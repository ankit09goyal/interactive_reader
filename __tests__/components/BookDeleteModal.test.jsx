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

// Mock bookUtils
vi.mock("@/libs/bookUtils", () => ({
  getFileType: vi.fn((mimeType) => (mimeType === "application/pdf" ? "PDF" : "EPUB")),
}));

import BookDeleteModal from "@/components/BookDeleteModal";

describe("BookDeleteModal Component", () => {
  const mockBook = {
    _id: "book-123",
    title: "Test Book Title",
    author: "Test Author",
    mimeType: "application/pdf",
    fileType: "PDF",
    fileSizeFormatted: "2.5 MB",
  };

  const defaultProps = {
    book: mockBook,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    isDeleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the delete modal", () => {
    render(<BookDeleteModal {...defaultProps} />);

    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
  });

  it("should pass correct title to DeleteModal", () => {
    render(<BookDeleteModal {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Delete Book");
  });

  it("should display book title in preview", () => {
    render(<BookDeleteModal {...defaultProps} />);

    expect(screen.getByText("Test Book Title")).toBeInTheDocument();
  });

  it("should display book author in preview", () => {
    render(<BookDeleteModal {...defaultProps} />);

    expect(screen.getByText("by Test Author")).toBeInTheDocument();
  });

  it("should display file type badge", () => {
    render(<BookDeleteModal {...defaultProps} />);

    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("should display formatted file size badge", () => {
    render(<BookDeleteModal {...defaultProps} />);

    expect(screen.getByText("2.5 MB")).toBeInTheDocument();
  });

  it("should use getFileType when fileType is not provided", () => {
    const bookWithoutFileType = {
      ...mockBook,
      fileType: undefined,
    };

    render(<BookDeleteModal {...defaultProps} book={bookWithoutFileType} />);

    // getFileType mock returns "PDF" for application/pdf
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("should show EPUB for non-PDF files", () => {
    const epubBook = {
      ...mockBook,
      mimeType: "application/epub+zip",
      fileType: undefined,
    };

    render(<BookDeleteModal {...defaultProps} book={epubBook} />);

    expect(screen.getByText("EPUB")).toBeInTheDocument();
  });

  it("should call onClose when cancel is clicked", () => {
    render(<BookDeleteModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should call onConfirm when delete is clicked", () => {
    render(<BookDeleteModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /delete book/i }));

    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it("should show loading state when deleting", () => {
    render(<BookDeleteModal {...defaultProps} isDeleting={true} />);

    expect(screen.getByText("Deleting...")).toBeInTheDocument();
  });

  it("should disable buttons when deleting", () => {
    render(<BookDeleteModal {...defaultProps} isDeleting={true} />);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /deleting/i })).toBeDisabled();
  });

  it("should display correct warning message", () => {
    render(<BookDeleteModal {...defaultProps} />);

    expect(screen.getByTestId("warning-message")).toHaveTextContent(
      "Are you sure you want to delete this book? This will permanently remove the book and its file from the system."
    );
  });
});
