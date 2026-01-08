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
import { transformBook } from "@/libs/bookUtils";
import { handleApiError } from "@/libs/apiHelpers";

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
    const transformedBooks = books.map((book) => transformBook(book));

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
    return handleApiError(error, "Failed to fetch books", "fetching books");
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

    // Transform book to match the format expected by the frontend
    const transformedBook = transformBook(book);

    return NextResponse.json(
      {
        book: transformedBook,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "Failed to upload book", "uploading book");
  }
}
