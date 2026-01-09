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

// Mock apiHelpers
vi.mock("@/libs/apiHelpers", () => ({
  handleApiError: vi.fn((error, message, context) => {
    return Response.json(
      { error: message || "An error occurred" },
      { status: 500 }
    );
  }),
}));

// Mock UserBookAccess model
const mockUserBookAccessFindOne = vi.fn();
const mockUserBookAccessFindOneAndUpdate = vi.fn();

vi.mock("@/models/UserBookAccess", () => ({
  default: {
    findOne: mockUserBookAccessFindOne,
    findOneAndUpdate: mockUserBookAccessFindOneAndUpdate,
  },
}));

// Helper to create mock with lean
const createMockWithLean = (data) => ({
  lean: vi.fn().mockResolvedValue(data),
});

describe("User Book Preferences API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/user/books/[bookId]/preferences", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = {};
      const params = { bookId: "book-123" };
      
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 if bookId is missing", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });

      const { GET } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = {};
      const params = { bookId: "" };
      
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Book ID is required");
    });

    it("should return 403 if access not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean(null));

      const { GET } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = {};
      const params = { bookId: "book-123" };
      
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You do not have access to this book");
    });

    it("should return default preferences if none exist", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean({
        userId: "user-123",
        bookId: "book-123",
        // no readingPreferences
      }));

      const { GET } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = {};
      const params = { bookId: "book-123" };
      
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toEqual({
        lastPage: 1,
        viewMode: "one-page",
        scale: 1.0,
        fontSize: 16,
        lastLocation: null,
      });
    });

    it("should return stored preferences", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean({
        userId: "user-123",
        bookId: "book-123",
        readingPreferences: {
          lastPage: 5,
          viewMode: "continuous",
          scale: 1.5,
          fontSize: 18,
          lastLocation: "epubcfi(/6/4[chap1ref]!/4/2/1:0)",
        },
      }));

      const { GET } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = {};
      const params = { bookId: "book-123" };
      
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toEqual({
        lastPage: 5,
        viewMode: "continuous",
        scale: 1.5,
        fontSize: 18,
        lastLocation: "epubcfi(/6/4[chap1ref]!/4/2/1:0)",
      });
    });
  });

  describe("PUT /api/user/books/[bookId]/preferences", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { PUT } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = { json: async () => ({}) };
      const params = { bookId: "book-123" };
      
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should validate lastPage input", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      
      const { PUT } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = { json: async () => ({ lastPage: -1 }) };
      const params = { bookId: "book-123" };
      
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid lastPage");
    });

    it("should validate viewMode input", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      
      const { PUT } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = { json: async () => ({ viewMode: "invalid-mode" }) };
      const params = { bookId: "book-123" };
      
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid viewMode");
    });

    it("should validate scale input", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      
      const { PUT } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = { json: async () => ({ scale: 3.5 }) };
      const params = { bookId: "book-123" };
      
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid scale");
    });

    it("should validate fontSize input", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      
      const { PUT } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = { json: async () => ({ fontSize: 10 }) }; // too small
      const params = { bookId: "book-123" };
      
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid fontSize");
    });

    it("should update valid preferences", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      
      const updateData = {
        lastPage: 10,
        viewMode: "continuous",
        scale: 1.2,
        fontSize: 18,
        lastLocation: "some-cfi",
      };

      mockUserBookAccessFindOneAndUpdate.mockReturnValue(createMockWithLean({
        userId: "user-123",
        bookId: "book-123",
        readingPreferences: updateData
      }));

      const { PUT } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = { json: async () => updateData };
      const params = { bookId: "book-123" };
      
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toEqual(updateData);
      
      // Verify DB call
      expect(mockUserBookAccessFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-123", bookId: "book-123" },
        {
          $set: {
            "readingPreferences.lastPage": 10,
            "readingPreferences.viewMode": "continuous",
            "readingPreferences.scale": 1.2,
            "readingPreferences.fontSize": 18,
            "readingPreferences.lastLocation": "some-cfi",
          }
        },
        expect.any(Object)
      );
    });

    it("should handle partial updates", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      
      const updateData = {
        lastPage: 20
      };

      // Mock return with mixed data (some new, some default/old)
      mockUserBookAccessFindOneAndUpdate.mockReturnValue(createMockWithLean({
        userId: "user-123",
        bookId: "book-123",
        readingPreferences: {
          lastPage: 20,
          viewMode: "one-page" // existing value
        }
      }));

      const { PUT } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = { json: async () => updateData };
      const params = { bookId: "book-123" };
      
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.lastPage).toBe(20);
      
      // Verify DB call only updated lastPage
      expect(mockUserBookAccessFindOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        {
          $set: {
            "readingPreferences.lastPage": 20
          }
        },
        expect.any(Object)
      );
    });

    it("should return 400 if no valid preferences provided", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      
      const { PUT } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = { json: async () => ({ unknownField: "value" }) };
      const params = { bookId: "book-123" };
      
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No valid preferences provided");
    });
  });

  describe("POST /api/user/books/[bookId]/preferences", () => {
    // Basic test to ensure POST delegates to updatePreferences
    it("should work same as PUT", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123" } });
      
      const updateData = { lastPage: 5 };
      mockUserBookAccessFindOneAndUpdate.mockReturnValue(createMockWithLean({
        userId: "user-123",
        bookId: "book-123",
        readingPreferences: updateData
      }));

      const { POST } = await import("@/app/api/user/books/[bookId]/preferences/route");
      const req = { json: async () => updateData };
      const params = { bookId: "book-123" };
      
      const response = await POST(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserBookAccessFindOneAndUpdate).toHaveBeenCalled();
    });
  });
});
