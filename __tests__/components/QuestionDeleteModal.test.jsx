import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock the DeleteModal component
vi.mock("@/components/DeleteModal", () => ({
  default: ({ title, itemPreview, warningMessage, confirmButtonText, onClose, onConfirm, isDeleting }) => (
    <div data-testid="delete-modal">
      <h3>{title}</h3>
      <div data-testid="item-preview">{itemPreview}</div>
      <p data-testid="warning-message">{warningMessage}</p>
      <button onClick={onClose} disabled={isDeleting}>Cancel</button>
      <button onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? "Deleting..." : confirmButtonText}
      </button>
    </div>
  ),
}));

import QuestionDeleteModal from "@/components/QuestionDeleteModal";

describe("QuestionDeleteModal Component", () => {
  const mockQuestion = {
    _id: "question-123",
    question: "What is the meaning of this passage?",
    selectedText: "Some selected text from the book that the question is about.",
    pageNumber: 42,
  };

  const defaultProps = {
    question: mockQuestion,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    isDeleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the delete modal", () => {
    render(<QuestionDeleteModal {...defaultProps} />);

    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
  });

  it("should pass correct title to DeleteModal", () => {
    render(<QuestionDeleteModal {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Delete Question");
  });

  it("should display the question text in preview", () => {
    render(<QuestionDeleteModal {...defaultProps} />);

    expect(screen.getByText("Question:")).toBeInTheDocument();
    expect(
      screen.getByText("What is the meaning of this passage?")
    ).toBeInTheDocument();
  });

  it("should display selected text when provided", () => {
    render(<QuestionDeleteModal {...defaultProps} />);

    expect(screen.getByText("Selected Text:")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Some selected text from the book that the question is about/
      )
    ).toBeInTheDocument();
  });

  it("should display page number when provided", () => {
    render(<QuestionDeleteModal {...defaultProps} />);

    expect(screen.getByText("Page 42")).toBeInTheDocument();
  });

  it("should not display selected text section when not provided", () => {
    const questionWithoutText = {
      ...mockQuestion,
      selectedText: null,
    };

    render(
      <QuestionDeleteModal {...defaultProps} question={questionWithoutText} />
    );

    expect(screen.queryByText("Selected Text:")).not.toBeInTheDocument();
  });

  it("should not display page number section when not provided", () => {
    const questionWithoutPage = {
      ...mockQuestion,
      pageNumber: null,
    };

    render(
      <QuestionDeleteModal {...defaultProps} question={questionWithoutPage} />
    );

    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it("should call onClose when cancel is clicked", () => {
    render(<QuestionDeleteModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should call onConfirm when delete is clicked", () => {
    render(<QuestionDeleteModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /delete question/i }));

    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it("should show loading state when deleting", () => {
    render(<QuestionDeleteModal {...defaultProps} isDeleting={true} />);

    expect(screen.getByText("Deleting...")).toBeInTheDocument();
  });

  it("should disable buttons when deleting", () => {
    render(<QuestionDeleteModal {...defaultProps} isDeleting={true} />);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /deleting/i })).toBeDisabled();
  });

  it("should display correct warning message", () => {
    render(<QuestionDeleteModal {...defaultProps} />);

    expect(screen.getByTestId("warning-message")).toHaveTextContent(
      "Are you sure you want to delete this question? This action cannot be undone and will permanently remove the question and any associated answers."
    );
  });

  it("should handle question with minimal data", () => {
    const minimalQuestion = {
      _id: "question-minimal",
      question: "A simple question?",
    };

    render(
      <QuestionDeleteModal {...defaultProps} question={minimalQuestion} />
    );

    expect(screen.getByText("A simple question?")).toBeInTheDocument();
    expect(screen.queryByText("Selected Text:")).not.toBeInTheDocument();
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });
});
