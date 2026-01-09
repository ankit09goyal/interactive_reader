import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEPubNavigation } from "@/components/ePubReader/hooks/useEPubNavigation";
import apiClient from "@/libs/api";

vi.mock("@/libs/api", () => ({
  default: {
    put: vi.fn().mockResolvedValue({}),
  },
}));

describe("useEPubNavigation", () => {
  let mockRendition;
  const defaultProps = {
    bookId: "book-1",
    toc: [
        { href: "ch1.html", label: "Chapter 1", subitems: [] },
        { href: "ch2.html", label: "Chapter 2", subitems: [{ href: "ch2-1.html", label: "Section 2.1" }] }
    ],
    initialLocation: null,
    initialFontSize: 16,
    preferencesLoaded: true,
    onLocationChange: vi.fn(),
    onFontSizeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockRendition = {
      display: vi.fn().mockResolvedValue(true),
      next: vi.fn(),
      prev: vi.fn(),
      themes: {
        fontSize: vi.fn(),
      },
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize and display initial location", () => {
    const { result } = renderHook(() => 
        useEPubNavigation({ ...defaultProps, rendition: mockRendition, initialLocation: "cfi123" })
    );
    
    expect(mockRendition.display).toHaveBeenCalledWith("cfi123");
  });

  it("should handle navigation (next/prev)", () => {
    const { result } = renderHook(() => 
        useEPubNavigation({ ...defaultProps, rendition: mockRendition })
    );

    act(() => result.current.nextPage());
    expect(mockRendition.next).toHaveBeenCalled();

    act(() => result.current.prevPage());
    expect(mockRendition.prev).toHaveBeenCalled();
  });

  it("should go to specific location and chapter", () => {
    const { result } = renderHook(() => 
        useEPubNavigation({ ...defaultProps, rendition: mockRendition })
    );

    act(() => result.current.goToLocation("cfi:location"));
    expect(mockRendition.display).toHaveBeenCalledWith("cfi:location");

    act(() => result.current.goToChapter("ch1.html"));
    expect(mockRendition.display).toHaveBeenCalledWith("ch1.html");
  });

  it("should change font size and debounce save", () => {
    const { result } = renderHook(() => 
        useEPubNavigation({ ...defaultProps, rendition: mockRendition })
    );

    act(() => result.current.increaseFontSize());
    expect(result.current.fontSize).toBe(18);
    expect(mockRendition.themes.fontSize).toHaveBeenCalledWith("18px");

    // Advance timer to trigger save
    act(() => {
        vi.runAllTimers();
    });
    expect(apiClient.put).toHaveBeenCalledWith(
        "/user/books/book-1/preferences", 
        { fontSize: 18 }
    );
  });

  it("should handle relocation events", () => {
    let relocatedCallback;
    mockRendition.on.mockImplementation((event, cb) => {
        if (event === "relocated") relocatedCallback = cb;
    });

    const { result } = renderHook(() => 
        useEPubNavigation({ ...defaultProps, rendition: mockRendition })
    );

    expect(relocatedCallback).toBeDefined();

    const locationData = {
        start: { cfi: "cfi_new", href: "ch2.html" },
        atStart: false,
        atEnd: true
    };

    act(() => {
        relocatedCallback(locationData);
    });

    expect(result.current.currentLocation).toBe("cfi_new");
    expect(result.current.currentChapter.href).toBe("ch2.html");
    expect(result.current.atEnd).toBe(true);
    expect(defaultProps.onLocationChange).toHaveBeenCalledWith("cfi_new", locationData);

    // Check debounced location save
    act(() => {
        vi.runAllTimers();
    });
    expect(apiClient.put).toHaveBeenCalledWith(
        "/user/books/book-1/preferences", 
        { lastLocation: "cfi_new" }
    );
  });

  it("should save preferences on unmount (beforeunload)", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    
    const { unmount } = renderHook(() => 
        useEPubNavigation({ ...defaultProps, rendition: mockRendition })
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });
});
