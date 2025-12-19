import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Stripe - define mock functions at module level
const mockCheckoutCreate = vi.fn();
const mockPortalCreate = vi.fn();
const mockSessionRetrieve = vi.fn();

vi.mock("stripe", () => {
  return {
    default: class Stripe {
      constructor() {
        this.checkout = {
          sessions: {
            create: mockCheckoutCreate,
            retrieve: mockSessionRetrieve,
          },
        };
        this.billingPortal = {
          sessions: {
            create: mockPortalCreate,
          },
        };
      }
    },
  };
});

// Import after mocks
import {
  createCheckout,
  createCustomerPortal,
  findCheckoutSession,
} from "@/libs/stripe";

describe("Stripe Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variable
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
  });

  describe("createCheckout", () => {
    const baseParams = {
      priceId: "price_123",
      mode: "subscription",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      clientReferenceId: "user_123",
    };

    it("should create checkout session and return URL", async () => {
      mockCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/123",
      });

      const result = await createCheckout(baseParams);

      expect(result).toBe("https://checkout.stripe.com/pay/123");
      expect(mockCheckoutCreate).toHaveBeenCalled();
    });

    it("should pass correct base parameters", async () => {
      mockCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/123",
      });

      await createCheckout(baseParams);

      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          client_reference_id: "user_123",
          success_url: "https://example.com/success",
          cancel_url: "https://example.com/cancel",
          line_items: [{ price: "price_123", quantity: 1 }],
          allow_promotion_codes: true,
        })
      );
    });

    it("should use existing customerId when provided", async () => {
      mockCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/123",
      });

      await createCheckout({
        ...baseParams,
        user: { customerId: "cus_existing" },
      });

      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_existing",
        })
      );
    });

    it("should set customer_email when user email provided without customerId", async () => {
      mockCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/123",
      });

      await createCheckout({
        ...baseParams,
        user: { email: "test@example.com" },
      });

      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: "test@example.com",
        })
      );
    });

    it("should enable customer_creation for payment mode", async () => {
      mockCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/123",
      });

      await createCheckout({
        ...baseParams,
        mode: "payment",
      });

      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_creation: "always",
          payment_intent_data: { setup_future_usage: "on_session" },
        })
      );
    });

    it("should apply couponId when provided", async () => {
      mockCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/123",
      });

      await createCheckout({
        ...baseParams,
        couponId: "COUPON123",
      });

      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          discounts: [{ coupon: "COUPON123" }],
        })
      );
    });

    it("should pass empty discounts when no couponId", async () => {
      mockCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/123",
      });

      await createCheckout(baseParams);

      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          discounts: [],
        })
      );
    });

    it("should enable tax_id_collection for new customers", async () => {
      mockCheckoutCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/123",
      });

      await createCheckout({
        ...baseParams,
        user: { email: "test@example.com" },
      });

      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tax_id_collection: { enabled: true },
        })
      );
    });
  });

  describe("createCustomerPortal", () => {
    it("should create portal session and return URL", async () => {
      mockPortalCreate.mockResolvedValue({
        url: "https://billing.stripe.com/portal/123",
      });

      const result = await createCustomerPortal({
        customerId: "cus_123",
        returnUrl: "https://example.com/account",
      });

      expect(result).toBe("https://billing.stripe.com/portal/123");
    });

    it("should pass correct parameters", async () => {
      mockPortalCreate.mockResolvedValue({
        url: "https://billing.stripe.com/portal/123",
      });

      await createCustomerPortal({
        customerId: "cus_123",
        returnUrl: "https://example.com/account",
      });

      expect(mockPortalCreate).toHaveBeenCalledWith({
        customer: "cus_123",
        return_url: "https://example.com/account",
      });
    });

    it("should return null on error", async () => {
      mockPortalCreate.mockRejectedValue(new Error("Stripe error"));

      const result = await createCustomerPortal({
        customerId: "cus_123",
        returnUrl: "https://example.com/account",
      });

      expect(result).toBeNull();
    });
  });

  describe("findCheckoutSession", () => {
    it("should retrieve session with line_items expanded", async () => {
      const mockSession = {
        id: "cs_123",
        line_items: { data: [{ price: { id: "price_123" } }] },
      };
      mockSessionRetrieve.mockResolvedValue(mockSession);

      const result = await findCheckoutSession("cs_123");

      expect(result).toEqual(mockSession);
      expect(mockSessionRetrieve).toHaveBeenCalledWith("cs_123", {
        expand: ["line_items"],
      });
    });

    it("should return null on error", async () => {
      mockSessionRetrieve.mockRejectedValue(new Error("Session not found"));

      const result = await findCheckoutSession("cs_invalid");

      expect(result).toBeNull();
    });
  });
});
