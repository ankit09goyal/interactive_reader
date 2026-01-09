import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PDFToolbar from "@/components/PDFReader/PDFToolbar";

// Mock icons
vi.mock("@/libs/icons", () => ({
  default: {
    back: <span>BackIcon</span>,
    chevronLeft: <span>PrevIcon</span>,
    chevronRight: <span>NextIcon</span>,
    zoomOut: <span>ZoomOutIcon</span>,
    zoomIn: <span>ZoomInIcon</span>,
    scrollDown: <span>ScrollIcon</span>,
    page: <span>PageIcon</span>,
    question: <span>QuestionIcon</span>,
    plus: <span>PlusIcon</span>,
  },
}));

describe("PDFToolbar Component", () => {
  const defaultProps = {
    title: "Test PDF",
    backHref: "/books",
    currentPage: 1,
    totalPages: 10,
    isLoading: false,
    scale: 1.0,
    viewMode: "one-page",
    bookId: "book-123",
    isAdmin: false,
    showSidebar: false,
    onPreviousPage: vi.fn(),
    onNextPage: vi.fn(),
    onPageInput: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onToggleViewMode: vi.fn(),
    onToggleSidebar: vi.fn(),
    onCreatePublicQA: vi.fn(),
  };

  it("renders title and back link", () => {
    render(<PDFToolbar {...defaultProps} />);
    expect(screen.getByText("Test PDF")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back/i })).toHaveAttribute(
      "href",
      "/books"
    );
  });

  it("handles page navigation", () => {
    // Render with currentPage 2 so previous button is enabled
    // We pass explicit props to override defaultProps spread inside component if any,
    // but here we just pass them to render
    const props = { ...defaultProps, currentPage: 2 };
    render(<PDFToolbar {...props} />);

    const prevBtn = screen.getByTitle("Previous page (Left Arrow)");
    expect(prevBtn).not.toBeDisabled();
    fireEvent.click(prevBtn);
    expect(props.onPreviousPage).toHaveBeenCalled();

    const nextBtn = screen.getByTitle("Next page (Right Arrow)");
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);
    expect(props.onNextPage).toHaveBeenCalled();
  });

  it("disables previous button on first page", () => {
    render(<PDFToolbar {...defaultProps} currentPage={1} />);
    expect(screen.getByTitle("Previous page (Left Arrow)")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<PDFToolbar {...defaultProps} currentPage={10} totalPages={10} />);
    expect(screen.getByTitle("Next page (Right Arrow)")).toBeDisabled();
  });

  it("handles page input", () => {
    render(<PDFToolbar {...defaultProps} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "5" } });
    expect(defaultProps.onPageInput).toHaveBeenCalled();
  });

  it("handles zoom controls", () => {
    render(<PDFToolbar {...defaultProps} />);

    fireEvent.click(screen.getByTitle("Zoom in (+)"));
    expect(defaultProps.onZoomIn).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Zoom out (-)"));
    expect(defaultProps.onZoomOut).toHaveBeenCalled();
  });

  it("disables zoom buttons at limits", () => {
    const { rerender } = render(<PDFToolbar {...defaultProps} scale={0.5} />);
    expect(screen.getByTitle("Zoom out (-)")).toBeDisabled();

    rerender(<PDFToolbar {...defaultProps} scale={3.0} />);
    expect(screen.getByTitle("Zoom in (+)")); // Re-query
    expect(screen.getByTitle("Zoom in (+)")).toBeDisabled();
  });

  it("handles view mode toggle", () => {
    render(<PDFToolbar {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Switch to continuous scroll view (V)"));
    expect(defaultProps.onToggleViewMode).toHaveBeenCalled();
  });

  it("shows Q&A toggle when bookId is present", () => {
    render(<PDFToolbar {...defaultProps} />);
    expect(screen.getByTitle("Questions & Answers (Q)")).toBeInTheDocument();
  });

  it("shows Create Q&A button for admin", () => {
    render(<PDFToolbar {...defaultProps} isAdmin={true} />);
    expect(screen.getByTitle("Create Public Q&A")).toBeInTheDocument();
  });

  it("hides Create Q&A button for non-admin", () => {
    render(<PDFToolbar {...defaultProps} isAdmin={false} />);
    expect(screen.queryByTitle("Create Public Q&A")).not.toBeInTheDocument();
  });
});
