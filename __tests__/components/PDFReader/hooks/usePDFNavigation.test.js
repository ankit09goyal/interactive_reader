import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePDFNavigation } from "@/components/PDFReader/hooks/usePDFNavigation";
import toast from "react-hot-toast";

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
  },
}));

describe("usePDFNavigation", () => {
  const viewerRefMock = {
    current: {
      querySelector: vi.fn().mockReturnValue({
        scrollIntoView: vi.fn(),
      }),
    },
  };

  const defaultProps = {
    totalPages: 10,
    viewMode: "one-page",
    viewerRef: viewerRefMock,
    isFullscreen: false,
    showQuestionModal: false,
    showAdminCreateModal: false,
    showSidebar: false,
    toggleViewMode: vi.fn(),
    clearSelection: vi.fn(),
    setShowSidebar: vi.fn(),
    initialPage: 1,
    initialScale: 1.0,
    preferencesLoaded: true,
    onPageChange: vi.fn(),
    onScaleChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default page and scale", () => {
    const { result } = renderHook(() => usePDFNavigation(defaultProps));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.scale).toBe(1.0);
  });

  it("should go to next page", () => {
    const { result } = renderHook(() => usePDFNavigation(defaultProps));

    act(() => {
      result.current.goToNextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it("should scroll to view in continuous mode on next page", () => {
    const { result } = renderHook(() =>
      usePDFNavigation({ ...defaultProps, viewMode: "continuous" })
    );

    act(() => {
      result.current.goToNextPage();
    });

    expect(viewerRefMock.current.querySelector).toHaveBeenCalledWith(
      '[data-page="2"]'
    );
  });

  it("should not go past total pages", () => {
    const { result } = renderHook(() =>
      usePDFNavigation({ ...defaultProps, initialPage: 10 })
    );

    act(() => {
      result.current.goToNextPage();
    });

    expect(result.current.currentPage).toBe(10);
  });

  it("should go to previous page", () => {
    const { result } = renderHook(() =>
      usePDFNavigation({ ...defaultProps, initialPage: 2 })
    );

    act(() => {
      result.current.goToPreviousPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it("should scroll to view in continuous mode on prev page", () => {
    const { result } = renderHook(() =>
      usePDFNavigation({
        ...defaultProps,
        initialPage: 2,
        viewMode: "continuous",
      })
    );

    act(() => {
      result.current.goToPreviousPage();
    });

    expect(viewerRefMock.current.querySelector).toHaveBeenCalledWith(
      '[data-page="1"]'
    );
  });

  it("should not go below page 1", () => {
    const { result } = renderHook(() =>
      usePDFNavigation({ ...defaultProps, initialPage: 1 })
    );

    act(() => {
      result.current.goToPreviousPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it("should handle page input", () => {
    const { result } = renderHook(() => usePDFNavigation(defaultProps));

    act(() => {
      result.current.handlePageInput({ target: { value: "5" } });
    });

    expect(result.current.currentPage).toBe(5);
  });

  it("should handle invalid page input", () => {
    const { result } = renderHook(() => usePDFNavigation(defaultProps));

    act(() => {
      result.current.handlePageInput({ target: { value: "999" } });
    });

    expect(result.current.currentPage).toBe(1); // Should not change
  });

  it("should go to specific page", () => {
    const { result } = renderHook(() => usePDFNavigation(defaultProps));

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.currentPage).toBe(5);
  });

  it("should zoom in and out", () => {
    const { result } = renderHook(() => usePDFNavigation(defaultProps));

    act(() => {
      result.current.zoomIn();
    });
    expect(result.current.scale).toBe(1.25);
    expect(defaultProps.onScaleChange).toHaveBeenCalledWith(1.25);

    act(() => {
      result.current.zoomOut();
    });
    expect(result.current.scale).toBe(1.0);
  });

  it("should handle keyboard events", () => {
    const { result } = renderHook(() => usePDFNavigation(defaultProps));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });
    expect(result.current.currentPage).toBe(2);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    });
    expect(result.current.currentPage).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "v" }));
    });
    expect(defaultProps.toggleViewMode).toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "0" }));
    });
    expect(result.current.scale).toBe(1.0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "q" }));
    });
    expect(defaultProps.setShowSidebar).toHaveBeenCalled();
  });

  it("should handle Escape key", () => {
    // Mock exitFullscreen
    document.exitFullscreen = vi.fn();

    renderHook(() => usePDFNavigation({ ...defaultProps, isFullscreen: true }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(document.exitFullscreen).toHaveBeenCalled();
    expect(defaultProps.clearSelection).toHaveBeenCalled();
  });

  it("should block keyboard events when modal is open", () => {
    const { result } = renderHook(() =>
      usePDFNavigation({ ...defaultProps, showQuestionModal: true })
    );

    // Verify initial page is 1
    expect(result.current.currentPage).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });

    // Page should remain at 1 because keyboard navigation is blocked when modal is open
    expect(result.current.currentPage).toBe(1);
    // onPageChange should not be called since navigation was blocked
    expect(defaultProps.onPageChange).not.toHaveBeenCalled();
  });
});
