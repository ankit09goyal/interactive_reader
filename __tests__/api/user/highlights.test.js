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

// Mock models
const mockHighlightFind = vi.fn();
const mockHighlightFindOne = vi.fn();
const mockHighlightCreate = vi.fn();
const mockHighlightFindOneAndUpdate = vi.fn();
const mockHighlightFindOneAndDelete = vi.fn();

vi.mock("@/models/Highlight", () => ({
  default: {
    find: mockHighlightFind,
    findOne: mockHighlightFindOne,
    create: mockHighlightCreate,
    findOneAndUpdate: mockHighlightFindOneAndUpdate,
    findOneAndDelete: mockHighlightFindOneAndDelete,
  },
}));

const mockUserBookAccessFindOne = vi.fn();
vi.mock("@/models/UserBookAccess", () => ({
  default: {
    findOne: mockUserBookAccessFindOne,
  },
}));

// Helper to create mock with lean
const createMockWithLean = (data) => ({
  lean: vi.fn().mockResolvedValue(data),
});

describe("User Highlights API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/user/highlights", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/user/highlights/route");
      const req = { url: "http://localhost:3000/api/user/highlights" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 if bookId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const { GET } = await import("@/app/api/user/highlights/route");
      const req = { url: "http://localhost:3000/api/user/highlights" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Book ID is required");
    });

    it("should return highlights for book", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean({
        _id: "access-1",
      }));

      mockHighlightFind.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "h-1",
            bookId: "book-1",
            userId: "user-123",
            selectedText: "Test",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      });

      const { GET } = await import("@/app/api/user/highlights/route");
      const req = {
        url: "http://localhost:3000/api/user/highlights?bookId=book-1",
      };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.highlights).toBeDefined();
    });
  });

  describe("POST /api/user/highlights", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/user/highlights/route");
      const req = { json: vi.fn().mockResolvedValue({}) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 if required fields are missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const { POST } = await import("@/app/api/user/highlights/route");
      const req = {
        json: vi.fn().mockResolvedValue({ bookId: "book-1" }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should create highlight successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean({
        _id: "access-1",
      }));

      const mockHighlight = {
        _id: "h-1",
        bookId: "book-1",
        userId: "user-123",
        selectedText: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockHighlightCreate.mockResolvedValue(mockHighlight);

      const { POST } = await import("@/app/api/user/highlights/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: "book-1",
          selectedText: "Test",
          cfi: "epubcfi(/6/4[chap01ref]!/4/2/1:0)",
          cfiRange: "epubcfi(/6/4[chap01ref]!/4/2/1:0,epubcfi(/6/4[chap01ref]!/4/2/1:10))",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.highlight).toBeDefined();
    });
  });
});

describe("User Highlights [highlightId] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/user/highlights/[highlightId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/user/highlights/[highlightId]/route");
      const req = {};
      const params = { highlightId: "h-1" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return highlight details", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const mockHighlight = {
        _id: "h-1",
        bookId: "book-1",
        userId: "user-123",
        selectedText: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockHighlightFindOne.mockReturnValue(createMockWithLean(mockHighlight));

      const { GET } = await import("@/app/api/user/highlights/[highlightId]/route");
      const req = {};
      const params = { highlightId: "h-1" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.highlight).toBeDefined();
    });
  });

  describe("PUT /api/user/highlights/[highlightId]", () => {
    it("should return 400 if invalid color", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const { PUT } = await import("@/app/api/user/highlights/[highlightId]/route");
      const req = {
        json: vi.fn().mockResolvedValue({ color: "invalid" }),
      };
      const params = { highlightId: "h-1" };
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid color");
    });

    it("should update highlight successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const mockHighlight = {
        _id: "h-1",
        bookId: "book-1",
        userId: "user-123",
        notes: "Updated notes",
        color: "green",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockHighlightFindOneAndUpdate.mockReturnValue(createMockWithLean(mockHighlight));

      const { PUT } = await import("@/app/api/user/highlights/[highlightId]/route");
      const req = {
        json: vi.fn().mockResolvedValue({ notes: "Updated notes", color: "green" }),
      };
      const params = { highlightId: "h-1" };
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.highlight).toBeDefined();
    });
  });

  describe("DELETE /api/user/highlights/[highlightId]", () => {
    it("should delete highlight successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const mockHighlight = {
        _id: "h-1",
        userId: "user-123",
      };
      mockHighlightFindOneAndDelete.mockResolvedValue(mockHighlight);

      const { DELETE } = await import("@/app/api/user/highlights/[highlightId]/route");
      const req = {};
      const params = { highlightId: "h-1" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
