import { vi } from "vitest";

// Mock email response
export const mockEmailResponse = {
  id: "email_test_123",
  from: "test@example.com",
  to: ["recipient@example.com"],
  created_at: new Date().toISOString(),
};

// Mock sendEmail function
export const mockSendEmail = vi.fn().mockResolvedValue(mockEmailResponse);

// Mock Resend client
export const mockResendClient = {
  emails: {
    send: vi.fn().mockResolvedValue({ data: mockEmailResponse, error: null }),
  },
};

// Mock email data
export const createMockEmailData = (overrides = {}) => ({
  to: "recipient@example.com",
  subject: "Test Subject",
  html: "<p>Test HTML Body</p>",
  text: "Test Text Body",
  ...overrides,
});

// Helper to reset all Resend mocks
export const resetResendMocks = () => {
  mockSendEmail.mockClear();
  mockResendClient.emails.send.mockClear();
};

// Mock for failed email send
export const mockSendEmailError = () => {
  mockSendEmail.mockRejectedValueOnce(new Error("Failed to send email"));
  mockResendClient.emails.send.mockResolvedValueOnce({
    data: null,
    error: { message: "Failed to send email" },
  });
};

export default {
  mockSendEmail,
  mockResendClient,
  mockEmailResponse,
  createMockEmailData,
  resetResendMocks,
  mockSendEmailError,
};
