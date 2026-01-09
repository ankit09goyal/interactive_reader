import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AdminCreateQuestionModal from "@/components/AdminCreateQuestionModal";
import apiClient from "@/libs/api";

// Mock apiClient
vi.mock("@/libs/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("AdminCreateQuestionModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    bookId: "book-1",
    selectedText: "Sample text",
    pageNumber: 5,
    onQuestionCreated: vi.fn(),
  };

  it("should not render if not open", () => {
    const { container } = render(
      <AdminCreateQuestionModal {...defaultProps} isOpen={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("should render form with initial values", () => {
    render(<AdminCreateQuestionModal {...defaultProps} />);
    expect(screen.getByText("Create Public Q&A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sample text")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  });

  it("should submit form successfully", async () => {
    apiClient.post.mockResolvedValue({ question: { id: "q1" } });

    render(<AdminCreateQuestionModal {...defaultProps} />);

    // Fill question
    fireEvent.change(screen.getByPlaceholderText("Enter the question..."), {
      target: { value: "What is this?" },
    });

    // Submit
    fireEvent.click(screen.getByText("Create Q&A"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/admin/questions/create",
        expect.objectContaining({
          bookId: "book-1",
          question: "What is this?",
          selectedText: "Sample text",
          pageNumber: 5,
          isPublic: true,
        })
      );
      expect(defaultProps.onQuestionCreated).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it("should handle error on submit", async () => {
    apiClient.post.mockRejectedValue(new Error("Failed"));

    render(<AdminCreateQuestionModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("Enter the question..."), {
      target: { value: "What is this?" },
    });

    fireEvent.click(screen.getByText("Create Q&A"));

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
  });
});
