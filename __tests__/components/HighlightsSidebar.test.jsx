import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock DeleteModal
vi.mock("@/components/DeleteModal", () => ({
  default: ({
    title,
    itemPreview,
    warningMessage,
    confirmButtonText,
    onClose,
    onConfirm,
    isDeleting,
  }) => (
    <div data-testid="delete-modal">
      <h3>{title}</h3>
      <div data-testid="item-preview">{itemPreview}</div>
      <p data-testid="warning-message">{warningMessage}</p>
      <button onClick={onClose} disabled={isDeleting}>
        Cancel
      </button>
      <button onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? "Deleting..." : confirmButtonText}
      </button>
    </div>
  ),
}));

// Mock icons
vi.mock("@/libs/icons", () => ({
  default: {
    close: <span data-testid="close-icon">×</span>,
    pencil: <span data-testid="pencil-icon">✎</span>,
    delete: <span data-testid="delete-icon">🗑</span>,
  },
}));

import HighlightsSidebar from "@/components/HighlightsSidebar";
import { toast } from "react-hot-toast";

describe("HighlightsSidebar Component", () => {
  const mockHighlights = [
    {
      _id: "highlight-1",
      selectedText: "First highlighted text passage from the book.",
      notes: "My notes about this highlight",
      color: "yellow",
      cfi: "epubcfi(/6/4)",
      cfiRange: "epubcfi(/6/4,/1:0,/1:20)",
      createdAt: "2024-01-15T10:00:00.000Z",
    },
    {
      _id: "highlight-2",
      selectedText: "Second highlighted text without notes.",
      notes: null,
      color: "blue",
      cfi: "epubcfi(/6/8)",
      cfiRange: "epubcfi(/6/8,/1:0,/1:30)",
      createdAt: "2024-01-20T10:00:00.000Z",
    },
    {
      _id: "highlight-3",
      selectedText:
        "A very long highlighted text that exceeds the 150 character limit and should show the Show more button to expand the full text content. This is additional text to make it longer than 150 characters.",
      notes:
        "A very long note that exceeds the 150 character limit and should show the Show more button to expand the full text content. This is additional text to make it longer than 150 characters.",
      color: "green",
      cfi: "epubcfi(/6/12)",
      cfiRange: "epubcfi(/6/12,/1:0,/1:50)",
      createdAt: "2024-01-25T10:00:00.000Z",
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    highlights: mockHighlights,
    onHighlightClick: vi.fn(),
    onGoToLocation: vi.fn(),
    onHighlightDeleted: vi.fn(),
    highlightedNoteId: null,
    highlightedNoteClicked: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<HighlightsSidebar {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Highlights & Notes")).not.toBeInTheDocument();
    });

    it("should render the sidebar when isOpen is true", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      expect(screen.getByText("Highlights & Notes")).toBeInTheDocument();
    });

    it("should render all highlights", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      expect(
        screen.getByText("First highlighted text passage from the book.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Second highlighted text without notes.")
      ).toBeInTheDocument();
    });

    it("should render notes when available", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      expect(
        screen.getByText("My notes about this highlight")
      ).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      expect(screen.getByTestId("close-icon")).toBeInTheDocument();
    });

    it("should render Add Note button for highlights without notes", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      expect(screen.getByText("Add Note")).toBeInTheDocument();
    });

    it("should render dates for each highlight", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      expect(screen.getByText("1/15/2024")).toBeInTheDocument();
      expect(screen.getByText("1/20/2024")).toBeInTheDocument();
    });

    it("should render Go to Highlight buttons", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      const goToButtons = screen.getAllByText("Go to Highlight");
      expect(goToButtons.length).toBe(3);
    });
  });

  describe("Empty State", () => {
    it("should show empty message when no highlights", () => {
      render(<HighlightsSidebar {...defaultProps} highlights={[]} />);

      expect(
        screen.getByText(/No highlights yet/i)
      ).toBeInTheDocument();
    });
  });

  describe("Expand/Collapse Text", () => {
    it("should show Show more button for long highlighted text", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      const showMoreButtons = screen.getAllByText("Show more");
      expect(showMoreButtons.length).toBeGreaterThan(0);
    });

    it("should toggle text expansion when Show more is clicked", async () => {
      const user = userEvent.setup();
      render(<HighlightsSidebar {...defaultProps} />);

      const showMoreButtons = screen.getAllByText("Show more");
      await user.click(showMoreButtons[0]);

      expect(screen.getByText("Show less")).toBeInTheDocument();
    });
  });

  describe("Button Actions", () => {
    it("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<HighlightsSidebar {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").closest("button");
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onHighlightClick when edit note button is clicked", async () => {
      const user = userEvent.setup();
      render(<HighlightsSidebar {...defaultProps} />);

      // Click on Add Note button (for highlight without notes)
      const addNoteButton = screen.getByText("Add Note");
      await user.click(addNoteButton);

      expect(defaultProps.onHighlightClick).toHaveBeenCalledWith("highlight-2");
    });

    it("should call onGoToLocation when Go to Highlight is clicked", async () => {
      const user = userEvent.setup();
      render(<HighlightsSidebar {...defaultProps} />);

      const goToButtons = screen.getAllByText("Go to Highlight");
      await user.click(goToButtons[0]);

      expect(defaultProps.onGoToLocation).toHaveBeenCalledWith(
        "epubcfi(/6/4,/1:0,/1:20)"
      );
    });
  });

  describe("Delete Functionality", () => {
    it("should open delete modal when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<HighlightsSidebar {...defaultProps} />);

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
    });

    it("should close delete modal when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<HighlightsSidebar {...defaultProps} />);

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      expect(screen.getByTestId("delete-modal")).toBeInTheDocument();

      await user.click(screen.getByText("Cancel"));

      expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    });

    it("should call onHighlightDeleted when delete is confirmed", async () => {
      const user = userEvent.setup();
      defaultProps.onHighlightDeleted.mockResolvedValue();
      render(<HighlightsSidebar {...defaultProps} />);

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      await user.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(defaultProps.onHighlightDeleted).toHaveBeenCalledWith(
          "highlight-1"
        );
      });
    });

    it("should show error toast if delete fails", async () => {
      const user = userEvent.setup();
      defaultProps.onHighlightDeleted.mockRejectedValue(
        new Error("Delete failed")
      );
      render(<HighlightsSidebar {...defaultProps} />);

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      await user.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Delete failed");
      });
    });
  });

  describe("Highlight Navigation", () => {
    it("should scroll to highlighted note when highlightedNoteClicked changes", async () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      const { rerender } = render(
        <HighlightsSidebar
          {...defaultProps}
          highlightedNoteId="highlight-1"
          highlightedNoteClicked={0}
        />
      );

      rerender(
        <HighlightsSidebar
          {...defaultProps}
          highlightedNoteId="highlight-1"
          highlightedNoteClicked={1}
        />
      );

      await waitFor(
        () => {
          expect(scrollIntoViewMock).toHaveBeenCalled();
        },
        { timeout: 500 }
      );
    });
  });

  describe("Color Styling", () => {
    it("should apply correct color class for yellow highlight", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      const yellowHighlight = screen
        .getByText("First highlighted text passage from the book.")
        .closest("div");
      expect(yellowHighlight.className).toContain("border-yellow-400");
    });

    it("should apply correct color class for blue highlight", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      const blueHighlight = screen
        .getByText("Second highlighted text without notes.")
        .closest("div");
      expect(blueHighlight.className).toContain("border-blue-400");
    });

    it("should apply correct color class for green highlight", () => {
      render(<HighlightsSidebar {...defaultProps} />);

      // Find the green highlight by looking for "green" in the class
      const greenHighlight = document.querySelector(".border-green-400");
      expect(greenHighlight).toBeInTheDocument();
    });
  });

  describe("Delete Modal Content", () => {
    it("should show highlight notes in delete modal preview", async () => {
      const user = userEvent.setup();
      render(<HighlightsSidebar {...defaultProps} />);

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      // The text is within a <strong> element, so we need to search within the preview
      const preview = screen.getByTestId("item-preview");
      expect(preview).toHaveTextContent("My notes about this highlight");
    });

    it("should show highlighted text in delete modal preview", async () => {
      const user = userEvent.setup();
      render(<HighlightsSidebar {...defaultProps} />);

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      // The text includes HTML elements like <strong> and <br />, so we check the container
      const preview = screen.getByTestId("item-preview");
      expect(preview).toHaveTextContent("First highlighted text passage from the book.");
    });
  });
});
