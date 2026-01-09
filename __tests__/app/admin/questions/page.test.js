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
const mockQuestionFind = vi.fn();
const mockBookFind = vi.fn();
const mockUserFind = vi.fn();

vi.mock("@/models/Question", () => ({
  default: {
    find: mockQuestionFind,
  },
}));

vi.mock("@/models/Book", () => ({
  default: {
    find: mockBookFind,
  },
}));

vi.mock("@/models/User", () => ({
  default: {
    find: mockUserFind,
  },
}));

// Mock AdminQuestionsClient
vi.mock("@/app/admin/questions/AdminQuestionsClient", () => ({
  default: ({ initialQuestions, books }) => (
    <div data-testid="admin-questions-client">
      <div>Questions: {initialQuestions.length}</div>
      <div>Books: {books.length}</div>
    </div>
  ),
}));

// Helper to create chainable query mock
const createChainableMock = (finalValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(finalValue),
  };
  chain.then = (resolve) => Promise.resolve(finalValue).then(resolve);
  chain.catch = (reject) => Promise.resolve(finalValue).catch(reject);
  return chain;
};

describe("Admin Questions Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockQuestionFind.mockReturnValue(createChainableMock([]));
    mockUserFind.mockReturnValue(createChainableMock([]));
  });

  it("should render questions page with stats", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockBooks = [
      {
        _id: "book-1",
        title: "Test Book 1",
      },
    ];

    const mockQuestions = [
      {
        _id: "question-1",
        question: "What is this?",
        bookId: "book-1",
        userId: "user-1",
        answer: "This is an answer",
        isPublic: true,
        createdAt: new Date(),
      },
      {
        _id: "question-2",
        question: "Another question?",
        bookId: "book-1",
        userId: null,
        answer: null,
        isPublic: false,
        createdAt: new Date(),
      },
    ];

    const mockUsers = [
      {
        _id: "user-1",
        name: "Test User",
        email: "user@example.com",
        image: null,
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockQuestionFind.mockReturnValue(createChainableMock(mockQuestions));
    mockUserFind.mockReturnValue(createChainableMock(mockUsers));

    const AdminQuestionsPage = (await import("@/app/admin/questions/page"))
      .default;
    const result = await AdminQuestionsPage();

    const { getByText, getByTestId } = render(result);
    expect(getByText("Questions & Answers")).toBeInTheDocument();
    expect(getByText(/Manage questions from your readers/)).toBeInTheDocument();
    expect(getByText("Total:")).toBeInTheDocument();
    expect(getByText("2")).toBeInTheDocument(); // Total questions
    expect(getByTestId("admin-questions-client")).toBeInTheDocument();
  });

  it("should calculate unanswered count correctly", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockBooks = [{ _id: "book-1", title: "Test Book" }];
    const mockQuestions = [
      {
        _id: "q1",
        question: "Question 1",
        bookId: "book-1",
        answer: "Answer",
        createdAt: new Date(),
      },
      {
        _id: "q2",
        question: "Question 2",
        bookId: "book-1",
        answer: null,
        createdAt: new Date(),
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockQuestionFind.mockReturnValue(createChainableMock(mockQuestions));
    mockUserFind.mockReturnValue(createChainableMock([]));

    const AdminQuestionsPage = (await import("@/app/admin/questions/page"))
      .default;
    const result = await AdminQuestionsPage();

    const { getByText } = render(result);
    expect(getByText(/Unanswered:/)).toBeInTheDocument();
    expect(getByText("1")).toBeInTheDocument(); // 1 unanswered
  });

  it("should calculate public count correctly", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockBooks = [{ _id: "book-1", title: "Test Book" }];
    const mockQuestions = [
      {
        _id: "q1",
        question: "Question 1",
        bookId: "book-1",
        isPublic: true,
        createdAt: new Date(),
      },
      {
        _id: "q2",
        question: "Question 2",
        bookId: "book-1",
        isPublic: false,
        createdAt: new Date(),
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockQuestionFind.mockReturnValue(createChainableMock(mockQuestions));
    mockUserFind.mockReturnValue(createChainableMock([]));

    const AdminQuestionsPage = (await import("@/app/admin/questions/page"))
      .default;
    const result = await AdminQuestionsPage();

    const { getByText } = render(result);
    expect(getByText(/Public:/)).toBeInTheDocument();
    expect(getByText("1")).toBeInTheDocument(); // 1 public
  });

  it("should fetch questions for admin's books only", async () => {
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

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockQuestionFind.mockReturnValue(createChainableMock([]));
    mockUserFind.mockReturnValue(createChainableMock([]));

    const AdminQuestionsPage = (await import("@/app/admin/questions/page"))
      .default;
    await AdminQuestionsPage();

    expect(mockBookFind).toHaveBeenCalledWith({ uploadedBy: "admin-id" });
    expect(mockQuestionFind).toHaveBeenCalledWith({
      bookId: { $in: ["book-1", "book-2"] },
    });
  });

  it("should limit questions to 100", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    const chainMock = createChainableMock([]);
    mockQuestionFind.mockReturnValue(chainMock);
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserFind.mockReturnValue(createChainableMock([]));

    const AdminQuestionsPage = (await import("@/app/admin/questions/page"))
      .default;
    await AdminQuestionsPage();

    expect(chainMock.limit).toHaveBeenCalledWith(100);
  });

  it("should format questions with user and book info", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockBooks = [
      {
        _id: "book-1",
        title: "Test Book",
      },
    ];

    const mockQuestions = [
      {
        _id: "question-1",
        question: "Test question?",
        selectedText: "Selected text",
        pageNumber: 5,
        answer: "Answer",
        isPublic: true,
        isAdminCreated: false,
        isEditedVersion: false,
        bookId: "book-1",
        userId: "user-1",
        createdAt: new Date("2024-01-01"),
        answeredAt: new Date("2024-01-02"),
      },
    ];

    const mockUsers = [
      {
        _id: "user-1",
        name: "Test User",
        email: "user@example.com",
        image: "image.jpg",
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockQuestionFind.mockReturnValue(createChainableMock(mockQuestions));
    mockUserFind.mockReturnValue(createChainableMock(mockUsers));

    const AdminQuestionsPage = (await import("@/app/admin/questions/page"))
      .default;
    const result = await AdminQuestionsPage();

    const { getByTestId } = render(result);
    expect(getByTestId("admin-questions-client")).toBeInTheDocument();
  });

  it("should handle questions without users", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockBooks = [{ _id: "book-1", title: "Test Book" }];
    const mockQuestions = [
      {
        _id: "question-1",
        question: "Admin created question?",
        bookId: "book-1",
        userId: null,
        createdAt: new Date(),
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockQuestionFind.mockReturnValue(createChainableMock(mockQuestions));
    mockUserFind.mockReturnValue(createChainableMock([]));

    const AdminQuestionsPage = (await import("@/app/admin/questions/page"))
      .default;
    const result = await AdminQuestionsPage();

    const { getByTestId } = render(result);
    expect(getByTestId("admin-questions-client")).toBeInTheDocument();
  });
});
