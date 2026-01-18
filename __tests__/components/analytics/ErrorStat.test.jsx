import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorStat from "@/components/analytics/ErrorStat";

describe("ErrorStat Component", () => {
  it("renders error message", () => {
    const errorMessage = "Failed to load statistics";
    render(<ErrorStat error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveClass("text-error");
  });

  it("renders Try Again button", () => {
    render(<ErrorStat error="Test error" />);
    
    const retryButton = screen.getByText("Try Again");
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toHaveClass("btn", "btn-error", "btn-sm");
  });

  it("calls onRetry when Try Again button is clicked", () => {
    const mockOnRetry = vi.fn();
    render(<ErrorStat error="Test error" onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByText("Try Again");
    fireEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it("renders with correct error styling classes", () => {
    render(<ErrorStat error="Test error" />);
    
    const container = screen.getByText("Test error").closest("div");
    expect(container).toHaveClass("bg-error/10", "border", "border-error", "rounded-xl", "p-6");
  });

  it("handles multiple retry clicks", () => {
    const mockOnRetry = vi.fn();
    render(<ErrorStat error="Test error" onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByText("Try Again");
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(3);
  });

  it("renders with empty error message", () => {
    const { container } = render(<ErrorStat error="" />);
    
    const errorParagraph = container.querySelector("p.text-error");
    expect(errorParagraph).toBeInTheDocument();
    expect(errorParagraph.textContent).toBe("");
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("renders with long error message", () => {
    const longError = "This is a very long error message that might wrap to multiple lines and should still be displayed correctly in the component";
    render(<ErrorStat error={longError} />);
    
    expect(screen.getByText(longError)).toBeInTheDocument();
  });
});
