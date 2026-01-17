import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// READING ANALYTICS SCHEMA
// Stores anonymized reading activity for analytics (GDPR compliant - no userId stored)
const readingAnalyticsSchema = mongoose.Schema(
  {
    // Reference to the book being read
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    // Type of location tracking (page for PDF, chapter/cfi for ePub)
    locationType: {
      type: String,
      enum: ["page", "chapter", "cfi"],
      required: true,
    },
    // Location identifier (page number, chapter title, or CFI string)
    location: {
      type: String,
      required: true,
    },
    // Time spent at this location in seconds
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Unique session identifier (UUID) for grouping events
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    // Session start timestamp (only set for session_start events)
    sessionStart: {
      type: Date,
      default: null,
    },
    // Session end timestamp (only set for session_end events)
    sessionEnd: {
      type: Date,
      default: null,
    },
    // Type of analytics event
    eventType: {
      type: String,
      enum: ["page_view", "chapter_view", "session_start", "session_end", "time_update"],
      required: true,
    },
    // Total pages in the book (for PDF completion tracking)
    totalPages: {
      type: Number,
      default: null,
    },
    // Total chapters in the book (for ePub completion tracking)
    totalChapters: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Add plugin that converts mongoose to json
readingAnalyticsSchema.plugin(toJSON);

// Index for time-series queries (getting analytics over time)
readingAnalyticsSchema.index({ bookId: 1, createdAt: -1 });

// Index for location-based aggregations (time spent per page/chapter)
readingAnalyticsSchema.index({ bookId: 1, locationType: 1, location: 1 });

// Index for finding session events
readingAnalyticsSchema.index({ bookId: 1, sessionId: 1 });

// Index for event type queries
readingAnalyticsSchema.index({ bookId: 1, eventType: 1 });

// Compound index for drop-off analysis (last location per session)
readingAnalyticsSchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.models.ReadingAnalytics ||
  mongoose.model("ReadingAnalytics", readingAnalyticsSchema);
