import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import ReadingAnalytics from "@/models/ReadingAnalytics";
import Book from "@/models/Book";
import { handleApiError } from "@/libs/apiHelpers";
import mongoose from "mongoose";

/**
 * POST /api/analytics/track - Track reading analytics events
 * 
 * GDPR Compliant: No userId is stored in analytics records.
 * Authentication is required to prevent abuse, but user identity
 * is not recorded in the analytics data.
 * 
 * Request body:
 * {
 *   bookId: string,
 *   events: [
 *     {
 *       eventType: "page_view" | "chapter_view" | "session_start" | "session_end" | "time_update",
 *       locationType: "page" | "chapter" | "cfi",
 *       location: string,
 *       timeSpent?: number,
 *       sessionId: string,
 *       sessionStart?: string (ISO date),
 *       sessionEnd?: string (ISO date),
 *       timestamp: string (ISO date),
 *       totalPages?: number,
 *       totalChapters?: number
 *     }
 *   ]
 * }
 */
export async function POST(req) {
  try {
    // Require authentication to prevent abuse (but don't store userId)
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { bookId, events } = body;

    // Validate required fields
    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Events array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate bookId format
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json(
        { error: "Invalid book ID format" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Verify book exists (no need to verify user access - we're tracking anonymously)
    const book = await Book.findById(bookId).select("_id").lean();
    if (!book) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 }
      );
    }

    // Validate and prepare events for insertion
    const validEventTypes = ["page_view", "chapter_view", "session_start", "session_end", "time_update"];
    const validLocationTypes = ["page", "chapter", "cfi"];

    const analyticsRecords = [];
    for (const event of events) {
      // Validate event type
      if (!event.eventType || !validEventTypes.includes(event.eventType)) {
        continue; // Skip invalid events
      }

      // Validate location type
      if (!event.locationType || !validLocationTypes.includes(event.locationType)) {
        continue; // Skip invalid events
      }

      // Validate required fields
      if (!event.sessionId || !event.location) {
        continue; // Skip invalid events
      }

      // Create analytics record (NO userId!)
      const record = {
        bookId: new mongoose.Types.ObjectId(bookId),
        eventType: event.eventType,
        locationType: event.locationType,
        location: String(event.location),
        sessionId: event.sessionId,
        timeSpent: event.timeSpent ? Math.max(0, Number(event.timeSpent)) : 0,
        sessionStart: event.sessionStart ? new Date(event.sessionStart) : null,
        sessionEnd: event.sessionEnd ? new Date(event.sessionEnd) : null,
        totalPages: event.totalPages ? Number(event.totalPages) : null,
        totalChapters: event.totalChapters ? Number(event.totalChapters) : null,
      };

      analyticsRecords.push(record);
    }

    // Batch insert all valid records
    if (analyticsRecords.length > 0) {
      await ReadingAnalytics.insertMany(analyticsRecords, { ordered: false });
    }

    return NextResponse.json({
      success: true,
      recordedEvents: analyticsRecords.length,
    });
  } catch (error) {
    // Don't expose internal errors for analytics - just log them
    console.error("Analytics tracking error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record analytics" },
      { status: 500 }
    );
  }
}
