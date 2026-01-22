import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Suggestion from "@/models/Suggestion";
import UserBookAccess from "@/models/UserBookAccess";
import { handleApiError } from "@/libs/apiHelpers";

// POST /api/user/suggestions - Create a new suggestion
export async function POST(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      bookId,
      suggestion,
      selectedText,
      epubCfi,
      epubCfiRange,
      epubChapter,
      chapterHref,
    } = body;

    // Validate required fields
    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    if (!suggestion?.trim()) {
      return NextResponse.json(
        { error: "Suggestion is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Verify user has access to this book
    const access = await UserBookAccess.findOne({
      userId: session.user.id,
      bookId,
    }).lean();

    if (!access) {
      return NextResponse.json(
        { error: "You don't have access to this book" },
        { status: 403 }
      );
    }

    // Create the suggestion
    const newSuggestion = await Suggestion.create({
      bookId,
      userId: session.user.id,
      suggestion: suggestion.trim(),
      selectedText: selectedText?.trim() || null,
      epubCfi: epubCfi || null,
      epubCfiRange: epubCfiRange || null,
      epubChapter: epubChapter || null,
      chapterHref: chapterHref || null,
    });

    return NextResponse.json({
      suggestion: newSuggestion.toJSON(),
    });
  } catch (error) {
    return handleApiError(error, "Failed to create suggestion", "creating suggestion");
  }
}

// GET /api/user/suggestions - List suggestions for a book
// Returns only user's own suggestions with admin replies
export async function GET(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Verify user has access to this book
    const access = await UserBookAccess.findOne({
      userId: session.user.id,
      bookId,
    }).lean();

    if (!access) {
      return NextResponse.json(
        { error: "You don't have access to this book" },
        { status: 403 }
      );
    }

    // Fetch user's own suggestions
    const suggestions = await Suggestion.find({
      bookId,
      userId: session.user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Format suggestions for response
    const formatSuggestion = (s) => ({
      ...s,
      _id: s._id.toString(),
      bookId: s.bookId.toString(),
      userId: s.userId.toString(),
      repliedBy: s.repliedBy?.toString() || null,
      epubCfi: s.epubCfi || null,
      epubCfiRange: s.epubCfiRange || null,
      epubChapter: s.epubChapter || null,
      chapterHref: s.chapterHref || null,
      selectedText: s.selectedText || null,
      adminReply: s.adminReply || null,
      repliedAt: s.repliedAt?.toISOString() || null,
      createdAt: s.createdAt?.toISOString() || null,
      updatedAt: s.updatedAt?.toISOString() || null,
    });

    return NextResponse.json({
      suggestions: suggestions.map(formatSuggestion),
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch suggestions", "fetching suggestions");
  }
}
