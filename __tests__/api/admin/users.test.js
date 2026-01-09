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

// Mock email notifications
vi.mock("@/libs/emailNotifications", () => ({
  getDefaultEmailTemplate: vi
    .fn()
    .mockReturnValue({ subject: "Test", body: "Test" }),
  sendBookAccessNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock models
const mockUserFind = vi.fn();
const mockUserFindOne = vi.fn();
const mockUserFindById = vi.fn();
const mockUserFindByIdAndUpdate = vi.fn();
const mockUserCountDocuments = vi.fn();
const mockUserCreate = vi.fn();
const mockUserFindByIdAndDelete = vi.fn();

vi.mock("@/models/User", () => ({
  default: {
    find: mockUserFind,
    findOne: mockUserFindOne,
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    countDocuments: mockUserCountDocuments,
    create: mockUserCreate,
    findByIdAndDelete: mockUserFindByIdAndDelete,
  },
}));

const mockBookFind = vi.fn();
const mockBookFindOne = vi.fn();
const mockBookFindById = vi.fn();

// Helper to create chainable query mock
const createChainableMock = (finalValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(finalValue),
    populate: vi.fn().mockReturnThis(),
    distinct: vi.fn().mockResolvedValue(finalValue),
  };
  // Make it thenable so it can be awaited directly (for cases like User.findById(id) without chaining)
  chain.then = (resolve) => Promise.resolve(finalValue).then(resolve);
  chain.catch = (reject) => Promise.resolve(finalValue).catch(reject);
  return chain;
};

vi.mock("@/models/Book", () => ({
  default: {
    find: mockBookFind,
    findOne: mockBookFindOne,
    findById: mockBookFindById,
  },
}));

const mockUserBookAccessFind = vi.fn();
const mockUserBookAccessBulkWrite = vi.fn();
const mockUserBookAccessCountDocuments = vi.fn();
const mockUserBookAccessDeleteMany = vi.fn();
const mockUserBookAccessDeleteOne = vi.fn();

vi.mock("@/models/UserBookAccess", () => ({
  default: {
    find: mockUserBookAccessFind,
    bulkWrite: mockUserBookAccessBulkWrite,
    countDocuments: mockUserBookAccessCountDocuments,
    deleteMany: mockUserBookAccessDeleteMany,
    deleteOne: mockUserBookAccessDeleteOne,
  },
}));

const mockEmailTemplateFindOne = vi.fn();
vi.mock("@/models/EmailTemplate", () => ({
  default: {
    findOne: mockEmailTemplateFindOne,
  },
}));

describe("Admin Users API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCountDocuments.mockResolvedValue(0);
    mockUserFind.mockReturnValue(createChainableMock([]));
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessFind.mockReturnValue(createChainableMock([]));
  });

  describe("GET /api/admin/users", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/users/route");
      const req = { url: "http://localhost:3000/api/admin/users" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return users for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      mockUserCountDocuments.mockResolvedValue(1);
      mockUserFind.mockReturnValue(
        createChainableMock([
          {
            _id: "user-1",
            name: "Test User",
            email: "test@example.com",
            addedBy: ["admin-123"],
          },
        ])
      );
      // Mock Book.find().select().lean() and Book.find().distinct() patterns
      mockBookFind.mockReturnValue(createChainableMock([]));

      const { GET } = await import("@/app/api/admin/users/route");
      const req = { url: "http://localhost:3000/api/admin/users" };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(data.pagination).toBeDefined();
    });

    it("should handle search query param", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { GET } = await import("@/app/api/admin/users/route");
      const req = {
        url: "http://localhost:3000/api/admin/users?search=test",
      };
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/admin/users", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/admin/users/route");
      const req = { json: vi.fn().mockResolvedValue({}) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if email is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { POST } = await import("@/app/api/admin/users/route");
      const req = { json: vi.fn().mockResolvedValue({ name: "Test" }) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email is required");
    });

    it("should create new user successfully", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "admin-123",
          role: "admin",
          name: "Admin",
          email: "admin@test.com",
        },
      });

      mockUserFindOne.mockResolvedValue(null);
      const mockUser = {
        _id: "user-1",
        name: "Test User",
        email: "test@example.com",
        toJSON: vi.fn().mockReturnValue({ _id: "user-1" }),
      };
      mockUserCreate.mockResolvedValue(mockUser);
      mockUserFindById.mockReturnValue(
        createChainableMock({
          name: "Admin",
          email: "admin@test.com",
        })
      );
      mockBookFind.mockReturnValue(createChainableMock([]));
      mockUserBookAccessCountDocuments.mockResolvedValue(0);

      const { POST } = await import("@/app/api/admin/users/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          name: "Test User",
          email: "test@example.com",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toBeDefined();
    });

    it("should add existing user to admin's list", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "admin-123",
          role: "admin",
          name: "Admin",
          email: "admin@test.com",
        },
      });

      const existingUser = {
        _id: "user-1",
        email: "test@example.com",
        addedBy: [],
        toJSON: vi.fn().mockReturnValue({
          _id: "user-1",
          email: "test@example.com",
          addedBy: ["admin-123"],
        }),
      };
      mockUserFindOne.mockResolvedValue(existingUser);
      const updatedUser = {
        ...existingUser,
        addedBy: ["admin-123"],
        toJSON: vi.fn().mockReturnValue({
          _id: "user-1",
          email: "test@example.com",
          addedBy: ["admin-123"],
        }),
      };
      mockUserFindByIdAndUpdate.mockResolvedValue(updatedUser);
      mockUserFindById.mockReturnValue(
        createChainableMock({
          name: "Admin",
          email: "admin@test.com",
        })
      );
      // Mock Book.find().distinct() pattern
      mockBookFind.mockReturnValue(createChainableMock([]));
      mockUserBookAccessCountDocuments.mockResolvedValue(0);

      const { POST } = await import("@/app/api/admin/users/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          email: "test@example.com",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("added to your list");
    });
  });
});

describe("Admin Users [userId] API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/users/[userId]", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/users/[userId]/route");
      const req = {};
      const params = { userId: "user-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if user not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });
      mockUserFindById.mockReturnValue(createChainableMock(null));

      const { GET } = await import("@/app/api/admin/users/[userId]/route");
      const req = {};
      const params = { userId: "user-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return user details", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockUser = {
        _id: "user-123",
        addedBy: ["admin-123"],
      };
      mockUserFindById.mockReturnValue(createChainableMock(mockUser));
      mockBookFind.mockReturnValue(createChainableMock([]));
      mockUserBookAccessCountDocuments.mockResolvedValue(0);

      const { GET } = await import("@/app/api/admin/users/[userId]/route");
      const req = {};
      const params = { userId: "user-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });
  });

  describe("PUT /api/admin/users/[userId]", () => {
    it("should return 400 if admin tries to modify own role", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { PUT } = await import("@/app/api/admin/users/[userId]/route");
      const req = {
        json: vi.fn().mockResolvedValue({ role: "user" }),
      };
      const params = { userId: "admin-123" };
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot modify your own role");
    });

    it("should update user successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const existingUser = {
        _id: "user-123",
        addedBy: ["admin-123"],
      };
      mockUserFindById.mockReturnValue(createChainableMock(existingUser));
      mockUserFindByIdAndUpdate.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          ...existingUser,
          name: "Updated Name",
        }),
      });

      const { PUT } = await import("@/app/api/admin/users/[userId]/route");
      const req = {
        json: vi.fn().mockResolvedValue({ name: "Updated Name" }),
      };
      const params = { userId: "user-123" };
      const response = await PUT(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });
  });

  describe("DELETE /api/admin/users/[userId]", () => {
    it("should return 400 if admin tries to delete themselves", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { DELETE } = await import("@/app/api/admin/users/[userId]/route");
      const req = {};
      const params = { userId: "admin-123" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot delete your own account");
    });

    it("should delete user successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockUser = {
        _id: "user-123",
        addedBy: ["admin-123"],
      };
      mockUserFindById.mockReturnValue(createChainableMock(mockUser));
      mockBookFind.mockReturnValue(createChainableMock([]));
      mockUserBookAccessDeleteMany.mockResolvedValue({ deletedCount: 0 });
      mockUserFindByIdAndDelete.mockResolvedValue(mockUser);

      const { DELETE } = await import("@/app/api/admin/users/[userId]/route");
      const req = {};
      const params = { userId: "user-123" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("User deleted successfully");
    });
  });
});

describe("Admin Users [userId]/books API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/users/[userId]/books", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import(
        "@/app/api/admin/users/[userId]/books/route"
      );
      const req = {};
      const params = { userId: "user-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return user books", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockUser = {
        _id: "user-123",
        addedBy: ["admin-123"],
      };
      mockUserFindById.mockResolvedValue(mockUser);
      mockBookFind.mockReturnValue(createChainableMock([]));
      mockUserBookAccessFind.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });

      const { GET } = await import(
        "@/app/api/admin/users/[userId]/books/route"
      );
      const req = {};
      const params = { userId: "user-123" };
      const response = await GET(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.userBooks).toBeDefined();
    });
  });

  describe("POST /api/admin/users/[userId]/books", () => {
    it("should return 400 if bookIds is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { POST } = await import(
        "@/app/api/admin/users/[userId]/books/route"
      );
      const req = { json: vi.fn().mockResolvedValue({}) };
      const params = { userId: "user-123" };
      const response = await POST(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("bookIds array is required");
    });

    it("should grant book access successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockUser = {
        _id: "user-123",
        addedBy: ["admin-123"],
      };
      mockUserFindById.mockResolvedValue(mockUser);
      mockBookFind.mockReturnValue(
        createChainableMock([{ _id: "book-1", uploadedBy: "admin-123" }])
      );
      mockUserBookAccessBulkWrite.mockResolvedValue({
        upsertedCount: 1,
      });

      const { POST } = await import(
        "@/app/api/admin/users/[userId]/books/route"
      );
      const req = {
        json: vi.fn().mockResolvedValue({ bookIds: ["book-1"] }),
      };
      const params = { userId: "user-123" };
      const response = await POST(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Book access granted successfully");
    });
  });

  describe("DELETE /api/admin/users/[userId]/books", () => {
    it("should return 400 if bookId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const { DELETE } = await import(
        "@/app/api/admin/users/[userId]/books/route"
      );
      const req = {
        url: "http://localhost:3000/api/admin/users/user-123/books",
      };
      const params = { userId: "user-123" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("bookId query parameter is required");
    });

    it("should revoke book access successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockUser = {
        _id: "user-123",
        addedBy: ["admin-123"],
      };
      mockUserFindById.mockResolvedValue(mockUser);
      const mockBook = {
        _id: "book-1",
        uploadedBy: "admin-123",
      };
      mockBookFindOne.mockResolvedValue(mockBook);
      mockUserBookAccessDeleteOne.mockResolvedValue({
        deletedCount: 1,
      });

      const { DELETE } = await import(
        "@/app/api/admin/users/[userId]/books/route"
      );
      const req = {
        url: "http://localhost:3000/api/admin/users/user-123/books?bookId=book-1",
      };
      const params = { userId: "user-123" };
      const response = await DELETE(req, { params: Promise.resolve(params) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Book access revoked successfully");
    });
  });
});
