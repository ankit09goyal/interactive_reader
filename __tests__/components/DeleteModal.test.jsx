import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import DeleteModal from "@/components/DeleteModal";

describe("DeleteModal Component", () => {
  const defaultProps = {
    title: "Delete Item",
    itemPreview: <div>Item Preview Content</div>,
    warningMessage: "This will permanently delete the item.",
    confirmButtonText: "Delete Item",
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    isDeleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up body overflow style
    document.body.style.overflow = "";
  });

  it("should render the modal with title", () => {
    render(<DeleteModal {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Delete Item");
  });

  it("should render item preview content", () => {
    render(<DeleteModal {...defaultProps} />);

    expect(screen.getByText("Item Preview Content")).toBeInTheDocument();
  });

  it("should render warning message", () => {
    render(<DeleteModal {...defaultProps} />);

    expect(
      screen.getByText("This will permanently delete the item.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Warning: This action cannot be undone")
    ).toBeInTheDocument();
  });

  it("should render confirm button with custom text", () => {
    render(<DeleteModal {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /delete item/i })
    ).toBeInTheDocument();
  });

  it("should render cancel button", () => {
    render(<DeleteModal {...defaultProps} />);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should call onClose when cancel button is clicked", () => {
    render(<DeleteModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    render(<DeleteModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /delete item/i }));

    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it("should call onClose when backdrop is clicked", () => {
    render(<DeleteModal {...defaultProps} />);

    // The backdrop has onClick handler
    const backdrop = document.querySelector(".bg-black\\/50");
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should call onClose when close button is clicked", () => {
    render(<DeleteModal {...defaultProps} />);

    // Find the close button (X button in header)
    const closeButtons = screen.getAllByRole("button");
    const closeButton = closeButtons.find((btn) =>
      btn.classList.contains("btn-circle")
    );
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should call onClose when Escape key is pressed", () => {
    render(<DeleteModal {...defaultProps} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should not call onClose when Escape is pressed while deleting", () => {
    render(<DeleteModal {...defaultProps} isDeleting={true} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it("should not call onClose when backdrop is clicked while deleting", () => {
    render(<DeleteModal {...defaultProps} isDeleting={true} />);

    const backdrop = document.querySelector(".bg-black\\/50");
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it("should disable buttons while deleting", () => {
    render(<DeleteModal {...defaultProps} isDeleting={true} />);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /deleting/i })).toBeDisabled();
  });

  it("should show loading state while deleting", () => {
    render(<DeleteModal {...defaultProps} isDeleting={true} />);

    expect(screen.getByText("Deleting...")).toBeInTheDocument();
  });

  it("should lock body scroll when modal is open", () => {
    render(<DeleteModal {...defaultProps} />);

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("should render without item preview if not provided", () => {
    render(<DeleteModal {...defaultProps} itemPreview={null} />);

    expect(screen.queryByText("Item Preview Content")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Delete Item");
  });

  it("should have error styling for title", () => {
    render(<DeleteModal {...defaultProps} />);

    const title = screen.getByRole("heading", { level: 3 });
    expect(title.className).toContain("text-error");
  });

  it("should have error styling for confirm button", () => {
    render(<DeleteModal {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: /delete item/i });
    expect(confirmButton.className).toContain("btn-error");
  });
});
