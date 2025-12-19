import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

const mockSignIn = vi.fn();

vi.mock("react-hot-toast", () => ({
  toast: mockToast,
}));

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

vi.mock("@/config", () => ({
  default: {
    auth: {
      callbackUrl: "/dashboard",
    },
  },
}));

// Mock axios create
const mockInterceptorsUse = vi.fn();
const mockAxiosInstance = {
  interceptors: {
    response: {
      use: mockInterceptorsUse,
    },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

describe("API Client", () => {
  let successHandler;
  let errorHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mock interceptors
    mockInterceptorsUse.mockImplementation((success, error) => {
      successHandler = success;
      errorHandler = error;
    });

    // Re-import to trigger the interceptor setup
    vi.resetModules();
  });

  describe("Response Interceptor Setup", () => {
    it("should create axios instance with /api baseURL", async () => {
      const axios = await import("axios");
      await import("@/libs/api");

      expect(axios.default.create).toHaveBeenCalledWith({
        baseURL: "/api",
      });
    });

    it("should register response interceptors", async () => {
      await import("@/libs/api");

      expect(mockInterceptorsUse).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
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
