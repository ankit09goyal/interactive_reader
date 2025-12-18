import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import {
  validateFile,
  generateUniqueFilename,
  saveFile,
} from "@/libs/fileUpload";

// GET /api/admin/books - List all books uploaded by the current admin
export async function GET(req) {
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

    await connectMongo();

    // Get query params for pagination
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;

    // Build query - only get books uploaded by the current admin
    const query = { uploadedBy: session.user.id };

    // Get total count and books
    const [total, books] = await Promise.all([
      Book.countDocuments(query),
      Book.find(query)
        .select(
          "title author description fileName filePath fileSize mimeType createdAt"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    // Transform books to include virtual fields
    const transformedBooks = books.map((book) => ({
      ...book,
      _id: book._id.toString(),
      uploadedBy: book.uploadedBy?.toString(),
      createdAt: book.createdAt?.toISOString(),
      fileSizeFormatted: formatFileSize(book.fileSize),
      fileType: book.mimeType === "application/pdf" ? "PDF" : "EPUB",
    }));

    return NextResponse.json({
      books: transformedBooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

// POST /api/admin/books - Upload a new book
export async function POST(req) {
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

    // Parse form data
    const formData = await req.formData();
    const title = formData.get("title");
    const author = formData.get("author");
    const description = formData.get("description") || "";
    const file = formData.get("file");

    // Validate required fields
    if (!title || !author) {
      return NextResponse.json(
        { error: "Title and author are required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generate unique filename and save file
    const uniqueFilename = generateUniqueFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { filePath } = await saveFile(
      buffer,
      session.user.id,
      uniqueFilename
    );

    await connectMongo();

    // Create book record
    const book = await Book.create({
      title,
      author,
      description,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy: session.user.id,
    });

    return NextResponse.json(
      {
        book: {
          ...book.toJSON(),
          fileSizeFormatted: formatFileSize(book.fileSize),
          fileType: book.mimeType === "application/pdf" ? "PDF" : "EPUB",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading book:", error);
    return NextResponse.json(
      { error: "Failed to upload book" },
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
