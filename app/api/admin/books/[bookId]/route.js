import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import {
  validateFile,
  generateUniqueFilename,
  saveFile,
  deleteFile,
} from "@/libs/fileUpload";

// GET /api/admin/books/[bookId] - Get single book details
export async function GET(req, { params }) {
  try {
    const session = await auth();

    // Verify admin access
    const authError = verifyAdminForApi(session);
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const { bookId } = await params;

    await connectMongo();

    // Find book and verify ownership
    const book = await Book.findOne({
      _id: bookId,
      uploadedBy: session.user.id,
    }).lean();

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({
      book: {
        ...book,
        _id: book._id.toString(),
        uploadedBy: book.uploadedBy?.toString(),
        createdAt: book.createdAt?.toISOString(),
        updatedAt: book.updatedAt?.toISOString(),
        fileSizeFormatted: formatFileSize(book.fileSize),
        fileType: book.mimeType === "application/pdf" ? "PDF" : "EPUB",
      },
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    return NextResponse.json(
      { error: "Failed to fetch book" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/books/[bookId] - Delete book and its file
export async function DELETE(req, { params }) {
  try {
    const session = await auth();

    // Verify admin access
    const authError = verifyAdminForApi(session);
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const { bookId } = await params;

    await connectMongo();

    // Find book and verify ownership
    const book = await Book.findOne({
      _id: bookId,
      uploadedBy: session.user.id,
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Delete the file from disk
    await deleteFile(book.filePath);

    // Delete the book record
    await Book.findByIdAndDelete(bookId);

    return NextResponse.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/books/[bookId] - Replace book file
export async function PUT(req, { params }) {
  try {
    const session = await auth();

    // Verify admin access
    const authError = verifyAdminForApi(session);
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const { bookId } = await params;

    await connectMongo();

    // Find book and verify ownership
    const book = await Book.findOne({
      _id: bookId,
      uploadedBy: session.user.id,
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Delete old file
    await deleteFile(book.filePath);

    // Generate unique filename and save new file
    const uniqueFilename = generateUniqueFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { filePath } = await saveFile(
      buffer,
      session.user.id,
      uniqueFilename
    );

    // Update book record
    book.fileName = file.name;
    book.filePath = filePath;
    book.fileSize = file.size;
    book.mimeType = file.type;
    await book.save();

    return NextResponse.json({
      book: {
        ...book.toJSON(),
        fileSizeFormatted: formatFileSize(book.fileSize),
        fileType: book.mimeType === "application/pdf" ? "PDF" : "EPUB",
      },
    });
  } catch (error) {
    console.error("Error replacing book file:", error);
    return NextResponse.json(
      { error: "Failed to replace book file" },
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
