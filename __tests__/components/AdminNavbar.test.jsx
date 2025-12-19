import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/admin"),
}));

// Mock ButtonAccount
vi.mock("@/components/ButtonAccount", () => ({
  default: () => <div data-testid="button-account">Account Button</div>,
}));

// Import after mocks
import AdminNavbar from "@/components/AdminNavbar";
import { usePathname } from "next/navigation";

describe("AdminNavbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathname.mockReturnValue("/admin");
  });

  it("should render the navbar", () => {
    render(<AdminNavbar />);

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("should render all navigation items", () => {
    render(<AdminNavbar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should render the ButtonAccount component", () => {
    render(<AdminNavbar />);

    expect(screen.getByTestId("button-account")).toBeInTheDocument();
  });

  it("should have correct links for navigation items", () => {
    render(<AdminNavbar />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/admin"
    );
    expect(screen.getByRole("link", { name: /users/i })).toHaveAttribute(
      "href",
      "/admin/users"
    );
    expect(screen.getByRole("link", { name: /analytics/i })).toHaveAttribute(
      "href",
      "/admin/analytics"
    );
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/admin/settings"
    );
  });

  it("should highlight active navigation item based on pathname", () => {
    usePathname.mockReturnValue("/admin/users");
    render(<AdminNavbar />);

    const usersLink = screen.getByRole("link", { name: /users/i });
    expect(usersLink.className).toContain("bg-primary");
  });

  it("should render the admin panel logo link", () => {
    render(<AdminNavbar />);

    const logoLink = screen.getAllByRole("link")[0];
    expect(logoLink).toHaveAttribute("href", "/admin");
  });

  it("should have accessible navigation structure", () => {
    render(<AdminNavbar />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
