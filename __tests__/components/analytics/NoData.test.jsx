import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import NoData from "@/components/analytics/NoData";

describe("NoData Component", () => {
  it("renders label text", () => {
    const label = "No data available";
    render(<NoData label={label} />);
    
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(label)).toHaveClass("text-base-content/70");
  });

  it("renders description text when provided", () => {
    const label = "No data";
    const description = "There is no data to display at this time";
    render(<NoData label={label} description={description} />);
    
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.getByText(description)).toHaveClass("text-sm", "text-base-content/50", "mt-2");
  });

  it("renders description paragraph even when description is not provided", () => {
    const label = "No data";
    const { container } = render(<NoData label={label} />);
    
    expect(screen.getByText(label)).toBeInTheDocument();
    // Component always renders description paragraph (with undefined value)
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(2); // Both label and description paragraphs
    expect(paragraphs[1].textContent).toBe("");
  });

  it("renders with correct container styling", () => {
    render(<NoData label="Test label" />);
    
    const container = screen.getByText("Test label").closest("div");
    expect(container).toHaveClass("bg-base-300", "rounded-xl", "p-6");
  });

  it("renders with empty label", () => {
    const { container } = render(<NoData label="" />);
    
    const paragraphs = container.querySelectorAll("p");
    const labelParagraph = paragraphs[0];
    expect(labelParagraph).toBeInTheDocument();
    expect(labelParagraph.textContent).toBe("");
    expect(labelParagraph).toHaveClass("text-base-content/70");
  });

  it("renders with empty description", () => {
    const { container } = render(<NoData label="Label" description="" />);
    
    expect(screen.getByText("Label")).toBeInTheDocument();
    const descriptionParagraph = container.querySelector("p.text-sm");
    expect(descriptionParagraph).toBeInTheDocument();
    expect(descriptionParagraph.textContent).toBe("");
  });

  it("renders with long label text", () => {
    const longLabel = "This is a very long label that might wrap to multiple lines and should still be displayed correctly";
    render(<NoData label={longLabel} />);
    
    expect(screen.getByText(longLabel)).toBeInTheDocument();
  });

  it("renders with long description text", () => {
    const label = "No data";
    const longDescription = "This is a very long description that provides detailed information about why there is no data available and what the user might be able to do about it";
    render(<NoData label={label} description={longDescription} />);
    
    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it("renders both label and description when both are provided", () => {
    const label = "No statistics";
    const description = "Please check back later";
    render(<NoData label={label} description={description} />);
    
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    
    const container = screen.getByText(label).closest("div");
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(2); // Label and description
  });
});
