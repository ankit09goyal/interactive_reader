import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import UserBookAccess from "@/models/UserBookAccess";
import { transformBook } from "@/libs/bookUtils";
import { handleApiError } from "@/libs/apiHelpers";

// GET /api/user/books - List all books the current user has access to
export async function GET(req) {
  try {
    const session = await auth();

    // Verify user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectMongo();

    // Get query params for pagination
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;

    const userId = session.user.id;

    // Get total count and books with access
    const [total, userBookAccess] = await Promise.all([
      UserBookAccess.countDocuments({ userId }),
      UserBookAccess.find({ userId })
        .populate({
          path: "bookId",
          select:
            "title author description fileName filePath fileSize mimeType createdAt",
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    // Transform books to the expected format
    const books = userBookAccess
      .filter((access) => access.bookId) // Filter out any with deleted books
      .map((access) => ({
        ...transformBook(access.bookId),
        grantedAt: access.createdAt?.toISOString(),
      }));

    return NextResponse.json({
      books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(
      error,
      "Failed to fetch books",
      "fetching user books"
    );
  }
}
