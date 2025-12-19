import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock dependencies
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/libs/api", () => ({
  default: {
    put: vi.fn(),
  },
}));

// Import after mocks
import ButtonRoleToggle from "@/components/ButtonRoleToggle";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";

describe("ButtonRoleToggle Component", () => {
  const defaultProps = {
    userId: "user-123",
    currentRole: "user",
    onRoleChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  it("should render with user role", () => {
    render(<ButtonRoleToggle {...defaultProps} />);

    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("should render with admin role", () => {
    render(<ButtonRoleToggle {...defaultProps} currentRole="admin" />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("should show confirmation dialog when clicked", async () => {
    render(<ButtonRoleToggle {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(window.confirm).toHaveBeenCalled();
  });

  it("should not make API call if confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockImplementation(() => false);

    render(<ButtonRoleToggle {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("should call API and update role on confirm", async () => {
    apiClient.put.mockResolvedValue({});

    render(<ButtonRoleToggle {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("/admin/users/user-123", {
        role: "admin",
      });
    });
  });

  it("should call onRoleChange callback after successful update", async () => {
    apiClient.put.mockResolvedValue({});

    render(<ButtonRoleToggle {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(defaultProps.onRoleChange).toHaveBeenCalledWith(
        "user-123",
        "admin"
      );
    });
  });

  it("should show success toast on successful update", async () => {
    apiClient.put.mockResolvedValue({});

    render(<ButtonRoleToggle {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("admin")
      );
    });
  });

  it("should show error toast on API failure", async () => {
    apiClient.put.mockRejectedValue(new Error("API Error"));

    render(<ButtonRoleToggle {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("should toggle from admin to user", async () => {
    apiClient.put.mockResolvedValue({});

    render(<ButtonRoleToggle {...defaultProps} currentRole="admin" />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("/admin/users/user-123", {
        role: "user",
      });
    });
  });

  it("should disable button while loading", async () => {
    // Create a promise that we control
    let resolvePromise;
    apiClient.put.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(<ButtonRoleToggle {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Button should be disabled while loading
    expect(button).toBeDisabled();

    // Resolve the promise
    resolvePromise({});

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it("should have correct styling for admin role", () => {
    render(<ButtonRoleToggle {...defaultProps} currentRole="admin" />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("badge-primary");
  });

  it("should have correct styling for user role", () => {
    render(<ButtonRoleToggle {...defaultProps} currentRole="user" />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("badge-ghost");
  });
});
