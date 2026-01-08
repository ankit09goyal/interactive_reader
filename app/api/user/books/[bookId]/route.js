import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import UserBookAccess from "@/models/UserBookAccess";
import { transformBook } from "@/libs/bookUtils";
import { handleApiError } from "@/libs/apiHelpers";

// GET /api/user/books/[bookId] - Get a specific book if user has access
export async function GET(req, { params }) {
  try {
    const session = await auth();

    // Verify user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { bookId } = await params;
    const userId = session.user.id;

    await connectMongo();

    // Check if user has access to this book
    const access = await UserBookAccess.findOne({
      userId,
      bookId,
    }).lean();

    if (!access) {
      return NextResponse.json(
        { error: "You do not have access to this book" },
        { status: 403 }
      );
    }

    // Get the book details
    const book = await Book.findById(bookId)
      .select(
        "title author description fileName filePath fileSize mimeType createdAt"
      )
      .lean();

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Transform book to the expected format
    const transformedBook = transformBook(book, {
      grantedAt: access.createdAt?.toISOString(),
    });

    return NextResponse.json({ book: transformedBook });
  } catch (error) {
    return handleApiError(error, "Failed to fetch book", "fetching book");
  }
}
