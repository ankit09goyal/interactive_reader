import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// USER BOOK ACCESS SCHEMA
// Tracks which users have access to which books
const userBookAccessSchema = mongoose.Schema(
  {
    // Reference to the user who has access
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Reference to the book the user has access to
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    // Reference to the admin who granted the access
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Reading preferences for this specific book
    readingPreferences: {
      // Last page the user was reading (for PDF)
      lastPage: {
        type: Number,
        default: 1,
        min: 1,
      },
      // View mode preference for this book (for PDF)
      viewMode: {
        type: String,
        enum: ["one-page", "continuous"],
        default: "one-page",
      },
      // Zoom scale for this book (for PDF)
      scale: {
        type: Number,
        default: 1.0,
        min: 0.5,
        max: 3.0,
      },
      // Font size for ePub reading
      fontSize: {
        type: Number,
        default: 16,
        min: 12,
        max: 24,
      },
      // Last reading location for ePub (CFI string)
      lastLocation: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Compound index to ensure a user can only have one access record per book
userBookAccessSchema.index({ userId: 1, bookId: 1 }, { unique: true });

// Add plugin that converts mongoose to json
userBookAccessSchema.plugin(toJSON);

export default mongoose.models.UserBookAccess ||
  mongoose.model("UserBookAccess", userBookAccessSchema);
