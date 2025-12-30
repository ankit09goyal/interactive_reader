import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Highlight from "@/models/Highlight";
import UserBookAccess from "@/models/UserBookAccess";

// GET /api/user/highlights - Get user's highlights for a book
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
        { error: "You do not have access to this book" },
        { status: 403 }
      );
    }

    // Get user's highlights for this book
    const highlights = await Highlight.find({
      bookId,
      userId: session.user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Transform highlights for response
    const transformedHighlights = highlights.map((h) => ({
      _id: h._id.toString(),
      bookId: h.bookId.toString(),
      userId: h.userId.toString(),
      selectedText: h.selectedText,
      cfi: h.cfi,
      cfiRange: h.cfiRange,
      chapterTitle: h.chapterTitle,
      chapterHref: h.chapterHref,
      notes: h.notes,
      color: h.color,
      createdAt: h.createdAt?.toISOString(),
      updatedAt: h.updatedAt?.toISOString(),
    }));

    return NextResponse.json({ highlights: transformedHighlights });
  } catch (error) {
    console.error("Error fetching highlights:", error);
    return NextResponse.json(
      { error: "Failed to fetch highlights" },
      { status: 500 }
    );
  }
}

// POST /api/user/highlights - Create a new highlight
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
      selectedText,
      cfi,
      cfiRange,
      chapterTitle,
      chapterHref,
      notes,
      color,
    } = body;

    // Validate required fields
    if (!bookId || !selectedText || !cfi || !cfiRange) {
      return NextResponse.json(
        { error: "Book ID, selected text, CFI, and CFI range are required" },
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
        { error: "You do not have access to this book" },
        { status: 403 }
      );
    }

    // Create the highlight
    const highlight = await Highlight.create({
      bookId,
      userId: session.user.id,
      selectedText: selectedText.trim(),
      cfi,
      cfiRange,
      chapterTitle: chapterTitle || null,
      chapterHref: chapterHref || null,
      notes: notes?.trim() || null,
      color: color || "yellow",
    });

    // Transform for response
    const transformedHighlight = {
      _id: highlight._id.toString(),
      bookId: highlight.bookId.toString(),
      userId: highlight.userId.toString(),
      selectedText: highlight.selectedText,
      cfi: highlight.cfi,
      cfiRange: highlight.cfiRange,
      chapterTitle: highlight.chapterTitle,
      chapterHref: highlight.chapterHref,
      notes: highlight.notes,
      color: highlight.color,
      createdAt: highlight.createdAt?.toISOString(),
      updatedAt: highlight.updatedAt?.toISOString(),
    };

    return NextResponse.json(
      { highlight: transformedHighlight },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating highlight:", error);
    return NextResponse.json(
      { error: "Failed to create highlight" },
      { status: 500 }
    );
  }
}

