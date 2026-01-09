import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ReaderPage from "@/app/reader/[bookId]/page";
import { auth } from "@/libs/auth";
import UserBookAccess from "@/models/UserBookAccess";
import Book from "@/models/Book";
import User from "@/models/User";

// Mock dependencies
vi.mock("@/libs/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/models/UserBookAccess", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/models/Book", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("@/models/User", () => ({
  default: {
    findById: vi.fn(),
  },
}));

// Mock child components to avoid deep rendering issues
vi.mock("@/components/PDFReader", () => ({
  default: () => <div data-testid="pdf-reader">PDF Reader</div>,
}));

vi.mock("@/components/ePubReader", () => ({
  default: () => <div data-testid="epub-reader">ePub Reader</div>,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

describe("ReaderPage", () => {
  const mockSession = { user: { id: "user-1" } };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(mockSession);
  });

  it("should show access denied if no access", async () => {
    UserBookAccess.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const result = await ReaderPage({
      params: Promise.resolve({ bookId: "book-1" }),
    });
    render(result);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("should render PDF reader for PDF book", async () => {
    UserBookAccess.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({}),
    });

    Book.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "book-1",
          title: "Test Book",
          mimeType: "application/pdf",
          filePath: "/book.pdf",
        }),
      }),
    });

    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ role: "user" }),
      }),
    });

    const result = await ReaderPage({
      params: Promise.resolve({ bookId: "book-1" }),
    });
    render(result);

    expect(screen.getByTestId("pdf-reader")).toBeInTheDocument();
  });

  it("should render ePub reader for ePub book", async () => {
    UserBookAccess.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({}),
    });

    Book.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "book-1",
          title: "Test Book",
          mimeType: "application/epub+zip",
          filePath: "/book.epub",
        }),
      }),
    });

    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ role: "user" }),
      }),
    });

    const result = await ReaderPage({
      params: Promise.resolve({ bookId: "book-1" }),
    });
    render(result);

    expect(screen.getByTestId("epub-reader")).toBeInTheDocument();
  });
});
