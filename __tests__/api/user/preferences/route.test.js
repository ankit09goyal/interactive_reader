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
  handleApiError: vi.fn((error, message) =>
    Response.json({ error: message }, { status: 500 })
  ),
}));

// Mock User model
const mockUserFindById = vi.fn();
const mockUserFindByIdAndUpdate = vi.fn();

vi.mock("@/models/User", () => ({
  default: {
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
  },
}));

// Helper for chainable mock
const createChainableMock = (data) => ({
  select: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(data),
});

describe("User Preferences API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/user/preferences", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const { GET } = await import("@/app/api/user/preferences/route");
      const response = await GET({});
      const data = await response.json();
      expect(response.status).toBe(401);
    });

    it("should return preferences", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockUserFindById.mockReturnValue(
        createChainableMock({
          preferences: { readerViewMode: "continuous" },
        })
      );

      const { GET } = await import("@/app/api/user/preferences/route");
      const response = await GET({});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.readerViewMode).toBe("continuous");
    });
  });

  describe("PUT /api/user/preferences", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const { PUT } = await import("@/app/api/user/preferences/route");
      const response = await PUT({});
      expect(response.status).toBe(401);
    });

    it("should validate readerViewMode", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      const { PUT } = await import("@/app/api/user/preferences/route");
      const req = { json: async () => ({ readerViewMode: "invalid" }) };

      const response = await PUT(req);
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid readerViewMode");
    });

    it("should update preferences", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });

      mockUserFindByIdAndUpdate.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          preferences: { readerViewMode: "continuous" },
        }),
      });

      const { PUT } = await import("@/app/api/user/preferences/route");
      const req = { json: async () => ({ readerViewMode: "continuous" }) };

      const response = await PUT(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.readerViewMode).toBe("continuous");
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "user-1",
        { $set: { "preferences.readerViewMode": "continuous" } },
        expect.any(Object)
      );
    });
  });
});
