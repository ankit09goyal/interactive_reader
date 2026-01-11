import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// USER SCHEMA
const userSchema = mongoose.Schema(
  {
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
    // Used in the Stripe webhook to identify the user in Stripe and later create Customer Portal or prefill user credit card details
    customerId: {
      type: String,
      validate(value) {
        return value.includes("cus_");
      },
    },
    // Used in the Stripe webhook. should match a plan in config.js file.
    priceId: {
      type: String,
      validate(value) {
        return value.includes("price_");
      },
    },
    // Used to determine if the user has access to the product—it's turn on/off by the Stripe webhook
    hasAccess: {
      type: Boolean,
      default: false,
    },
    // User role - determines access level (admin has full permissions, user has standard access)
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    // Array of admin user IDs who added this user to the system
    // Multiple admins can add the same user (e.g., user buys books from different admins)
    addedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    // User preferences for reader and app settings
    preferences: {
      // Reader view mode: "one-page" for Kindle-like single page view, "continuous" for scrolling
      readerViewMode: {
        type: String,
        enum: ["one-page", "continuous"],
        default: "one-page",
      },
      // Page view settings for ePub reader
      pageViewSettings: {
        // Font family for reading
        fontFamily: {
          type: String,
          default: "Georgia",
        },
        // Font size in pixels
        fontSize: {
          type: Number,
          default: 16,
          min: 12,
          max: 24,
        },
        // Line spacing: narrow, normal, wide
        spacing: {
          type: String,
          enum: ["narrow", "normal", "wide"],
          default: "normal",
        },
        // Text alignment: left or justify
        alignment: {
          type: String,
          enum: ["left", "justify"],
          default: "justify",
        },
        // Page margins: narrow, normal, wide
        margins: {
          type: String,
          enum: ["narrow", "normal", "wide"],
          default: "normal",
        },
        // Column spread: none (single column), always (two columns)
        spread: {
          type: String,
          enum: ["none", "always"],
          default: "always",
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);

export default mongoose.models.User || mongoose.model("User", userSchema);
