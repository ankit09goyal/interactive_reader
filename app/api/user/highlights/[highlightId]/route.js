import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Highlight from "@/models/Highlight";

// GET /api/user/highlights/[highlightId] - Get a specific highlight
export async function GET(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { highlightId } = await params;

    if (!highlightId) {
      return NextResponse.json(
        { error: "Highlight ID is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Find the highlight (must belong to user)
    const highlight = await Highlight.findOne({
      _id: highlightId,
      userId: session.user.id,
    }).lean();

    if (!highlight) {
      return NextResponse.json(
        { error: "Highlight not found" },
        { status: 404 }
      );
    }

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

    return NextResponse.json({ highlight: transformedHighlight });
  } catch (error) {
    console.error("Error fetching highlight:", error);
    return NextResponse.json(
      { error: "Failed to fetch highlight" },
      { status: 500 }
    );
  }
}

// PUT /api/user/highlights/[highlightId] - Update a highlight (notes, color)
export async function PUT(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { highlightId } = await params;

    if (!highlightId) {
      return NextResponse.json(
        { error: "Highlight ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { notes, color } = body;

    // Validate color if provided
    const validColors = ["yellow", "green", "blue", "pink", "orange"];
    if (color && !validColors.includes(color)) {
      return NextResponse.json(
        { error: `Invalid color. Must be one of: ${validColors.join(", ")}` },
        { status: 400 }
      );
    }

    await connectMongo();

    // Build update object
    const updateObj = {};
    if (notes !== undefined) {
      updateObj.notes = notes?.trim() || null;
    }
    if (color) {
      updateObj.color = color;
    }

    if (Object.keys(updateObj).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    // Update the highlight (must belong to user)
    const highlight = await Highlight.findOneAndUpdate(
      { _id: highlightId, userId: session.user.id },
      { $set: updateObj },
      { new: true, runValidators: true }
    ).lean();

    if (!highlight) {
      return NextResponse.json(
        { error: "Highlight not found" },
        { status: 404 }
      );
    }

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

    return NextResponse.json({ highlight: transformedHighlight });
  } catch (error) {
    console.error("Error updating highlight:", error);
    return NextResponse.json(
      { error: "Failed to update highlight" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/highlights/[highlightId] - Delete a highlight
export async function DELETE(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { highlightId } = await params;

    if (!highlightId) {
      return NextResponse.json(
        { error: "Highlight ID is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Delete the highlight (must belong to user)
    const result = await Highlight.findOneAndDelete({
      _id: highlightId,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Highlight not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting highlight:", error);
    return NextResponse.json(
      { error: "Failed to delete highlight" },
      { status: 500 }
    );
  }
}

