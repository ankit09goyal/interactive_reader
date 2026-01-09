import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEPubHighlights } from "@/components/ePubReader/hooks/useEPubHighlights";
import apiClient from "@/libs/api";

vi.mock("@/libs/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("useEPubHighlights", () => {
  let mockRendition;
  let mockDocument;
  let mockContent;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDocument = {
      createElementNS: vi.fn().mockReturnValue({
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
      }),
      createElement: vi.fn().mockReturnValue({
        className: "",
        setAttribute: vi.fn(),
        style: {},
      }),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
    };

    mockContent = {
      document: mockDocument,
    };

    mockRendition = {
      annotations: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      on: vi.fn(),
      off: vi.fn(),
      getContents: vi.fn().mockReturnValue([mockContent]),
      getRange: vi.fn().mockReturnValue({
        cloneRange: vi.fn().mockReturnValue({
          collapse: vi.fn(),
          insertNode: vi.fn(),
        }),
      }),
    };
  });

  it("should update highlight and update notes icon", async () => {
    const initialHighlight = { _id: "h1", cfiRange: "cfi1", color: "yellow", notes: "" };
    apiClient.get.mockResolvedValue({ highlights: [initialHighlight] });
    
    const { result } = renderHook(() =>
      useEPubHighlights({ bookId: "book-1", rendition: mockRendition })
    );
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updatedHighlight = { ...initialHighlight, notes: "New note" };
    apiClient.put.mockResolvedValue({ highlight: updatedHighlight });

    const mockSvg = {
        appendChild: vi.fn(),
    };

    const mockBBox = { x: 0, y: 0, width: 10, height: 10 };

    const mockHighlightEl = {
        closest: vi.fn().mockReturnValue(mockSvg),
        getBBox: vi.fn().mockReturnValue(mockBBox),
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
    };

    // Configure querySelector
    mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes(".notes-icon")) return null; // simulate icon missing
        return mockHighlightEl; // simulate highlight element found
    });

    await act(async () => {
      await result.current.updateHighlight("h1", { notes: "New note" });
    });

    expect(result.current.highlights[0].notes).toBe("New note");
    
    // Check flow
    expect(mockRendition.getContents).toHaveBeenCalled();
    expect(mockHighlightEl.closest).toHaveBeenCalledWith("svg");
    expect(mockHighlightEl.getBBox).toHaveBeenCalled();
    
    // This assertion was failing, let's verify if we reached this point
    expect(mockDocument.createElementNS).toHaveBeenCalled();
    expect(mockDocument.createElementNS).toHaveBeenCalledWith("http://www.w3.org/2000/svg", "g");
    
    expect(mockSvg.appendChild).toHaveBeenCalled();
  });

  // ... other tests (keeping them as is or simplified if needed)
  it("should initialize with empty highlights", () => {
    const { result } = renderHook(() =>
      useEPubHighlights({ bookId: "book-1", rendition: mockRendition })
    );
    expect(result.current.highlights).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("should fetch highlights success", async () => {
    const mockHighlights = [{ _id: "h1", cfiRange: "cfi", color: "yellow" }];
    apiClient.get.mockResolvedValue({ highlights: mockHighlights });

    const { result } = renderHook(() =>
      useEPubHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.highlights).toEqual(mockHighlights);
  });

  it("should handle fetch error", async () => {
    apiClient.get.mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() =>
      useEPubHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.highlights).toEqual([]);
  });

  it("should create highlight and add annotation", async () => {
    const newHighlight = { _id: "h2", cfiRange: "cfi2", color: "green", notes: "Test note" };
    apiClient.post.mockResolvedValue({ highlight: newHighlight });

    const { result } = renderHook(() =>
      useEPubHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created;
    await act(async () => {
      created = await result.current.createHighlight({
        selectedText: "text",
        cfiRange: "cfi2",
        color: "green",
        notes: "Test note"
      });
    });

    expect(created).toEqual(newHighlight);
    expect(result.current.highlights).toContainEqual(newHighlight);
    expect(mockRendition.annotations.add).toHaveBeenCalled();
  });

  it("should delete highlight and remove annotation/icon", async () => {
    const initialHighlight = { _id: "h1", cfiRange: "cfi1", color: "yellow" };
    apiClient.get.mockResolvedValue({ highlights: [initialHighlight] });
    apiClient.delete.mockResolvedValue({});

    const { result } = renderHook(() =>
      useEPubHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const mockIcon = { remove: vi.fn() };
    mockDocument.querySelector.mockImplementation((sel) => {
        if (sel.includes(".notes-icon")) return mockIcon;
        return null;
    });

    await act(async () => {
      await result.current.deleteHighlight("h1");
    });

    expect(result.current.highlights).toEqual([]);
    expect(mockRendition.annotations.remove).toHaveBeenCalledWith("cfi1", "highlight");
    expect(mockIcon.remove).toHaveBeenCalled();
  });

  it("should apply highlights on mount/update", async () => {
    const mockHighlights = [{ _id: "h1", cfiRange: "cfi", color: "yellow" }];
    apiClient.get.mockResolvedValue({ highlights: mockHighlights });

    renderHook(() =>
      useEPubHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => {
        expect(mockRendition.annotations.add).toHaveBeenCalled();
    });
  });

  it("should cleanup on unmount", async () => {
    const mockHighlights = [{ _id: "h1", cfiRange: "cfi", color: "yellow" }];
    apiClient.get.mockResolvedValue({ highlights: mockHighlights });
    
    const { unmount } = renderHook(() =>
      useEPubHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => expect(mockRendition.annotations.add).toHaveBeenCalled());

    unmount();

    expect(mockRendition.off).toHaveBeenCalled();
    expect(mockRendition.annotations.remove).toHaveBeenCalled();
  });
});
