import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// QUESTION SCHEMA
// Questions asked by users about selected text in books
// Admins can answer, edit (creates new version), or create public questions directly
const questionSchema = mongoose.Schema(
  {
    // Reference to the book this question is about
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    // Reference to the user who asked the question (null if admin-created)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    // The text that was selected when asking the question (optional for admin-created)
    selectedText: {
      type: String,
      trim: true,
      default: null,
    },
    // The question text
    question: {
      type: String,
      required: true,
      trim: true,
    },
    // Admin's answer to the question
    answer: {
      type: String,
      trim: true,
      default: null,
    },
    // Reference to the admin who answered the question
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // PDF page number where the text was selected (optional for admin-created)
    pageNumber: {
      type: Number,
      default: null,
    },
    // When the question was answered
    answeredAt: {
      type: Date,
      default: null,
    },
    // Whether this question is visible to all users with book access
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Reference to the original question if this is an edited version
    originalQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      default: null,
      index: true,
    },
    // True if this is an admin-edited version of another question
    isEditedVersion: {
      type: Boolean,
      default: false,
    },
    // Reference to the admin who created this question (for admin-created or edited versions)
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    // True if this question was created directly by admin (not from user question)
    isAdminCreated: {
      type: Boolean,
      default: false,
    },
    // When the question was made public
    madePublicAt: {
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
questionSchema.plugin(toJSON);

// Compound index for efficient queries by book and user
questionSchema.index({ bookId: 1, userId: 1 });

// Compound index for finding public questions by book
questionSchema.index({ bookId: 1, isPublic: 1 });

// Virtual for checking if question has an answer
questionSchema.virtual("isAnswered").get(function () {
  return !!this.answer;
});

// Virtual for formatted selected text (truncated for display)
questionSchema.virtual("selectedTextPreview").get(function () {
  if (!this.selectedText) return null;
  if (this.selectedText.length <= 100) return this.selectedText;
  return this.selectedText.substring(0, 100) + "...";
});

export default mongoose.models.Question ||
  mongoose.model("Question", questionSchema);

