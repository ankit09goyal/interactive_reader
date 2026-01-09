import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EPubTOC from "@/components/ePubReader/ePubTOC";

describe("EPubTOC Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    toc: [
      { id: "1", label: "Chapter 1", href: "chap1.xhtml" },
      {
        id: "2",
        label: "Chapter 2",
        href: "chap2.xhtml",
        subitems: [{ id: "2.1", label: "Section 2.1", href: "chap2-1.xhtml" }],
      },
    ],
    currentChapter: { href: "chap1.xhtml" },
    onNavigate: vi.fn(),
  };

  it("should not render if not open", () => {
    const { container } = render(<EPubTOC {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should render TOC items", () => {
    render(<EPubTOC {...defaultProps} />);
    expect(screen.getByText("Table of Contents")).toBeInTheDocument();
    expect(screen.getByText("Chapter 1")).toBeInTheDocument();
    expect(screen.getByText("Chapter 2")).toBeInTheDocument();
  });

  it("should call onNavigate when item clicked", () => {
    render(<EPubTOC {...defaultProps} />);
    fireEvent.click(screen.getByText("Chapter 1"));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith("chap1.xhtml");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should expand/collapse subitems", () => {
    render(<EPubTOC {...defaultProps} />);
    expect(screen.getByText("Section 2.1")).toBeInTheDocument(); // Initially expanded

    // Find expand button (it's the button inside the item div)
    // The structure is list item -> div -> button
    // We can find by checking if it has children logic or just by class if we could but tests should avoid implementation details.
    // Let's use the svg or closest button.
    const collapseButton = screen.getAllByRole("button")[1]; // 0 is close sidebar, 1 should be the collapse for Chapter 2

    fireEvent.click(collapseButton);
    expect(screen.queryByText("Section 2.1")).not.toBeInTheDocument();

    fireEvent.click(collapseButton);
    expect(screen.getByText("Section 2.1")).toBeInTheDocument();
  });

  it("should close when backdrop clicked", () => {
    const { container } = render(<EPubTOC {...defaultProps} />);
    // The backdrop is the first child div with click handler
    const backdrop = container.firstChild.firstChild;
    fireEvent.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
