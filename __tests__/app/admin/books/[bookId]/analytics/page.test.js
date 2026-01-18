import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/libs/auth", () => ({
  auth: mockAuth,
}));

// Mock roles
vi.mock("@/libs/roles", () => ({
  requireAdmin: vi.fn((session) => {
    if (!session || session.user?.role !== "admin") {
      throw new Error("Admin access required");
    }
  }),
}));

// Mock mongoose
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// Mock Book model
const mockBookFindOne = vi.fn();
const createChainableMock = (finalValue) => {
  const chain = {
    lean: vi.fn().mockResolvedValue(finalValue),
  };
  chain.then = (resolve) => Promise.resolve(finalValue).then(resolve);
  chain.catch = (reject) => Promise.resolve(finalValue).catch(reject);
  return chain;
};

vi.mock("@/models/Book", () => ({
  default: {
    findOne: mockBookFindOne,
  },
}));

// Mock BookAnalyticsClient
vi.mock("@/app/admin/books/[bookId]/analytics/BookAnalyticsClient", () => ({
  default: ({ bookId }) => <div data-testid="analytics-client">BookId: {bookId}</div>,
}));

// Mock Link
vi.mock("next/link", () => ({
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

// Mock icons
vi.mock("@/libs/icons", () => ({
  default: {
    back: "←",
  },
}));

describe("BookAnalyticsPage", () => {
  const mockBookId = "507f1f77bcf86cd799439011";
  const mockParams = { bookId: mockBookId };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    });
  });

  it("should render book analytics page with book", async () => {
    const mockBook = {
      _id: mockBookId,
      title: "Test Book",
      mimeType: "application/pdf",
      uploadedBy: "admin-id",
    };

    mockBookFindOne.mockReturnValue(createChainableMock(mockBook));

    const BookAnalyticsPage = (await import("@/app/admin/books/[bookId]/analytics/page"))
      .default;
    const result = await BookAnalyticsPage({ params: mockParams });

    const { getByText, getByTestId } = render(result);
    expect(getByText("Book Analytics")).toBeInTheDocument();
    expect(getByText("Test Book (PDF)")).toBeInTheDocument();
    expect(getByTestId("analytics-client")).toBeInTheDocument();
  });

  it("should render EPUB book type", async () => {
    const mockBook = {
      _id: mockBookId,
      title: "EPUB Book",
      mimeType: "application/epub+zip",
      uploadedBy: "admin-id",
    };

    mockBookFindOne.mockReturnValue(createChainableMock(mockBook));

    const BookAnalyticsPage = (await import("@/app/admin/books/[bookId]/analytics/page"))
      .default;
    const result = await BookAnalyticsPage({ params: mockParams });

    const { getByText } = render(result);
    expect(getByText("EPUB Book (EPUB)")).toBeInTheDocument();
  });

  it("should render book not found when book doesn't exist", async () => {
    mockBookFindOne.mockReturnValue(createChainableMock(null));

    const BookAnalyticsPage = (await import("@/app/admin/books/[bookId]/analytics/page"))
      .default;
    const result = await BookAnalyticsPage({ params: mockParams });

    const { getByText } = render(result);
    expect(getByText("Book Not Found")).toBeInTheDocument();
    expect(
      getByText(/The book you're looking for doesn't exist/i)
    ).toBeInTheDocument();
  });

  it("should render back link", async () => {
    const mockBook = {
      _id: mockBookId,
      title: "Test Book",
      mimeType: "application/pdf",
      uploadedBy: "admin-id",
    };

    mockBookFindOne.mockReturnValue(createChainableMock(mockBook));

    const BookAnalyticsPage = (await import("@/app/admin/books/[bookId]/analytics/page"))
      .default;
    const result = await BookAnalyticsPage({ params: mockParams });

    const { getByText } = render(result);
    expect(getByText(/Back to Books/i)).toBeInTheDocument();
  });

  it("should query book with correct parameters", async () => {
    const mockBook = {
      _id: mockBookId,
      title: "Test Book",
      mimeType: "application/pdf",
      uploadedBy: "admin-id",
    };

    mockBookFindOne.mockReturnValue(createChainableMock(mockBook));

    const BookAnalyticsPage = (await import("@/app/admin/books/[bookId]/analytics/page"))
      .default;
    await BookAnalyticsPage({ params: mockParams });

    expect(mockBookFindOne).toHaveBeenCalledWith({
      _id: mockBookId,
      uploadedBy: "admin-id",
    });
  });

  it("should pass bookId to BookAnalyticsClient", async () => {
    const mockBook = {
      _id: mockBookId,
      title: "Test Book",
      mimeType: "application/pdf",
      uploadedBy: "admin-id",
    };

    mockBookFindOne.mockReturnValue(createChainableMock(mockBook));

    const BookAnalyticsPage = (await import("@/app/admin/books/[bookId]/analytics/page"))
      .default;
    const result = await BookAnalyticsPage({ params: mockParams });

    const { getByText } = render(result);
    expect(getByText(`BookId: ${mockBookId}`)).toBeInTheDocument();
  });

  it("should handle book not owned by admin", async () => {
    mockBookFindOne.mockReturnValue(createChainableMock(null));

    const BookAnalyticsPage = (await import("@/app/admin/books/[bookId]/analytics/page"))
      .default;
    const result = await BookAnalyticsPage({ params: mockParams });

    const { getByText } = render(result);
    expect(getByText("Book Not Found")).toBeInTheDocument();
  });

  it("should await params correctly", async () => {
    const mockBook = {
      _id: mockBookId,
      title: "Test Book",
      mimeType: "application/pdf",
      uploadedBy: "admin-id",
    };

    mockBookFindOne.mockReturnValue(createChainableMock(mockBook));

    // Test with async params
    const asyncParams = Promise.resolve(mockParams);
    const BookAnalyticsPage = (await import("@/app/admin/books/[bookId]/analytics/page"))
      .default;
    const result = await BookAnalyticsPage({ params: asyncParams });

    const { getByText } = render(result);
    expect(getByText("Book Analytics")).toBeInTheDocument();
  });
});
