import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock icons
vi.mock("@/libs/icons", () => ({
  default: {
    close: <span data-testid="close-icon">×</span>,
  },
}));

import NotesModal from "@/components/NotesModal";

describe("NotesModal Component", () => {
  const mockHighlight = {
    _id: "highlight-123",
    selectedText: "This is the highlighted text from the book.",
    notes: "Existing notes for this highlight",
    color: "yellow",
    chapterTitle: "Chapter 5: Introduction",
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    highlight: mockHighlight,
    onSave: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<NotesModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Edit Note")).not.toBeInTheDocument();
    });

    it("should render the modal when isOpen is true", () => {
      render(<NotesModal {...defaultProps} />);

      expect(screen.getByText("Edit Note")).toBeInTheDocument();
    });

    it("should show Add Note title when highlight has no notes", () => {
      render(
        <NotesModal
          {...defaultProps}
          highlight={{ ...mockHighlight, notes: "" }}
        />
      );

      expect(screen.getByText("Add Note")).toBeInTheDocument();
    });

    it("should display highlighted text preview", () => {
      render(<NotesModal {...defaultProps} />);

      expect(screen.getByText("Highlighted Text:")).toBeInTheDocument();
      expect(
        screen.getByText(/This is the highlighted text from the book/i)
      ).toBeInTheDocument();
    });

    it("should display chapter title when available", () => {
      render(<NotesModal {...defaultProps} />);

      expect(
        screen.getByText("Chapter: Chapter 5: Introduction")
      ).toBeInTheDocument();
    });

    it("should not display chapter title when not available", () => {
      render(
        <NotesModal
          {...defaultProps}
          highlight={{ ...mockHighlight, chapterTitle: null }}
        />
      );

      expect(screen.queryByText(/Chapter:/)).not.toBeInTheDocument();
    });

    it("should render color selector with all options", () => {
      render(<NotesModal {...defaultProps} />);

      expect(screen.getByText("Highlight Color")).toBeInTheDocument();
      expect(screen.getByTitle("Yellow")).toBeInTheDocument();
      expect(screen.getByTitle("Green")).toBeInTheDocument();
      expect(screen.getByTitle("Blue")).toBeInTheDocument();
      expect(screen.getByTitle("Pink")).toBeInTheDocument();
      expect(screen.getByTitle("Orange")).toBeInTheDocument();
    });

    it("should render notes textarea", () => {
      render(<NotesModal {...defaultProps} />);

      expect(screen.getByText("Your Notes")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Add your notes about this highlight...")
      ).toBeInTheDocument();
    });

    it("should pre-fill notes from highlight", () => {
      render(<NotesModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Add your notes about this highlight..."
      );
      expect(textarea.value).toBe("Existing notes for this highlight");
    });

    it("should render save and cancel buttons", () => {
      render(<NotesModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
    });
  });

  describe("Color Selection", () => {
    it("should highlight the current color", () => {
      render(<NotesModal {...defaultProps} />);

      const yellowButton = screen.getByTitle("Yellow");
      expect(yellowButton.className).toContain("border-base-content");
    });

    it("should change color when clicking a different color", async () => {
      const user = userEvent.setup();
      render(<NotesModal {...defaultProps} />);

      const blueButton = screen.getByTitle("Blue");
      await user.click(blueButton);

      expect(blueButton.className).toContain("border-base-content");
    });
  });

  describe("Notes Input", () => {
    it("should update notes when typing", async () => {
      const user = userEvent.setup();
      render(<NotesModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Add your notes about this highlight..."
      );
      await user.clear(textarea);
      await user.type(textarea, "New notes content");

      expect(textarea.value).toBe("New notes content");
    });
  });

  describe("Form Submission", () => {
    it("should call onSave with notes and color when save is clicked", async () => {
      const user = userEvent.setup();
      render(<NotesModal {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith({
        notes: "Existing notes for this highlight",
        color: "yellow",
      });
    });

    it("should call onSave with updated values", async () => {
      const user = userEvent.setup();
      render(<NotesModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Add your notes about this highlight..."
      );
      await user.clear(textarea);
      await user.type(textarea, "Updated notes");

      const blueButton = screen.getByTitle("Blue");
      await user.click(blueButton);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith({
        notes: "Updated notes",
        color: "blue",
      });
    });

    it("should call onSave with null notes if notes are empty", async () => {
      const user = userEvent.setup();
      render(<NotesModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(
        "Add your notes about this highlight..."
      );
      await user.clear(textarea);

      const saveButton = screen.getByRole("button", { name: /save/i });
      // Save button should be disabled when notes are empty
      expect(saveButton).toBeDisabled();
    });

    it("should close modal after saving", async () => {
      const user = userEvent.setup();
      render(<NotesModal {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("should disable textarea when loading", () => {
      render(<NotesModal {...defaultProps} isLoading={true} />);

      const textarea = screen.getByPlaceholderText(
        "Add your notes about this highlight..."
      );
      expect(textarea).toBeDisabled();
    });

    it("should disable color buttons when loading", () => {
      render(<NotesModal {...defaultProps} isLoading={true} />);

      const colorButtons = screen.getAllByTitle(/Yellow|Green|Blue|Pink|Orange/);
      colorButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("should disable cancel button when loading", () => {
      render(<NotesModal {...defaultProps} isLoading={true} />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    });

    it("should show loading state on save button", () => {
      render(<NotesModal {...defaultProps} isLoading={true} />);

      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });

  describe("Modal Close Behavior", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<NotesModal {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when backdrop is clicked", () => {
      render(<NotesModal {...defaultProps} />);

      const backdrop = document.querySelector(".bg-black\\/50");
      fireEvent.click(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", () => {
      render(<NotesModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<NotesModal {...defaultProps} />);

      const closeButton = screen.getAllByRole("button").find(
        (btn) => btn.classList.contains("btn-square")
      );
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Form Reset", () => {
    it("should reset form values when modal reopens with different highlight", () => {
      const { rerender } = render(
        <NotesModal {...defaultProps} isOpen={false} />
      );

      const newHighlight = {
        _id: "highlight-456",
        selectedText: "Different text",
        notes: "Different notes",
        color: "green",
      };

      rerender(
        <NotesModal {...defaultProps} isOpen={true} highlight={newHighlight} />
      );

      const textarea = screen.getByPlaceholderText(
        "Add your notes about this highlight..."
      );
      expect(textarea.value).toBe("Different notes");
    });
  });

  describe("Without highlighted text", () => {
    it("should not show text preview when selectedText is not available", () => {
      render(
        <NotesModal
          {...defaultProps}
          highlight={{ ...mockHighlight, selectedText: null }}
        />
      );

      expect(screen.queryByText("Highlighted Text:")).not.toBeInTheDocument();
    });
  });
});
