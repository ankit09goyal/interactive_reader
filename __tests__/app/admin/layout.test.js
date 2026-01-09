import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/libs/auth", () => ({
  auth: mockAuth,
}));

// Mock roles
vi.mock("@/libs/roles", () => ({
  requireAdmin: vi.fn(),
}));

// Mock config
vi.mock("@/config", () => ({
  default: {
    auth: {
      loginUrl: "/api/auth/signin",
    },
  },
}));

// Mock AdminNavbar
vi.mock("@/components/AdminNavbar", () => ({
  default: () => <nav data-testid="admin-navbar">Admin Navbar</nav>,
}));

describe("Admin Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to login if user is not authenticated", async () => {
    const { requireAdmin } = await import("@/libs/roles");
    mockAuth.mockResolvedValue(null);

    const AdminLayout = (await import("@/app/admin/layout")).default;

    try {
      await AdminLayout({ children: <div>Test</div> });
    } catch (error) {
      // redirect throws, so we expect it to be called
    }

    expect(mockRedirect).toHaveBeenCalledWith("/api/auth/signin");
  });

  it("should render layout with navbar and children for authenticated admin", async () => {
    const { requireAdmin } = await import("@/libs/roles");
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    requireAdmin.mockImplementation(() => {}); // No redirect

    const AdminLayout = (await import("@/app/admin/layout")).default;
    const result = await AdminLayout({
      children: <div data-testid="children">Test Content</div>,
    });

    const { getByTestId } = render(result);
    expect(getByTestId("admin-navbar")).toBeInTheDocument();
    expect(getByTestId("children")).toBeInTheDocument();
  });

  it("should call requireAdmin with correct redirect path", async () => {
    const { requireAdmin } = await import("@/libs/roles");
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    requireAdmin.mockImplementation(() => {});

    const AdminLayout = (await import("@/app/admin/layout")).default;
    await AdminLayout({ children: <div>Test</div> });

    expect(requireAdmin).toHaveBeenCalledWith(mockSession, "/dashboard");
  });

  it("should have correct layout structure", async () => {
    const { requireAdmin } = await import("@/libs/roles");
    const mockSession = {
      user: {
        id: "admin-id",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
    };

    mockAuth.mockResolvedValue(mockSession);
    requireAdmin.mockImplementation(() => {});

    const AdminLayout = (await import("@/app/admin/layout")).default;
    const result = await AdminLayout({ children: <div>Test</div> });

    const { container } = render(result);
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main.className).toContain("max-w-7xl");
    expect(main.className).toContain("mx-auto");
  });
});
