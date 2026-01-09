import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PDFError from "@/components/PDFReader/PDFError";

describe("PDFError Component", () => {
  it("renders the error message", () => {
    const errorMsg = "Failed to load PDF";
    render(<PDFError error={errorMsg} onRetry={() => {}} />);
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });

  it("calls onRetry when 'Try Again' button is clicked", () => {
    const onRetryMock = vi.fn();
    render(<PDFError error="Error" onRetry={onRetryMock} />);
    
    const button = screen.getByText("Try Again");
    fireEvent.click(button);
    
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });
});
