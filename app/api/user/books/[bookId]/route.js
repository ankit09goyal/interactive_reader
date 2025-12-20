import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import UserBookAccess from "@/models/UserBookAccess";

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
      .select("title author description fileName filePath fileSize mimeType createdAt")
      .lean();

    if (!book) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 }
      );
    }

    // Transform book to the expected format
    const transformedBook = {
      _id: book._id.toString(),
      title: book.title,
      author: book.author,
      description: book.description,
      fileName: book.fileName,
      filePath: book.filePath,
      fileSize: book.fileSize,
      mimeType: book.mimeType,
      createdAt: book.createdAt?.toISOString(),
      fileSizeFormatted: formatFileSize(book.fileSize),
      fileType: book.mimeType === "application/pdf" ? "PDF" : "EPUB",
      grantedAt: access.createdAt?.toISOString(),
    };

    return NextResponse.json({ book: transformedBook });
  } catch (error) {
    console.error("Error fetching book:", error);
    return NextResponse.json(
      { error: "Failed to fetch book" },
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

