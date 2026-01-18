import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/books/[bookId]/analytics/reading/route";

// Use vi.hoisted to create mock functions before vi.mock hoisting
const {
  mockAuth,
  mockReadingAnalyticsAggregate,
  mockReadingAnalyticsDistinct,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockReadingAnalyticsAggregate: vi.fn(),
  mockReadingAnalyticsDistinct: vi.fn(),
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
vi.mock("@/models/ReadingAnalytics", () => ({
  default: {
    aggregate: mockReadingAnalyticsAggregate,
    distinct: mockReadingAnalyticsDistinct,
  },
}));

describe("GET /api/admin/books/[bookId]/analytics/reading", () => {
  const mockBookObjectId = "507f1f77bcf86cd799439011";
  const mockBook = {
    _id: mockBookObjectId,
    title: "Test Book",
    mimeType: "application/pdf",
  };
  const mockParams = { bookId: mockBookObjectId };
  let verifyAdminBookAccess;

  beforeEach(async () => {
    vi.clearAllMocks();
    const adminBookAuth = await import("@/libs/adminBookAuth");
    verifyAdminBookAccess = vi.mocked(adminBookAuth.verifyAdminBookAccess);
    verifyAdminBookAccess.mockResolvedValue({
      book: mockBook,
      bookObjectId: mockBookObjectId,
    });
    mockReadingAnalyticsAggregate.mockResolvedValue([]);
    mockReadingAnalyticsDistinct.mockResolvedValue([]);
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

  it("should return reading analytics successfully", async () => {
    // Mock summary stats
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([{ totalTime: 3600 }]) // totalTimeResult
      .mockResolvedValueOnce([
        {
          totalSessions: 10,
          avgDuration: 300,
          totalDuration: 3000,
        },
      ]) // sessionStats
      .mockResolvedValueOnce([]) // timePerLocation
      .mockResolvedValueOnce([]) // dropOffAnalysis
      .mockResolvedValueOnce([]) // sessionsOverTime
      .mockResolvedValueOnce([]) // readingActivity
      .mockResolvedValueOnce([]); // peakReadingTimes
    mockReadingAnalyticsDistinct.mockResolvedValue(["session1", "session2"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(result.status).toBe(200);
    expect(json.bookObjectId).toBe(mockBookObjectId);
    expect(json.bookTitle).toBe("Test Book");
    expect(json.fileType).toBe("PDF");
    expect(json.summary).toBeDefined();
    expect(json.summary.totalReadingTime).toBe(3600);
    expect(json.summary.totalSessions).toBe(2);
  });

  it("should handle EPUB file type", async () => {
    verifyAdminBookAccess.mockResolvedValue({
      book: { ...mockBook, mimeType: "application/epub+zip" },
      bookObjectId: mockBookObjectId,
    });
    mockReadingAnalyticsAggregate.mockResolvedValue([]);
    mockReadingAnalyticsDistinct.mockResolvedValue([]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.fileType).toBe("EPUB");
  });

  it("should handle zero reading time", async () => {
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([]) // no totalTimeResult
      .mockResolvedValueOnce([
        {
          totalSessions: 0,
          avgDuration: 0,
          totalDuration: 0,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockReadingAnalyticsDistinct.mockResolvedValue([]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.summary.totalReadingTime).toBe(0);
    expect(json.summary.totalReadingTimeFormatted).toBe("0s");
  });

  it("should format duration correctly", async () => {
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([{ totalTime: 3661 }]) // 1h 1m 1s
      .mockResolvedValueOnce([
        {
          totalSessions: 1,
          avgDuration: 3661,
          totalDuration: 3661,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockReadingAnalyticsDistinct.mockResolvedValue(["session1"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.summary.totalReadingTimeFormatted).toContain("h");
    expect(json.summary.totalReadingTimeFormatted).toContain("m");
    expect(json.summary.totalReadingTimeFormatted).toContain("s");
  });

  it("should return time per location data", async () => {
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([{ totalTime: 1000 }])
      .mockResolvedValueOnce([{ totalSessions: 1, avgDuration: 100, totalDuration: 100 }])
      .mockResolvedValueOnce([
        {
          _id: { locationType: "page", location: "1" },
          totalTime: 500,
          viewCount: 10,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockReadingAnalyticsDistinct.mockResolvedValue(["session1"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(Array.isArray(json.timePerLocation)).toBe(true);
    if (json.timePerLocation.length > 0) {
      expect(json.timePerLocation[0].locationType).toBe("page");
      expect(json.timePerLocation[0].location).toBe("1");
      expect(json.timePerLocation[0].totalTime).toBe(500);
    }
  });

  it("should return drop-off analysis data", async () => {
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([{ totalTime: 1000 }])
      .mockResolvedValueOnce([{ totalSessions: 1, avgDuration: 100, totalDuration: 100 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          _id: { location: "page-5", locationType: "page" },
          dropOffCount: 5,
          totalPages: 100,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockReadingAnalyticsDistinct.mockResolvedValue(["session1"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(Array.isArray(json.dropOffAnalysis)).toBe(true);
    if (json.dropOffAnalysis.length > 0) {
      expect(json.dropOffAnalysis[0].dropOffCount).toBe(5);
    }
  });

  it("should return sessions over time data", async () => {
    const mockDate = new Date();
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([{ totalTime: 1000 }])
      .mockResolvedValueOnce([{ totalSessions: 1, avgDuration: 100, totalDuration: 100 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          _id: {
            year: mockDate.getFullYear(),
            month: mockDate.getMonth() + 1,
            day: mockDate.getDate(),
          },
          sessionCount: 5,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockReadingAnalyticsDistinct.mockResolvedValue(["session1"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(Array.isArray(json.sessionsOverTime)).toBe(true);
  });

  it("should return reading activity over time data", async () => {
    const mockDate = new Date();
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([{ totalTime: 1000 }])
      .mockResolvedValueOnce([{ totalSessions: 1, avgDuration: 100, totalDuration: 100 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          _id: {
            year: mockDate.getFullYear(),
            month: mockDate.getMonth() + 1,
            day: mockDate.getDate(),
          },
          totalTime: 3600,
        },
      ])
      .mockResolvedValueOnce([]);
    mockReadingAnalyticsDistinct.mockResolvedValue(["session1"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(Array.isArray(json.readingActivity)).toBe(true);
  });

  it("should return peak reading times data", async () => {
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([{ totalTime: 1000 }])
      .mockResolvedValueOnce([{ totalSessions: 1, avgDuration: 100, totalDuration: 100 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { _id: 10, totalTime: 500, sessionCount: 5 },
        { _id: 14, totalTime: 800, sessionCount: 8 },
      ]);
    mockReadingAnalyticsDistinct.mockResolvedValue(["session1"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(Array.isArray(json.peakReadingTimes)).toBe(true);
    expect(json.peakReadingTimes.length).toBe(24); // 24 hours
  });

  it("should fill missing hours with zero in peak reading times", async () => {
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([{ totalTime: 1000 }])
      .mockResolvedValueOnce([{ totalSessions: 1, avgDuration: 100, totalDuration: 100 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { _id: 10, totalTime: 500, sessionCount: 5 },
      ]);
    mockReadingAnalyticsDistinct.mockResolvedValue(["session1"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.peakReadingTimes.length).toBe(24);
    // Check that hour 10 has data and hour 0 has 0
    const hour10 = json.peakReadingTimes.find((h) => h.hour === 10);
    const hour0 = json.peakReadingTimes.find((h) => h.hour === 0);
    expect(hour10.totalTime).toBe(500);
    expect(hour0.totalTime).toBe(0);
  });

  it("should handle errors gracefully", async () => {
    verifyAdminBookAccess.mockRejectedValue(new Error("Database error"));

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(result.status).toBe(500);
    expect(json.error).toBe("Failed to fetch reading analytics");
  });

  it("should handle empty aggregate results", async () => {
    mockReadingAnalyticsAggregate
      .mockResolvedValueOnce([]) // no totalTimeResult
      .mockResolvedValueOnce([]) // no sessionStats
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockReadingAnalyticsDistinct.mockResolvedValue([]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.summary.totalReadingTime).toBe(0);
    expect(json.summary.totalSessions).toBe(0);
    expect(json.summary.avgSessionDuration).toBe(0);
  });
});
