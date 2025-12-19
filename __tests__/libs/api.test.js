import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies - these need to be inside vi.mock factories to survive resetModules
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("@/config", () => ({
  default: {
    auth: {
      callbackUrl: "/dashboard",
    },
  },
}));

vi.mock("axios", () => {
  const mockInterceptorsUse = vi.fn();
  return {
    default: {
      create: vi.fn(() => ({
        interceptors: {
          response: {
            use: mockInterceptorsUse,
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      })),
    },
  };
});

describe("API Client", () => {
  let successHandler;
  let errorHandler;
  let mockToast;
  let mockSignIn;
  let mockAxiosCreate;

  beforeEach(async () => {
    // Reset modules to get fresh imports
    vi.resetModules();

    // Re-import mocked modules after resetModules
    const toastModule = await import("react-hot-toast");
    mockToast = toastModule.toast;

    const authModule = await import("next-auth/react");
    mockSignIn = authModule.signIn;

    const axiosModule = await import("axios");
    mockAxiosCreate = axiosModule.default.create;

    // Clear mock call history
    vi.clearAllMocks();

    // Setup interceptor capture
    mockAxiosCreate.mockImplementation(() => {
      const instance = {
        interceptors: {
          response: {
            use: vi.fn((success, error) => {
              successHandler = success;
              errorHandler = error;
            }),
          },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      };
      return instance;
    });
  });

  describe("Response Interceptor Setup", () => {
    it("should create axios instance with /api baseURL", async () => {
      await import("@/libs/api");

      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: "/api",
      });
    });

    it("should register response interceptors", async () => {
      await import("@/libs/api");

      // Verify interceptors were set up (successHandler and errorHandler should be captured)
      expect(successHandler).toBeDefined();
      expect(errorHandler).toBeDefined();
    });
  });

  describe("Success Handler", () => {
    beforeEach(async () => {
      await import("@/libs/api");
    });

    it("should return response data on success", () => {
      const response = { data: { message: "Success" }, status: 200 };
      const result = successHandler(response);
      expect(result).toEqual({ message: "Success" });
    });

    it("should extract data from response", () => {
      const response = { data: { users: [1, 2, 3] } };
      const result = successHandler(response);
      expect(result).toEqual({ users: [1, 2, 3] });
    });
  });

  describe("Error Handler", () => {
    beforeEach(async () => {
      await import("@/libs/api");
    });

    it("should call signIn on 401 error", async () => {
      const error = {
        response: { status: 401 },
      };

      await errorHandler(error);

      expect(mockToast.error).toHaveBeenCalledWith("Please login");
      expect(mockSignIn).toHaveBeenCalledWith(undefined, {
        callbackUrl: "/dashboard",
      });
    });

    it("should show plan message on 403 error", async () => {
      const error = {
        response: { status: 403 },
        message: "",
      };

      await expect(errorHandler(error)).rejects.toThrow();
      expect(error.message).toBe("Pick a plan to use this feature");
    });

    it("should show error message from response", async () => {
      const error = {
        response: {
          status: 400,
          data: { error: "Validation failed" },
        },
        message: "",
      };

      await expect(errorHandler(error)).rejects.toThrow();
      expect(mockToast.error).toHaveBeenCalledWith("Validation failed");
    });

    it("should show generic error message when no specific error", async () => {
      const error = {
        response: { status: 500 },
        message: "Network Error",
      };

      await expect(errorHandler(error)).rejects.toThrow();
      expect(mockToast.error).toHaveBeenCalledWith("Network Error");
    });

    it("should show fallback message when no message available", async () => {
      const error = {
        response: { status: 500 },
        message: "",
      };

      // Set message to empty to test fallback
      error.message = "";

      await expect(errorHandler(error)).rejects.toThrow();
      expect(mockToast.error).toHaveBeenCalled();
    });

    it("should stringify object error messages", async () => {
      const error = {
        response: {
          status: 400,
          data: { error: { field: "email", message: "invalid" } },
        },
        message: "",
      };

      await expect(errorHandler(error)).rejects.toThrow();
      expect(error.message).toContain("field");
    });
  });
});
