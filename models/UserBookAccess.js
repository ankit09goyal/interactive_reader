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
