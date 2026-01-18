import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatCard from "@/components/analytics/StatCard";

describe("StatCard Component", () => {
  it("renders title and value", () => {
    render(<StatCard title="Total Users" value="1,234" />);
    
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders value with correct styling", () => {
    render(<StatCard title="Test" value="100" />);
    
    const valueElement = screen.getByText("100");
    expect(valueElement).toHaveClass("text-3xl", "font-bold", "text-neutral");
  });

  it("renders title with correct styling", () => {
    render(<StatCard title="Test Title" value="100" />);
    
    const titleElement = screen.getByText("Test Title");
    expect(titleElement).toHaveClass("text-sm", "text-base-content/70", "mt-1");
  });

  it("renders subtitle when provided", () => {
    render(<StatCard title="Test" value="100" subtitle="Additional info" />);
    
    expect(screen.getByText("Additional info")).toBeInTheDocument();
    expect(screen.getByText("Additional info")).toHaveClass("text-xs", "text-base-content/50", "mt-1");
  });

  it("does not render subtitle when not provided", () => {
    render(<StatCard title="Test" value="100" />);
    
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.queryByText(/Additional info/i)).not.toBeInTheDocument();
  });

  it("renders with custom color class", () => {
    render(<StatCard title="Test" value="100" colorClass="text-primary" />);
    
    const valueElement = screen.getByText("100");
    expect(valueElement).toHaveClass("text-primary");
    expect(valueElement).not.toHaveClass("text-neutral");
  });

  it("renders with default color class when not provided", () => {
    render(<StatCard title="Test" value="100" />);
    
    const valueElement = screen.getByText("100");
    expect(valueElement).toHaveClass("text-neutral");
  });

  it("renders with correct container styling", () => {
    const { container } = render(<StatCard title="Test" value="100" />);
    
    const cardContainer = container.firstChild;
    expect(cardContainer).toHaveClass("bg-base-300", "rounded-xl", "p-6");
  });

  it("renders with numeric value", () => {
    render(<StatCard title="Count" value={1234} />);
    
    expect(screen.getByText("1234")).toBeInTheDocument();
  });

  it("renders with zero value", () => {
    render(<StatCard title="Count" value="0" />);
    
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders with empty string value", () => {
    const { container } = render(<StatCard title="Count" value="" />);
    
    const valueElement = container.querySelector(".text-3xl");
    expect(valueElement).toBeInTheDocument();
    expect(valueElement.textContent).toBe("");
  });

  it("renders with empty string title", () => {
    const { container } = render(<StatCard title="" value="100" />);
    
    expect(screen.getByText("100")).toBeInTheDocument();
    const titleElement = container.querySelector(".text-sm");
    expect(titleElement).toBeInTheDocument();
    expect(titleElement.textContent).toBe("");
  });

  it("does not render subtitle when empty string is provided", () => {
    const { container } = render(<StatCard title="Test" value="100" subtitle="" />);
    
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    // Empty string is falsy, so subtitle should not render
    const subtitleElement = container.querySelector(".text-xs");
    expect(subtitleElement).not.toBeInTheDocument();
  });

  it("renders with long text values", () => {
    const longValue = "1,234,567,890";
    const longTitle = "This is a very long title that might wrap";
    const longSubtitle = "This is a very long subtitle with additional information";
    
    render(<StatCard title={longTitle} value={longValue} subtitle={longSubtitle} />);
    
    expect(screen.getByText(longValue)).toBeInTheDocument();
    expect(screen.getByText(longTitle)).toBeInTheDocument();
    expect(screen.getByText(longSubtitle)).toBeInTheDocument();
  });

  it("renders with different color classes", () => {
    const colorClasses = ["text-primary", "text-secondary", "text-accent", "text-success", "text-error"];
    
    colorClasses.forEach((colorClass) => {
      const { unmount } = render(<StatCard title="Test" value="100" colorClass={colorClass} />);
      const valueElement = screen.getByText("100");
      expect(valueElement).toHaveClass(colorClass);
      unmount();
    });
  });
});
