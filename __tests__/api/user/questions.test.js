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
const mockQuestionFind = vi.fn();
const mockQuestionCreate = vi.fn();
const mockQuestionFindById = vi.fn();
const mockQuestionFindByIdAndDelete = vi.fn();

vi.mock("@/models/Question", () => ({
  default: {
    find: mockQuestionFind,
    create: mockQuestionCreate,
    findById: mockQuestionFindById,
    findByIdAndDelete: mockQuestionFindByIdAndDelete,
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

describe("User Questions API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/user/questions", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/user/questions/route");
      const req = { json: vi.fn().mockResolvedValue({}) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 if bookId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const { POST } = await import("@/app/api/user/questions/route");
      const req = { json: vi.fn().mockResolvedValue({ question: "Test?" }) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Book ID is required");
    });

    it("should return 400 if question is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const { POST } = await import("@/app/api/user/questions/route");
      const req = {
        json: vi.fn().mockResolvedValue({ bookId: "book-1" }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Question is required");
    });

    it("should return 403 if user doesn't have access to book", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean(null));

      const { POST } = await import("@/app/api/user/questions/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: "book-1",
          question: "Test?",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You don't have access to this book");
    });

    it("should create question successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean({
        _id: "access-1",
      }));

      const mockQuestion = {
        _id: "q-1",
        toJSON: vi.fn().mockReturnValue({ _id: "q-1" }),
      };
      mockQuestionCreate.mockResolvedValue(mockQuestion);

      const { POST } = await import("@/app/api/user/questions/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: "book-1",
          question: "Test?",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.question).toBeDefined();
    });
  });

  describe("GET /api/user/questions", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/user/questions/route");
      const req = { url: "http://localhost:3000/api/user/questions" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 if bookId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });

      const { GET } = await import("@/app/api/user/questions/route");
      const req = { url: "http://localhost:3000/api/user/questions" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Book ID is required");
    });

    it("should return questions for book", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserBookAccessFindOne.mockReturnValue(createMockWithLean({
        _id: "access-1",
      }));

      mockQuestionFind.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });

      const { GET } = await import("@/app/api/user/questions/route");
      const req = {
        url: "http://localhost:3000/api/user/questions?bookId=book-1",
      };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.myQuestions).toBeDefined();
      expect(data.publicQuestions).toBeDefined();
    });
  });
});

describe("User Questions [questionId] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DELETE /api/user/questions/[questionId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { DELETE } = await import("@/app/api/user/questions/[questionId]/route");
      const req = {};
      const params = { questionId: "q-1" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 404 if question not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockQuestionFindById.mockReturnValue(createMockWithLean(null));

      const { DELETE } = await import("@/app/api/user/questions/[questionId]/route");
      const req = {};
      const params = { questionId: "q-1" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Question not found");
    });

    it("should return 403 if user doesn't own question", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockQuestionFindById.mockReturnValue(createMockWithLean({
        _id: "q-1",
        userId: "other-user",
      }));

      const { DELETE } = await import("@/app/api/user/questions/[questionId]/route");
      const req = {};
      const params = { questionId: "q-1" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only delete your own questions");
    });

    it("should delete question successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockQuestionFindById.mockReturnValue(createMockWithLean({
        _id: "q-1",
        userId: "user-123",
        isAdminCreated: false,
      }));
      mockQuestionFindByIdAndDelete.mockResolvedValue({
        _id: "q-1",
      });

      const { DELETE } = await import("@/app/api/user/questions/[questionId]/route");
      const req = {};
      const params = { questionId: "q-1" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
