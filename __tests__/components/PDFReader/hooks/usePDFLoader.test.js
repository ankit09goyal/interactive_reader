import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Polyfill DOMMatrix for JSDOM
global.DOMMatrix = class DOMMatrix {};

// Mock objects
const mockPdfDoc = {
  numPages: 5,
};

const mockGetDocument = {
  promise: Promise.resolve(mockPdfDoc),
};

const mockPdfJs = {
  GlobalWorkerOptions: {
    workerSrc: "",
  },
  getDocument: vi.fn().mockReturnValue(mockGetDocument),
};

describe("usePDFLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const getHook = async () => {
    // Mock pdfjs-dist before importing the hook
    vi.doMock("pdfjs-dist", () => ({
      default: mockPdfJs,
      GlobalWorkerOptions: mockPdfJs.GlobalWorkerOptions,
      getDocument: mockPdfJs.getDocument,
    }));

    // We also mock the specific build file if it's being resolved directly
    vi.doMock("pdfjs-dist/build/pdf.mjs", () => ({
      default: mockPdfJs,
      GlobalWorkerOptions: mockPdfJs.GlobalWorkerOptions,
      getDocument: mockPdfJs.getDocument,
    }));

    // Import the hook dynamically
    const { usePDFLoader } = await import(
      "@/components/PDFReader/hooks/usePDFLoader"
    );
    return usePDFLoader;
  };

  it("should initialize with default states", async () => {
    const usePDFLoader = await getHook();
    const { result } = renderHook(() => usePDFLoader(null));
    expect(result.current.pdfDoc).toBeNull();
    expect(result.current.totalPages).toBe(0);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should successfully load a PDF", async () => {
    const usePDFLoader = await getHook();
    const { result } = renderHook(() => usePDFLoader("/test.pdf"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pdfDoc).not.toBeNull();
    expect(result.current.totalPages).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it("should handle error during loading", async () => {
    const mockError = new Error("Failed to load");

    // Suppress console error
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Setup rejection using Promise.reject - attach a no-op catch to prevent unhandled rejection
    const rejectedPromise = Promise.reject(mockError);
    rejectedPromise.catch(() => {}); // Prevent unhandled rejection warning

    mockPdfJs.getDocument.mockReturnValueOnce({
      promise: rejectedPromise,
    });

    const usePDFLoader = await getHook();
    const { result } = renderHook(() => usePDFLoader("/error.pdf"));

    // Wait for the error to be handled and loading to complete
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toBeTruthy();
    expect(result.current.pdfDoc).toBeNull();

    // Clean up
    consoleErrorSpy.mockRestore();
  });

  it("should cleanup tasks on unmount", async () => {
    const usePDFLoader = await getHook();
    const mockCancel = vi.fn();

    const { result, unmount } = renderHook(() => usePDFLoader("/test.pdf"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Manually add a task
    result.current.renderTasksRef.current.set(1, { cancel: mockCancel });

    unmount();

    expect(mockCancel).toHaveBeenCalled();
    expect(result.current.renderTasksRef.current.size).toBe(0);
  });
});
