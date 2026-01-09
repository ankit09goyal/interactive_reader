import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePDFContinuousMode } from "@/components/PDFReader/hooks/usePDFContinuousMode";

describe("usePDFContinuousMode", () => {
  let observeMock;
  let disconnectMock;

  beforeEach(() => {
    observeMock = vi.fn();
    disconnectMock = vi.fn();

    // Mock IntersectionObserver as a class
    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
      }
      observe = observeMock;
      disconnect = disconnectMock;
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.IntersectionObserver;
  });

  const defaultProps = {
    viewMode: "continuous",
    pdfDoc: { numPages: 10 },
    isLoading: false,
    totalPages: 10,
    renderedPages: new Set(),
    setRenderedPages: vi.fn(),
    renderedPagesRef: { current: new Set() },
    isTransitioningModeRef: { current: false },
    viewerRef: { current: document.createElement("div") },
    setCurrentPage: vi.fn(),
    renderPageToCanvas: vi.fn(),
    canvasRefs: { current: new Map() },
    scale: 1.0,
  };

  it("should setup IntersectionObserver in continuous mode", () => {
    const observerSpy = vi.spyOn(global, "IntersectionObserver");
    renderHook(() => usePDFContinuousMode(defaultProps));
    expect(observerSpy).toHaveBeenCalled();
  });

  it("should not setup observer if not continuous mode", () => {
    const observerSpy = vi.spyOn(global, "IntersectionObserver");
    renderHook(() =>
      usePDFContinuousMode({ ...defaultProps, viewMode: "one-page" })
    );
    expect(observerSpy).not.toHaveBeenCalled();
  });

  it("should disconnect observer on unmount", () => {
    const { unmount } = renderHook(() => usePDFContinuousMode(defaultProps));
    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("should handle intersecting entries", () => {
    let callback;
    global.IntersectionObserver = class IntersectionObserver {
      constructor(cb) {
        callback = cb;
      }
      observe = observeMock;
      disconnect = disconnectMock;
    };

    renderHook(() => usePDFContinuousMode(defaultProps));

    // Simulate intersection
    act(() => {
      callback([
        {
          isIntersecting: true,
          target: { dataset: { page: "5" } },
          intersectionRatio: 0.6,
        },
      ]);
    });

    expect(defaultProps.setRenderedPages).toHaveBeenCalled();
    expect(defaultProps.setCurrentPage).toHaveBeenCalledWith(5);
  });

  it("should clear rendered flags when scale changes", () => {
    const canvas = document.createElement("canvas");
    canvas.dataset.rendered = "true";
    defaultProps.canvasRefs.current.set(1, canvas);

    const { rerender } = renderHook(
      (props) => usePDFContinuousMode(props),
      { initialProps: defaultProps }
    );

    // Update scale
    rerender({ ...defaultProps, scale: 1.5 });

    expect(canvas.dataset.rendered).toBe("");
  });

  it("should render visible pages", async () => {
    const canvas = document.createElement("canvas");
    defaultProps.canvasRefs.current.set(1, canvas);
    defaultProps.renderedPages.add(1);

    renderHook(() => usePDFContinuousMode(defaultProps));

    // Wait for effect
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(defaultProps.renderPageToCanvas).toHaveBeenCalledWith(1, canvas, false);
  });
});
