import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PDFViewer from "@/components/PDFReader/PDFViewer";

// Mock PDFPage
vi.mock("@/components/PDFReader/PDFPage", () => ({
  default: ({ pageNum, isVisible }) => (
    <div
      data-testid={`pdf-page-${pageNum}`}
      style={{ display: isVisible ? "block" : "none" }}
    >
      Page {pageNum}
    </div>
  ),
}));

describe("PDFViewer Component", () => {
  const defaultProps = {
    viewerRef: { current: null },
    isLoading: false,
    viewMode: "one-page",
    currentPage: 1,
    totalPages: 5,
    renderedPages: new Set([1]),
    isRendering: false,
    isFullscreen: false,
    setCanvasRef: () => () => {},
    setTextLayerRef: () => () => {},
  };

  it("should render loading state", () => {
    render(<PDFViewer {...defaultProps} isLoading={true} />);
    expect(screen.getByText("Loading PDF...")).toBeInTheDocument();
  });

  it("should render one-page view", () => {
    render(<PDFViewer {...defaultProps} viewMode="one-page" />);
    // In one-page view, it renders a single canvas structure directly, not PDFPage component list
    // We check for the canvas (which might be hidden or shown)
    // The component renders a canvas with key=currentPage
    // Since we can't easily query canvas by text, we check structure
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("should render continuous view", () => {
    render(<PDFViewer {...defaultProps} viewMode="continuous" />);
    // Should render PDFPage components
    expect(screen.getByTestId("pdf-page-1")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-page-5")).toBeInTheDocument();
  });

  it("should show spinner when rendering in one-page mode", () => {
    render(
      <PDFViewer {...defaultProps} viewMode="one-page" isRendering={true} />
    );
    const spinner = document.querySelector(".loading-spinner");
    expect(spinner).toBeInTheDocument();
  });
});
