import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Import component
import Modal from "@/components/Modal";

describe("Modal Component", () => {
  const defaultProps = {
    isModalOpen: true,
    setIsModalOpen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render when isModalOpen is true", () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText("I'm a modal")).toBeInTheDocument();
  });

  it("should not render content when isModalOpen is false", () => {
    render(<Modal {...defaultProps} isModalOpen={false} />);

    expect(screen.queryByText("I'm a modal")).not.toBeInTheDocument();
  });

  it("should render modal content", () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText("And here is my content")).toBeInTheDocument();
  });

  it("should call setIsModalOpen with false when close button is clicked", () => {
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);

    expect(defaultProps.setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it("should have a dialog role", () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should have a title", () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByRole("heading")).toHaveTextContent("I'm a modal");
  });
});
