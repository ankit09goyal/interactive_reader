import { vi } from "vitest";

// Mock session data
export const mockUserSession = {
  user: {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    role: "user",
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const mockAdminSession = {
  user: {
    id: "test-admin-id",
    name: "Test Admin",
    email: "admin@example.com",
    role: "admin",
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Mock auth function
export const mockAuth = vi.fn().mockResolvedValue(null);

// Mock signIn function
export const mockSignIn = vi.fn().mockResolvedValue({ ok: true });

// Mock signOut function
export const mockSignOut = vi.fn().mockResolvedValue(undefined);

// Mock handlers
export const mockHandlers = {
  GET: vi.fn(),
  POST: vi.fn(),
};

// Helper functions
export const setMockSession = (session) => {
  mockAuth.mockResolvedValue(session);
};

export const setMockUserSession = () => {
  mockAuth.mockResolvedValue(mockUserSession);
};

export const setMockAdminSession = () => {
  mockAuth.mockResolvedValue(mockAdminSession);
};

export const setNoSession = () => {
  mockAuth.mockResolvedValue(null);
};

export const resetAuthMocks = () => {
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(null);
  mockSignIn.mockClear();
  mockSignOut.mockClear();
};

export default {
  mockAuth,
  mockSignIn,
  mockSignOut,
  mockHandlers,
  mockUserSession,
  mockAdminSession,
  setMockSession,
  setMockUserSession,
  setMockAdminSession,
  setNoSession,
  resetAuthMocks,
};
