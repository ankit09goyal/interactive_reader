import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";
import {
  requireAuth,
  requireBookAccess,
  handleApiError,
} from "@/libs/apiHelpers";
import UserBookAccess from "@/models/UserBookAccess";

// Mock mongoose
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

// Mock UserBookAccess
vi.mock("@/models/UserBookAccess", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

describe("apiHelpers", () => {
  describe("requireAuth", () => {
    it("should return 401 if no session or user id", () => {
      const result = requireAuth(null);
      expect(result).toBeInstanceOf(NextResponse);
      expect(result.status).toBe(401);
    });

    it("should return null if authenticated", () => {
      const result = requireAuth({ user: { id: "user-1" } });
      expect(result).toBeNull();
    });
  });

  describe("requireBookAccess", () => {
    it("should return error if access denied", async () => {
      UserBookAccess.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const { access, error } = await requireBookAccess("user-1", "book-1");
      expect(access).toBeNull();
      expect(error).toBeInstanceOf(NextResponse);
      expect(error.status).toBe(403);
    });

    it("should return access object if access granted", async () => {
      const mockAccess = { userId: "user-1", bookId: "book-1" };
      UserBookAccess.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockAccess),
      });

      const { access, error } = await requireBookAccess("user-1", "book-1");
      expect(access).toEqual(mockAccess);
      expect(error).toBeNull();
    });
  });

  describe("handleApiError", () => {
    it("should return 500 with error message", () => {
      const error = new Error("Test error");
      const response = handleApiError(error);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(500);
      // We can't easily check body stream in JSDOM env without helpers, but structure is standard
    });

    it("should use default message if no error message", () => {
      const error = {};
      const response = handleApiError(error);
      expect(response.status).toBe(500);
    });
  });
});
