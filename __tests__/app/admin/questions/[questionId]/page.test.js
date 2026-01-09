import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock next/navigation
const mockNotFound = vi.fn();
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
  redirect: mockRedirect,
}));

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/libs/auth", () => ({
  auth: mockAuth,
}));

// Mock mongoose
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// Helper to create chainable query mock
const createChainableMock = (finalValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(finalValue),
  };
  chain.then = (resolve) => Promise.resolve(finalValue).then(resolve);
  chain.catch = (reject) => Promise.resolve(finalValue).catch(reject);
  return chain;
};

// Mock models
const mockQuestionFindById = vi.fn();
const mockQuestionFind = vi.fn();
const mockBookFindById = vi.fn();
const mockUserFindById = vi.fn();

vi.mock("@/models/Question", () => ({
  default: {
    findById: (...args) => mockQuestionFindById(...args),
    find: (...args) => mockQuestionFind(...args),
  },
}));

vi.mock("@/models/Book", () => ({
  default: {
    findById: (...args) => mockBookFindById(...args),
  },
}));

vi.mock("@/models/User", () => ({
  default: {
    findById: (...args) => mockUserFindById(...args),
  },
}));

// Mock QuestionDetailClient
vi.mock("@/app/admin/questions/[questionId]/QuestionDetailClient", () => ({
  default: ({ question, questionId, book }) => (
    <div data-testid="question-detail-client">Question: {questionId}</div>
  ),
}));

// Mock Link
vi.mock("next/link", () => ({
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

describe("Admin Question Detail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render question detail page", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockQuestion = {
      _id: "question-1",
      question: "Test question?",
      selectedText: "Selected text",
      pageNumber: 5,
      answer: "Test answer",
      isPublic: true,
      isAdminCreated: false,
      isEditedVersion: false,
      bookId: "book-1",
      userId: "user-1",
      createdAt: new Date("2024-01-01"),
      answeredAt: new Date("2024-01-02"),
      madePublicAt: new Date("2024-01-03"),
    };

    const mockBook = {
      _id: "book-1",
      title: "Test Book",
      author: "Test Author",
      uploadedBy: "admin-id",
    };

    const mockUser = {
      _id: "user-1",
      name: "Test User",
      email: "user@example.com",
      image: "image.jpg",
    };

    mockAuth.mockResolvedValue(mockSession);
    mockQuestionFindById.mockReturnValue(createChainableMock(mockQuestion));
    mockBookFindById.mockReturnValue(createChainableMock(mockBook));
    mockUserFindById.mockReturnValue(createChainableMock(mockUser));
    mockQuestionFind.mockReturnValue(createChainableMock([])); // No edited versions

    const AdminQuestionDetailPage = (
      await import("@/app/admin/questions/[questionId]/page")
    ).default;
    const result = await AdminQuestionDetailPage({
      params: Promise.resolve({ questionId: "question-1" }),
    });

    const { getByText, getByTestId } = render(result);
    expect(getByText("Back to Questions")).toBeInTheDocument();
    expect(getByText("Test question?")).toBeInTheDocument();
    expect(getByTestId("question-detail-client")).toBeInTheDocument();
  });

  it("should call notFound when question does not exist", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockQuestionFindById.mockReturnValue(createChainableMock(null));

    const AdminQuestionDetailPage = (
      await import("@/app/admin/questions/[questionId]/page")
    ).default;

    try {
      await AdminQuestionDetailPage({
        params: Promise.resolve({ questionId: "non-existent" }),
      });
    } catch (error) {
      // notFound throws
    }

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("should redirect when admin does not own the book", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockQuestion = {
      _id: "question-1",
      question: "Test question?",
      bookId: "book-1",
      createdAt: new Date(),
    };

    const mockBook = {
      _id: "book-1",
      title: "Test Book",
      uploadedBy: "other-admin-id", // Different admin
    };

    mockAuth.mockResolvedValue(mockSession);
    mockQuestionFindById.mockReturnValue(createChainableMock(mockQuestion));
    mockBookFindById.mockReturnValue(createChainableMock(mockBook));

    const AdminQuestionDetailPage = (
      await import("@/app/admin/questions/[questionId]/page")
    ).default;

    try {
      await AdminQuestionDetailPage({
        params: Promise.resolve({ questionId: "question-1" }),
      });
    } catch (error) {
      // redirect throws
    }

    expect(mockRedirect).toHaveBeenCalledWith("/admin/questions");
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

    const mockQuestion = {
      _id: "question-1",
      question: "Admin created question?",
      bookId: "book-1",
      userId: null,
      createdAt: new Date(),
    };

    const mockBook = {
      _id: "book-1",
      title: "Test Book",
      author: "Test Author",
      uploadedBy: "admin-id",
    };

    mockAuth.mockResolvedValue(mockSession);
    mockQuestionFindById.mockReturnValue(createChainableMock(mockQuestion));
    mockBookFindById.mockReturnValue(createChainableMock(mockBook));
    mockQuestionFind.mockReturnValue(createChainableMock([]));

    const AdminQuestionDetailPage = (
      await import("@/app/admin/questions/[questionId]/page")
    ).default;
    const result = await AdminQuestionDetailPage({
      params: Promise.resolve({ questionId: "question-1" }),
    });

    const { getByText } = render(result);
    expect(getByText("Admin created question?")).toBeInTheDocument();
  });

  it("should display edited versions when available", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockQuestion = {
      _id: "question-1",
      question: "Original question?",
      bookId: "book-1",
      createdAt: new Date(),
    };

    const mockBook = {
      _id: "book-1",
      title: "Test Book",
      author: "Test Author",
      uploadedBy: "admin-id",
    };

    const mockEditedVersions = [
      {
        _id: "edited-1",
        question: "Edited question?",
        answer: "Answer",
        isPublic: true,
        originalQuestionId: "question-1",
        createdAt: new Date(),
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockQuestionFindById.mockReturnValue(createChainableMock(mockQuestion));
    mockBookFindById.mockReturnValue(createChainableMock(mockBook));
    mockQuestionFind.mockReturnValue(createChainableMock(mockEditedVersions));

    const AdminQuestionDetailPage = (
      await import("@/app/admin/questions/[questionId]/page")
    ).default;
    const result = await AdminQuestionDetailPage({
      params: Promise.resolve({ questionId: "question-1" }),
    });

    const { getByText } = render(result);
    expect(getByText(/Edited Versions/)).toBeInTheDocument();
    expect(getByText("Edited question?")).toBeInTheDocument();
  });

  it("should format question data correctly", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockQuestion = {
      _id: "question-1",
      question: "Test question?",
      selectedText: "Selected text",
      pageNumber: 10,
      answer: "Answer",
      isPublic: true,
      isAdminCreated: true,
      isEditedVersion: false,
      originalQuestionId: null,
      bookId: "book-1",
      userId: null,
      createdAt: new Date("2024-01-01"),
      answeredAt: new Date("2024-01-02"),
      madePublicAt: new Date("2024-01-03"),
    };

    const mockBook = {
      _id: "book-1",
      title: "Test Book",
      author: "Test Author",
      uploadedBy: "admin-id",
    };

    mockAuth.mockResolvedValue(mockSession);
    mockQuestionFindById.mockReturnValue(createChainableMock(mockQuestion));
    mockBookFindById.mockReturnValue(createChainableMock(mockBook));
    mockQuestionFind.mockReturnValue(createChainableMock([]));

    const AdminQuestionDetailPage = (
      await import("@/app/admin/questions/[questionId]/page")
    ).default;
    const result = await AdminQuestionDetailPage({
      params: Promise.resolve({ questionId: "question-1" }),
    });

    const { getByText } = render(result);
    expect(getByText("Test question?")).toBeInTheDocument();
    expect(getByText(/Selected text/)).toBeInTheDocument();
    expect(getByText(/Page 10/)).toBeInTheDocument();
  });

  it("should display badges correctly", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockQuestion = {
      _id: "question-1",
      question: "Test question?",
      answer: "Answer",
      isPublic: true,
      isAdminCreated: true,
      isEditedVersion: false,
      bookId: "book-1",
      createdAt: new Date(),
    };

    const mockBook = {
      _id: "book-1",
      title: "Test Book",
      author: "Test Author",
      uploadedBy: "admin-id",
    };

    mockAuth.mockResolvedValue(mockSession);
    mockQuestionFindById.mockReturnValue(createChainableMock(mockQuestion));
    mockBookFindById.mockReturnValue(createChainableMock(mockBook));
    mockQuestionFind.mockReturnValue(createChainableMock([]));

    const AdminQuestionDetailPage = (
      await import("@/app/admin/questions/[questionId]/page")
    ).default;
    const result = await AdminQuestionDetailPage({
      params: Promise.resolve({ questionId: "question-1" }),
    });

    const { getByText } = render(result);
    expect(getByText("Public")).toBeInTheDocument();
    expect(getByText("Answered")).toBeInTheDocument();
    expect(getByText("Admin Created")).toBeInTheDocument();
  });
});
