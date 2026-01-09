import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePDFViewMode } from "@/components/PDFReader/hooks/usePDFViewMode";
import apiClient from "@/libs/api";

// Mock API client
vi.mock("@/libs/api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("usePDFViewMode", () => {
  const mockGetCurrentPage = vi.fn().mockReturnValue(1);
  const mockViewerRef = { current: document.createElement("div") };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentPage.mockReturnValue(1);
  });

  it("should initialize with one-page mode", () => {
    const { result } = renderHook(() =>
      usePDFViewMode({ getCurrentPage: mockGetCurrentPage, viewerRef: mockViewerRef })
    );
    expect(result.current.viewMode).toBe("one-page");
  });

  it("should load preferences on mount", async () => {
    apiClient.get.mockResolvedValue({
      preferences: { readerViewMode: "continuous" },
    });

    const { result } = renderHook(() =>
      usePDFViewMode({ getCurrentPage: mockGetCurrentPage, viewerRef: mockViewerRef })
    );

    await waitFor(() => {
      expect(result.current.viewMode).toBe("continuous");
    });
  });

  it("should toggle view mode and save preference", () => {
    apiClient.get.mockResolvedValue({}); // No pref
    apiClient.put.mockResolvedValue({});

    const { result } = renderHook(() =>
      usePDFViewMode({ getCurrentPage: mockGetCurrentPage, viewerRef: mockViewerRef })
    );

    act(() => {
      result.current.toggleViewMode();
    });

    expect(result.current.viewMode).toBe("continuous");
    expect(apiClient.put).toHaveBeenCalledWith("/user/preferences", {
      readerViewMode: "continuous",
    });

    act(() => {
      result.current.toggleViewMode();
    });

    expect(result.current.viewMode).toBe("one-page");
    expect(apiClient.put).toHaveBeenCalledWith("/user/preferences", {
      readerViewMode: "one-page",
    });
  });

  it("should update rendered pages when switching to continuous", () => {
    const { result } = renderHook(() =>
      usePDFViewMode({ getCurrentPage: mockGetCurrentPage, viewerRef: mockViewerRef })
    );

    mockGetCurrentPage.mockReturnValue(5);

    act(() => {
      result.current.toggleViewMode();
    });

    expect(result.current.renderedPages.has(5)).toBe(true);
  });
});
