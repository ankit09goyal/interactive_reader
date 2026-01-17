import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import mongoose from "mongoose";

/**
 * Verify admin authentication and book ownership
 *
 * This utility function handles common authentication and authorization logic
 * for admin book analytics endpoints. It:
 * 1. Verifies the user is authenticated and is an admin
 * 2. Validates the bookId parameter
 * 3. Connects to MongoDB
 * 4. Verifies the admin owns the requested book
 *
 * @param {Object} params - The route params object containing bookId
 * @returns {Promise<Object>} Object containing either { error: NextResponse } or { book, bookObjectId, adminId }
 *
 * @example
 * const result = await verifyAdminBookAccess(params);
 * if (result.error) return result.error;
 * const { book, bookObjectId, adminId } = result;
 */
export async function verifyAdminBookAccess(params) {
  try {
    // Verify admin authentication
    const session = await auth();
    const authError = verifyAdminForApi(session);
    if (authError) {
      return {
        error: NextResponse.json(
          { error: authError.error },
          { status: authError.status }
        ),
      };
    }

    // Validate bookId parameter
    const { bookId } = await params;
    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      return {
        error: NextResponse.json(
          { error: "Valid book ID is required" },
          { status: 400 }
        ),
      };
    }

    // Connect to MongoDB
    await connectMongo();

    const bookObjectId = new mongoose.Types.ObjectId(bookId);
    const adminId = session.user.id;

    // Verify admin owns this book
    const book = await Book.findOne({
      _id: bookObjectId,
      uploadedBy: adminId,
    }).lean();

    if (!book) {
      return {
        error: NextResponse.json(
          { error: "Book not found or you don't have access to it" },
          { status: 404 }
        ),
      };
    }

    // Return validated data
    return {
      book,
      bookObjectId,
      adminId,
    };
  } catch (error) {
    console.error("Error in verifyAdminBookAccess:", error);
    return {
      error: NextResponse.json(
        { error: "Failed to verify book access" },
        { status: 500 }
      ),
    };
  }
}
