import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// SUGGESTION SCHEMA
// Improvement suggestions made by users about selected text in books
// Admins can reply to suggestions
const suggestionSchema = mongoose.Schema(
  {
    // Reference to the book this suggestion is about
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    // Reference to the user who made the suggestion
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The text that was selected when making the suggestion
    selectedText: {
      type: String,
      trim: true,
      default: null,
    },
    // The improvement suggestion text
    suggestion: {
      type: String,
      required: true,
      trim: true,
    },
    // ePub CFI location (Canonical Fragment Identifier) - start position
    epubCfi: {
      type: String,
      default: null,
    },
    // ePub CFI range (for highlighting selected text)
    epubCfiRange: {
      type: String,
      default: null,
    },
    // ePub chapter title for display
    epubChapter: {
      type: String,
      default: null,
    },
    // ePub chapter href for navigation
    chapterHref: {
      type: String,
      default: null,
    },
    // Admin's reply to the suggestion
    adminReply: {
      type: String,
      trim: true,
      default: null,
    },
    // Reference to the admin who replied to the suggestion
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // When the suggestion was replied to
    repliedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Add plugin that converts mongoose to json
suggestionSchema.plugin(toJSON);

// Compound index for efficient queries by book and user
suggestionSchema.index({ bookId: 1, userId: 1 });

// Index for admin queries (all suggestions for a book)
suggestionSchema.index({ bookId: 1 });

// Virtual for checking if suggestion has a reply
suggestionSchema.virtual("isReplied").get(function () {
  return !!this.adminReply;
});

// Virtual for formatted selected text (truncated for display)
suggestionSchema.virtual("selectedTextPreview").get(function () {
  if (!this.selectedText) return null;
  if (this.selectedText.length <= 100) return this.selectedText;
  return this.selectedText.substring(0, 100) + "...";
});

export default mongoose.models.Suggestion ||
  mongoose.model("Suggestion", suggestionSchema);
