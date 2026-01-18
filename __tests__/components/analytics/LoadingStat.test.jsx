import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadingStat from "@/components/analytics/LoadingStat";

describe("LoadingStat Component", () => {
  it("renders loading skeleton structure", () => {
    const { container } = render(<LoadingStat />);
    
    const mainContainer = container.firstChild;
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass("space-y-6");
  });

  it("renders 4 skeleton cards in the first grid", () => {
    const { container } = render(<LoadingStat />);
    
    // Find all skeleton elements
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBe(6); // 4 in first grid + 2 in second grid
    
    // Check that skeletons have correct classes
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveClass("skeleton", "rounded-xl");
    });
  });

  it("renders skeletons with correct height classes", () => {
    const { container } = render(<LoadingStat />);
    
    const skeletons = container.querySelectorAll(".skeleton");
    
    // First 4 skeletons should be h-24 (for stat cards)
    const firstGridSkeletons = Array.from(skeletons).slice(0, 4);
    firstGridSkeletons.forEach((skeleton) => {
      expect(skeleton).toHaveClass("h-24");
    });
    
    // Last 2 skeletons should be h-64 (for panels)
    const secondGridSkeletons = Array.from(skeletons).slice(4);
    secondGridSkeletons.forEach((skeleton) => {
      expect(skeleton).toHaveClass("h-64");
    });
  });

  it("renders first grid with correct grid classes", () => {
    const { container } = render(<LoadingStat />);
    
    const grids = container.querySelectorAll(".grid");
    expect(grids.length).toBe(2);
    
    // First grid should have md:grid-cols-4
    const firstGrid = grids[0];
    expect(firstGrid).toHaveClass("grid", "grid-cols-1", "md:grid-cols-4", "gap-4");
  });

  it("renders second grid with correct grid classes", () => {
    const { container } = render(<LoadingStat />);
    
    const grids = container.querySelectorAll(".grid");
    
    // Second grid should have md:grid-cols-2
    const secondGrid = grids[1];
    expect(secondGrid).toHaveClass("grid", "grid-cols-1", "md:grid-cols-2", "gap-6");
  });

  it("renders with space-y-6 container class", () => {
    const { container } = render(<LoadingStat />);
    
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass("space-y-6");
  });

  it("renders all skeleton elements with unique keys", () => {
    const { container } = render(<LoadingStat />);
    
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBe(6);
    
    // Verify all skeletons are rendered
    skeletons.forEach((skeleton) => {
      expect(skeleton).toBeInTheDocument();
    });
  });
});
