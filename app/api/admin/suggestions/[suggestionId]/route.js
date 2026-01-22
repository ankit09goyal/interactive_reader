import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Suggestion from "@/models/Suggestion";
import Book from "@/models/Book";
import User from "@/models/User";
import { handleApiError } from "@/libs/apiHelpers";

// GET /api/admin/suggestions/[suggestionId] - Get a single suggestion
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

    const adminId = session.user.id;
    const { suggestionId } = await params;

    await connectMongo();

    // Get the suggestion
    const suggestion = await Suggestion.findById(suggestionId).lean();

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    // Verify admin owns the book
    const book = await Book.findById(suggestion.bookId).lean();

    if (!book || book.uploadedBy.toString() !== adminId) {
      return NextResponse.json(
        { error: "You can only view suggestions for books you uploaded" },
        { status: 403 }
      );
    }

    // Get user info if suggestion was made by a user
    let user = null;
    if (suggestion.userId) {
      user = await User.findById(suggestion.userId)
        .select("name email image")
        .lean();
    }

    // Format response
    const formatSuggestion = (s) => ({
      ...s,
      _id: s._id.toString(),
      bookId: s.bookId.toString(),
      userId: s.userId?.toString() || null,
      repliedBy: s.repliedBy?.toString() || null,
      createdAt: s.createdAt?.toISOString() || null,
      updatedAt: s.updatedAt?.toISOString() || null,
      repliedAt: s.repliedAt?.toISOString() || null,
    });

    return NextResponse.json({
      suggestion: formatSuggestion(suggestion),
      user: user
        ? {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            image: user.image,
          }
        : null,
      book: {
        id: book._id.toString(),
        title: book.title,
        author: book.author,
      },
    });
  } catch (error) {
    return handleApiError(
      error,
      "Failed to fetch suggestion",
      "fetching suggestion"
    );
  }
}

// PUT /api/admin/suggestions/[suggestionId] - Reply to a suggestion
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

    const adminId = session.user.id;
    const { suggestionId } = await params;
    const body = await req.json();
    const { adminReply } = body;

    await connectMongo();

    // Get the suggestion
    const suggestion = await Suggestion.findById(suggestionId);

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    // Verify admin owns the book
    const book = await Book.findById(suggestion.bookId).lean();

    if (!book || book.uploadedBy.toString() !== adminId) {
      return NextResponse.json(
        { error: "You can only reply to suggestions for books you uploaded" },
        { status: 403 }
      );
    }

    // Update the reply
    const now = new Date();

    if (adminReply !== undefined) {
      suggestion.adminReply = adminReply?.trim() || null;
      if (adminReply?.trim()) {
        suggestion.repliedBy = adminId;
        suggestion.repliedAt = now;
      } else {
        suggestion.repliedBy = null;
        suggestion.repliedAt = null;
      }
    }

    await suggestion.save();

    return NextResponse.json({
      suggestion: suggestion.toJSON(),
    });
  } catch (error) {
    return handleApiError(
      error,
      "Failed to update suggestion",
      "updating suggestion"
    );
  }
}

// DELETE /api/admin/suggestions/[suggestionId] - Delete a suggestion
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

    const adminId = session.user.id;
    const { suggestionId } = await params;

    await connectMongo();

    // Get the suggestion
    const suggestion = await Suggestion.findById(suggestionId);

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    // Verify admin owns the book
    const book = await Book.findById(suggestion.bookId).lean();

    if (!book || book.uploadedBy.toString() !== adminId) {
      return NextResponse.json(
        { error: "You can only delete suggestions for books you uploaded" },
        { status: 403 }
      );
    }

    // Delete the suggestion
    await Suggestion.findByIdAndDelete(suggestionId);

    return NextResponse.json({
      success: true,
      message: "Suggestion deleted successfully",
    });
  } catch (error) {
    return handleApiError(
      error,
      "Failed to delete suggestion",
      "deleting suggestion"
    );
  }
}
