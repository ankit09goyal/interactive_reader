import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEPubQuestionHighlights } from "@/components/ePubReader/hooks/useEPubQuestionHighlights";
import apiClient from "@/libs/api";
import { useSession } from "next-auth/react";

vi.mock("@/libs/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

describe("useEPubQuestionHighlights", () => {
  const mockRendition = {
    annotations: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    getContents: vi.fn().mockReturnValue([]),
    getRange: vi.fn().mockReturnValue(null),
    on: vi.fn(),
    off: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ data: { user: { id: "user-1" } } });
    // Reset mock return values
    mockRendition.getContents.mockReturnValue([]);
    mockRendition.getRange.mockReturnValue(null);
  });

  it("should fetch and filter question highlights", async () => {
    apiClient.get.mockResolvedValue({
      myQuestions: [
        {
          _id: "q1",
          selectedText: "text",
          epubCfiRange: "cfi",
          userId: "user-1",
        },
        {
          _id: "q2",
          selectedText: "text",
          epubCfiRange: null, // Should filter out
          userId: "user-1",
        },
        {
          _id: "q3",
          selectedText: "text",
          epubCfiRange: "cfi",
          userId: "user-2", // Different user, should filter out
        },
      ],
    });

    const { result } = renderHook(() =>
      useEPubQuestionHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.highlights).toHaveLength(1);
    expect(result.current.highlights[0].id).toBe("q1");
  });

  it("should add annotations for highlights", async () => {
    apiClient.get.mockResolvedValue({
      myQuestions: [
        {
          _id: "q1",
          selectedText: "text",
          epubCfiRange: "cfi",
          userId: "user-1",
        },
      ],
    });

    const { result } = renderHook(() =>
      useEPubQuestionHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Annotations are added in useEffect, which runs after render
    expect(mockRendition.annotations.add).toHaveBeenCalled();
  });

  it("should handle error when adding annotation", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    apiClient.get.mockResolvedValue({
      myQuestions: [
        {
          _id: "q1",
          selectedText: "text",
          epubCfiRange: "cfi",
          userId: "user-1",
        },
      ],
    });

    // Mock annotations.add to throw
    mockRendition.annotations.add.mockImplementationOnce(() => {
      throw new Error("Add failed");
    });

    const { result } = renderHook(() =>
      useEPubQuestionHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should catch error and log warning
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Failed to add question highlight:",
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it("should handle error when fetching questions", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    apiClient.get.mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() =>
      useEPubQuestionHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.highlights).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should register event listeners for page display", async () => {
    apiClient.get.mockResolvedValue({
      myQuestions: [
        {
          _id: "q1",
          selectedText: "text",
          epubCfiRange: "cfi",
          userId: "user-1",
        },
      ],
    });

    const { result } = renderHook(() =>
      useEPubQuestionHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should register event listeners for question icons
    expect(mockRendition.on).toHaveBeenCalledWith(
      "rendered",
      expect.any(Function)
    );
    expect(mockRendition.on).toHaveBeenCalledWith(
      "displayed",
      expect.any(Function)
    );
  });

  it("should add question icons when content is available", async () => {
    const mockDoc = {
      querySelector: vi.fn().mockReturnValue(null),
      createElement: vi.fn().mockReturnValue({
        className: "",
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        innerHTML: "",
        title: "",
      }),
    };

    const mockRange = {
      cloneRange: vi.fn().mockReturnValue({
        collapse: vi.fn(),
        insertNode: vi.fn(),
      }),
    };

    mockRendition.getContents.mockReturnValue([{ document: mockDoc }]);
    mockRendition.getRange.mockReturnValue(mockRange);

    apiClient.get.mockResolvedValue({
      myQuestions: [
        {
          _id: "q1",
          selectedText: "test text",
          epubCfiRange: "cfi-range",
          userId: "user-1",
        },
      ],
    });

    const { result } = renderHook(() =>
      useEPubQuestionHighlights({
        bookId: "book-1",
        rendition: mockRendition,
        onHighlightClick: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Wait for the timeout to add icons
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Should have tried to create the question icon
    expect(mockDoc.createElement).toHaveBeenCalledWith("span");
  });

  it("should cleanup icons and event listeners on unmount", async () => {
    const mockDoc = {
      querySelectorAll: vi.fn().mockReturnValue([
        { remove: vi.fn() },
        { remove: vi.fn() },
      ]),
    };

    mockRendition.getContents.mockReturnValue([{ document: mockDoc }]);

    apiClient.get.mockResolvedValue({
      myQuestions: [
        {
          _id: "q1",
          selectedText: "text",
          epubCfiRange: "cfi",
          userId: "user-1",
        },
      ],
    });

    const { result, unmount } = renderHook(() =>
      useEPubQuestionHighlights({ bookId: "book-1", rendition: mockRendition })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    unmount();

    // Should remove event listeners
    expect(mockRendition.off).toHaveBeenCalledWith(
      "rendered",
      expect.any(Function)
    );
    expect(mockRendition.off).toHaveBeenCalledWith(
      "displayed",
      expect.any(Function)
    );

    // Should remove annotations
    expect(mockRendition.annotations.remove).toHaveBeenCalled();
  });
});
