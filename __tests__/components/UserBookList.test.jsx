import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import UserBookList from "@/components/UserBookList";

describe("UserBookList Component", () => {
  it("should render empty state when no books", () => {
    render(<UserBookList books={[]} />);
    expect(screen.getByText("No books available")).toBeInTheDocument();
  });

  it("should render list of books", () => {
    const books = [
      {
        _id: "1",
        title: "Book 1",
        author: "Author 1",
        mimeType: "application/pdf",
        fileSizeFormatted: "1 MB",
        createdAt: new Date().toISOString(),
      },
      {
        _id: "2",
        title: "Book 2",
        author: "Author 2",
        mimeType: "application/epub+zip",
        fileSizeFormatted: "2 MB",
        createdAt: new Date().toISOString(),
      },
    ];

    render(<UserBookList books={books} />);

    expect(screen.getByText("Book 1")).toBeInTheDocument();
    expect(screen.getByText("Book 2")).toBeInTheDocument();
    expect(screen.getByText("by Author 1")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument(); // Badge
    expect(screen.getByText("EPUB")).toBeInTheDocument(); // Badge
  });
});
