import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// HIGHLIGHT SCHEMA
// Stores user highlights and notes for ePub books
const highlightSchema = mongoose.Schema(
  {
    // Reference to the book this highlight is in
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    // Reference to the user who created the highlight
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The text that was highlighted
    selectedText: {
      type: String,
      required: true,
      trim: true,
    },
    // CFI (Canonical Fragment Identifier) for ePub location
    // This uniquely identifies the location in the ePub
    cfi: {
      type: String,
      required: true,
    },
    // CFI range for the highlight (start and end)
    cfiRange: {
      type: String,
      required: true,
    },
    // Chapter title where the highlight is located
    chapterTitle: {
      type: String,
      trim: true,
      default: null,
    },
    // Chapter href for navigation
    chapterHref: {
      type: String,
      default: null,
    },
    // User's notes on the highlight
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    // Highlight color
    color: {
      type: String,
      enum: ["yellow", "green", "blue", "pink", "orange"],
      default: "yellow",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Add plugin that converts mongoose to json
highlightSchema.plugin(toJSON);

// Compound index for efficient queries by book and user
highlightSchema.index({ bookId: 1, userId: 1 });

// Index for finding highlights by CFI location
highlightSchema.index({ bookId: 1, cfi: 1 });

// Virtual for checking if highlight has notes
highlightSchema.virtual("hasNotes").get(function () {
  return !!this.notes && this.notes.trim().length > 0;
});

// Virtual for truncated text preview
highlightSchema.virtual("textPreview").get(function () {
  if (!this.selectedText) return null;
  if (this.selectedText.length <= 100) return this.selectedText;
  return this.selectedText.substring(0, 100) + "...";
});

export default mongoose.models.Highlight ||
  mongoose.model("Highlight", highlightSchema);

