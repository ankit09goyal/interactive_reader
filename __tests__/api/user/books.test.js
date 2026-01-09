import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/libs/auth", () => ({
  auth: mockAuth,
}));

// Mock mongoose
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// Mock bookUtils
const mockTransformBook = vi.fn((book) => ({ ...book, transformed: true }));
vi.mock("@/libs/bookUtils", () => ({
  transformBook: mockTransformBook,
}));

// Mock models
const mockUserBookAccessFind = vi.fn();
const mockUserBookAccessFindOne = vi.fn();
const mockUserBookAccessCountDocuments = vi.fn();

vi.mock("@/models/UserBookAccess", () => ({
  default: {
    find: mockUserBookAccessFind,
    findOne: mockUserBookAccessFindOne,
    countDocuments: mockUserBookAccessCountDocuments,
  },
}));

const mockBookFindById = vi.fn();
vi.mock("@/models/Book", () => ({
  default: {
    findById: mockBookFindById,
  },
}));

// Helper to create chainable query mock
const createChainableMock = (finalValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(finalValue),
    populate: vi.fn().mockReturnThis(),
  };
  // Make it thenable so it can be awaited directly
  chain.then = (resolve) => Promise.resolve(finalValue).then(resolve);
  chain.catch = (reject) => Promise.resolve(finalValue).catch(reject);
  return chain;
};

// Helper to create mock with lean (for backward compatibility)
const createMockWithLean = (data) => ({
  lean: vi.fn().mockResolvedValue(data),
});

describe("User Books API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserBookAccessCountDocuments.mockResolvedValue(0);
    mockUserBookAccessFind.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
  });

  describe("GET /api/user/books", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/user/books/route");
      const req = { url: "http://localhost:3000/api/user/books" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return books for authenticated user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      mockUserBookAccessCountDocuments.mockResolvedValue(1);
      mockUserBookAccessFind.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            bookId: {
              _id: "book-1",
              title: "Test Book",
            },
            createdAt: new Date(),
          },
        ]),
      });

      const { GET } = await import("@/app/api/user/books/route");
      const req = { url: "http://localhost:3000/api/user/books" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it("should handle pagination", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const { GET } = await import("@/app/api/user/books/route");
      const req = {
        url: "http://localhost:3000/api/user/books?page=2&limit=10",
      };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
    });
  });
});

describe("User Books [bookId] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/user/books/[bookId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/user/books/[bookId]/route");
      const req = {};
      const params = { bookId: "book-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 403 if user doesn't have access", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean(null));

      const { GET } = await import("@/app/api/user/books/[bookId]/route");
      const req = {};
      const params = { bookId: "book-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You do not have access to this book");
    });

    it("should return book details", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const mockAccess = {
        _id: "access-1",
        createdAt: new Date(),
      };
      const mockBook = {
        _id: "book-123",
        title: "Test Book",
        author: "Author",
      };

      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean(mockAccess));
      mockBookFindById.mockReturnValue(createChainableMock(mockBook));

      const { GET } = await import("@/app/api/user/books/[bookId]/route");
      const req = {};
      const params = { bookId: "book-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.book).toBeDefined();
    });
  });
});
