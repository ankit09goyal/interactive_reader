import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

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
const mockEmailTemplateFindOne = vi.fn();

vi.mock("@/models/Book", () => ({
  default: {
    find: mockBookFind,
  },
}));

vi.mock("@/models/EmailTemplate", () => ({
  default: {
    findOne: (...args) => mockEmailTemplateFindOne(...args),
  },
}));

// Mock emailNotifications
vi.mock("@/libs/emailNotifications", () => ({
  getDefaultEmailTemplate: vi.fn(() => ({
    subject: "Default Subject",
    htmlBody: "Default HTML",
    textBody: "Default Text",
  })),
}));

// Mock bookUtils
vi.mock("@/libs/bookUtils", () => ({
  getFileType: vi.fn((mimeType) =>
    mimeType === "application/pdf" ? "PDF" : "EPUB"
  ),
}));

// Mock AddUserForm
vi.mock("@/app/admin/users/add/AddUserForm", () => ({
  default: ({ books, initialTemplate, isDefaultTemplate }) => (
    <div data-testid="add-user-form">
      <div>Books: {books.length}</div>
      <div>Template Subject: {initialTemplate.subject}</div>
      <div>Is Default: {isDefaultTemplate ? "Yes" : "No"}</div>
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

describe("Add User Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockEmailTemplateFindOne.mockReturnValue(createChainableMock(null));
  });

  it("should render add user page", async () => {
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
        mimeType: "application/pdf",
      },
      {
        _id: "book-2",
        title: "Test Book 2",
        author: "Author 2",
        mimeType: "application/epub+zip",
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));

    const AddUserPage = (await import("@/app/admin/users/add/page")).default;
    const result = await AddUserPage();

    const { getByText, getByTestId } = render(result);
    expect(getByText("Add New User")).toBeInTheDocument();
    expect(getByText(/Create a new user/)).toBeInTheDocument();
    expect(getByTestId("add-user-form")).toBeInTheDocument();
  });

  it("should redirect to signin if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const AddUserPage = (await import("@/app/admin/users/add/page")).default;

    try {
      await AddUserPage();
    } catch (error) {
      // redirect throws
    }

    expect(mockRedirect).toHaveBeenCalledWith("/api/auth/signin");
  });

  it("should fetch admin books", async () => {
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

    const AddUserPage = (await import("@/app/admin/users/add/page")).default;
    await AddUserPage();

    expect(mockBookFind).toHaveBeenCalledWith({ uploadedBy: "admin-id" });
  });

  it("should use saved email template if exists", async () => {
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    const mockTemplate = {
      subject: "Custom Subject",
      htmlBody: "Custom HTML",
      textBody: "Custom Text",
    };

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock([]));
    mockEmailTemplateFindOne.mockReturnValue(createChainableMock(mockTemplate));

    const AddUserPage = (await import("@/app/admin/users/add/page")).default;
    const result = await AddUserPage();

    const { getByTestId, getByText } = render(result);
    expect(getByText("Template Subject: Custom Subject")).toBeInTheDocument();
    expect(getByText("Is Default: No")).toBeInTheDocument();
  });

  it("should use default template if no saved template", async () => {
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
    mockEmailTemplateFindOne.mockReturnValue(createChainableMock(null));

    const AddUserPage = (await import("@/app/admin/users/add/page")).default;
    const result = await AddUserPage();

    const { getByTestId, getByText } = render(result);
    expect(getByText("Template Subject: Default Subject")).toBeInTheDocument();
    expect(getByText("Is Default: Yes")).toBeInTheDocument();
  });

  it("should format books with file types", async () => {
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
        title: "PDF Book",
        author: "Author",
        mimeType: "application/pdf",
      },
    ];

    mockAuth.mockResolvedValue(mockSession);
    mockBookFind.mockReturnValue(createChainableMock(mockBooks));

    const AddUserPage = (await import("@/app/admin/users/add/page")).default;
    const result = await AddUserPage();

    const { getByTestId, getByText } = render(result);
    expect(getByTestId("add-user-form")).toBeInTheDocument();
    expect(getByText("Books: 1")).toBeInTheDocument();
  });

  it("should include back button", async () => {
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

    const AddUserPage = (await import("@/app/admin/users/add/page")).default;
    const result = await AddUserPage();

    const { getByText } = render(result);
    const backButton = getByText("Back");
    expect(backButton).toBeInTheDocument();
    expect(backButton.closest("a")).toHaveAttribute("href", "/admin/users");
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

    const AddUserPage = (await import("@/app/admin/users/add/page")).default;
    const result = await AddUserPage();

    const { getByTestId, getByText } = render(result);
    expect(getByText("Books: 0")).toBeInTheDocument();
  });
});
