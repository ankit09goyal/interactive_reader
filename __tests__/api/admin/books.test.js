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

// Mock fileUpload
const mockValidateFile = vi.fn();
const mockGenerateUniqueFilename = vi.fn();
const mockSaveFile = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock("@/libs/fileUpload", () => ({
  validateFile: mockValidateFile,
  generateUniqueFilename: mockGenerateUniqueFilename,
  saveFile: mockSaveFile,
  deleteFile: mockDeleteFile,
}));

// Mock bookUtils
const mockTransformBook = vi.fn((book) => ({ ...book, transformed: true }));
vi.mock("@/libs/bookUtils", () => ({
  transformBook: mockTransformBook,
}));

// Mock Book model
const mockBookFind = vi.fn();
const mockBookFindOne = vi.fn();
const mockBookCountDocuments = vi.fn();
const mockBookCreate = vi.fn();
const mockBookFindByIdAndDelete = vi.fn();
const mockBookSave = vi.fn();

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

// Helper to create a mock file with required props
const createMockFile = ({ name, size = 1024 } = {}) => {
  const blob = new Blob(["test"], { type: "application/pdf" });
  Object.defineProperty(blob, "name", { value: name });
  Object.defineProperty(blob, "size", { value: size });
  blob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  return blob;
};

vi.mock("@/models/Book", () => ({
  default: {
    find: mockBookFind,
    findOne: mockBookFindOne,
    countDocuments: mockBookCountDocuments,
    create: mockBookCreate,
    findByIdAndDelete: mockBookFindByIdAndDelete,
  },
}));

describe("Admin Books API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateFile.mockReturnValue({ valid: true });
    mockGenerateUniqueFilename.mockReturnValue("unique-filename.pdf");
    mockSaveFile.mockResolvedValue({ filePath: "/uploads/test.pdf" });
    mockDeleteFile.mockResolvedValue(true);
    mockBookCountDocuments.mockResolvedValue(0);
    mockBookFind.mockReturnValue(createChainableMock([]));
  });

  describe("GET /api/admin/books", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/books/route");
      const req = { url: "http://localhost:3000/api/admin/books" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin user", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-123", role: "user" } });

      const { GET } = await import("@/app/api/admin/books/route");
      const req = { url: "http://localhost:3000/api/admin/books" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden - Admin access required");
    });

    it("should return books for admin user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockBooks = [
        {
          _id: "book-1",
          title: "Test Book",
          author: "Test Author",
          fileName: "test.pdf",
          filePath: "/uploads/test.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          createdAt: new Date(),
        },
      ];

      mockBookCountDocuments.mockResolvedValue(1);
      mockBookFind.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockBooks),
      });

      const { GET } = await import("@/app/api/admin/books/route");
      const req = { url: "http://localhost:3000/api/admin/books" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.books).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it("should handle pagination query params", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { GET } = await import("@/app/api/admin/books/route");
      const req = {
        url: "http://localhost:3000/api/admin/books?page=2&limit=10",
      };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
    });

    it("should return 500 on database error", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });
      mockBookCountDocuments.mockRejectedValue(new Error("Database error"));

      const { GET } = await import("@/app/api/admin/books/route");
      const req = { url: "http://localhost:3000/api/admin/books" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });
  });

  describe("POST /api/admin/books", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/admin/books/route");
      const formData = new FormData();
      const req = { formData: vi.fn().mockResolvedValue(formData) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if title is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const formData = new FormData();
      formData.append("author", "Test Author");
      formData.append("file", new Blob(["test"], { type: "application/pdf" }));

      const { POST } = await import("@/app/api/admin/books/route");
      const req = { formData: vi.fn().mockResolvedValue(formData) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Title and author are required");
    });

    it("should return 400 if file is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const formData = new FormData();
      formData.append("title", "Test Book");
      formData.append("author", "Test Author");

      const { POST } = await import("@/app/api/admin/books/route");
      const req = { formData: vi.fn().mockResolvedValue(formData) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No file uploaded");
    });

    it("should return 400 if file validation fails", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      mockValidateFile.mockReturnValue({
        valid: false,
        error: "Invalid file type",
      });

      const formData = new FormData();
      formData.append("title", "Test Book");
      formData.append("author", "Test Author");
      // Create a mock file object
      const file = {
        name: "test.pdf",
        size: 1024,
        type: "application/pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      };
      formData.append("file", file);

      const { POST } = await import("@/app/api/admin/books/route");
      const req = { formData: vi.fn().mockResolvedValue(formData) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid file type");
    });

    it("should create book successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockBook = {
        _id: "book-1",
        title: "Test Book",
        author: "Test Author",
        toJSON: vi.fn().mockReturnValue({ _id: "book-1", title: "Test Book" }),
      };

      mockBookCreate.mockResolvedValue(mockBook);

      // Create a mock file with arrayBuffer method
      const fileBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: "test.pdf",
        type: "application/pdf",
        size: 1024,
        arrayBuffer: async () => fileBuffer,
      };

      // Mock formData with a custom get method
      const mockFormData = {
        get: vi.fn((key) => {
          if (key === "title") return "Test Book";
          if (key === "author") return "Test Author";
          if (key === "file") return mockFile;
          return null;
        }),
      };

      const { POST } = await import("@/app/api/admin/books/route");
      const req = { formData: vi.fn().mockResolvedValue(mockFormData) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.book).toBeDefined();
      expect(mockBookCreate).toHaveBeenCalled();
    });
  });
});

describe("Admin Books [bookId] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/books/[bookId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/books/[bookId]/route");
      const req = {};
      const params = { bookId: "book-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if book not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });
      mockBookFindOne.mockReturnValue(createChainableMock(null));

      const { GET } = await import("@/app/api/admin/books/[bookId]/route");
      const req = {};
      const params = { bookId: "book-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Book not found");
    });

    it("should return book details", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockBook = {
        _id: "book-123",
        title: "Test Book",
        uploadedBy: "admin-123",
      };

      mockBookFindOne.mockReturnValue(createChainableMock(mockBook));

      const { GET } = await import("@/app/api/admin/books/[bookId]/route");
      const req = {};
      const params = { bookId: "book-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.book).toBeDefined();
    });
  });

  describe("DELETE /api/admin/books/[bookId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { DELETE } = await import("@/app/api/admin/books/[bookId]/route");
      const req = {};
      const params = { bookId: "book-123" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if book not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });
      mockBookFindOne.mockReturnValue(createChainableMock(null));

      const { DELETE } = await import("@/app/api/admin/books/[bookId]/route");
      const req = {};
      const params = { bookId: "book-123" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Book not found");
    });

    it("should delete book successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockBook = {
        _id: "book-123",
        filePath: "/uploads/test.pdf",
        uploadedBy: "admin-123",
      };

      mockBookFindOne.mockReturnValue(createChainableMock(mockBook));
      mockBookFindByIdAndDelete.mockResolvedValue(mockBook);

      const { DELETE } = await import("@/app/api/admin/books/[bookId]/route");
      const req = {};
      const params = { bookId: "book-123" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Book deleted successfully");
      expect(mockDeleteFile).toHaveBeenCalled();
    });
  });

  describe("PUT /api/admin/books/[bookId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { PUT } = await import("@/app/api/admin/books/[bookId]/route");
      const req = { formData: vi.fn().mockResolvedValue(new FormData()) };
      const params = { bookId: "book-123" };
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if no file uploaded", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockBook = {
        _id: "book-123",
        filePath: "/uploads/test.pdf",
        uploadedBy: "admin-123",
        save: mockBookSave.mockResolvedValue(true),
      };

      mockBookFindOne.mockReturnValue(createChainableMock(mockBook));

      const formData = new FormData();
      const { PUT } = await import("@/app/api/admin/books/[bookId]/route");
      const req = { formData: vi.fn().mockResolvedValue(formData) };
      const params = { bookId: "book-123" };
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No file uploaded");
    });

    it("should replace book file successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockBook = {
        _id: "book-123",
        filePath: "/uploads/old.pdf",
        uploadedBy: "admin-123",
        fileName: "old.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        save: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue({ _id: "book-123" }),
      };

      mockBookFindOne.mockReturnValue(createChainableMock(mockBook));
      mockValidateFile.mockReturnValue({ valid: true });

      // Create a mock file with arrayBuffer method
      const fileBuffer = new ArrayBuffer(8);
      const mockFile = {
        name: "new.pdf",
        type: "application/pdf",
        size: 2048,
        arrayBuffer: async () => fileBuffer,
      };

      // Mock formData with a custom get method
      const mockFormData = {
        get: vi.fn((key) => {
          if (key === "file") return mockFile;
          return null;
        }),
      };

      const { PUT } = await import("@/app/api/admin/books/[bookId]/route");
      const req = { formData: vi.fn().mockResolvedValue(mockFormData) };
      const params = { bookId: "book-123" };
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.book).toBeDefined();
      expect(mockDeleteFile).toHaveBeenCalledWith("/uploads/old.pdf");
    });
  });
});
