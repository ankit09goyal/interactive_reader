import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: "unauthenticated",
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }) => children,
}));

// Global test utilities
global.createMockRequest = (options = {}) => {
  const {
    method = "GET",
    body = null,
    headers = {},
    searchParams = {},
  } = options;

  const url = new URL("http://localhost:3000/api/test");
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    method,
    url: url.toString(),
    json: vi.fn().mockResolvedValue(body),
    formData: vi.fn().mockResolvedValue(new FormData()),
    headers: new Headers(headers),
  };
};

global.createMockSession = (overrides = {}) => ({
  user: {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    role: "user",
    ...overrides.user,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

global.createMockAdminSession = (overrides = {}) => ({
  user: {
    id: "test-admin-id",
    name: "Test Admin",
    email: "admin@example.com",
    role: "admin",
    ...overrides.user,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

// Suppress console errors during tests (optional - comment out for debugging)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (
//       typeof args[0] === "string" &&
//       args[0].includes("Warning: ReactDOM.render")
//     ) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });

// afterAll(() => {
//   console.error = originalError;
// });
