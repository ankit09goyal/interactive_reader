import { NextResponse } from "next/server";
import { verifyAdminBookAccess } from "@/libs/adminBookAuth";
import ReadingAnalytics from "@/models/ReadingAnalytics";
import Highlight from "@/models/Highlight";
import Question from "@/models/Question";

/**
 * GET /api/admin/books/[bookId]/analytics/reading - Get reading analytics for a book
 *
 * Returns:
 * - Summary statistics (total time, sessions, avg duration)
 * - Time spent per location (page/chapter)
 * - Drop-off analysis (where readers stop)
 * - Highlight analytics (counts by location)
 * - Question analytics (counts by location)
 * - Reading activity over time
 *
 * Access control: Admin must own the book
 * GDPR compliant: All data is aggregated, no personal information exposed
 */
export async function GET(req, { params }) {
  try {
    // Verify admin authentication and book ownership
    const authResult = await verifyAdminBookAccess(params);
    if (authResult.error) return authResult.error;

    const { book, bookObjectId } = authResult;

    // Run all analytics queries in parallel
    const [
      summaryStats,
      timePerLocation,
      dropOffAnalysis,
      sessionsOverTime,
      readingActivity,
      peakReadingTimes,
    ] = await Promise.all([
      // 1. Summary statistics
      getSummaryStats(bookObjectId),

      // 2. Time spent per location
      getTimePerLocation(bookObjectId),

      // 3. Drop-off analysis (last location per session)
      getDropOffAnalysis(bookObjectId),

      // 4. Sessions over time (last 30 days)
      getSessionsOverTime(bookObjectId),

      // 8. Reading activity over time
      getReadingActivity(bookObjectId),

      // 9. Peak reading times (hour of day distribution)
      getPeakReadingTimes(bookObjectId),
    ]);

    return NextResponse.json({
      bookObjectId,
      bookTitle: book.title,
      fileType: book.mimeType === "application/pdf" ? "PDF" : "EPUB",
      summary: summaryStats,
      timePerLocation,
      dropOffAnalysis,
      sessionsOverTime,
      highlights: {
        byLocation: highlightsByLocation,
        withNotes: highlightsWithNotes,
      },
      questions: {
        byLocation: questionsByLocation,
      },
      readingActivity,
      peakReadingTimes,
    });
  } catch (error) {
    console.error("Error fetching reading analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch reading analytics" },
      { status: 500 }
    );
  }
}

/**
 * Get summary statistics for a book
 */
async function getSummaryStats(bookId) {
  const [totalTimeResult, sessionStats, uniqueSessions] = await Promise.all([
    // Total time spent reading
    ReadingAnalytics.aggregate([
      { $match: { bookId, eventType: "time_update" } },
      { $group: { _id: null, totalTime: { $sum: "$timeSpent" } } },
    ]),

    // Session statistics
    ReadingAnalytics.aggregate([
      {
        $match: {
          bookId,
          eventType: { $in: ["session_start", "session_end"] },
        },
      },
      {
        $group: {
          _id: "$sessionId",
          start: {
            $min: {
              $cond: [
                { $eq: ["$eventType", "session_start"] },
                "$createdAt",
                null,
              ],
            },
          },
          end: {
            $max: {
              $cond: [
                { $eq: ["$eventType", "session_end"] },
                "$createdAt",
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          duration: {
            $cond: [
              { $and: [{ $ne: ["$start", null] }, { $ne: ["$end", null] }] },
              { $divide: [{ $subtract: ["$end", "$start"] }, 1000] }, // Convert to seconds
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          avgDuration: { $avg: "$duration" },
          totalDuration: { $sum: "$duration" },
        },
      },
    ]),

    // Unique sessions count
    ReadingAnalytics.distinct("sessionId", { bookId }),
  ]);

  const totalTime = totalTimeResult[0]?.totalTime || 0;
  const stats = sessionStats[0] || { totalSessions: 0, avgDuration: 0 };

  return {
    totalReadingTime: Math.round(totalTime), // in seconds
    totalReadingTimeFormatted: formatDuration(totalTime),
    totalSessions: uniqueSessions.length,
    avgSessionDuration: Math.round(stats.avgDuration || 0),
    avgSessionDurationFormatted: formatDuration(stats.avgDuration || 0),
  };
}

/**
 * Get time spent per location
 */
async function getTimePerLocation(bookId) {
  const result = await ReadingAnalytics.aggregate([
    { $match: { bookId, eventType: "time_update" } },
    {
      $group: {
        _id: { locationType: "$locationType", location: "$location" },
        totalTime: { $sum: "$timeSpent" },
        viewCount: { $sum: 1 },
      },
    },
    { $sort: { totalTime: -1 } },
    { $limit: 50 }, // Top 50 locations
  ]);

  return result.map((item) => ({
    locationType: item._id.locationType,
    location: item._id.location,
    totalTime: Math.round(item.totalTime),
    totalTimeFormatted: formatDuration(item.totalTime),
    viewCount: item.viewCount,
  }));
}

/**
 * Get drop-off analysis (where readers stop reading)
 */
async function getDropOffAnalysis(bookId) {
  // Get the last location visited in each session
  const result = await ReadingAnalytics.aggregate([
    {
      $match: {
        bookId,
        eventType: { $in: ["page_view", "chapter_view", "time_update"] },
      },
    },
    { $sort: { sessionId: 1, createdAt: -1 } },
    {
      $group: {
        _id: "$sessionId",
        lastLocation: { $first: "$location" },
        lastLocationType: { $first: "$locationType" },
        totalPages: { $first: "$totalPages" },
        totalChapters: { $first: "$totalChapters" },
      },
    },
    {
      $group: {
        _id: { location: "$lastLocation", locationType: "$lastLocationType" },
        dropOffCount: { $sum: 1 },
        totalPages: { $first: "$totalPages" },
        totalChapters: { $first: "$totalChapters" },
      },
    },
    { $sort: { dropOffCount: -1 } },
    { $limit: 20 }, // Top 20 drop-off points
  ]);

  return result.map((item) => ({
    location: item._id.location,
    locationType: item._id.locationType,
    dropOffCount: item.dropOffCount,
    totalPages: item.totalPages,
    totalChapters: item.totalChapters,
  }));
}

/**
 * Get sessions over time (last 30 days)
 */
async function getSessionsOverTime(bookId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await ReadingAnalytics.aggregate([
    {
      $match: {
        bookId,
        eventType: "session_start",
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        sessionCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  return result.map((item) => ({
    date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(
      item._id.day
    ).padStart(2, "0")}`,
    sessionCount: item.sessionCount,
  }));
}

/**
 * Get reading activity over time (time spent per day)
 */
async function getReadingActivity(bookId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await ReadingAnalytics.aggregate([
    {
      $match: {
        bookId,
        eventType: "time_update",
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        totalTime: { $sum: "$timeSpent" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  return result.map((item) => ({
    date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(
      item._id.day
    ).padStart(2, "0")}`,
    totalTime: Math.round(item.totalTime),
    totalTimeFormatted: formatDuration(item.totalTime),
  }));
}

/**
 * Get peak reading times (hour of day distribution)
 */
async function getPeakReadingTimes(bookId) {
  const result = await ReadingAnalytics.aggregate([
    { $match: { bookId, eventType: "time_update" } },
    {
      $group: {
        _id: { $hour: "$createdAt" },
        totalTime: { $sum: "$timeSpent" },
        sessionCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in missing hours with 0
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const found = result.find((item) => item._id === hour);
    return {
      hour,
      hourFormatted: `${String(hour).padStart(2, "0")}:00`,
      totalTime: found ? Math.round(found.totalTime) : 0,
      sessionCount: found ? found.sessionCount : 0,
    };
  });

  return hourlyData;
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}
