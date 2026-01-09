import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/libs/auth", () => ({
  auth: mockAuth,
}));

// Mock mongoose
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// Mock models
const mockBookFind = vi.fn();
vi.mock("@/models/Book", () => ({
  default: {
    find: mockBookFind,
  },
}));

// Mock bookUtils
vi.mock("@/libs/bookUtils", () => ({
  transformBook: vi.fn((book) => ({
    ...book,
    _id: book._id?.toString() || book._id,
    fileSizeFormatted: "1 MB",
    fileType: "PDF",
  })),
}));

// Mock AdminBooksClient
vi.mock("@/app/admin/AdminBooksClient", () => ({
  default: ({ initialBooks }) => (
    <div data-testid="admin-books-client">Books: {initialBooks.length}</div>
  ),
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

describe("Admin Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookFind.mockReturnValue(createChainableMock([]));
  });

  it("should render admin dashboard with books", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockBooks = [
      {
        _id: "book-1",
        title: "Test Book 1",
        author: "Author 1",
        fileName: "book1.pdf",
        filePath: "/path/to/book1.pdf",
        fileSize: 1024000,
        mimeType: "application/pdf",
        createdAt: new Date(),
      },
      {
        _id: "book-2",
        title: "Test Book 2",
        author: "Author 2",
        fileName: "book2.epub",
        filePath: "/path/to/book2.epub",
        fileSize: 2048000,
        mimeType: "application/epub+zip",
        createdAt: new Date(),
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));

    const AdminDashboard = (await import("@/app/admin/page")).default;
    const result = await AdminDashboard();

    const { getByText, getByTestId } = render(result);
    expect(getByText("Admin Dashboard")).toBeInTheDocument();
    expect(getByText(/Manage your books/)).toBeInTheDocument();
    expect(getByTestId("admin-books-client")).toBeInTheDocument();
    expect(getByText("Books: 2")).toBeInTheDocument();
  });

  it("should fetch books for the authenticated admin", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockBooks = [
      {
        _id: "book-1",
        title: "Test Book",
        author: "Test Author",
        fileName: "test.pdf",
        filePath: "/path/to/test.pdf",
        fileSize: 1024000,
        mimeType: "application/pdf",
        createdAt: new Date(),
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));

    const AdminDashboard = (await import("@/app/admin/page")).default;
    await AdminDashboard();

    expect(mockBookFind).toHaveBeenCalledWith({ uploadedBy: "admin-id" });
  });

  it("should handle empty books list", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock([]));

    const AdminDashboard = (await import("@/app/admin/page")).default;
    const result = await AdminDashboard();

    const { getByText, getByTestId } = render(result);
    expect(getByText("Admin Dashboard")).toBeInTheDocument();
    expect(getByTestId("admin-books-client")).toBeInTheDocument();
    expect(getByText("Books: 0")).toBeInTheDocument();
  });

  it("should sort books by createdAt descending", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    const chainMock = createChainableMock([]);
    mockBookFind.mockReturnValue(chainMock);

    const AdminDashboard = (await import("@/app/admin/page")).default;
    await AdminDashboard();

    expect(chainMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it("should select correct book fields", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    const chainMock = createChainableMock([]);
    mockBookFind.mockReturnValue(chainMock);

    const AdminDashboard = (await import("@/app/admin/page")).default;
    await AdminDashboard();

    expect(chainMock.select).toHaveBeenCalledWith(
      "title author description fileName filePath fileSize mimeType createdAt"
    );
  });
});
