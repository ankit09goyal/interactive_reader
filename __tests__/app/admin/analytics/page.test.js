import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/libs/auth", () => ({
  auth: mockAuth,
}));

// Mock mongoose
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// Mock models
const mockUserAggregate = vi.fn();
const mockUserCountDocuments = vi.fn();
const mockBookFind = vi.fn();
const mockUserBookAccessDistinct = vi.fn();
const mockUserBookAccessAggregate = vi.fn();

vi.mock("@/models/User", () => ({
  default: {
    aggregate: mockUserAggregate,
    countDocuments: mockUserCountDocuments,
  },
}));

vi.mock("@/models/Book", () => ({
  default: {
    find: mockBookFind,
  },
}));

vi.mock("@/models/UserBookAccess", () => ({
  default: {
    distinct: mockUserBookAccessDistinct,
    aggregate: mockUserBookAccessAggregate,
  },
}));

// Mock mongoose
class MockObjectId {
  constructor(id) {
    this.id = id;
    this.toString = () => id;
  }
}

vi.mock("mongoose", () => ({
  default: {
    Types: {
      ObjectId: MockObjectId,
    },
  },
}));

// Helper to create chainable query mock
const createChainableMock = (finalValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(finalValue),
  };
  chain.then = (resolve) => Promise.resolve(finalValue).then(resolve);
  chain.catch = (reject) => Promise.resolve(finalValue).catch(reject);
  return chain;
};

describe("Admin Analytics Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockUserAggregate.mockResolvedValue([]);
    mockUserCountDocuments.mockResolvedValue(0);
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessDistinct.mockResolvedValue([]);
    mockUserBookAccessAggregate.mockResolvedValue([]);
  });

  it("should render analytics page with stats", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserCountDocuments.mockResolvedValue(10);
    mockUserBookAccessDistinct.mockResolvedValue(["user-1", "user-2"]);
    mockUserCountDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(2);
    mockBookFind.mockReturnValue(
      createChainableMock([{ _id: "book-1", title: "Book 1" }])
    );

    const AdminAnalyticsPage = (await import("@/app/admin/analytics/page"))
      .default;
    const result = await AdminAnalyticsPage();

    const { getByText } = render(result);
    expect(getByText("Analytics")).toBeInTheDocument();
    expect(
      getByText(/View your users and book access statistics/)
    ).toBeInTheDocument();
  });

  it("should display total users count", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserAggregate.mockResolvedValue([]);
    mockUserCountDocuments.mockReset();
    mockUserCountDocuments.mockResolvedValue(25);
    mockUserBookAccessDistinct.mockResolvedValue([]);
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessAggregate.mockResolvedValue([]);

    const AdminAnalyticsPage = (await import("@/app/admin/analytics/page"))
      .default;
    const result = await AdminAnalyticsPage();

    const { container } = render(result);
    expect(container.textContent).toContain("25");
    expect(container.textContent).toContain("Total Users");
  });

  it("should calculate users with and without access", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserAggregate.mockResolvedValue([]);
    mockUserCountDocuments.mockReset();
    mockUserCountDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
    mockUserBookAccessDistinct.mockResolvedValue([
      "user-1",
      "user-2",
      "user-3",
    ]);
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessAggregate.mockResolvedValue([]);

    const AdminAnalyticsPage = (await import("@/app/admin/analytics/page"))
      .default;
    const result = await AdminAnalyticsPage();

    const { container } = render(result);
    expect(container.textContent).toContain("3"); // Users with access
    expect(container.textContent).toContain("Users with Book Access");
  });

  it("should display book access per book", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockBooks = [
      { _id: "book-1", title: "Book 1" },
      { _id: "book-2", title: "Book 2" },
    ];

    const mockBookAccessStats = [
      { _id: "book-1", accessCount: 5 },
      { _id: "book-2", accessCount: 3 },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockUserCountDocuments.mockResolvedValue(0);
    mockUserBookAccessDistinct.mockResolvedValue([]);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockUserBookAccessAggregate.mockResolvedValue(mockBookAccessStats);

    const AdminAnalyticsPage = (await import("@/app/admin/analytics/page"))
      .default;
    const result = await AdminAnalyticsPage();

    const { getByText } = render(result);
    expect(getByText("Access Per Book")).toBeInTheDocument();
    expect(getByText("Book 1")).toBeInTheDocument();
    expect(getByText("Book 2")).toBeInTheDocument();
  });

  it("should display users by month", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockUsersByMonth = [
      { _id: { year: 2024, month: 1 }, count: 5 },
      { _id: { year: 2024, month: 2 }, count: 3 },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockUserAggregate.mockResolvedValue(mockUsersByMonth);
    mockUserCountDocuments.mockResolvedValue(0);
    mockUserBookAccessDistinct.mockResolvedValue([]);
    mockBookFind.mockReturnValue(createChainableMock([]));

    const AdminAnalyticsPage = (await import("@/app/admin/analytics/page"))
      .default;
    const result = await AdminAnalyticsPage();

    const { getByText } = render(result);
    expect(getByText("Users Added (Last 6 Months)")).toBeInTheDocument();
    expect(getByText("Jan 2024")).toBeInTheDocument();
    expect(getByText("Feb 2024")).toBeInTheDocument();
  });

  it("should handle empty analytics data", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserAggregate.mockReset();
    mockUserAggregate.mockResolvedValue([]);
    mockUserCountDocuments.mockReset();
    mockUserCountDocuments.mockResolvedValue(0);
    mockUserBookAccessDistinct.mockResolvedValue([]);
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessAggregate.mockResolvedValue([]);

    const AdminAnalyticsPage = (await import("@/app/admin/analytics/page"))
      .default;
    const result = await AdminAnalyticsPage();

    const { container } = render(result);
    expect(container.textContent).toContain("0"); // Total users
    expect(container.textContent).toContain("No users added in the last 6 months");
  });

  it("should calculate correct percentages for access distribution", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserCountDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(7);
    mockUserBookAccessDistinct.mockResolvedValue([
      "user-1",
      "user-2",
      "user-3",
    ]);
    mockBookFind.mockReturnValue(createChainableMock([]));

    const AdminAnalyticsPage = (await import("@/app/admin/analytics/page"))
      .default;
    const result = await AdminAnalyticsPage();

    const { container } = render(result);
    // Check that progress bars are rendered
    const progressBars = container.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("should filter users by admin ID", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserAggregate.mockReset();
    mockUserAggregate.mockResolvedValue([]);
    mockUserCountDocuments.mockReset();
    mockUserCountDocuments.mockResolvedValue(0);
    mockUserBookAccessDistinct.mockResolvedValue([]);
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessAggregate.mockResolvedValue([]);

    const AdminAnalyticsPage = (await import("@/app/admin/analytics/page"))
      .default;
    await AdminAnalyticsPage();

    // The aggregate is called with the adminObjectId
    expect(mockUserAggregate).toHaveBeenCalled();
    const aggregateCall = mockUserAggregate.mock.calls[0][0];
    expect(aggregateCall[0].$match).toBeDefined();
    expect(aggregateCall[0].$match.addedBy).toBeDefined();
  });

  it("should limit users by month to last 6 months", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserAggregate.mockResolvedValue([]);
    mockUserCountDocuments.mockResolvedValue(0);
    mockUserBookAccessDistinct.mockResolvedValue([]);
    mockBookFind.mockReturnValue(createChainableMock([]));

    const AdminAnalyticsPage = (await import("@/app/admin/analytics/page"))
      .default;
    await AdminAnalyticsPage();

    expect(mockUserAggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({
            createdAt: expect.objectContaining({
              $gte: expect.any(Date),
            }),
          }),
        }),
      ])
    );
  });
});
