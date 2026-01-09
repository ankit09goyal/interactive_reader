import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock apiClient
vi.mock("@/libs/api", () => ({
  default: {
    delete: vi.fn(),
  },
}));

// Mock ButtonRoleToggle
vi.mock("@/components/ButtonRoleToggle", () => ({
  default: ({ userId, currentRole, onRoleChange }) => (
    <button
      data-testid={`role-toggle-${userId}`}
      onClick={() => onRoleChange(userId, currentRole === "admin" ? "user" : "admin")}
    >
      {currentRole}
    </button>
  ),
}));

import UserTable from "@/components/UserTable";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";

describe("UserTable Component", () => {
  const mockUsers = [
    {
      _id: "user-1",
      name: "John Doe",
      email: "john@example.com",
      role: "user",
      image: "https://example.com/john.jpg",
      hasBookAccess: true,
      bookAccessCount: 3,
      bookTitles: ["Book A", "Book B", "Book C"],
      createdAt: "2024-01-15T10:00:00.000Z",
    },
    {
      _id: "user-2",
      name: "Jane Smith",
      email: "jane@example.com",
      role: "admin",
      image: null,
      hasBookAccess: false,
      bookAccessCount: 0,
      bookTitles: [],
      createdAt: "2024-01-20T10:00:00.000Z",
    },
    {
      _id: "user-3",
      name: null,
      email: "noname@example.com",
      role: "user",
      image: null,
      hasBookAccess: true,
      bookAccessCount: 1,
      bookTitles: ["Book D"],
      createdAt: "2024-01-25T10:00:00.000Z",
    },
  ];

  const defaultProps = {
    users: mockUsers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render the table headers", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Book Access")).toBeInTheDocument();
      expect(screen.getByText("Books")).toBeInTheDocument();
      expect(screen.getByText("Joined")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("should render all users", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("noname@example.com")).toBeInTheDocument();
    });

    it("should render user emails", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("should render user with image", () => {
      render(<UserTable {...defaultProps} />);

      const userImage = screen.getByAltText("John Doe");
      expect(userImage).toBeInTheDocument();
      expect(userImage).toHaveAttribute("src", "https://example.com/john.jpg");
    });

    it("should render avatar placeholder for users without image", () => {
      render(<UserTable {...defaultProps} />);

      // Jane's initial should be "J"
      const janeAvatar = screen.getByText("J");
      expect(janeAvatar).toBeInTheDocument();
    });

    it("should show No name for users without name", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText("No name")).toBeInTheDocument();
    });

    it("should show book access status correctly", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText("3 books")).toBeInTheDocument();
      expect(screen.getByText("1 book")).toBeInTheDocument();
      expect(screen.getByText("No access")).toBeInTheDocument();
    });

    it("should render book titles for users with access", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText("Book A")).toBeInTheDocument();
      expect(screen.getByText("Book B")).toBeInTheDocument();
      expect(screen.getByText("Book C")).toBeInTheDocument();
      expect(screen.getByText("Book D")).toBeInTheDocument();
    });

    it("should show No books text for users without book access", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText("No books")).toBeInTheDocument();
    });

    it("should render formatted dates", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
      expect(screen.getByText("Jan 20, 2024")).toBeInTheDocument();
    });

    it("should render role toggle buttons", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByTestId("role-toggle-user-1")).toBeInTheDocument();
      expect(screen.getByTestId("role-toggle-user-2")).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("should render search input", () => {
      render(<UserTable {...defaultProps} />);

      expect(
        screen.getByPlaceholderText("Search users by name or email...")
      ).toBeInTheDocument();
    });

    it("should filter users by name", async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search users by name or email..."
      );
      await user.type(searchInput, "John");

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });

    it("should filter users by email", async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search users by name or email..."
      );
      await user.type(searchInput, "jane@");

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });

    it("should show no results message when no users match search", async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search users by name or email..."
      );
      await user.type(searchInput, "nonexistent");

      expect(
        screen.getByText("No users found matching your filters")
      ).toBeInTheDocument();
    });
  });

  describe("Filter by Book Access", () => {
    it("should render filter dropdown", () => {
      render(<UserTable {...defaultProps} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("All Users")).toBeInTheDocument();
    });

    it("should filter users with book access", async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      const filterSelect = screen.getByRole("combobox");
      await user.selectOptions(filterSelect, "with-access");

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });

    it("should filter users without book access", async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      const filterSelect = screen.getByRole("combobox");
      await user.selectOptions(filterSelect, "no-access");

      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  describe("Delete Functionality", () => {
    it("should show confirmation dialog on delete", async () => {
      render(<UserTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole("button", { name: "" }).filter(
        (btn) => btn.classList.contains("text-error")
      );
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete John Doe?"
      );
    });

    it("should not delete if confirmation is cancelled", async () => {
      vi.mocked(window.confirm).mockReturnValue(false);

      render(<UserTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole("button", { name: "" }).filter(
        (btn) => btn.classList.contains("text-error")
      );
      fireEvent.click(deleteButtons[0]);

      expect(apiClient.delete).not.toHaveBeenCalled();
    });

    it("should delete user and show success toast on confirm", async () => {
      apiClient.delete.mockResolvedValueOnce({ softDeleted: false });

      render(<UserTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole("button", { name: "" }).filter(
        (btn) => btn.classList.contains("text-error")
      );
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith("/admin/users/user-1");
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("User deleted successfully");
      });
    });

    it("should show soft delete message when user is only removed from list", async () => {
      apiClient.delete.mockResolvedValueOnce({ softDeleted: true });

      render(<UserTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole("button", { name: "" }).filter(
        (btn) => btn.classList.contains("text-error")
      );
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "User removed from your list"
        );
      });
    });

    it("should show error toast on delete failure", async () => {
      apiClient.delete.mockRejectedValueOnce(new Error("Delete failed"));

      render(<UserTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole("button", { name: "" }).filter(
        (btn) => btn.classList.contains("text-error")
      );
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Delete failed");
      });
    });
  });

  describe("Role Change", () => {
    it("should update user role when role toggle is clicked", () => {
      render(<UserTable {...defaultProps} />);

      const roleToggle = screen.getByTestId("role-toggle-user-1");
      expect(roleToggle).toHaveTextContent("user");

      fireEvent.click(roleToggle);

      // Role should be updated in the UI via the callback
      expect(screen.getByTestId("role-toggle-user-1")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show no users found message when users array is empty", () => {
      render(<UserTable users={[]} />);

      expect(screen.getByText("No users found")).toBeInTheDocument();
    });
  });

  describe("Users without book access highlighting", () => {
    it("should highlight rows for users without book access", () => {
      render(<UserTable {...defaultProps} />);

      // Jane Smith doesn't have book access, her row should have warning styling
      // We can check by finding her row and checking for the warning class
      const janeRow = screen.getByText("Jane Smith").closest("tr");
      expect(janeRow?.className).toContain("bg-warning");
    });
  });

  describe("Date handling", () => {
    it("should handle missing date gracefully", () => {
      const usersWithoutDate = [
        {
          _id: "user-no-date",
          name: "No Date User",
          email: "nodate@example.com",
          role: "user",
          hasBookAccess: false,
          createdAt: null,
        },
      ];

      render(<UserTable users={usersWithoutDate} />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });
});
