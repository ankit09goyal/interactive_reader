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
      hooks: {
        content: {
          register: vi.fn(),
        },
      },
      on: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn(),
      spread: vi.fn(),
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
    // Note: resize is now only called when manager is available (after display)
    // So we don't expect it to be called immediately on render
  });

  it("cleans up previous rendition when book changes", () => {
    const mockDestroy = vi.fn();
    const mockRendition1 = {
      themes: { default: vi.fn(), fontSize: vi.fn(), register: vi.fn() },
      hooks: { content: { register: vi.fn() } },
      on: vi.fn(),
      destroy: mockDestroy,
      resize: vi.fn(),
      spread: vi.fn(),
    };
    const mockRendition2 = {
      ...mockRendition1,
      hooks: { content: { register: vi.fn() } },
      destroy: vi.fn(),
      resize: vi.fn(),
      spread: vi.fn(),
    };

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
      hooks: { content: { register: vi.fn() } },
      on: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn(),
      spread: vi.fn(),
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
      hooks: { content: { register: vi.fn() } },
      on: vi.fn().mockImplementation((event, cb) => {
        if (event === "keyup") keyupCallback = cb;
      }),
      destroy: vi.fn(),
      resize: vi.fn(),
      spread: vi.fn(),
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

  it("registers content hook for table scroll wrapping", () => {
    const mockContentRegister = vi.fn();
    const mockRendition = {
      themes: { default: vi.fn(), fontSize: vi.fn(), register: vi.fn() },
      hooks: { content: { register: mockContentRegister } },
      on: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn(),
      spread: vi.fn(),
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

    // Verify the content hook was registered for table wrapping
    expect(mockContentRegister).toHaveBeenCalled();
    expect(mockContentRegister).toHaveBeenCalledWith(expect.any(Function));
  });

  it("wraps tables in scrollable containers when content hook is called", () => {
    let contentCallback;
    const mockContentRegister = vi.fn().mockImplementation((cb) => {
      contentCallback = cb;
    });
    const mockRendition = {
      themes: { default: vi.fn(), fontSize: vi.fn(), register: vi.fn() },
      hooks: { content: { register: mockContentRegister } },
      on: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn(),
      spread: vi.fn(),
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

    // Simulate the content hook being called with a mock document containing a table
    const mockTable = document.createElement("table");
    const mockParent = document.createElement("div");
    mockParent.appendChild(mockTable);

    const mockContents = {
      document: {
        querySelectorAll: vi.fn().mockReturnValue([mockTable]),
        createElement: vi.fn().mockImplementation((tag) => {
          const el = document.createElement(tag);
          return el;
        }),
        getElementById: vi.fn().mockReturnValue(null),
        head: {
          appendChild: vi.fn(),
        },
      },
    };

    // Call the content callback
    contentCallback(mockContents);

    // Verify table was wrapped
    expect(
      mockTable.parentElement.classList.contains("table-scroll-wrapper")
    ).toBe(true);
    expect(mockTable.parentElement.style.maxHeight).toBe("70vh");
    expect(mockTable.parentElement.style.overflow).toBe("auto");
  });

  it("does not re-wrap already wrapped tables", () => {
    let contentCallback;
    const mockContentRegister = vi.fn().mockImplementation((cb) => {
      contentCallback = cb;
    });
    const mockRendition = {
      themes: { default: vi.fn(), fontSize: vi.fn(), register: vi.fn() },
      hooks: { content: { register: mockContentRegister } },
      on: vi.fn(),
      destroy: vi.fn(),
      resize: vi.fn(),
      spread: vi.fn(),
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

    // Create a table that's already wrapped
    const mockWrapper = document.createElement("div");
    mockWrapper.classList.add("table-scroll-wrapper");
    const mockTable = document.createElement("table");
    mockWrapper.appendChild(mockTable);

    // Track if createElement was called for wrapper (style element will be created)
    let wrapperCreateCount = 0;
    const mockContents = {
      document: {
        querySelectorAll: vi.fn().mockReturnValue([mockTable]),
        createElement: vi.fn().mockImplementation((tag) => {
          if (tag === "div") wrapperCreateCount++;
          return document.createElement(tag);
        }),
        getElementById: vi.fn().mockReturnValue(null),
        head: {
          appendChild: vi.fn(),
        },
      },
    };

    // Call the content callback
    contentCallback(mockContents);

    // Verify no wrapper div was created (style element is created but no wrapper)
    expect(wrapperCreateCount).toBe(0);
  });
});
