import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/books/[bookId]/analytics/questions/route";

// Use vi.hoisted to create mock functions before vi.mock hoisting
const {
  mockAuth,
  mockQuestionCountDocuments,
  mockQuestionDistinct,
  mockUserBookAccessCountDocuments,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockQuestionCountDocuments: vi.fn(),
  mockQuestionDistinct: vi.fn(),
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
vi.mock("@/models/Question", () => ({
  default: {
    countDocuments: mockQuestionCountDocuments,
    distinct: mockQuestionDistinct,
  },
}));

vi.mock("@/models/UserBookAccess", () => ({
  default: {
    countDocuments: mockUserBookAccessCountDocuments,
  },
}));

describe("GET /api/admin/books/[bookId]/analytics/questions", () => {
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
    mockQuestionCountDocuments.mockResolvedValue(0);
    mockQuestionDistinct.mockResolvedValue([]);
    mockUserBookAccessCountDocuments.mockResolvedValue(0);
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

  it("should return questions analytics successfully", async () => {
    mockQuestionCountDocuments
      .mockResolvedValueOnce(50) // totalQuestions
      .mockResolvedValueOnce(30) // publicQuestions
      .mockResolvedValueOnce(20) // privateQuestions
      .mockResolvedValueOnce(10); // unansweredQuestions
    mockUserBookAccessCountDocuments.mockResolvedValue(25);
    mockQuestionDistinct.mockResolvedValue(["user1", "user2", "user3"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(result.status).toBe(200);
    expect(json.bookObjectId).toBe(mockBookObjectId);
    expect(json.summary.totalQuestions).toBe(50);
    expect(json.summary.publicQuestions).toBe(30);
    expect(json.summary.privateQuestions).toBe(20);
    expect(json.summary.unansweredQuestions).toBe(10);
    expect(json.summary.answeredQuestions).toBe(40);
    expect(json.summary.answeredPercentage).toBe(80);
    expect(json.summary.publicPercentage).toBe(60);
    expect(json.userEngagement.totalUsersWithAccess).toBe(25);
    expect(json.userEngagement.usersWhoAskedQuestions).toBe(3);
    expect(json.userEngagement.usersWhoDidntAskQuestions).toBe(22);
    expect(json.userEngagement.avgQuestionsPerUser).toBe(2);
    expect(json.userEngagement.questionRate).toBe(12);
  });

  it("should calculate answered percentage correctly", async () => {
    mockQuestionCountDocuments
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(25); // unanswered
    mockUserBookAccessCountDocuments.mockResolvedValue(10);
    mockQuestionDistinct.mockResolvedValue([]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.summary.answeredQuestions).toBe(75);
    expect(json.summary.answeredPercentage).toBe(75);
  });

  it("should handle zero questions", async () => {
    mockQuestionCountDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockUserBookAccessCountDocuments.mockResolvedValue(10);
    mockQuestionDistinct.mockResolvedValue([]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.summary.totalQuestions).toBe(0);
    expect(json.summary.answeredPercentage).toBe(0);
    expect(json.summary.publicPercentage).toBe(0);
    expect(json.userEngagement.avgQuestionsPerUser).toBe(0);
  });

  it("should handle zero users with access", async () => {
    mockQuestionCountDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    mockUserBookAccessCountDocuments.mockResolvedValue(0);
    mockQuestionDistinct.mockResolvedValue([]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.userEngagement.avgQuestionsPerUser).toBe(0);
    expect(json.userEngagement.questionRate).toBe(0);
  });

  it("should exclude admin-created questions from user count", async () => {
    mockQuestionCountDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    mockUserBookAccessCountDocuments.mockResolvedValue(10);
    mockQuestionDistinct.mockResolvedValue(["user1", "user2"]);

    const req = {};
    await GET(req, { params: mockParams });

    // Verify distinct is called with userId: { $ne: null } to exclude admin questions
    expect(mockQuestionDistinct).toHaveBeenCalledWith("userId", {
      bookId: mockBookObjectId,
      userId: { $ne: null },
    });
  });

  it("should handle errors gracefully", async () => {
    verifyAdminBookAccess.mockRejectedValue(new Error("Database error"));

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(result.status).toBe(500);
    expect(json.error).toBe("Failed to fetch questions analytics");
  });

  it("should calculate question rate correctly", async () => {
    mockQuestionCountDocuments
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(10);
    mockUserBookAccessCountDocuments.mockResolvedValue(50);
    mockQuestionDistinct.mockResolvedValue(["user1", "user2", "user3", "user4", "user5"]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.userEngagement.questionRate).toBe(10); // 5/50 * 100 = 10%
  });

  it("should ensure usersWhoDidntAskQuestions is never negative", async () => {
    mockQuestionCountDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    mockUserBookAccessCountDocuments.mockResolvedValue(5);
    mockQuestionDistinct.mockResolvedValue(["user1", "user2", "user3", "user4", "user5", "user6"]); // More than total users

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.userEngagement.usersWhoDidntAskQuestions).toBeGreaterThanOrEqual(0);
  });

  it("should handle all questions answered", async () => {
    mockQuestionCountDocuments
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(0); // no unanswered
    mockUserBookAccessCountDocuments.mockResolvedValue(10);
    mockQuestionDistinct.mockResolvedValue([]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.summary.answeredQuestions).toBe(50);
    expect(json.summary.answeredPercentage).toBe(100);
  });

  it("should handle all questions unanswered", async () => {
    mockQuestionCountDocuments
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(50); // all unanswered
    mockUserBookAccessCountDocuments.mockResolvedValue(10);
    mockQuestionDistinct.mockResolvedValue([]);

    const req = {};
    const result = await GET(req, { params: mockParams });
    const json = await result.json();

    expect(json.summary.answeredQuestions).toBe(0);
    expect(json.summary.answeredPercentage).toBe(0);
  });
});
