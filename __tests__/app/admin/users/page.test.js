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
const mockUserFind = vi.fn();
const mockBookFind = vi.fn();
const mockUserBookAccessFind = vi.fn();

vi.mock("@/models/User", () => ({
  default: {
    find: mockUserFind,
  },
}));

vi.mock("@/models/Book", () => ({
  default: {
    find: mockBookFind,
  },
}));

vi.mock("@/models/UserBookAccess", () => ({
  default: {
    find: mockUserBookAccessFind,
  },
}));

// Mock UserTable
vi.mock("@/components/UserTable", () => ({
  default: ({ users }) => (
    <div data-testid="user-table">
      <div>Users: {users.length}</div>
    </div>
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

describe("Admin Users Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFind.mockReturnValue(createChainableMock([]));
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessFind.mockReturnValue(createChainableMock([]));
  });

  it("should render users page with stats", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockUsers = [
      {
        _id: "user-1",
        name: "User 1",
        email: "user1@example.com",
        role: "user",
        hasAccess: true,
        createdAt: new Date(),
      },
      {
        _id: "user-2",
        name: "User 2",
        email: "user2@example.com",
        role: "user",
        hasAccess: false,
        createdAt: new Date(),
      },
    ];

    const mockBooks = [
      { _id: "book-1", title: "Book 1" },
      { _id: "book-2", title: "Book 2" },
    ];

    const mockAccess = [
      { userId: "user-1", bookId: "book-1" },
      { userId: "user-1", bookId: "book-2" },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockUserFind.mockReturnValue(createChainableMock(mockUsers));
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockUserBookAccessFind.mockReturnValue(createChainableMock(mockAccess));

    const AdminUsersPage = (await import("@/app/admin/users/page")).default;
    const result = await AdminUsersPage();

    const { getByText, getByTestId, container } = render(result);
    expect(getByText("User Management")).toBeInTheDocument();
    expect(
      getByText(/View and manage users you have added/)
    ).toBeInTheDocument();
    expect(container.textContent).toContain("Total:");
    expect(container.textContent).toContain("2");
    expect(getByTestId("user-table")).toBeInTheDocument();
  });

  it("should calculate users without book access", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockUsers = [
      {
        _id: "user-1",
        name: "User 1",
        email: "user1@example.com",
        role: "user",
        hasAccess: true,
        createdAt: new Date(),
      },
      {
        _id: "user-2",
        name: "User 2",
        email: "user2@example.com",
        role: "user",
        hasAccess: false,
        createdAt: new Date(),
      },
    ];

    const mockBooks = [{ _id: "book-1", title: "Book 1" }];
    const mockAccess = [{ userId: "user-1", bookId: "book-1" }];

    mockAuth.mockResolvedValue(mockSession);
    mockUserFind.mockReturnValue(createChainableMock(mockUsers));
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockUserBookAccessFind.mockReturnValue(createChainableMock(mockAccess));

    const AdminUsersPage = (await import("@/app/admin/users/page")).default;
    const result = await AdminUsersPage();

    const { getByText } = render(result);
    expect(getByText(/without book access/)).toBeInTheDocument();
    expect(getByText("1")).toBeInTheDocument(); // 1 user without access
  });

  it("should not show warning when all users have access", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockUsers = [
      {
        _id: "user-1",
        name: "User 1",
        email: "user1@example.com",
        role: "user",
        hasAccess: true,
        createdAt: new Date(),
      },
    ];

    const mockBooks = [{ _id: "book-1", title: "Book 1" }];
    const mockAccess = [{ userId: "user-1", bookId: "book-1" }];

    mockAuth.mockResolvedValue(mockSession);
    mockUserFind.mockReturnValue(createChainableMock(mockUsers));
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockUserBookAccessFind.mockReturnValue(createChainableMock(mockAccess));

    const AdminUsersPage = (await import("@/app/admin/users/page")).default;
    const result = await AdminUsersPage();

    const { queryByText } = render(result);
    expect(queryByText(/without book access/)).not.toBeInTheDocument();
  });

  it("should fetch users added by admin", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserFind.mockReturnValue(createChainableMock([]));
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessFind.mockReturnValue(createChainableMock([]));

    const AdminUsersPage = (await import("@/app/admin/users/page")).default;
    await AdminUsersPage();

    expect(mockUserFind).toHaveBeenCalledWith({ addedBy: "admin-id" });
  });

  it("should map book access to users", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockUsers = [
      {
        _id: "user-1",
        name: "User 1",
        email: "user1@example.com",
        role: "user",
        hasAccess: true,
        createdAt: new Date(),
      },
    ];

    const mockBooks = [
      { _id: "book-1", title: "Book 1" },
      { _id: "book-2", title: "Book 2" },
    ];

    const mockAccess = [
      { userId: "user-1", bookId: "book-1" },
      { userId: "user-1", bookId: "book-2" },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockUserFind.mockReturnValue(createChainableMock(mockUsers));
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));
    mockUserBookAccessFind.mockReturnValue(createChainableMock(mockAccess));

    const AdminUsersPage = (await import("@/app/admin/users/page")).default;
    const result = await AdminUsersPage();

    const { getByTestId } = render(result);
    expect(getByTestId("user-table")).toBeInTheDocument();
  });

  it("should include add user button", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserFind.mockReturnValue(createChainableMock([]));
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessFind.mockReturnValue(createChainableMock([]));

    const AdminUsersPage = (await import("@/app/admin/users/page")).default;
    const result = await AdminUsersPage();

    const { getByText } = render(result);
    const addButton = getByText("Add User");
    expect(addButton).toBeInTheDocument();
    expect(addButton.closest("a")).toHaveAttribute("href", "/admin/users/add");
  });

  it("should handle empty users list", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    mockUserFind.mockReturnValue(createChainableMock([]));
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockUserBookAccessFind.mockReturnValue(createChainableMock([]));

    const AdminUsersPage = (await import("@/app/admin/users/page")).default;
    const result = await AdminUsersPage();

    const { getByTestId, container } = render(result);
    expect(container.textContent).toContain("Total:");
    expect(container.textContent).toContain("0");
    expect(getByTestId("user-table")).toBeInTheDocument();
  });
});
