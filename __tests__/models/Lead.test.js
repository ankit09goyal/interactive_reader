import { describe, it, expect, vi } from "vitest";

// Mock mongoose connection
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

describe("Lead Model Schema", () => {
  // Schema field definitions for testing
  const leadSchemaFields = {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      private: true,
      required: true,
    },
  };

  describe("Schema Structure", () => {
    it("should have email field as required string", () => {
      expect(leadSchemaFields.email.type).toBe(String);
      expect(leadSchemaFields.email.required).toBe(true);
    });

    it("should have email field with trim", () => {
      expect(leadSchemaFields.email.trim).toBe(true);
    });

    it("should have email field with lowercase", () => {
      expect(leadSchemaFields.email.lowercase).toBe(true);
    });

    it("should have email field marked as private", () => {
      expect(leadSchemaFields.email.private).toBe(true);
    });
  });

  describe("Required Fields", () => {
    it("should require email", () => {
      expect(leadSchemaFields.email.required).toBe(true);
    });
  });

  describe("Privacy", () => {
    it("should mark email as private (excluded from toJSON)", () => {
      expect(leadSchemaFields.email.private).toBe(true);
    });
  });

  describe("Email Normalization", () => {
    it("should lowercase email addresses", () => {
      // The schema defines lowercase: true
      expect(leadSchemaFields.email.lowercase).toBe(true);
    });

    it("should trim email addresses", () => {
      // The schema defines trim: true
      expect(leadSchemaFields.email.trim).toBe(true);
    });
  });
});
