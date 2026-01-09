import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PDFFooter from "@/components/PDFReader/PDFFooter";

describe("PDFFooter Component", () => {
  it("renders one-page view mode instructions correctly", () => {
    render(<PDFFooter viewMode="one-page" />);
    expect(screen.getByText(/Arrow keys to navigate/)).toBeInTheDocument();
    expect(screen.getByText(/Select text to ask questions/)).toBeInTheDocument();
  });

  it("renders continuous view mode instructions correctly", () => {
    render(<PDFFooter viewMode="continuous" />);
    expect(screen.getByText(/Scroll to read/)).toBeInTheDocument();
    expect(screen.getByText(/Select text to ask questions/)).toBeInTheDocument();
  });
});
