import { NextResponse } from "next/server";
import connectMongo from "@/libs/mongoose";
import UserBookAccess from "@/models/UserBookAccess";

/**
 * Require authentication - returns error response if not authenticated
 * @param {Object} session - NextAuth session object
 * @returns {NextResponse|null} - Error response if not authenticated, null if authenticated
 */
export function requireAuth(session) {
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  return null;
}

/**
 * Require book access - verifies user has access to a book
 * @param {string} userId - User ID
 * @param {string} bookId - Book ID
 * @returns {Promise<{access: Object|null, error: NextResponse|null}>} - Access object or error response
 */
export async function requireBookAccess(userId, bookId) {
  await connectMongo();

  const access = await UserBookAccess.findOne({
    userId,
    bookId,
  }).lean();

  if (!access) {
    return {
      access: null,
      error: NextResponse.json(
        { error: "You do not have access to this book" },
        { status: 403 }
      ),
    };
  }

  return { access, error: null };
}

/**
 * Handle API errors with standardized error responses
 * @param {Error} error - The error object
 * @param {string} defaultMessage - Default error message if error doesn't have one
 * @param {string} logContext - Context for logging (e.g., "fetching books")
 * @returns {NextResponse} - Error response
 */
export function handleApiError(error, defaultMessage = "Something went wrong", logContext = "") {
  console.error(`Error ${logContext}:`, error);
  return NextResponse.json(
    { error: error.message || defaultMessage },
    { status: 500 }
  );
}

