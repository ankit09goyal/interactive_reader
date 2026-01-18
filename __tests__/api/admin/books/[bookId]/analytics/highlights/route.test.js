import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/books/[bookId]/analytics/highlights/route";

// Use vi.hoisted to create mock functions before vi.mock hoisting
const {
  mockAuth,
  mockHighlightCountDocuments,
  mockHighlightDistinct,
  mockHighlightFind,
  mockUserBookAccessCountDocuments,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockHighlightCountDocuments: vi.fn(),
  mockHighlightDistinct: vi.fn(),
  mockHighlightFind: vi.fn(),
  mockUserBookAccessCountDocuments: vi.fn(),
}));

// Mock auth
vi.mock("@/libs/auth", () => ({
  auth: mockAuth,
}));

// Mock adminBookAuth
vi.mock("@/libs/adminBookAuth", () => ({
  verifyAdminBookAccess: vi.fn(),
}));

// Mock mongoose
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// Mock models
vi.mock("@/models/Highlight", () => ({
  default: {
    countDocuments: mockHighlightCountDocuments,
    distinct: mockHighlightDistinct,
    find: mockHighlightFind,
  },
}));

vi.mock("@/models/UserBookAccess", () => ({
  default: {
    countDocuments: mockUserBookAccessCountDocuments,
  },
}));

// Helper to create chainable query mock
const createChainableMock = (finalValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(finalValue),
  };
  chain.then = (resolve) => Promise.resolve(finalValue).then(resolve);
  chain.catch = (reject) => Promise.resolve(finalValue).catch(reject);
  return chain;
};

describe("GET /api/admin/books/[bookId]/analytics/highlights", () => {
  const mockBookObjectId = "507f1f77bcf86cd799439011";
  const mockParams = { bookId: mockBookObjectId };
  let verifyAdminBookAccess;

  beforeEach(async () => {
    vi.clearAllMocks();
    const adminBookAuth = await import("@/libs/adminBookAuth");
    verifyAdminBookAccess = vi.mocked(adminBookAuth.verifyAdminBookAccess);
    verifyAdminBookAccess.mockResolvedValue({
      bookObjectId: mockBookObjectId,
    });
    mockHighlightCountDocuments.mockResolvedValue(0);
    mockHighlightDistinct.mockResolvedValue([]);
    mockUserBookAccessCountDocuments.mockResolvedValue(0);
    mockHighlightFind.mockReturnValue(createChainableMock([]));
  });

  it("should return 401 when admin access verification fails", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      error: { json: () => ({ error: "Unauthorized" }), status: 401 },
    });

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.error).toBe("Unauthorized");
    expect(result.status).toBe(401);
  });

  it("should return highlights analytics successfully", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      bookObjectId: mockBookObjectId,
    });
    mockHighlightCountDocuments
      .mockResolvedValueOnce(100) // totalHighlights
      .mockResolvedValueOnce(30); // highlightsWithNotes
    mockUserBookAccessCountDocuments.mockResolvedValue(50);
    mockHighlightDistinct.mockResolvedValue(["user1", "user2", "user3"]);
    mockHighlightFind.mockReturnValue(
      createChainableMock([
        { selectedText: "Test highlight", userId: "user1" },
        { selectedText: "Test highlight", userId: "user2" },
      ])
    );

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(result.status).toBe(200);
    expect(json.bookObjectId).toBe(mockBookObjectId);
    expect(json.summary.totalHighlights).toBe(100);
    expect(json.summary.withNotes).toBe(30);
    expect(json.summary.withoutNotes).toBe(70);
    expect(json.summary.notesPercentage).toBe(30);
    expect(json.userEngagement.totalUsersWithAccess).toBe(50);
    expect(json.userEngagement.usersWhoHighlighted).toBe(3);
    expect(json.userEngagement.usersWhoDidntHighlight).toBe(47);
    expect(json.userEngagement.avgHighlightsPerUser).toBe(2);
    expect(json.userEngagement.highlightingRate).toBe(6);
  });

  it("should calculate notes percentage correctly", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      bookObjectId: mockBookObjectId,
    });
    mockHighlightCountDocuments
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(150);
    mockUserBookAccessCountDocuments.mockResolvedValue(10);
    mockHighlightDistinct.mockResolvedValue([]);
    mockHighlightFind.mockReturnValue(createChainableMock([]));

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.summary.notesPercentage).toBe(75);
  });

  it("should handle zero highlights", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      bookObjectId: mockBookObjectId,
    });
    mockHighlightCountDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockUserBookAccessCountDocuments.mockResolvedValue(10);
    mockHighlightDistinct.mockResolvedValue([]);
    mockHighlightFind.mockReturnValue(createChainableMock([]));

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.summary.totalHighlights).toBe(0);
    expect(json.summary.notesPercentage).toBe(0);
    expect(json.userEngagement.avgHighlightsPerUser).toBe(0);
  });

  it("should handle zero users with access", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      bookObjectId: mockBookObjectId,
    });
    mockHighlightCountDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5);
    mockUserBookAccessCountDocuments.mockResolvedValue(0);
    mockHighlightDistinct.mockResolvedValue([]);
    mockHighlightFind.mockReturnValue(createChainableMock([]));

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.userEngagement.avgHighlightsPerUser).toBe(0);
    expect(json.userEngagement.highlightingRate).toBe(0);
  });

  it("should group popular highlights correctly", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      bookObjectId: mockBookObjectId,
    });
    mockHighlightCountDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5);
    mockUserBookAccessCountDocuments.mockResolvedValue(10);
    mockHighlightDistinct.mockResolvedValue(["user1", "user2"]);
    mockHighlightFind.mockReturnValue(
      createChainableMock([
        { selectedText: "Same text", userId: "user1" },
        { selectedText: "Same text", userId: "user2" },
        { selectedText: "Different text", userId: "user3" },
      ])
    );

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(Array.isArray(json.popularHighlights)).toBe(true);
  });

  it("should limit highlights to 1000 for popular highlights analysis", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      bookObjectId: mockBookObjectId,
    });
    mockHighlightCountDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5);
    mockUserBookAccessCountDocuments.mockResolvedValue(10);
    mockHighlightDistinct.mockResolvedValue([]);
    mockHighlightFind.mockReturnValue(createChainableMock([]));

    const req = {};
    await GET(req, { params: mockParams });

    expect(mockHighlightFind).toHaveBeenCalled();
    expect(mockHighlightFind().limit).toHaveBeenCalledWith(1000);
  });

  it("should handle errors gracefully", async () => {
    verifyAdminBookAccess.mockRejectedValue(new Error("Database error"));

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(result.status).toBe(500);
    expect(json.error).toBe("Failed to fetch highlights analytics");
  });

  it("should calculate highlighting rate correctly", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      bookObjectId: mockBookObjectId,
    });
    mockHighlightCountDocuments
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(20);
    mockUserBookAccessCountDocuments.mockResolvedValue(100);
    mockHighlightDistinct.mockResolvedValue(["user1", "user2", "user3", "user4", "user5"]);
    mockHighlightFind.mockReturnValue(createChainableMock([]));

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.userEngagement.highlightingRate).toBe(5); // 5/100 * 100 = 5%
  });

  it("should ensure usersWhoDidntHighlight is never negative", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      bookObjectId: mockBookObjectId,
    });
    mockHighlightCountDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5);
    mockUserBookAccessCountDocuments.mockResolvedValue(5);
    mockHighlightDistinct.mockResolvedValue(["user1", "user2", "user3", "user4", "user5", "user6"]); // More than total users
    mockHighlightFind.mockReturnValue(createChainableMock([]));

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.userEngagement.usersWhoDidntHighlight).toBeGreaterThanOrEqual(0);
  });
});
