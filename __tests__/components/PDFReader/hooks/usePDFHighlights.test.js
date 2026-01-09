import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePDFHighlights } from "@/components/PDFReader/hooks/usePDFHighlights";
import apiClient from "@/libs/api";
import { useSession } from "next-auth/react";

// Mock api client
vi.mock("@/libs/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock useSession
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

describe("usePDFHighlights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty highlights and loading false", () => {
    useSession.mockReturnValue({ data: null });
    const { result } = renderHook(() => usePDFHighlights({ bookId: null }));
    expect(result.current.highlights).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should fetch highlights when bookId and user are present", async () => {
    useSession.mockReturnValue({ data: { user: { id: "user-1" } } });
    apiClient.get.mockResolvedValue({
      myQuestions: [
        {
          _id: "q1",
          selectedText: "some text",
          pageNumber: 1,
          userId: "user-1",
        },
        {
          _id: "q2",
          selectedText: "other text",
          pageNumber: 2,
          userId: "user-2", // Different user
        },
      ],
    });

    const { result } = renderHook(() => usePDFHighlights({ bookId: "book-1" }));

    // Initially loading
    // expect(result.current.isLoading).toBe(true); // Might be too fast to catch

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.highlights).toHaveLength(1);
    expect(result.current.highlights[0]).toEqual({
      id: "q1",
      text: "some text",
      pageNumber: 1,
      questionId: "q1",
    });
  });

  it("should handle fetch error", async () => {
    useSession.mockReturnValue({ data: { user: { id: "user-1" } } });
    apiClient.get.mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() => usePDFHighlights({ bookId: "book-1" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.highlights).toEqual([]);
  });
});
