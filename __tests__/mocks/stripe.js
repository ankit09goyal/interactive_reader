import { vi } from "vitest";

// Mock Stripe checkout session
export const mockCheckoutSession = {
  id: "cs_test_123",
  url: "https://checkout.stripe.com/pay/cs_test_123",
  customer: "cus_test_123",
  payment_status: "paid",
  status: "complete",
  mode: "subscription",
  client_reference_id: "test-user-id",
  metadata: {},
};

// Mock Stripe customer
export const mockCustomer = {
  id: "cus_test_123",
  email: "test@example.com",
  name: "Test User",
  metadata: {},
};

// Mock Stripe subscription
export const mockSubscription = {
  id: "sub_test_123",
  customer: "cus_test_123",
  status: "active",
  items: {
    data: [
      {
        price: {
          id: "price_test_123",
        },
      },
    ],
  },
};

// Mock Stripe portal session
export const mockPortalSession = {
  id: "bps_test_123",
  url: "https://billing.stripe.com/session/bps_test_123",
};

// Mock Stripe webhook event
export const mockWebhookEvent = {
  id: "evt_test_123",
  type: "checkout.session.completed",
  data: {
    object: mockCheckoutSession,
  },
};

// Mock Stripe client
export const mockStripeClient = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue(mockCheckoutSession),
      retrieve: vi.fn().mockResolvedValue(mockCheckoutSession),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn().mockResolvedValue(mockPortalSession),
    },
  },
  customers: {
    create: vi.fn().mockResolvedValue(mockCustomer),
    retrieve: vi.fn().mockResolvedValue(mockCustomer),
    update: vi.fn().mockResolvedValue(mockCustomer),
  },
  subscriptions: {
    retrieve: vi.fn().mockResolvedValue(mockSubscription),
    update: vi.fn().mockResolvedValue(mockSubscription),
    cancel: vi
      .fn()
      .mockResolvedValue({ ...mockSubscription, status: "canceled" }),
  },
  webhooks: {
    constructEvent: vi.fn().mockReturnValue(mockWebhookEvent),
  },
};

// Mock createCheckout function
export const mockCreateCheckout = vi
  .fn()
  .mockResolvedValue(mockCheckoutSession.url);

// Mock createCustomerPortal function
export const mockCreateCustomerPortal = vi
  .fn()
  .mockResolvedValue(mockPortalSession.url);

// Helper to reset all Stripe mocks
export const resetStripeMocks = () => {
  mockStripeClient.checkout.sessions.create.mockClear();
  mockStripeClient.checkout.sessions.retrieve.mockClear();
  mockStripeClient.billingPortal.sessions.create.mockClear();
  mockStripeClient.customers.create.mockClear();
  mockStripeClient.customers.retrieve.mockClear();
  mockStripeClient.customers.update.mockClear();
  mockStripeClient.subscriptions.retrieve.mockClear();
  mockStripeClient.subscriptions.update.mockClear();
  mockStripeClient.subscriptions.cancel.mockClear();
  mockStripeClient.webhooks.constructEvent.mockClear();
  mockCreateCheckout.mockClear();
  mockCreateCustomerPortal.mockClear();
};

export default {
  mockStripeClient,
  mockCheckoutSession,
  mockCustomer,
  mockSubscription,
  mockPortalSession,
  mockWebhookEvent,
  mockCreateCheckout,
  mockCreateCustomerPortal,
  resetStripeMocks,
};
