import { NextResponse } from "next/server";
import { verifyAdminBookAccess } from "@/libs/adminBookAuth";
import Question from "@/models/Question";
import UserBookAccess from "@/models/UserBookAccess";

/**
 * GET /api/admin/books/[bookId]/analytics/questions - Get questions analytics for a book
 *
 * Returns:
 * - Total questions count
 * - Public and private questions
 * - Average questions per user
 * - Users who asked vs didn't ask questions
 * - Unanswered questions count
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
      totalQuestions,
      publicQuestions,
      privateQuestions,
      unansweredQuestions,
      totalUsersWithAccess,
      usersWhoAskedQuestions,
    ] = await Promise.all([
      // Total questions count
      Question.countDocuments({ bookId: bookObjectId }),

      // Public questions count
      Question.countDocuments({ bookId: bookObjectId, isPublic: true }),

      // Private questions count
      Question.countDocuments({ bookId: bookObjectId, isPublic: false }),

      // Unanswered questions count
      Question.countDocuments({
        bookId: bookObjectId,
        answer: { $in: [null, ""] },
      }),

      // Total users with access to this book
      UserBookAccess.countDocuments({ bookId: bookObjectId }),

      // Unique users who have asked questions (exclude admin-created questions)
      Question.distinct("userId", {
        bookId: bookObjectId,
        userId: { $ne: null },
      }),
    ]);

    const usersWhoAskedQuestionsCount = usersWhoAskedQuestions.length;
    const usersWhoDidntAskQuestions = Math.max(
      0,
      totalUsersWithAccess - usersWhoAskedQuestionsCount
    );

    // Calculate average questions per user (based on users with access)
    const avgQuestionsPerUser =
      totalUsersWithAccess > 0
        ? (totalQuestions / totalUsersWithAccess).toFixed(1)
        : "0";

    const answeredQuestions = totalQuestions - unansweredQuestions;

    return NextResponse.json({
      bookObjectId,
      summary: {
        totalQuestions,
        publicQuestions,
        privateQuestions,
        unansweredQuestions,
        answeredQuestions,
        answeredPercentage:
          totalQuestions > 0
            ? Math.round((answeredQuestions / totalQuestions) * 100)
            : 0,
      },
      userEngagement: {
        totalUsersWithAccess,
        usersWhoAskedQuestions: usersWhoAskedQuestionsCount,
        usersWhoDidntAskQuestions,
        avgQuestionsPerUser: parseFloat(avgQuestionsPerUser),
        questionRate:
          totalUsersWithAccess > 0
            ? Math.round(
                (usersWhoAskedQuestionsCount / totalUsersWithAccess) * 100
              )
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching questions analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions analytics" },
      { status: 500 }
    );
  }
}
