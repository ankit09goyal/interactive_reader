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

// Mock User model
const mockCountDocuments = vi.fn();
const mockFind = vi.fn();
const mockAggregate = vi.fn();

vi.mock("@/models/User", () => ({
  default: {
    countDocuments: mockCountDocuments,
    find: mockFind,
    aggregate: mockAggregate,
  },
}));

describe("Admin Stats API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to returning counts
    mockCountDocuments.mockResolvedValue(0);
    mockFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    mockAggregate.mockResolvedValue([]);
  });

  describe("GET /api/admin/stats", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/admin/stats/route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "user" },
      });

      const { GET } = await import("@/app/api/admin/stats/route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden - Admin access required");
    });

    it("should return stats for admin user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      // Set up mock returns
      mockCountDocuments
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(5) // adminUsers
        .mockResolvedValueOnce(50); // usersWithAccess

      mockFind.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi
          .fn()
          .mockResolvedValue([
            { name: "Recent User", email: "recent@example.com" },
          ]),
      });

      mockAggregate.mockResolvedValue([
        { _id: { year: 2024, month: 1 }, count: 10 },
      ]);

      const { GET } = await import("@/app/api/admin/stats/route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalUsers).toBe(100);
      expect(data.stats.adminUsers).toBe(5);
      expect(data.stats.regularUsers).toBe(95);
      expect(data.stats.usersWithAccess).toBe(50);
      expect(data.stats.freeUsers).toBe(50);
    });

    it("should return recent users", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const recentUsers = [
        { name: "User 1", email: "user1@example.com" },
        { name: "User 2", email: "user2@example.com" },
      ];

      mockFind.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(recentUsers),
      });

      const { GET } = await import("@/app/api/admin/stats/route");
      const response = await GET();
      const data = await response.json();

      expect(data.recentUsers).toBeDefined();
      expect(Array.isArray(data.recentUsers)).toBe(true);
    });

    it("should return usersByMonth aggregation", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const monthlyData = [
        { _id: { year: 2024, month: 1 }, count: 10 },
        { _id: { year: 2024, month: 2 }, count: 15 },
      ];

      mockAggregate.mockResolvedValue(monthlyData);

      const { GET } = await import("@/app/api/admin/stats/route");
      const response = await GET();
      const data = await response.json();

      expect(data.usersByMonth).toBeDefined();
      expect(Array.isArray(data.usersByMonth)).toBe(true);
    });

    it("should return 500 on database error", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      mockCountDocuments.mockRejectedValueOnce(new Error("Database error"));

      const { GET } = await import("@/app/api/admin/stats/route");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch stats");
    });
  });
});
