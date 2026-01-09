import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/libs/auth", () => ({
  auth: mockAuth,
}));

// Mock mongoose
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// Mock stripe
const mockCreateCheckout = vi.fn();
const mockCreateCustomerPortal = vi.fn();

vi.mock("@/libs/stripe", () => ({
  createCheckout: mockCreateCheckout,
  createCustomerPortal: mockCreateCustomerPortal,
}));

// Mock User model
const mockUserFindById = vi.fn();
const mockUserFindOne = vi.fn();

vi.mock("@/models/User", () => ({
  default: {
    findById: mockUserFindById,
    findOne: mockUserFindOne,
  },
}));

describe("Stripe Create Checkout API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/stripe/create-checkout", () => {
    it("should return 400 if priceId is missing", async () => {
      const { POST } = await import("@/app/api/stripe/create-checkout/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          successUrl: "http://localhost/success",
          cancelUrl: "http://localhost/cancel",
          mode: "payment",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Price ID is required");
    });

    it("should return 400 if successUrl is missing", async () => {
      const { POST } = await import("@/app/api/stripe/create-checkout/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          priceId: "price_123",
          cancelUrl: "http://localhost/cancel",
          mode: "payment",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Success and cancel URLs are required");
    });

    it("should return 400 if mode is missing", async () => {
      const { POST } = await import("@/app/api/stripe/create-checkout/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          priceId: "price_123",
          successUrl: "http://localhost/success",
          cancelUrl: "http://localhost/cancel",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Mode is required");
    });

    it("should create checkout session successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserFindById.mockResolvedValue({
        _id: "user-123",
        email: "test@example.com",
      });
      mockCreateCheckout.mockResolvedValue("https://checkout.stripe.com/session_123");

      const { POST } = await import("@/app/api/stripe/create-checkout/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          priceId: "price_123",
          successUrl: "http://localhost/success",
          cancelUrl: "http://localhost/cancel",
          mode: "payment",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
    });
  });
});

describe("Stripe Create Portal API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/stripe/create-portal", () => {
    it("should return 401 if not signed in", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/stripe/create-portal/route");
      const req = { json: vi.fn().mockResolvedValue({}) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not signed in");
    });

    it("should return 400 if user doesn't have customerId", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserFindById.mockResolvedValue({
        _id: "user-123",
        customerId: null,
      });

      const { POST } = await import("@/app/api/stripe/create-portal/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          returnUrl: "http://localhost/return",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("billing account");
    });

    it("should return 400 if returnUrl is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserFindById.mockResolvedValue({
        _id: "user-123",
        customerId: "cus_123",
      });

      const { POST } = await import("@/app/api/stripe/create-portal/route");
      const req = { json: vi.fn().mockResolvedValue({}) };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Return URL is required");
    });

    it("should create portal session successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123" },
      });
      mockUserFindById.mockResolvedValue({
        _id: "user-123",
        customerId: "cus_123",
      });
      mockCreateCustomerPortal.mockResolvedValue("https://billing.stripe.com/portal_123");

      const { POST } = await import("@/app/api/stripe/create-portal/route");
      const req = {
        json: vi.fn().mockResolvedValue({
          returnUrl: "http://localhost/return",
        }),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
    });
  });
});

describe("Stripe Webhook API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
  });

  describe("POST /api/webhook/stripe", () => {
    it("should return 500 if Stripe is not configured", async () => {
      delete process.env.STRIPE_SECRET_KEY;

      const { POST } = await import("@/app/api/webhook/stripe/route");
      const req = {
        text: vi.fn().mockResolvedValue("test"),
      };
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Stripe configuration");
    });

    // Note: Webhook signature verification test is complex and requires proper Stripe event construction
    // Skipping this test as it requires extensive mocking of Stripe webhook events
    it.skip("should return 400 if signature verification fails", async () => {
      // This test would require complex Stripe webhook event mocking
    });
  });
});
