import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }) => <a href={href}>{children}</a>,
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render questions list", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
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
      />
    );

    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("Book:")).toBeInTheDocument();
  });

  it("should filter by answered status", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
      />
    );

    const statusFilter = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusFilter, { target: { value: "answered" } });

    expect(screen.getByText("Question 1?")).toBeInTheDocument();
    expect(screen.queryByText("Question 2?")).not.toBeInTheDocument();
  });

  it("should filter by unanswered status", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
      />
    );

    const statusFilter = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusFilter, { target: { value: "unanswered" } });

    expect(screen.queryByText("Question 1?")).not.toBeInTheDocument();
    expect(screen.getByText("Question 2?")).toBeInTheDocument();
  });

  it("should filter by public status", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
      />
    );

    const statusFilter = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusFilter, { target: { value: "public" } });

    expect(screen.getByText("Question 1?")).toBeInTheDocument();
    expect(screen.queryByText("Question 2?")).not.toBeInTheDocument();
  });

  it("should filter by book", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
      />
    );

    const bookFilter = screen.getAllByRole("combobox")[1];
    fireEvent.change(bookFilter, { target: { value: "book-1" } });

    expect(screen.getByText("Question 1?")).toBeInTheDocument();
    expect(screen.queryByText("Question 2?")).not.toBeInTheDocument();
  });

  it("should show create modal when button is clicked", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
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
      />
    );

    fireEvent.click(screen.getByText("Create Public Q&A"));
    fireEvent.click(screen.getByText("Create Question"));

    expect(screen.getByText("New question?")).toBeInTheDocument();
    expect(screen.getByText("Question 1?")).toBeInTheDocument();
    expect(screen.getByText("Question 2?")).toBeInTheDocument();
  });

  it("should show empty state when no questions match filter", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
      />
    );

    const statusFilter = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusFilter, { target: { value: "answered" } });

    const bookFilter = screen.getAllByRole("combobox")[1];
    fireEvent.change(bookFilter, { target: { value: "book-2" } });

    expect(screen.getByText(/No questions found/)).toBeInTheDocument();
  });

  it("should render question badges correctly", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
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
      />
    );

    expect(screen.getByText(/From: User 1/)).toBeInTheDocument();
  });

  it("should display admin created label when user is null", () => {
    render(
      <AdminQuestionsClient
        initialQuestions={mockQuestions}
        books={mockBooks}
      />
    );

    expect(screen.getByText(/Admin created/)).toBeInTheDocument();
  });
});
