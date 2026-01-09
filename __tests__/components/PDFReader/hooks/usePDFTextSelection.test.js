import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePDFTextSelection } from "@/components/PDFReader/hooks/usePDFTextSelection";

describe("usePDFTextSelection", () => {
  let addEventListenerMock;
  let removeEventListenerMock;

  beforeEach(() => {
    addEventListenerMock = vi.spyOn(document, "addEventListener");
    removeEventListenerMock = vi.spyOn(document, "removeEventListener");

    // Mock getSelection
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => "",
      removeAllRanges: vi.fn(),
      getRangeAt: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const defaultProps = {
    currentPage: 1,
    showQuestionModal: false,
    showAdminCreateModal: false,
    showSidebar: false,
  };

  const createEventWithTarget = (target) => {
    const event = new MouseEvent("mouseup", { bubbles: true });
    Object.defineProperty(event, "target", { value: target, writable: false });
    return event;
  };

  it("should initialize with default state", () => {
    const { result } = renderHook(() => usePDFTextSelection(defaultProps));
    expect(result.current.selectedText).toBe("");
    expect(result.current.selectionPosition).toBeNull();
  });

  it("should update state on mouseup with selection", () => {
    const mockRange = {
      getBoundingClientRect: () => ({ left: 10, bottom: 20, width: 100 }),
    };
    
    window.getSelection.mockReturnValue({
      toString: () => "Selected text",
      anchorNode: { parentElement: { dataset: { pageNum: "2" } } },
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    });

    const { result } = renderHook(() => usePDFTextSelection(defaultProps));

    act(() => {
      // Create a dummy target element that has 'closest'
      const target = document.createElement("div");
      document.body.appendChild(target);
      const event = createEventWithTarget(target);
      document.dispatchEvent(event);
      document.body.removeChild(target);
    });

    expect(result.current.selectedText).toBe("Selected text");
    expect(result.current.selectionPageNumber).toBe(2);
    expect(result.current.selectionPosition).toEqual({ x: 60, y: 20 });
  });

  it("should not update if clicking inside toolbar", () => {
    const { result } = renderHook(() => usePDFTextSelection(defaultProps));
    
    act(() => {
      const toolbar = document.createElement("div");
      toolbar.className = "toolbar";
      document.body.appendChild(toolbar);
      
      const event = createEventWithTarget(toolbar);
      document.dispatchEvent(event);
      
      document.body.removeChild(toolbar);
    });

    expect(result.current.selectedText).toBe("");
  });

  it("should clear selection when clicking elsewhere", () => {
    // Setup initial selection
    window.getSelection.mockReturnValue({
      toString: () => "Selected text",
      anchorNode: { parentElement: {} },
      getRangeAt: () => ({ getBoundingClientRect: () => ({}) }),
      removeAllRanges: vi.fn(),
    });

    const { result } = renderHook(() => usePDFTextSelection(defaultProps));

    // Simulate initial selection
    act(() => {
      const target = document.createElement("div");
      document.body.appendChild(target);
      document.dispatchEvent(createEventWithTarget(target));
      document.body.removeChild(target);
    });
    
    expect(result.current.selectedText).toBe("Selected text");

    // Clear it
    window.getSelection.mockReturnValue({
      toString: () => "",
      removeAllRanges: vi.fn(),
    });

    act(() => {
      const target = document.createElement("div");
      document.body.appendChild(target);
      document.dispatchEvent(createEventWithTarget(target));
      document.body.removeChild(target);
    });

    expect(result.current.selectedText).toBe("");
  });
});
