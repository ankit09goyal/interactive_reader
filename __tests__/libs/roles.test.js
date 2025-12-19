import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";

// Mock dependencies
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/models/User", () => ({
  default: {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    }),
  },
}));

// Import after mocks
import {
  ROLES,
  isAdmin,
  hasRole,
  requireAdmin,
  requireAuth,
  getUserRole,
  isAdminById,
  verifyAdminForApi,
} from "@/libs/roles";
import User from "@/models/User";

describe("Roles Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ROLES constant", () => {
    it("should have USER role defined", () => {
      expect(ROLES.USER).toBe("user");
    });

    it("should have ADMIN role defined", () => {
      expect(ROLES.ADMIN).toBe("admin");
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin session", () => {
      const session = { user: { role: "admin" } };
      expect(isAdmin(session)).toBe(true);
    });

    it("should return false for user session", () => {
      const session = { user: { role: "user" } };
      expect(isAdmin(session)).toBe(false);
    });

    it("should return false for null session", () => {
      expect(isAdmin(null)).toBe(false);
    });

    it("should return false for undefined session", () => {
      expect(isAdmin(undefined)).toBe(false);
    });

    it("should return false for session without user", () => {
      const session = {};
      expect(isAdmin(session)).toBe(false);
    });

    it("should return false for session without role", () => {
      const session = { user: {} };
      expect(isAdmin(session)).toBe(false);
    });
  });

  describe("hasRole", () => {
    it("should return true when session has matching role", () => {
      const session = { user: { role: "admin" } };
      expect(hasRole(session, "admin")).toBe(true);
    });

    it("should return false when session has different role", () => {
      const session = { user: { role: "user" } };
      expect(hasRole(session, "admin")).toBe(false);
    });

    it("should return false for null session", () => {
      expect(hasRole(null, "admin")).toBe(false);
    });

    it("should return false for session without user", () => {
      const session = {};
      expect(hasRole(session, "admin")).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("should not redirect for admin session", () => {
      const session = { user: { role: "admin" } };
      requireAdmin(session);
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should redirect to /dashboard for non-admin session", () => {
      const session = { user: { role: "user" } };
      requireAdmin(session);
      expect(redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("should redirect to custom path when provided", () => {
      const session = { user: { role: "user" } };
      requireAdmin(session, "/custom-path");
      expect(redirect).toHaveBeenCalledWith("/custom-path");
    });

    it("should redirect for null session", () => {
      requireAdmin(null);
      expect(redirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("requireAuth", () => {
    it("should not redirect for authenticated session", () => {
      const session = { user: { id: "123" } };
      requireAuth(session);
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should redirect to signin for null session", () => {
      requireAuth(null);
      expect(redirect).toHaveBeenCalledWith("/api/auth/signin");
    });

    it("should redirect to custom path when provided", () => {
      requireAuth(null, "/login");
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("getUserRole", () => {
    it("should return null for null userId", async () => {
      const role = await getUserRole(null);
      expect(role).toBeNull();
    });

    it("should return null for undefined userId", async () => {
      const role = await getUserRole(undefined);
      expect(role).toBeNull();
    });

    it("should return user role from database", async () => {
      User.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ role: "admin" }),
        }),
      });

      const role = await getUserRole("test-id");
      expect(role).toBe("admin");
    });

    it("should return USER role if no role in database", async () => {
      User.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({}),
        }),
      });

      const role = await getUserRole("test-id");
      expect(role).toBe("user");
    });

    it("should return null on database error", async () => {
      User.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockRejectedValue(new Error("DB Error")),
        }),
      });

      const role = await getUserRole("test-id");
      expect(role).toBeNull();
    });
  });

  describe("isAdminById", () => {
    it("should return true for admin user", async () => {
      User.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ role: "admin" }),
        }),
      });

      const result = await isAdminById("test-id");
      expect(result).toBe(true);
    });

    it("should return false for non-admin user", async () => {
      User.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ role: "user" }),
        }),
      });

      const result = await isAdminById("test-id");
      expect(result).toBe(false);
    });
  });

  describe("verifyAdminForApi", () => {
    it("should return 401 error for null session", () => {
      const result = verifyAdminForApi(null);
      expect(result).toEqual({ error: "Unauthorized", status: 401 });
    });

    it("should return 403 error for non-admin session", () => {
      const session = { user: { role: "user" } };
      const result = verifyAdminForApi(session);
      expect(result).toEqual({
        error: "Forbidden - Admin access required",
        status: 403,
      });
    });

    it("should return null for admin session", () => {
      const session = { user: { role: "admin" } };
      const result = verifyAdminForApi(session);
      expect(result).toBeNull();
    });
  });
});
