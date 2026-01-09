import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EPubViewer from "@/components/ePubReader/ePubViewer";

describe("EPubViewer Component", () => {
  const mockCreateRendition = vi.fn();
  const mockBook = { resources: {} }; // valid book object

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading spinner when isLoading is true", () => {
    const { container } = render(
      <EPubViewer
        book={null}
        isLoading={true}
        error={null}
        createRendition={mockCreateRendition}
        fontSize={16}
      />
    );
    const spinner = container.querySelector(".loading-spinner");
    expect(spinner).toBeInTheDocument();
  });

  it("renders error message when error is present", () => {
    render(
      <EPubViewer
        book={null}
        isLoading={false}
        error="Failed to load"
        createRendition={mockCreateRendition}
        fontSize={16}
      />
    );
    expect(screen.getByText("Failed to Load Book")).toBeInTheDocument();
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("renders container and creates rendition when loaded", () => {
    const mockRendition = {
      themes: {
        default: vi.fn(),
        fontSize: vi.fn(),
        register: vi.fn(),
      },
      on: vi.fn(),
      destroy: vi.fn(),
    };
    mockCreateRendition.mockReturnValue(mockRendition);

    const { container } = render(
      <EPubViewer
        book={mockBook}
        isLoading={false}
        error={null}
        createRendition={mockCreateRendition}
        fontSize={16}
      />
    );
    expect(container.querySelector(".epub-container")).toBeInTheDocument();
    expect(mockCreateRendition).toHaveBeenCalled();
    expect(mockRendition.themes.fontSize).toHaveBeenCalledWith("16px");
  });

  it("cleans up previous rendition when book changes", () => {
    const mockDestroy = vi.fn();
    const mockRendition1 = {
      themes: { default: vi.fn(), fontSize: vi.fn(), register: vi.fn() },
      on: vi.fn(),
      destroy: mockDestroy,
    };
    const mockRendition2 = { ...mockRendition1, destroy: vi.fn() };

    mockCreateRendition
      .mockReturnValueOnce(mockRendition1)
      .mockReturnValueOnce(mockRendition2);

    const { rerender } = render(
      <EPubViewer
        book={mockBook}
        isLoading={false}
        error={null}
        createRendition={mockCreateRendition}
        fontSize={16}
      />
    );

    const newBook = { resources: {} };
    rerender(
      <EPubViewer
        book={newBook}
        isLoading={false}
        error={null}
        createRendition={mockCreateRendition}
        fontSize={16}
      />
    );

    expect(mockDestroy).toHaveBeenCalled();
    expect(mockCreateRendition).toHaveBeenCalledTimes(2);
  });

  it("updates font size when prop changes", () => {
    const mockFontSizeFn = vi.fn();
    const mockRendition = {
      themes: { default: vi.fn(), fontSize: mockFontSizeFn, register: vi.fn() },
      on: vi.fn(),
      destroy: vi.fn(),
    };
    mockCreateRendition.mockReturnValue(mockRendition);

    const { rerender } = render(
      <EPubViewer
        book={mockBook}
        isLoading={false}
        error={null}
        createRendition={mockCreateRendition}
        fontSize={16}
      />
    );

    expect(mockFontSizeFn).toHaveBeenCalledWith("16px");

    rerender(
      <EPubViewer
        book={mockBook}
        isLoading={false}
        error={null}
        createRendition={mockCreateRendition}
        fontSize={20}
      />
    );

    expect(mockFontSizeFn).toHaveBeenCalledWith("20px");
  });

  it("handles keyboard navigation", () => {
    let keyupCallback;
    const mockNext = vi.fn();
    const mockPrev = vi.fn();
    const mockRendition = {
      themes: { default: vi.fn(), fontSize: vi.fn(), register: vi.fn() },
      on: vi.fn().mockImplementation((event, cb) => {
        if (event === "keyup") keyupCallback = cb;
      }),
      destroy: vi.fn(),
      next: mockNext,
      prev: mockPrev,
    };
    mockCreateRendition.mockReturnValue(mockRendition);

    render(
      <EPubViewer
        book={mockBook}
        isLoading={false}
        error={null}
        createRendition={mockCreateRendition}
        fontSize={16}
      />
    );

    expect(keyupCallback).toBeDefined();

    act(() => {
      keyupCallback({ key: "ArrowRight" });
    });
    expect(mockNext).toHaveBeenCalled();

    act(() => {
      keyupCallback({ key: "ArrowLeft" });
    });
    expect(mockPrev).toHaveBeenCalled();
  });
});
