import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Book from "@/models/Book";
import UserBookAccess from "@/models/UserBookAccess";
import { handleApiError } from "@/libs/apiHelpers";

// GET /api/admin/users/[userId]/books - List all books a user has access to (filtered by admin's books)
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

    const { userId } = await params;
    const adminId = session.user.id;

    await connectMongo();

    // Verify user exists and admin has access to them
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isUserAddedByAdmin = user.addedBy?.some(
      (id) => id.toString() === adminId
    );
    if (!isUserAddedByAdmin) {
      return NextResponse.json(
        { error: "You do not have access to this user" },
        { status: 403 }
      );
    }

    // Get admin's book IDs
    const adminBookIds = await Book.find({ uploadedBy: adminId }).distinct(
      "_id"
    );

    // Get user's book access for admin's books
    const userBookAccess = await UserBookAccess.find({
      userId: userId,
      bookId: { $in: adminBookIds },
    })
      .populate("bookId", "title author description mimeType fileSize")
      .lean();

    // Transform to return book details with access info
    const booksWithAccess = userBookAccess.map((access) => ({
      accessId: access._id.toString(),
      book: {
        _id: access.bookId._id.toString(),
        title: access.bookId.title,
        author: access.bookId.author,
        description: access.bookId.description,
        mimeType: access.bookId.mimeType,
        fileSize: access.bookId.fileSize,
      },
      grantedAt: access.createdAt,
    }));

    // Get all admin's books to show which ones the user has access to
    const allAdminBooks = await Book.find({ uploadedBy: adminId })
      .select("title author description mimeType fileSize")
      .lean();

    const accessedBookIds = new Set(
      userBookAccess.map((a) => a.bookId._id.toString())
    );

    const allBooksWithAccessStatus = allAdminBooks.map((book) => ({
      _id: book._id.toString(),
      title: book.title,
      author: book.author,
      description: book.description,
      mimeType: book.mimeType,
      fileSize: book.fileSize,
      hasAccess: accessedBookIds.has(book._id.toString()),
    }));

    return NextResponse.json({
      userBooks: booksWithAccess,
      allBooks: allBooksWithAccessStatus,
      totalBooksWithAccess: booksWithAccess.length,
      totalAdminBooks: allAdminBooks.length,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch user books", "fetching user books");
  }
}

// POST /api/admin/users/[userId]/books - Grant access to one or more books
export async function POST(req, { params }) {
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

    const { userId } = await params;
    const adminId = session.user.id;
    const body = await req.json();
    const { bookIds } = body; // Array of book IDs to grant access to

    if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
      return NextResponse.json(
        { error: "bookIds array is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Verify user exists and admin has access to them
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isUserAddedByAdmin = user.addedBy?.some(
      (id) => id.toString() === adminId
    );
    if (!isUserAddedByAdmin) {
      return NextResponse.json(
        { error: "You do not have access to this user" },
        { status: 403 }
      );
    }

    // Verify all books belong to the current admin
    const adminBooks = await Book.find({
      _id: { $in: bookIds },
      uploadedBy: adminId,
    });

    if (adminBooks.length !== bookIds.length) {
      return NextResponse.json(
        { error: "Some books do not exist or do not belong to you" },
        { status: 400 }
      );
    }

    // Create book access records (use upsert to avoid duplicates)
    const accessRecords = bookIds.map((bookId) => ({
      updateOne: {
        filter: { userId, bookId },
        update: {
          $setOnInsert: {
            userId,
            bookId,
            grantedBy: adminId,
          },
        },
        upsert: true,
      },
    }));

    const result = await UserBookAccess.bulkWrite(accessRecords);

    return NextResponse.json({
      message: "Book access granted successfully",
      granted: result.upsertedCount,
      alreadyHadAccess: bookIds.length - result.upsertedCount,
    });
  } catch (error) {
    return handleApiError(error, "Failed to grant book access", "granting book access");
  }
}

// DELETE /api/admin/users/[userId]/books - Revoke access to a book
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

    const { userId } = await params;
    const adminId = session.user.id;

    // Get bookId from query params
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      return NextResponse.json(
        { error: "bookId query parameter is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Verify user exists and admin has access to them
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isUserAddedByAdmin = user.addedBy?.some(
      (id) => id.toString() === adminId
    );
    if (!isUserAddedByAdmin) {
      return NextResponse.json(
        { error: "You do not have access to this user" },
        { status: 403 }
      );
    }

    // Verify the book belongs to the current admin
    const book = await Book.findOne({ _id: bookId, uploadedBy: adminId });
    if (!book) {
      return NextResponse.json(
        { error: "Book not found or does not belong to you" },
        { status: 404 }
      );
    }

    // Delete the access record
    const result = await UserBookAccess.deleteOne({ userId, bookId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "User did not have access to this book" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Book access revoked successfully",
    });
  } catch (error) {
    return handleApiError(error, "Failed to revoke book access", "revoking book access");
  }
}
