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

// Mock roles
vi.mock("@/libs/roles", () => ({
  verifyAdminForApi: vi.fn((session) => {
    if (!session) return { error: "Unauthorized", status: 401 };
    if (session.user?.role !== "admin")
      return { error: "Forbidden - Admin access required", status: 403 };
    return null;
  }),
}));

// Mock models
const mockQuestionFind = vi.fn();
const mockQuestionFindById = vi.fn();
const mockQuestionFindOne = vi.fn();
const mockQuestionCountDocuments = vi.fn();
const mockQuestionCreate = vi.fn();
const mockQuestionDeleteMany = vi.fn();
const mockQuestionSave = vi.fn();

vi.mock("@/models/Question", () => ({
  default: {
    find: mockQuestionFind,
    findById: mockQuestionFindById,
    findOne: mockQuestionFindOne,
    countDocuments: mockQuestionCountDocuments,
    create: mockQuestionCreate,
    deleteMany: mockQuestionDeleteMany,
  },
}));

const mockBookFind = vi.fn();
const mockBookFindById = vi.fn();

vi.mock("@/models/Book", () => ({
  default: {
    find: mockBookFind,
    findById: mockBookFindById,
  },
}));

const mockUserFind = vi.fn();

vi.mock("@/models/User", () => ({
  default: {
    find: mockUserFind,
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

describe("Admin Questions API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuestionCountDocuments.mockResolvedValue(0);
    mockQuestionFind.mockReturnValue(createChainableMock([]));
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserFind.mockReturnValue(createChainableMock([]));
  });

  describe("GET /api/admin/questions", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/questions/route");
      const req = { url: "http://localhost:3000/api/admin/questions" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return questions for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      mockBookFind.mockReturnValue(
        createChainableMock([{ _id: "book-1", title: "Test Book" }])
      );
      mockQuestionCountDocuments.mockResolvedValue(1);
      mockQuestionFind.mockReturnValue(
        createChainableMock([
          {
            _id: "q-1",
            bookId: "book-1",
            userId: "user-1",
            question: "Test question",
          },
        ])
      );

      const { GET } = await import("@/app/api/admin/questions/route");
      const req = { url: "http://localhost:3000/api/admin/questions" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it("should filter by bookId", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { GET } = await import("@/app/api/admin/questions/route");
      const req = {
        url: "http://localhost:3000/api/admin/questions?bookId=book-1",
      };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should filter by status", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { GET } = await import("@/app/api/admin/questions/route");
      const req = {
        url: "http://localhost:3000/api/admin/questions?status=answered",
      };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });
});

describe("Admin Questions Create API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/admin/questions/create", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/admin/questions/create/route");
      const req = { json: vi.fn().mockResolvedValue({}) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if bookId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { POST } = await import("@/app/api/admin/questions/create/route");
      const req = { json: vi.fn().mockResolvedValue({ question: "Test?" }) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Book ID is required");
    });

    it("should return 400 if question is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { POST } = await import("@/app/api/admin/questions/create/route");
      const req = {
        json: vi.fn().mockResolvedValue({ bookId: "book-1" }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Question is required");
    });

    it("should return 404 if book not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });
      mockBookFindById.mockReturnValue(createChainableMock(null));

      const { POST } = await import("@/app/api/admin/questions/create/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: "book-1",
          question: "Test?",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Book not found");
    });

    it("should return 403 if admin doesn't own book", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });
      mockBookFindById.mockReturnValue(
        createChainableMock({
          _id: "book-1",
          uploadedBy: "other-admin",
        })
      );

      const { POST } = await import("@/app/api/admin/questions/create/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          bookId: "book-1",
          question: "Test?",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        "You can only create questions for books you uploaded"
      );
    });

    it("should create question successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });
      mockBookFindById.mockReturnValue(
        createChainableMock({
          _id: "book-1",
          uploadedBy: "admin-123",
        })
      );

      const mockQuestion = {
        _id: "q-1",
        toJSON: vi.fn().mockReturnValue({ _id: "q-1" }),
      };
      mockQuestionCreate.mockResolvedValue(mockQuestion);

      const { POST } = await import("@/app/api/admin/questions/create/route");
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
});

describe("Admin Questions [questionId] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/questions/[questionId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import(
        "@/app/api/admin/questions/[questionId]/route"
      );
      const req = {};
      const params = { questionId: "q-1" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if question not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });
      mockQuestionFindById.mockReturnValue(createChainableMock(null));

      const { GET } = await import(
        "@/app/api/admin/questions/[questionId]/route"
      );
      const req = {};
      const params = { questionId: "q-1" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Question not found");
    });

    it("should return question details", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockQuestion = {
        _id: "q-1",
        bookId: "book-1",
        userId: null,
      };
      const mockBook = {
        _id: "book-1",
        title: "Test Book",
        author: "Author",
        uploadedBy: "admin-123",
      };

      mockQuestionFindById.mockReturnValue(createChainableMock(mockQuestion));
      mockBookFindById.mockReturnValue(createChainableMock(mockBook));
      mockQuestionFind.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });

      const { GET } = await import(
        "@/app/api/admin/questions/[questionId]/route"
      );
      const req = {};
      const params = { questionId: "q-1" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.question).toBeDefined();
    });
  });

  describe("PUT /api/admin/questions/[questionId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { PUT } = await import(
        "@/app/api/admin/questions/[questionId]/route"
      );
      const req = { json: vi.fn().mockResolvedValue({}) };
      const params = { questionId: "q-1" };
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should update question answer", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockQuestion = {
        _id: "q-1",
        bookId: "book-1",
        answer: null,
        isPublic: false,
        save: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue({ _id: "q-1" }),
      };
      const mockBook = {
        _id: "book-1",
        uploadedBy: "admin-123",
      };

      mockQuestionFindById.mockReturnValue(createChainableMock(mockQuestion));
      mockBookFindById.mockReturnValue(createChainableMock(mockBook));

      const { PUT } = await import(
        "@/app/api/admin/questions/[questionId]/route"
      );
      const req = {
        json: vi.fn().mockResolvedValue({ answer: "Test answer" }),
      };
      const params = { questionId: "q-1" };
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.question).toBeDefined();
      expect(mockQuestion.save).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/admin/questions/[questionId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { DELETE } = await import(
        "@/app/api/admin/questions/[questionId]/route"
      );
      const req = {};
      const params = { questionId: "q-1" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should delete question successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockQuestion = {
        _id: "q-1",
        bookId: "book-1",
      };
      const mockBook = {
        _id: "book-1",
        uploadedBy: "admin-123",
      };

      mockQuestionFindById.mockReturnValue(createChainableMock(mockQuestion));
      mockBookFindById.mockReturnValue(createChainableMock(mockBook));
      mockQuestionDeleteMany.mockResolvedValue({ deletedCount: 1 });

      const { DELETE } = await import(
        "@/app/api/admin/questions/[questionId]/route"
      );
      const req = {};
      const params = { questionId: "q-1" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe("Admin Questions Edit API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/admin/questions/[questionId]/edit", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import(
        "@/app/api/admin/questions/[questionId]/edit/route"
      );
      const req = { json: vi.fn().mockResolvedValue({}) };
      const params = { questionId: "q-1" };
      const response = await POST(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if question is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { POST } = await import(
        "@/app/api/admin/questions/[questionId]/edit/route"
      );
      const req = { json: vi.fn().mockResolvedValue({}) };
      const params = { questionId: "q-1" };
      const response = await POST(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Question is required");
    });

    it("should create edited version successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockOriginalQuestion = {
        _id: "q-1",
        bookId: "book-1",
        userId: "user-1",
        selectedText: "text",
        answer: "Original answer",
        answeredBy: "admin-123",
        answeredAt: new Date(),
      };
      const mockBook = {
        _id: "book-1",
        uploadedBy: "admin-123",
      };
      const mockEditedQuestion = {
        _id: "q-2",
        toJSON: vi.fn().mockReturnValue({ _id: "q-2" }),
      };

      mockQuestionFindById.mockReturnValue(
        createChainableMock(mockOriginalQuestion)
      );
      mockBookFindById.mockReturnValue(createChainableMock(mockBook));
      mockQuestionCreate.mockResolvedValue(mockEditedQuestion);

      const { POST } = await import(
        "@/app/api/admin/questions/[questionId]/edit/route"
      );
      const req = {
        json: vi.fn().mockResolvedValue({
          question: "Edited question?",
          useOriginalAnswer: true,
        }),
      };
      const params = { questionId: "q-1" };
      const response = await POST(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.question).toBeDefined();
      expect(data.originalQuestion).toBeDefined();
    });
  });
});
