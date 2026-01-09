import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock BookReplaceModal
vi.mock("@/components/BookReplaceModal", () => ({
  default: ({ book, onClose, onSuccess }) => (
    <div data-testid="replace-modal">
      <span>Replace Modal for {book.title}</span>
      <button onClick={onClose}>Close Replace</button>
      <button onClick={() => onSuccess({ ...book, title: "Updated Book" })}>
        Confirm Replace
      </button>
    </div>
  ),
}));

// Mock BookDeleteModal
vi.mock("@/components/BookDeleteModal", () => ({
  default: ({ book, onClose, onConfirm, isDeleting }) => (
    <div data-testid="delete-modal">
      <span>Delete Modal for {book.title}</span>
      <button onClick={onClose}>Cancel Delete</button>
      <button onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? "Deleting..." : "Confirm Delete"}
      </button>
    </div>
  ),
}));

// Mock bookUtils
vi.mock("@/libs/bookUtils", () => ({
  getFileType: vi.fn((mimeType) =>
    mimeType === "application/pdf" ? "PDF" : "EPUB"
  ),
}));

// Mock global fetch
global.fetch = vi.fn();

import BookList from "@/components/BookList";
import { toast } from "react-hot-toast";

describe("BookList Component", () => {
  const mockBooks = [
    {
      _id: "book-1",
      title: "Test Book 1",
      author: "Author One",
      description: "Description for book 1",
      mimeType: "application/pdf",
      fileType: "PDF",
      fileSizeFormatted: "2.5 MB",
      filePath: "/files/book1.pdf",
      createdAt: "2024-01-15T10:00:00.000Z",
    },
    {
      _id: "book-2",
      title: "Test Book 2",
      author: "Author Two",
      description: "Description for book 2",
      mimeType: "application/epub+zip",
      fileType: "EPUB",
      fileSizeFormatted: "1.2 MB",
      filePath: "/files/book2.epub",
      createdAt: "2024-01-20T10:00:00.000Z",
    },
  ];

  const defaultProps = {
    books: mockBooks,
    onBooksChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render the book list header with count", () => {
      render(<BookList {...defaultProps} />);

      expect(screen.getByText("Your Books")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should render all books", () => {
      render(<BookList {...defaultProps} />);

      expect(screen.getByText("Test Book 1")).toBeInTheDocument();
      expect(screen.getByText("Test Book 2")).toBeInTheDocument();
    });

    it("should render book authors", () => {
      render(<BookList {...defaultProps} />);

      expect(screen.getByText("by Author One")).toBeInTheDocument();
      expect(screen.getByText("by Author Two")).toBeInTheDocument();
    });

    it("should render book descriptions", () => {
      render(<BookList {...defaultProps} />);

      expect(screen.getByText("Description for book 1")).toBeInTheDocument();
      expect(screen.getByText("Description for book 2")).toBeInTheDocument();
    });

    it("should render file type badges", () => {
      render(<BookList {...defaultProps} />);

      expect(screen.getByText("PDF")).toBeInTheDocument();
      expect(screen.getByText("EPUB")).toBeInTheDocument();
    });

    it("should render file size badges", () => {
      render(<BookList {...defaultProps} />);

      expect(screen.getByText("2.5 MB")).toBeInTheDocument();
      expect(screen.getByText("1.2 MB")).toBeInTheDocument();
    });

    it("should render formatted dates", () => {
      render(<BookList {...defaultProps} />);

      expect(screen.getByText(/Uploaded Jan 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Uploaded Jan 20, 2024/i)).toBeInTheDocument();
    });

    it("should render view/download links", () => {
      render(<BookList {...defaultProps} />);

      const links = screen.getAllByRole("link");
      expect(links[0]).toHaveAttribute("href", "/files/book1.pdf");
      expect(links[0]).toHaveAttribute("target", "_blank");
    });
  });

  describe("Empty State", () => {
    it("should render empty state when no books", () => {
      render(<BookList books={[]} onBooksChange={defaultProps.onBooksChange} />);

      expect(screen.getByText("No books uploaded yet")).toBeInTheDocument();
      expect(
        screen.getByText("Upload your first book using the form above")
      ).toBeInTheDocument();
    });

    it("should not render the book list container when empty", () => {
      render(<BookList books={[]} onBooksChange={defaultProps.onBooksChange} />);

      expect(screen.queryByText("Your Books")).not.toBeInTheDocument();
    });
  });

  describe("Delete Functionality", () => {
    it("should open delete modal when delete button is clicked", () => {
      render(<BookList {...defaultProps} />);

      // Find delete buttons (they have title="Delete")
      const deleteButtons = screen.getAllByTitle("Delete");
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
      expect(
        screen.getByText("Delete Modal for Test Book 1")
      ).toBeInTheDocument();
    });

    it("should close delete modal when cancel is clicked", () => {
      render(<BookList {...defaultProps} />);

      const deleteButtons = screen.getAllByTitle("Delete");
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTestId("delete-modal")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel Delete"));

      expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    });

    it("should delete book and show success toast on confirm", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<BookList {...defaultProps} />);

      const deleteButtons = screen.getAllByTitle("Delete");
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByText("Confirm Delete"));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/admin/books/book-1", {
          method: "DELETE",
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Book deleted successfully");
      });

      await waitFor(() => {
        expect(defaultProps.onBooksChange).toHaveBeenCalled();
      });
    });

    it("should show error toast on delete failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed to delete" }),
      });

      render(<BookList {...defaultProps} />);

      const deleteButtons = screen.getAllByTitle("Delete");
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByText("Confirm Delete"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete");
      });
    });
  });

  describe("Replace Functionality", () => {
    it("should open replace modal when replace button is clicked", () => {
      render(<BookList {...defaultProps} />);

      const replaceButtons = screen.getAllByTitle("Replace File");
      fireEvent.click(replaceButtons[0]);

      expect(screen.getByTestId("replace-modal")).toBeInTheDocument();
      expect(
        screen.getByText("Replace Modal for Test Book 1")
      ).toBeInTheDocument();
    });

    it("should close replace modal when close is clicked", () => {
      render(<BookList {...defaultProps} />);

      const replaceButtons = screen.getAllByTitle("Replace File");
      fireEvent.click(replaceButtons[0]);

      expect(screen.getByTestId("replace-modal")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Close Replace"));

      expect(screen.queryByTestId("replace-modal")).not.toBeInTheDocument();
    });

    it("should update book list on successful replace", () => {
      render(<BookList {...defaultProps} />);

      const replaceButtons = screen.getAllByTitle("Replace File");
      fireEvent.click(replaceButtons[0]);

      fireEvent.click(screen.getByText("Confirm Replace"));

      expect(defaultProps.onBooksChange).toHaveBeenCalled();
      expect(screen.queryByTestId("replace-modal")).not.toBeInTheDocument();
    });
  });

  describe("Props Update", () => {
    it("should update books when initialBooks prop changes", () => {
      const { rerender } = render(<BookList {...defaultProps} />);

      expect(screen.getByText("Test Book 1")).toBeInTheDocument();

      const newBooks = [
        {
          _id: "book-3",
          title: "New Book",
          author: "New Author",
          mimeType: "application/pdf",
          fileSizeFormatted: "3.0 MB",
          filePath: "/files/book3.pdf",
          createdAt: "2024-02-01T10:00:00.000Z",
        },
      ];

      rerender(
        <BookList books={newBooks} onBooksChange={defaultProps.onBooksChange} />
      );

      expect(screen.getByText("New Book")).toBeInTheDocument();
      expect(screen.queryByText("Test Book 1")).not.toBeInTheDocument();
    });
  });

  describe("Book without description", () => {
    it("should render book without description", () => {
      const bookWithoutDesc = [
        {
          _id: "book-no-desc",
          title: "Book Without Description",
          author: "Author",
          mimeType: "application/pdf",
          fileSizeFormatted: "1.0 MB",
          filePath: "/files/book.pdf",
          createdAt: "2024-01-01T10:00:00.000Z",
        },
      ];

      render(
        <BookList
          books={bookWithoutDesc}
          onBooksChange={defaultProps.onBooksChange}
        />
      );

      expect(screen.getByText("Book Without Description")).toBeInTheDocument();
      expect(screen.getByText("by Author")).toBeInTheDocument();
    });
  });

  describe("Date formatting", () => {
    it("should handle missing date gracefully", () => {
      const bookWithoutDate = [
        {
          _id: "book-no-date",
          title: "Book Without Date",
          author: "Author",
          mimeType: "application/pdf",
          fileSizeFormatted: "1.0 MB",
          filePath: "/files/book.pdf",
          createdAt: null,
        },
      ];

      render(
        <BookList
          books={bookWithoutDate}
          onBooksChange={defaultProps.onBooksChange}
        />
      );

      expect(screen.getByText(/Uploaded N\/A/i)).toBeInTheDocument();
    });
  });
});
