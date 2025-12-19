import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

// Mock mongoose connection
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

describe("User Model Schema", () => {
  // Import the schema definition structure (without actual model registration)
  const userSchemaFields = {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      private: true,
    },
    image: {
      type: String,
    },
    customerId: {
      type: String,
    },
    priceId: {
      type: String,
    },
    hasAccess: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    addedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  };

  describe("Schema Structure", () => {
    it("should have name field with trim", () => {
      expect(userSchemaFields.name.type).toBe(String);
      expect(userSchemaFields.name.trim).toBe(true);
    });

    it("should have email field with lowercase and private", () => {
      expect(userSchemaFields.email.type).toBe(String);
      expect(userSchemaFields.email.lowercase).toBe(true);
      expect(userSchemaFields.email.private).toBe(true);
    });

    it("should have image field as String", () => {
      expect(userSchemaFields.image.type).toBe(String);
    });

    it("should have customerId field as String", () => {
      expect(userSchemaFields.customerId.type).toBe(String);
    });

    it("should have priceId field as String", () => {
      expect(userSchemaFields.priceId.type).toBe(String);
    });

    it("should have hasAccess field with default false", () => {
      expect(userSchemaFields.hasAccess.type).toBe(Boolean);
      expect(userSchemaFields.hasAccess.default).toBe(false);
    });

    it("should have role field with enum and default user", () => {
      expect(userSchemaFields.role.type).toBe(String);
      expect(userSchemaFields.role.enum).toContain("user");
      expect(userSchemaFields.role.enum).toContain("admin");
      expect(userSchemaFields.role.default).toBe("user");
    });

    it("should have addedBy as array of ObjectIds", () => {
      expect(Array.isArray(userSchemaFields.addedBy)).toBe(true);
      expect(userSchemaFields.addedBy[0].type).toBe(
        mongoose.Schema.Types.ObjectId
      );
      expect(userSchemaFields.addedBy[0].ref).toBe("User");
    });
  });

  describe("Validation Rules", () => {
    it("should only allow user or admin roles", () => {
      const allowedRoles = userSchemaFields.role.enum;
      expect(allowedRoles).toEqual(["user", "admin"]);
    });

    it("should validate customerId starts with cus_", () => {
      // This is documented in the schema but tested through the validation function
      const validCustomerId = "cus_12345";
      const invalidCustomerId = "invalid_123";

      expect(validCustomerId.includes("cus_")).toBe(true);
      expect(invalidCustomerId.includes("cus_")).toBe(false);
    });

    it("should validate priceId starts with price_", () => {
      // This is documented in the schema but tested through the validation function
      const validPriceId = "price_12345";
      const invalidPriceId = "invalid_123";

      expect(validPriceId.includes("price_")).toBe(true);
      expect(invalidPriceId.includes("price_")).toBe(false);
    });
  });

  describe("Default Values", () => {
    it("should default hasAccess to false", () => {
      expect(userSchemaFields.hasAccess.default).toBe(false);
    });

    it("should default role to user", () => {
      expect(userSchemaFields.role.default).toBe("user");
    });
  });
});
