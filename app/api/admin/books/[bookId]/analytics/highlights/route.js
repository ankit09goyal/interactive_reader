import { NextResponse } from "next/server";
import { verifyAdminBookAccess } from "@/libs/adminBookAuth";
import Highlight from "@/models/Highlight";
import UserBookAccess from "@/models/UserBookAccess";

/**
 * Calculate similarity ratio between two strings (0 to 1)
 * Uses character-based similarity for efficiency
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Use longer string as base for comparison
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  // Check if shorter is contained in longer (common case for highlights)
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  // Calculate Levenshtein distance for more accurate similarity
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  return (maxLength - distance) / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;

  // Optimize for very long strings - use only 2 rows
  let prev = Array(n + 1)
    .fill(0)
    .map((_, i) => i);
  let curr = Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = Math.min(prev[j - 1], prev[j], curr[j - 1]) + 1;
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Group similar highlights (70% similarity threshold)
 * Returns top 10 most popular highlighted texts with user counts
 */
function getPopularHighlights(highlights, similarityThreshold = 0.7) {
  if (!highlights || highlights.length === 0) return [];

  // Group highlights by similar text
  const groups = [];

  for (const highlight of highlights) {
    const text = highlight.selectedText;
    const userId = highlight.userId.toString();

    // Find existing group with similar text
    let foundGroup = null;
    for (const group of groups) {
      if (calculateSimilarity(group.text, text) >= similarityThreshold) {
        foundGroup = group;
        break;
      }
    }

    if (foundGroup) {
      // Add user to existing group
      foundGroup.userIds.add(userId);
      // Keep the longer text as representative
      if (text.length > foundGroup.text.length) {
        foundGroup.text = text;
      }
    } else {
      // Create new group
      groups.push({
        text: text,
        userIds: new Set([userId]),
      });
    }
  }

  // Convert to array format and sort by user count
  const result = groups
    .map((group) => ({
      text: group.text,
      userCount: group.userIds.size,
    }))
    .filter((item) => item.userCount > 1) // Only show texts highlighted by multiple users
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 10); // Top 10

  return result;
}

/**
 * GET /api/admin/books/[bookId]/analytics/highlights - Get highlights analytics for a book
 *
 * Returns:
 * - Total highlights count
 * - Highlights with and without notes
 * - Average highlights per user
 * - Users who highlighted vs didn't highlight
 * - Popular highlights (texts highlighted by multiple users)
 *
 * Access control: Admin must own the book
 * GDPR compliant: All data is aggregated, no personal information exposed
 */
export async function GET(req, { params }) {
  try {
    // Verify admin authentication and book ownership
    const authResult = await verifyAdminBookAccess(params);
    if (authResult.error) return authResult.error;

    const { bookObjectId } = authResult;

    // Run all analytics queries in parallel
    const [
      totalHighlights,
      highlightsWithNotes,
      totalUsersWithAccess,
      usersWhoHighlighted,
      allHighlights,
    ] = await Promise.all([
      // Total highlights count
      Highlight.countDocuments({ bookId: bookObjectId }),

      // Highlights with notes count (notes exists and is not null or empty)
      Highlight.countDocuments({
        bookId: bookObjectId,
        notes: { $nin: [null, ""] },
      }),

      // Total users with access to this book
      UserBookAccess.countDocuments({ bookId: bookObjectId }),

      // Unique users who have created highlights
      Highlight.distinct("userId", { bookId: bookObjectId }),

      // Get all highlights for popular text analysis (limit to prevent memory issues)
      Highlight.find({ bookId: bookObjectId })
        .select("selectedText userId")
        .limit(1000)
        .lean(),
    ]);

    const usersWhoHighlightedCount = usersWhoHighlighted.length;
    const usersWhoDidntHighlight = Math.max(
      0,
      totalUsersWithAccess - usersWhoHighlightedCount
    );

    // Calculate average highlights per user (based on users with access)
    const avgHighlightsPerUser =
      totalUsersWithAccess > 0
        ? (totalHighlights / totalUsersWithAccess).toFixed(1)
        : "0";

    // Get popular highlights (texts highlighted by multiple users)
    const popularHighlights = getPopularHighlights(allHighlights);

    return NextResponse.json({
      bookObjectId,
      summary: {
        totalHighlights,
        withNotes: highlightsWithNotes,
        withoutNotes: totalHighlights - highlightsWithNotes,
        notesPercentage:
          totalHighlights > 0
            ? Math.round((highlightsWithNotes / totalHighlights) * 100)
            : 0,
      },
      userEngagement: {
        totalUsersWithAccess,
        usersWhoHighlighted: usersWhoHighlightedCount,
        usersWhoDidntHighlight,
        avgHighlightsPerUser: parseFloat(avgHighlightsPerUser),
        highlightingRate:
          totalUsersWithAccess > 0
            ? Math.round(
                (usersWhoHighlightedCount / totalUsersWithAccess) * 100
              )
            : 0,
      },
      popularHighlights,
    });
  } catch (error) {
    console.error("Error fetching highlights analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch highlights analytics" },
      { status: 500 }
    );
  }
}
