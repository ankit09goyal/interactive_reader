import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

// Mock apiClient
const mockApiGet = vi.fn();
vi.mock("@/libs/api", () => ({
  default: {
    get: (...args) => mockApiGet(...args),
  },
}));

// Mock AdminCreateQuestionModal
vi.mock("@/components/AdminCreateQuestionModal", () => ({
  default: ({ isOpen, onClose, books, onQuestionCreated }) =>
    isOpen ? (
      <div data-testid="create-question-modal">
        <button onClick={onClose}>Close</button>
        <button
          onClick={() =>
            onQuestionCreated({
              _id: "new-q",
              question: "New question?",
              bookId: books[0]?.id,
            })
          }
        >
          Create Question
        </button>
      </div>
    ) : null,
}));

// Import after mocks
import AdminQuestionsClient from "@/app/admin/questions/AdminQuestionsClient";

describe("AdminQuestionsClient Component", () => {
  const mockBooks = [
    { id: "book-1", title: "Book 1" },
    { id: "book-2", title: "Book 2" },
  ];

  const mockQuestions = [
    {
      _id: "q1",
      question: "Question 1?",
      answer: "Answer 1",
      isPublic: true,
      book: { id: "book-1", title: "Book 1" },
      user: { id: "user-1", name: "User 1" },
      createdAt: new Date().toISOString(),
    },
    {
      _id: "q2",
      question: "Question 2?",
      answer: null,
      isPublic: false,
      book: { id: "book-2", title: "Book 2" },
      user: null,
      createdAt: new Date().toISOString(),
    },
  ];

  const mockPagination = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 2,
    hasNextPage: false,
    hasPrevPage: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render questions list", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    expect(screen.getByText("Question 1?")).toBeInTheDocument();
    expect(screen.getByText("Question 2?")).toBeInTheDocument();
  });

  it("should render filters", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("Book:")).toBeInTheDocument();
  });

  it("should filter by answered status", async () => {
    const answeredQuestions = [mockQuestions[0]]; // Only q1 is answered
    mockApiGet.mockResolvedValueOnce({
      questions: answeredQuestions,
      pagination: { ...mockPagination, totalItems: 1 },
    });

    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    const statusFilter = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusFilter, { target: { value: "answered" } });

    await waitFor(() => {
      expect(screen.getByText("Question 1?")).toBeInTheDocument();
    });
    expect(screen.queryByText("Question 2?")).not.toBeInTheDocument();
  });

  it("should filter by unanswered status", async () => {
    const unansweredQuestions = [mockQuestions[1]]; // Only q2 is unanswered
    mockApiGet.mockResolvedValueOnce({
      questions: unansweredQuestions,
      pagination: { ...mockPagination, totalItems: 1 },
    });

    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    const statusFilter = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusFilter, { target: { value: "unanswered" } });

    await waitFor(() => {
      expect(screen.getByText("Question 2?")).toBeInTheDocument();
    });
    expect(screen.queryByText("Question 1?")).not.toBeInTheDocument();
  });

  it("should filter by public status", async () => {
    const publicQuestions = [mockQuestions[0]]; // Only q1 is public
    mockApiGet.mockResolvedValueOnce({
      questions: publicQuestions,
      pagination: { ...mockPagination, totalItems: 1 },
    });

    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    const statusFilter = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusFilter, { target: { value: "public" } });

    await waitFor(() => {
      expect(screen.getByText("Question 1?")).toBeInTheDocument();
    });
    expect(screen.queryByText("Question 2?")).not.toBeInTheDocument();
  });

  it("should filter by book", async () => {
    const book1Questions = [mockQuestions[0]]; // Only q1 is in book-1
    mockApiGet.mockResolvedValueOnce({
      questions: book1Questions,
      pagination: { ...mockPagination, totalItems: 1 },
    });

    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    const bookFilter = screen.getAllByRole("combobox")[1];
    fireEvent.change(bookFilter, { target: { value: "book-1" } });

    await waitFor(() => {
      expect(screen.getByText("Question 1?")).toBeInTheDocument();
    });
    expect(screen.queryByText("Question 2?")).not.toBeInTheDocument();
  });

  it("should show create modal when button is clicked", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    const createButton = screen.getByText("Create Public Q&A");
    fireEvent.click(createButton);

    expect(screen.getByTestId("create-question-modal")).toBeInTheDocument();
  });

  it("should close create modal", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    fireEvent.click(screen.getByText("Create Public Q&A"));
    expect(screen.getByTestId("create-question-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close"));
    expect(
      screen.queryByTestId("create-question-modal")
    ).not.toBeInTheDocument();
  });

  it("should add new question to list when created", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    fireEvent.click(screen.getByText("Create Public Q&A"));
    fireEvent.click(screen.getByText("Create Question"));

    expect(screen.getByText("New question?")).toBeInTheDocument();
    expect(screen.getByText("Question 1?")).toBeInTheDocument();
    expect(screen.getByText("Question 2?")).toBeInTheDocument();
  });

  it("should show empty state when no questions match filter", async () => {
    // First filter returns q1 (answered), second filter returns empty
    mockApiGet
      .mockResolvedValueOnce({
        questions: [mockQuestions[0]],
        pagination: { ...mockPagination, totalItems: 1 },
      })
      .mockResolvedValueOnce({
        questions: [],
        pagination: { ...mockPagination, totalItems: 0 },
      });

    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    const statusFilter = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusFilter, { target: { value: "answered" } });

    await waitFor(() => {
      expect(screen.getByText("Question 1?")).toBeInTheDocument();
    });

    const bookFilter = screen.getAllByRole("combobox")[1];
    fireEvent.change(bookFilter, { target: { value: "book-2" } });

    await waitFor(() => {
      expect(screen.getByText(/No questions found/)).toBeInTheDocument();
    });
  });

  it("should render question badges correctly", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    // q1 has isPublic=true and answer, q2 has no answer
    expect(screen.getAllByText("Public").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Answered").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Unanswered").length).toBeGreaterThanOrEqual(1);
  });

  it("should render question links with correct hrefs", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    const links = screen.getAllByRole("link");
    const questionLinks = links.filter((link) =>
      link.href.includes("/admin/questions/")
    );

    expect(questionLinks[0]).toHaveAttribute("href", "/admin/questions/q1");
    expect(questionLinks[1]).toHaveAttribute("href", "/admin/questions/q2");
  });

  it("should display selected text preview when available", () => {
    const questionsWithText = [
      {
        _id: "q1",
        question: "Question?",
        selectedText: "This is selected text",
        pageNumber: 5,
        book: { id: "book-1", title: "Book 1" },
        createdAt: new Date().toISOString(),
      },
    ];

    render(
      <AdminQuestionsClient
        initialQuestions={questionsWithText}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    expect(screen.getByText(/This is selected text/)).toBeInTheDocument();
    expect(screen.getByText(/Page 5/)).toBeInTheDocument();
  });

  it("should display answer preview when available", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    // The answer is displayed as "A:" in a span followed by the answer text
    expect(screen.getByText("A:")).toBeInTheDocument();
    expect(screen.getByText("Answer 1")).toBeInTheDocument();
  });

  it("should display user info when available", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    expect(screen.getByText(/From: User 1/)).toBeInTheDocument();
  });

  it("should display admin created label when user is null", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
        initialPagination={mockPagination}
      />
    );

    expect(screen.getByText(/Admin created/)).toBeInTheDocument();
  });
});
