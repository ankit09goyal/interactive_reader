import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock config
const mockConfig = {
  appName: "Test App",
  domainName: "test.com",
  appDescription: "Test Description",
  stripe: {
    plans: [
      {
        name: "Basic",
        description: "Basic plan",
        price: 10,
        priceId: "price_basic",
        isFeatured: false,
      },
      {
        name: "Pro",
        description: "Pro plan",
        price: 20,
        priceId: "price_pro",
        isFeatured: true,
      },
    ],
  },
  resend: {
    fromNoReply: "noreply@test.com",
    fromAdmin: "admin@test.com",
    supportEmail: "support@test.com",
  },
  auth: {
    loginUrl: "/api/auth/signin",
    callbackUrl: "/api/auth/callback",
  },
};

vi.mock("@/config", () => ({
  default: mockConfig,
}));

describe("Admin Settings Page", () => {
  it("should render settings page", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText("Settings")).toBeInTheDocument();
    expect(
      getByText(/Application configuration and settings/)
    ).toBeInTheDocument();
  });

  it("should display current configuration", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText("Current Configuration")).toBeInTheDocument();
    expect(getByText("Test App")).toBeInTheDocument();
    expect(getByText("test.com")).toBeInTheDocument();
    expect(getByText("Test Description")).toBeInTheDocument();
  });

  it("should display Stripe plans", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText("Stripe Plans")).toBeInTheDocument();
    expect(getByText("Basic")).toBeInTheDocument();
    expect(getByText("Pro")).toBeInTheDocument();
    expect(getByText("$10")).toBeInTheDocument();
    expect(getByText("$20")).toBeInTheDocument();
  });

  it("should highlight featured plan", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText("Featured")).toBeInTheDocument();
  });

  it("should display plan price IDs", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText("price_basic")).toBeInTheDocument();
    expect(getByText("price_pro")).toBeInTheDocument();
  });

  it("should display email settings", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText("Email Settings")).toBeInTheDocument();
    expect(getByText("noreply@test.com")).toBeInTheDocument();
    expect(getByText("admin@test.com")).toBeInTheDocument();
    expect(getByText("support@test.com")).toBeInTheDocument();
  });

  it("should display authentication settings", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText("Authentication Settings")).toBeInTheDocument();
    expect(getByText("/api/auth/signin")).toBeInTheDocument();
    expect(getByText("/api/auth/callback")).toBeInTheDocument();
  });

  it("should display note about config file", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText(/These settings are read from/)).toBeInTheDocument();
    expect(getByText("config.js")).toBeInTheDocument();
  });

  it("should display plan descriptions", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText("Basic plan")).toBeInTheDocument();
    expect(getByText("Pro plan")).toBeInTheDocument();
  });

  it("should handle plans without price anchor", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { container } = render(result);
    // Plans should render without errors even without priceAnchor
    expect(container).toBeInTheDocument();
  });

  it("should display all configuration sections", async () => {
    const AdminSettingsPage = (await import("@/app/admin/settings/page"))
      .default;
    const result = await AdminSettingsPage();

    const { getByText } = render(result);
    expect(getByText("Current Configuration")).toBeInTheDocument();
    expect(getByText("Stripe Plans")).toBeInTheDocument();
    expect(getByText("Email Settings")).toBeInTheDocument();
    expect(getByText("Authentication Settings")).toBeInTheDocument();
  });
});
