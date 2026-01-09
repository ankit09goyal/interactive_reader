import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePDFRenderer } from "@/components/PDFReader/hooks/usePDFRenderer";

describe("usePDFRenderer", () => {
  let mockRenderTask;
  let mockPage;
  let mockPdfDoc;
  let mockContext;
  let mockCanvas;
  let mockTextLayerDiv;
  let mockTextLayerMap;
  let mockPdfjsLib;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockRenderTask = {
      promise: Promise.resolve(),
      cancel: vi.fn(),
    };

    mockPage = {
      getViewport: vi.fn().mockReturnValue({ width: 100, height: 100, transform: [] }),
      render: vi.fn().mockReturnValue(mockRenderTask),
      getTextContent: vi.fn().mockResolvedValue({ 
        items: [
          { str: "Hello", transform: [1, 0, 0, 1, 0, 0], fontName: "Arial" },
          { str: "World", transform: [1, 0, 0, 1, 50, 0], fontName: "Arial" }
        ] 
      }),
    };

    mockPdfDoc = {
      getPage: vi.fn().mockResolvedValue(mockPage),
    };

    mockContext = {
      setTransform: vi.fn(),
      drawImage: vi.fn(),
    };

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 0,
      height: 0,
      style: {},
    };

    mockTextLayerDiv = document.createElement("div");
    // Ensure text layer is in document for event propagation if needed
    document.body.appendChild(mockTextLayerDiv);
    
    mockTextLayerMap = {
      get: vi.fn().mockReturnValue(mockTextLayerDiv),
      set: vi.fn(),
      delete: vi.fn(),
    };

    mockPdfjsLib = {
      current: {
        Util: {
          transform: vi.fn().mockReturnValue([10, 0, 0, 10, 0, 0]),
        },
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    if (mockTextLayerDiv.parentNode) {
      document.body.removeChild(mockTextLayerDiv);
    }
  });

  const getDefaultProps = () => ({
    pdfDoc: mockPdfDoc,
    pdfjsLibRef: mockPdfjsLib,
    scale: 1.0,
    viewMode: "one-page",
    isFullscreen: false,
    containerRef: { current: { clientWidth: 800 } },
    renderTasksRef: { current: new Map(), get: () => {}, set: () => {}, delete: () => {} },
    textLayerRefs: { current: mockTextLayerMap },
    highlights: [],
    onHighlightClick: vi.fn(),
  });

  it("should return renderPageToCanvas function", () => {
    const { result } = renderHook(() => usePDFRenderer(getDefaultProps()));
    expect(result.current.renderPageToCanvas).toBeDefined();
  });

  it("should render page to canvas and text layer", async () => {
    const { result } = renderHook(() => usePDFRenderer(getDefaultProps()));
    
    // We await the promise returned by renderPageToCanvas
    const promise = result.current.renderPageToCanvas(1, mockCanvas);
    
    // Since rendering involves microtasks (promises), we might not need to advance timers
    // unless there are setTimeouts. 
    // renderPageToCanvas awaits renderTextLayer.
    // renderTextLayer awaits getTextContent, then populates DOM, then calls setTimeout for highlights.
    
    await promise;
    
    expect(mockPdfDoc.getPage).toHaveBeenCalledWith(1);
    expect(mockPage.render).toHaveBeenCalled();
    expect(mockPage.getTextContent).toHaveBeenCalled();
    
    // Check text layer content
    expect(mockTextLayerDiv.children.length).toBeGreaterThan(0);
    expect(mockTextLayerDiv.innerHTML).toContain("Hello");
  });

  it("should fit to viewport in one-page mode", async () => {
    const props = getDefaultProps();
    const { result } = renderHook(() => usePDFRenderer({ ...props, viewMode: "one-page" }));
    
    await result.current.renderPageToCanvas(1, mockCanvas, true);
    
    expect(mockPage.getViewport).toHaveBeenCalled();
  });

  it("should cancel existing render task for same page", async () => {
    const props = getDefaultProps();
    const mockCancel = vi.fn();
    const tasks = new Map();
    tasks.set(1, { cancel: mockCancel });
    props.renderTasksRef.current = tasks;

    const { result } = renderHook(() => usePDFRenderer(props));
    
    await result.current.renderPageToCanvas(1, mockCanvas);
    
    expect(mockCancel).toHaveBeenCalled();
  });

  it("should handle rendering errors gracefully", async () => {
    mockPdfDoc.getPage.mockRejectedValueOnce(new Error("Render failed"));
    
    const { result } = renderHook(() => usePDFRenderer(getDefaultProps()));
    
    const success = await result.current.renderPageToCanvas(1, mockCanvas);
    expect(success).toBe(false);
  });

  it("should ignore RenderingCancelledException", async () => {
    const cancelledError = new Error("Cancelled");
    cancelledError.name = "RenderingCancelledException";
    mockPdfDoc.getPage.mockRejectedValueOnce(cancelledError);
    
    const { result } = renderHook(() => usePDFRenderer(getDefaultProps()));
    
    const success = await result.current.renderPageToCanvas(1, mockCanvas);
    expect(success).toBe(false);
  });

  it("should apply highlights to text layer", async () => {
    const highlights = [{ pageNumber: 1, text: "Hello", questionId: "q1" }];
    const props = getDefaultProps();
    const { result } = renderHook(() => usePDFRenderer({ ...props, highlights }));

    await result.current.renderPageToCanvas(1, mockCanvas);

    // Apply highlights uses setTimeout(0), so we must advance timers
    act(() => {
      vi.runAllTimers();
    });

    const highlightSpan = mockTextLayerDiv.querySelector(".pdf-highlight");
    expect(highlightSpan).toBeInTheDocument();
    expect(highlightSpan.textContent).toBe("Hello");
  });

  it("should handle highlight click interaction", async () => {
    const onHighlightClick = vi.fn();
    const highlights = [{ pageNumber: 1, text: "Hello", questionId: "q1" }];
    const props = { ...getDefaultProps(), highlights, onHighlightClick };
    const { result } = renderHook(() => usePDFRenderer(props));

    await result.current.renderPageToCanvas(1, mockCanvas);

    act(() => {
      vi.runAllTimers();
    });

    const highlightSpan = mockTextLayerDiv.querySelector(".pdf-highlight");
    expect(highlightSpan).toBeInTheDocument();
    
    // Simulate click
    highlightSpan.click();
    expect(onHighlightClick).toHaveBeenCalledWith("q1");
  });
});
