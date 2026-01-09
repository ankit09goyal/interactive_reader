import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock BookUploadForm
vi.mock("@/components/BookUploadForm", () => ({
  default: ({ onUploadSuccess, onCancel }) => (
    <div data-testid="book-upload-form">
      <button
        onClick={() => onUploadSuccess({ _id: "new-book", title: "New Book" })}
      >
        Upload Success
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock BookList
vi.mock("@/components/BookList", () => ({
  default: ({ books, onBooksChange }) => (
    <div data-testid="book-list">
      <div>Books: {books.length}</div>
      <button onClick={() => onBooksChange([])}>Clear Books</button>
    </div>
  ),
}));

// Import after mocks
import AdminBooksClient from "@/app/admin/AdminBooksClient";

describe("AdminBooksClient Component", () => {
  const mockInitialBooks = [
    { _id: "1", title: "Book 1" },
    { _id: "2", title: "Book 2" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render upload button initially", () => {
    render(<AdminBooksClient initialBooks={mockInitialBooks} />);

    expect(screen.getByText("Upload New Book")).toBeInTheDocument();
    expect(screen.queryByTestId("book-upload-form")).not.toBeInTheDocument();
  });

  it("should show upload form when upload button is clicked", () => {
    render(<AdminBooksClient initialBooks={mockInitialBooks} />);

    const uploadButton = screen.getByText("Upload New Book");
    fireEvent.click(uploadButton);

    expect(screen.getByTestId("book-upload-form")).toBeInTheDocument();
    expect(screen.queryByText("Upload New Book")).not.toBeInTheDocument();
  });

  it("should hide upload form when cancel is clicked", () => {
    render(<AdminBooksClient initialBooks={mockInitialBooks} />);

    // Show form
    fireEvent.click(screen.getByText("Upload New Book"));
    expect(screen.getByTestId("book-upload-form")).toBeInTheDocument();

    // Cancel
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("book-upload-form")).not.toBeInTheDocument();
    expect(screen.getByText("Upload New Book")).toBeInTheDocument();
  });

  it("should add new book to list on upload success", () => {
    render(<AdminBooksClient initialBooks={mockInitialBooks} />);

    // Show form
    fireEvent.click(screen.getByText("Upload New Book"));

    // Upload success
    fireEvent.click(screen.getByText("Upload Success"));

    expect(screen.queryByTestId("book-upload-form")).not.toBeInTheDocument();
    expect(screen.getByText("Books: 3")).toBeInTheDocument(); // 2 initial + 1 new
  });

  it("should hide upload form after successful upload", () => {
    render(<AdminBooksClient initialBooks={mockInitialBooks} />);

    // Show form
    fireEvent.click(screen.getByText("Upload New Book"));

    // Upload success
    fireEvent.click(screen.getByText("Upload Success"));

    expect(screen.queryByTestId("book-upload-form")).not.toBeInTheDocument();
  });

  it("should render BookList with initial books", () => {
    render(<AdminBooksClient initialBooks={mockInitialBooks} />);

    expect(screen.getByTestId("book-list")).toBeInTheDocument();
    expect(screen.getByText("Books: 2")).toBeInTheDocument();
  });

  it("should update books list when BookList calls onBooksChange", () => {
    render(<AdminBooksClient initialBooks={mockInitialBooks} />);

    expect(screen.getByText("Books: 2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clear Books"));

    expect(screen.getByText("Books: 0")).toBeInTheDocument();
  });

  it("should handle empty initial books", () => {
    render(<AdminBooksClient initialBooks={[]} />);

    expect(screen.getByText("Upload New Book")).toBeInTheDocument();
    expect(screen.getByText("Books: 0")).toBeInTheDocument();
  });
});
