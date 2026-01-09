import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock apiClient
vi.mock("@/libs/api", () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mocks
import AddUserForm from "@/app/admin/users/add/AddUserForm";
import apiClient from "@/libs/api";

describe("AddUserForm Component", () => {
  const mockBooks = [
    {
      _id: "book-1",
      title: "Book 1",
      author: "Author 1",
      fileType: "PDF",
    },
    {
      _id: "book-2",
      title: "Book 2",
      author: "Author 2",
      fileType: "EPUB",
    },
  ];

  const mockInitialTemplate = {
    subject: "Welcome!",
    htmlBody: "<p>Hello {{userName}}</p>",
    textBody: "Hello {{userName}}",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.post.mockResolvedValue({});
    apiClient.put.mockResolvedValue({});
    apiClient.delete.mockResolvedValue({ template: mockInitialTemplate });
  });

  it("should render form sections", () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    expect(screen.getByText("User Details")).toBeInTheDocument();
    expect(screen.getByText("Book Access")).toBeInTheDocument();
    expect(screen.getByText("Email Notification")).toBeInTheDocument();
  });

  it("should render name and email inputs", () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("user@example.com")).toBeInTheDocument();
  });

  it("should render book selection", () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    expect(screen.getByText("Book 1")).toBeInTheDocument();
    expect(screen.getByText("Book 2")).toBeInTheDocument();
  });

  it("should show select all button when books exist", () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    expect(screen.getByText("Select All")).toBeInTheDocument();
  });

  it("should toggle book selection", () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    const book1Checkbox = checkboxes.find((cb) =>
      cb.closest("label")?.textContent?.includes("Book 1")
    );
    expect(book1Checkbox.checked).toBe(false);

    fireEvent.click(book1Checkbox);
    expect(book1Checkbox.checked).toBe(true);
  });

  it("should submit form with email", async () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    const emailInput = screen.getByPlaceholderText("user@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: /Add User/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/admin/users",
        expect.objectContaining({
          email: "test@example.com",
        })
      );
    });
  });

  it("should redirect after successful submission", async () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    const emailInput = screen.getByPlaceholderText("user@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: /Add User/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/admin/users");
    });
  });

  it("should show empty state when no books", () => {
    render(
      <AddUserForm
        books={[]}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    expect(
      screen.getByText(/You haven't uploaded any books yet/)
    ).toBeInTheDocument();
  });

  it("should disable submit when email is empty", () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    const submitButton = screen.getByRole("button", { name: /Add User/i });
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit when email is provided", () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    const emailInput = screen.getByPlaceholderText("user@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: /Add User/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("should handle API error on submission", async () => {
    apiClient.post.mockRejectedValue(new Error("API Error"));

    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    const emailInput = screen.getByPlaceholderText("user@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: /Add User/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });

  it("should cancel button link to users page", () => {
    render(
      <AddUserForm
        books={mockBooks}
        initialTemplate={mockInitialTemplate}
        isDefaultTemplate={true}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    expect(cancelButton.closest("a")).toHaveAttribute("href", "/admin/users");
  });
});
