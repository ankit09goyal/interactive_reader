import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock icons
vi.mock("@/libs/icons", () => ({
  default: {
    pencil: <span data-testid="pencil-icon">✎</span>,
    question: <span data-testid="question-icon">?</span>,
    book: <span data-testid="book-icon">📖</span>,
  },
}));

import TextSelectionMenu from "@/components/TextSelectionMenu";

describe("TextSelectionMenu Component", () => {
  const defaultProps = {
    position: { x: 100, y: 200 },
    selectedText: "This is the selected text from the book.",
    onAskQuestion: vi.fn(),
    onCreatePublicQA: vi.fn(),
    onClose: vi.fn(),
    isAdmin: false,
    isEPub: false,
    onAddHighlight: vi.fn(),
    onAddNotes: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when position is null", () => {
      render(<TextSelectionMenu {...defaultProps} position={null} />);

      expect(screen.queryByText("Ask Question")).not.toBeInTheDocument();
    });

    it("should not render when selectedText is empty", () => {
      render(<TextSelectionMenu {...defaultProps} selectedText="" />);

      expect(screen.queryByText("Ask Question")).not.toBeInTheDocument();
    });

    it("should render the menu when position and selectedText are provided", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      expect(screen.getByText("Ask Question")).toBeInTheDocument();
    });

    it("should render at the correct position", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      const menu = document.querySelector(".fixed");
      expect(menu).toHaveStyle({ left: "100px", top: "200px" });
    });

    it("should render Take Notes button", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      expect(screen.getByText("Take Notes")).toBeInTheDocument();
    });

    it("should render Ask Question button", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      expect(screen.getByText("Ask Question")).toBeInTheDocument();
    });

    it("should render selected text preview (truncated)", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      expect(
        screen.getByText(/This is the selected text from the book/i)
      ).toBeInTheDocument();
    });

    it("should truncate long selected text", () => {
      const longText = "A".repeat(100);
      render(<TextSelectionMenu {...defaultProps} selectedText={longText} />);

      expect(screen.getByText(/A{50}\.\.\./)).toBeInTheDocument();
    });
  });

  describe("Highlight Color Options", () => {
    it("should render color options when onAddHighlight is provided", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      expect(screen.getByTitle("Yellow")).toBeInTheDocument();
      expect(screen.getByTitle("Green")).toBeInTheDocument();
      expect(screen.getByTitle("Blue")).toBeInTheDocument();
      expect(screen.getByTitle("Pink")).toBeInTheDocument();
      expect(screen.getByTitle("Orange")).toBeInTheDocument();
    });

    it("should not render color options when onAddHighlight is not provided", () => {
      render(<TextSelectionMenu {...defaultProps} onAddHighlight={null} />);

      expect(screen.queryByTitle("Yellow")).not.toBeInTheDocument();
    });

    it("should call onAddHighlight with correct color when color button is clicked", async () => {
      const user = userEvent.setup();
      render(<TextSelectionMenu {...defaultProps} />);

      await user.click(screen.getByTitle("Yellow"));
      expect(defaultProps.onAddHighlight).toHaveBeenCalledWith("yellow");

      await user.click(screen.getByTitle("Green"));
      expect(defaultProps.onAddHighlight).toHaveBeenCalledWith("green");

      await user.click(screen.getByTitle("Blue"));
      expect(defaultProps.onAddHighlight).toHaveBeenCalledWith("blue");

      await user.click(screen.getByTitle("Pink"));
      expect(defaultProps.onAddHighlight).toHaveBeenCalledWith("pink");

      await user.click(screen.getByTitle("Orange"));
      expect(defaultProps.onAddHighlight).toHaveBeenCalledWith("orange");
    });
  });

  describe("Admin Features", () => {
    it("should not render Create Public Q&A button for non-admin users", () => {
      render(<TextSelectionMenu {...defaultProps} isAdmin={false} />);

      expect(screen.queryByText("Create Public Q&A")).not.toBeInTheDocument();
    });

    it("should render Create Public Q&A button for admin users", () => {
      render(<TextSelectionMenu {...defaultProps} isAdmin={true} />);

      expect(screen.getByText("Create Public Q&A")).toBeInTheDocument();
    });

    it("should call onCreatePublicQA with selected text when button is clicked", async () => {
      const user = userEvent.setup();
      render(<TextSelectionMenu {...defaultProps} isAdmin={true} />);

      await user.click(screen.getByText("Create Public Q&A"));

      expect(defaultProps.onCreatePublicQA).toHaveBeenCalledWith(
        "This is the selected text from the book."
      );
    });
  });

  describe("Button Actions", () => {
    it("should call onAskQuestion with selected text when Ask Question is clicked", async () => {
      const user = userEvent.setup();
      render(<TextSelectionMenu {...defaultProps} />);

      await user.click(screen.getByText("Ask Question"));

      expect(defaultProps.onAskQuestion).toHaveBeenCalledWith(
        "This is the selected text from the book."
      );
    });

    it("should call onAddNotes with selected text when Take Notes is clicked", async () => {
      const user = userEvent.setup();
      render(<TextSelectionMenu {...defaultProps} />);

      await user.click(screen.getByText("Take Notes"));

      expect(defaultProps.onAddNotes).toHaveBeenCalledWith(
        "This is the selected text from the book."
      );
    });
  });

  describe("Close Behavior", () => {
    it("should call onClose when clicking outside the menu", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      fireEvent.mouseDown(document.body);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should not call onClose when clicking inside the menu", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      const menu = document.querySelector(".fixed");
      fireEvent.mouseDown(menu);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Styling", () => {
    it("should have correct base styling", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      const menu = document.querySelector(".fixed");
      expect(menu.className).toContain("bg-base-100");
      expect(menu.className).toContain("rounded-lg");
      expect(menu.className).toContain("shadow-xl");
    });

    it("should have primary styling for Create Public Q&A button", () => {
      render(<TextSelectionMenu {...defaultProps} isAdmin={true} />);

      const publicQAButton = screen.getByText("Create Public Q&A").closest("button");
      expect(publicQAButton.className).toContain("btn-primary");
    });

    it("should have ghost styling for Ask Question and Take Notes buttons", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      const askButton = screen.getByText("Ask Question").closest("button");
      const notesButton = screen.getByText("Take Notes").closest("button");

      expect(askButton.className).toContain("btn-ghost");
      expect(notesButton.className).toContain("btn-ghost");
    });
  });

  describe("Icons", () => {
    it("should render pencil icon for Take Notes", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      expect(screen.getByTestId("pencil-icon")).toBeInTheDocument();
    });

    it("should render question icon for Ask Question", () => {
      render(<TextSelectionMenu {...defaultProps} />);

      expect(screen.getByTestId("question-icon")).toBeInTheDocument();
    });

    it("should render book icon for Create Public Q&A (admin only)", () => {
      render(<TextSelectionMenu {...defaultProps} isAdmin={true} />);

      expect(screen.getByTestId("book-icon")).toBeInTheDocument();
    });
  });
});
