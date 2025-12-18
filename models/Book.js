import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// BOOK SCHEMA
const bookSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // Original filename from upload
    fileName: {
      type: String,
      required: true,
    },
    // Path to the file (relative to public directory)
    filePath: {
      type: String,
      required: true,
    },
    // File size in bytes
    fileSize: {
      type: Number,
      required: true,
    },
    // MIME type of the file (e.g., application/pdf, application/epub+zip)
    mimeType: {
      type: String,
      required: true,
      enum: ["application/pdf", "application/epub+zip"],
    },
    // Reference to the admin user who uploaded the book
    uploadedBy: {
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

// Add plugin that converts mongoose to json
bookSchema.plugin(toJSON);

// Virtual for human-readable file size
bookSchema.virtual("fileSizeFormatted").get(function () {
  const bytes = this.fileSize;
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
});

// Virtual for file type label
bookSchema.virtual("fileType").get(function () {
  if (this.mimeType === "application/pdf") return "PDF";
  if (this.mimeType === "application/epub+zip") return "EPUB";
  return "Unknown";
});

export default mongoose.models.Book || mongoose.model("Book", bookSchema);

