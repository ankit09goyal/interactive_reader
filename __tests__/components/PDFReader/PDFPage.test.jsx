import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import PDFPage from "@/components/PDFReader/PDFPage";

describe("PDFPage Component", () => {
  it("renders page number if showPageNumber is true", () => {
    const canvasRef = React.createRef();
    const textLayerRef = React.createRef();
    render(
      <PDFPage
        pageNum={1}
        canvasRef={canvasRef}
        textLayerRef={textLayerRef}
        showPageNumber={true}
      />
    );
    expect(screen.getByText("Page 1")).toBeInTheDocument();
  });

  it("renders loading spinner when not visible", () => {
    const canvasRef = React.createRef();
    const textLayerRef = React.createRef();
    render(
      <PDFPage
        pageNum={1}
        canvasRef={canvasRef}
        textLayerRef={textLayerRef}
        isVisible={false}
      />
    );
    // There is no role for the spinner, but we can check for the class or container
    const spinner = document.querySelector(".loading-spinner");
    expect(spinner).toBeInTheDocument();
  });

  it("renders canvas and text layer when visible", () => {
    const canvasRef = React.createRef();
    const textLayerRef = React.createRef();
    const { container } = render(
      <PDFPage
        pageNum={1}
        canvasRef={canvasRef}
        textLayerRef={textLayerRef}
        isVisible={true}
        isRendering={false}
      />
    );
    
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveStyle({ display: "block" });
  });

  it("hides canvas when rendering", () => {
    const canvasRef = React.createRef();
    const textLayerRef = React.createRef();
    const { container } = render(
      <PDFPage
        pageNum={1}
        canvasRef={canvasRef}
        textLayerRef={textLayerRef}
        isVisible={true}
        isRendering={true}
      />
    );
    
    const canvas = container.querySelector("canvas");
    expect(canvas).toHaveStyle({ display: "none" });
  });
});
