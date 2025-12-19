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

// Mock EmailTemplate model
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockDeleteOne = vi.fn();

vi.mock("@/models/EmailTemplate", () => ({
  default: {
    findOne: mockFindOne,
    findOneAndUpdate: mockFindOneAndUpdate,
    deleteOne: mockDeleteOne,
  },
}));

// Mock emailNotifications
vi.mock("@/libs/emailNotifications", () => ({
  getDefaultEmailTemplate: vi.fn(() => ({
    subject: "Default Subject",
    htmlBody: "<p>Default Body</p>",
    textBody: "Default Body",
  })),
}));

describe("Admin Email Template API Route", () => {
  const adminSession = {
    user: { id: "admin-123", role: "admin" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  // Helper to create mock request
  const createMockRequest = (body) => ({
    json: vi.fn().mockResolvedValue(body),
  });

  describe("GET /api/admin/email-template", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/email-template/route");
      const response = await GET({});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "user" },
      });

      const { GET } = await import("@/app/api/admin/email-template/route");
      const response = await GET({});
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it("should return custom template if exists", async () => {
      mockFindOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          subject: "Custom Subject",
          htmlBody: "<p>Custom Body</p>",
          textBody: "Custom Body",
        }),
      });

      const { GET } = await import("@/app/api/admin/email-template/route");
      const response = await GET({});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isDefault).toBe(false);
      expect(data.template.subject).toBe("Custom Subject");
    });

    it("should return default template if no custom template", async () => {
      mockFindOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const { GET } = await import("@/app/api/admin/email-template/route");
      const response = await GET({});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isDefault).toBe(true);
      expect(data.template.subject).toBe("Default Subject");
    });
  });

  describe("PUT /api/admin/email-template", () => {
    it("should return 400 if subject is missing", async () => {
      const { PUT } = await import("@/app/api/admin/email-template/route");
      const req = createMockRequest({ htmlBody: "<p>Body</p>" });

      const response = await PUT(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Subject");
    });

    it("should return 400 if htmlBody is missing", async () => {
      const { PUT } = await import("@/app/api/admin/email-template/route");
      const req = createMockRequest({ subject: "Test Subject" });

      const response = await PUT(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("HTML body");
    });

    it("should save template successfully", async () => {
      mockFindOneAndUpdate.mockResolvedValue({
        subject: "Saved Subject",
        htmlBody: "<p>Saved Body</p>",
        textBody: "Saved Body",
      });

      const { PUT } = await import("@/app/api/admin/email-template/route");
      const req = createMockRequest({
        subject: "Saved Subject",
        htmlBody: "<p>Saved Body</p>",
        textBody: "Saved Body",
      });

      const response = await PUT(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("saved successfully");
      expect(data.template.subject).toBe("Saved Subject");
    });

    it("should use upsert to create or update", async () => {
      mockFindOneAndUpdate.mockResolvedValue({
        subject: "Test",
        htmlBody: "<p>Test</p>",
        textBody: "",
      });

      const { PUT } = await import("@/app/api/admin/email-template/route");
      const req = createMockRequest({
        subject: "Test",
        htmlBody: "<p>Test</p>",
      });

      await PUT(req);

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { adminId: "admin-123" },
        expect.objectContaining({
          adminId: "admin-123",
          subject: "Test",
          htmlBody: "<p>Test</p>",
        }),
        { upsert: true, new: true, runValidators: true }
      );
    });
  });

  describe("DELETE /api/admin/email-template", () => {
    it("should delete custom template and return default", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

      const { DELETE } = await import("@/app/api/admin/email-template/route");
      const response = await DELETE({});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isDefault).toBe(true);
      expect(data.message).toContain("reset to default");
    });

    it("should call deleteOne with correct adminId", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

      const { DELETE } = await import("@/app/api/admin/email-template/route");
      await DELETE({});

      expect(mockDeleteOne).toHaveBeenCalledWith({ adminId: "admin-123" });
    });

    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { DELETE } = await import("@/app/api/admin/email-template/route");
      const response = await DELETE({});
      const data = await response.json();

      expect(response.status).toBe(401);
    });
  });
});
