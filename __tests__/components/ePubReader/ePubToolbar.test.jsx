import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EPubToolbar from "@/components/ePubReader/ePubToolbar";

// Mock icons
vi.mock("@/libs/icons", () => ({
  default: {
    chevronLeft: <span>PrevIcon</span>,
    chevronRight: <span>NextIcon</span>,
    minus: <span>MinusIcon</span>,
    plus: <span>PlusIcon</span>,
    menu: <span>MenuIcon</span>,
    question: <span>QuestionIcon</span>,
    highlight: <span>HighlightIcon</span>,
    settings: <span>SettingsIcon</span>,
  },
}));

describe("EPubToolbar Component", () => {
  const defaultProps = {
    title: "Test ePub",
    currentChapter: { label: "Chapter 1" },
    isLoading: false,
    fontSize: 16,
    showTOC: false,
    showQuestionsSidebar: false,
    showHighlightsSidebar: false,
    showSettingsSidebar: false,
    bookId: "book-1",
    onPrevPage: vi.fn(),
    onNextPage: vi.fn(),
    onIncreaseFontSize: vi.fn(),
    onDecreaseFontSize: vi.fn(),
    onToggleTOC: vi.fn(),
    onToggleQuestionsSidebar: vi.fn(),
    onToggleHighlightsSidebar: vi.fn(),
    onToggleSettingsSidebar: vi.fn(),
    atStart: false,
    atEnd: false,
  };

  it("renders title and chapter info", () => {
    render(<EPubToolbar {...defaultProps} />);
    expect(screen.getByText("Test ePub")).toBeInTheDocument();
    expect(screen.getByText("Chapter 1")).toBeInTheDocument();
  });

  it("handles navigation", () => {
    render(<EPubToolbar {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Previous Page"));
    expect(defaultProps.onPrevPage).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Next Page"));
    expect(defaultProps.onNextPage).toHaveBeenCalled();
  });

  it("handles toggles", () => {
    render(<EPubToolbar {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Table of Contents"));
    expect(defaultProps.onToggleTOC).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Questions & Answers"));
    expect(defaultProps.onToggleQuestionsSidebar).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Highlights & Notes"));
    expect(defaultProps.onToggleHighlightsSidebar).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Page View Settings"));
    expect(defaultProps.onToggleSettingsSidebar).toHaveBeenCalled();
  });
});
