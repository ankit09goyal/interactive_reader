import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import UserBookAccess from "@/models/UserBookAccess";

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
          select: "title author description fileName filePath fileSize mimeType createdAt",
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
        _id: access.bookId._id.toString(),
        title: access.bookId.title,
        author: access.bookId.author,
        description: access.bookId.description,
        fileName: access.bookId.fileName,
        filePath: access.bookId.filePath,
        fileSize: access.bookId.fileSize,
        mimeType: access.bookId.mimeType,
        createdAt: access.bookId.createdAt?.toISOString(),
        fileSizeFormatted: formatFileSize(access.bookId.fileSize),
        fileType: access.bookId.mimeType === "application/pdf" ? "PDF" : "EPUB",
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
    console.error("Error fetching user books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

// Helper function for file size formatting
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

