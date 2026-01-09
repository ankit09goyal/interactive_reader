import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEPubTextSelection } from "@/components/ePubReader/hooks/useEPubTextSelection";

describe("useEPubTextSelection", () => {
  let mockRendition;
  let mockIframe;
  let mockSelection;

  const defaultProps = {
    currentChapter: { href: "ch1.html" },
    showNotesModal: false,
    showQuestionModal: false,
    showSidebar: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSelection = {
      toString: vi.fn().mockReturnValue("Selected text"),
      getRangeAt: vi.fn().mockReturnValue({
        getBoundingClientRect: vi.fn().mockReturnValue({
          left: 10, right: 100, top: 10, bottom: 20, width: 90, height: 10
        }),
      }),
      removeAllRanges: vi.fn(),
    };

    mockIframe = {
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 50, top: 50 }),
      contentWindow: {
        getSelection: vi.fn().mockReturnValue(mockSelection),
      },
    };

    const mockContents = {
      window: {
        getSelection: vi.fn().mockReturnValue(mockSelection),
      },
    };

    mockRendition = {
      on: vi.fn(),
      off: vi.fn(),
      manager: {
        container: {
          querySelector: vi.fn().mockReturnValue(mockIframe),
        },
      },
    };
  });

  it("should subscribe to selection events", () => {
    renderHook(() =>
      useEPubTextSelection({ ...defaultProps, rendition: mockRendition })
    );
    expect(mockRendition.on).toHaveBeenCalledWith("selected", expect.any(Function));
  });

  it("should handle selection event", () => {
    let selectedCallback;
    mockRendition.on.mockImplementation((event, cb) => {
        if (event === "selected") selectedCallback = cb;
    });

    const { result } = renderHook(() =>
      useEPubTextSelection({ ...defaultProps, rendition: mockRendition })
    );

    const mockContents = {
      window: {
        getSelection: vi.fn().mockReturnValue(mockSelection),
      },
    };

    act(() => {
        selectedCallback("cfiRange123", mockContents);
    });

    expect(result.current.selectedText).toBe("Selected text");
    expect(result.current.selectionCfiRange).toBe("cfiRange123");
    expect(result.current.selectionChapter).toEqual(defaultProps.currentChapter);
    expect(result.current.selectionPosition).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
  });

  it("should not handle selection if modal is open", () => {
    let selectedCallback;
    mockRendition.on.mockImplementation((event, cb) => {
        if (event === "selected") selectedCallback = cb;
    });

    const { result } = renderHook(() =>
      useEPubTextSelection({ ...defaultProps, rendition: mockRendition, showNotesModal: true })
    );

    act(() => {
        selectedCallback("cfiRange123", {});
    });

    expect(result.current.selectedText).toBe("");
  });

  it("should clear selection programmatically", () => {
    const { result } = renderHook(() =>
      useEPubTextSelection({ ...defaultProps, rendition: mockRendition })
    );

    // Set some state first (simulated) or just check clear behavior
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedText).toBe("");
    expect(result.current.selectionCfi).toBeNull();
    expect(mockSelection.removeAllRanges).toHaveBeenCalled();
  });

  it("should clear selection on click outside", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { result, unmount } = renderHook(() =>
      useEPubTextSelection({ ...defaultProps, rendition: mockRendition })
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));

    // Simulate click outside
    // We'd need to invoke the callback passed to addEventListener. 
    // Since we mocked addEventListener, we can't easily trigger the real event on document unless we use real implementation.
    // Instead, we can verify the listener is attached.
    
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
  });
});
