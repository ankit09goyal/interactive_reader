import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatsPanel from "@/components/analytics/StatsPanel";

describe("StatsPanel Component", () => {
  it("renders title", () => {
    render(<StatsPanel title="Statistics" stats={[]} />);
    
    expect(screen.getByText("Statistics")).toBeInTheDocument();
    expect(screen.getByText("Statistics")).toHaveClass("text-lg", "font-semibold", "mb-4");
  });

  it("renders stats array", () => {
    const stats = [
      { label: "Total Users", value: "1,234" },
      { label: "Active Users", value: "567" },
    ];
    
    render(<StatsPanel title="Test" stats={stats} />);
    
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("567")).toBeInTheDocument();
  });

  it("renders empty stats array", () => {
    render(<StatsPanel title="Test" stats={[]} />);
    
    expect(screen.getByText("Test")).toBeInTheDocument();
    // No stat items should be rendered
    const statItems = screen.queryAllByText(/Users|Active/i);
    expect(statItems.length).toBe(0);
  });

  it("renders stats with default empty array when not provided", () => {
    render(<StatsPanel title="Test" />);
    
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("renders stat labels with correct styling", () => {
    const stats = [{ label: "Test Label", value: "100" }];
    render(<StatsPanel title="Test" stats={stats} />);
    
    const labelElement = screen.getByText("Test Label");
    expect(labelElement).toHaveClass("text-base-content/70");
  });

  it("renders stat values with correct styling", () => {
    const stats = [{ label: "Test", value: "100" }];
    render(<StatsPanel title="Test" stats={stats} />);
    
    const valueElement = screen.getByText("100");
    expect(valueElement).toHaveClass("font-semibold", "text-lg");
  });

  it("renders stat values with custom color class", () => {
    const stats = [
      { label: "Test", value: "100", valueColorClass: "text-primary" },
    ];
    render(<StatsPanel title="Test" stats={stats} />);
    
    const valueElement = screen.getByText("100");
    expect(valueElement).toHaveClass("text-primary");
  });

  it("renders stat values without color class when not provided", () => {
    const stats = [{ label: "Test", value: "100" }];
    render(<StatsPanel title="Test" stats={stats} />);
    
    const valueElement = screen.getByText("100");
    expect(valueElement).toHaveClass("font-semibold", "text-lg");
    // Should not have any color class by default
    expect(valueElement.className).not.toMatch(/text-(primary|secondary|accent|success|error|warning)/);
  });

  it("renders footer when provided", () => {
    const footer = <div data-testid="footer">Footer Content</div>;
    render(<StatsPanel title="Test" stats={[]} footer={footer} />);
    
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByText("Footer Content")).toBeInTheDocument();
  });

  it("does not render footer when not provided", () => {
    render(<StatsPanel title="Test" stats={[]} />);
    
    expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
  });

  it("renders with default background class", () => {
    const { container } = render(<StatsPanel title="Test" stats={[]} />);
    
    const panel = container.firstChild;
    expect(panel).toHaveClass("bg-base-300", "rounded-xl", "p-6");
  });

  it("renders with custom background class", () => {
    const { container } = render(
      <StatsPanel title="Test" stats={[]} bgClass="bg-primary" />
    );
    
    const panel = container.firstChild;
    expect(panel).toHaveClass("bg-primary", "rounded-xl", "p-6");
    expect(panel).not.toHaveClass("bg-base-300");
  });

  it("renders multiple stats correctly", () => {
    const stats = [
      { label: "Stat 1", value: "100" },
      { label: "Stat 2", value: "200" },
      { label: "Stat 3", value: "300" },
      { label: "Stat 4", value: "400" },
    ];
    
    render(<StatsPanel title="Test" stats={stats} />);
    
    stats.forEach((stat) => {
      expect(screen.getByText(stat.label)).toBeInTheDocument();
      expect(screen.getByText(stat.value)).toBeInTheDocument();
    });
  });

  it("renders stats with different value color classes", () => {
    const stats = [
      { label: "Stat 1", value: "100", valueColorClass: "text-primary" },
      { label: "Stat 2", value: "200", valueColorClass: "text-success" },
      { label: "Stat 3", value: "300", valueColorClass: "text-error" },
    ];
    
    render(<StatsPanel title="Test" stats={stats} />);
    
    expect(screen.getByText("100")).toHaveClass("text-primary");
    expect(screen.getByText("200")).toHaveClass("text-success");
    expect(screen.getByText("300")).toHaveClass("text-error");
  });

  it("renders stats with numeric values", () => {
    const stats = [
      { label: "Count", value: 1234 },
      { label: "Total", value: 5678 },
    ];
    
    render(<StatsPanel title="Test" stats={stats} />);
    
    expect(screen.getByText("1234")).toBeInTheDocument();
    expect(screen.getByText("5678")).toBeInTheDocument();
  });

  it("renders stats with zero values", () => {
    const stats = [{ label: "Count", value: "0" }];
    render(<StatsPanel title="Test" stats={stats} />);
    
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders stats with empty string values", () => {
    const stats = [{ label: "Count", value: "" }];
    render(<StatsPanel title="Test" stats={stats} />);
    
    expect(screen.getByText("Count")).toBeInTheDocument();
    // Find the value element by finding the parent of the label and then the value span
    const labelElement = screen.getByText("Count");
    const statItem = labelElement.parentElement;
    const valueElement = statItem.querySelector(".font-semibold.text-lg");
    expect(valueElement).toBeInTheDocument();
    expect(valueElement.textContent).toBe("");
  });

  it("renders footer with correct styling", () => {
    const footer = <div>Footer</div>;
    const { container } = render(
      <StatsPanel title="Test" stats={[]} footer={footer} />
    );
    
    const footerElement = container.querySelector(".pt-4");
    expect(footerElement).toBeInTheDocument();
    expect(footerElement).toHaveClass("pt-4");
  });

  it("renders stats in flex layout", () => {
    const stats = [{ label: "Stat Label", value: "100" }];
    render(<StatsPanel title="Test Panel" stats={stats} />);
    
    const labelElement = screen.getByText("Stat Label");
    const statItem = labelElement.parentElement;
    expect(statItem).toHaveClass("flex", "justify-between", "items-center");
  });

  it("renders with space-y-4 for stats container", () => {
    const stats = [
      { label: "Stat 1", value: "100" },
      { label: "Stat 2", value: "200" },
    ];
    const { container } = render(<StatsPanel title="Test" stats={stats} />);
    
    const statsContainer = container.querySelector(".space-y-4");
    expect(statsContainer).toBeInTheDocument();
    expect(statsContainer).toHaveClass("space-y-4");
  });
});
