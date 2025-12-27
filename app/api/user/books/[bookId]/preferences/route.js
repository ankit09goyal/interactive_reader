import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import UserBookAccess from "@/models/UserBookAccess";

// GET /api/user/books/[bookId]/preferences - Get reading preferences for a book
export async function GET(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { bookId } = await params;
    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }
    const userId = session.user.id;

    await connectMongo();

    // Find user's access record for this book
    const access = await UserBookAccess.findOne({
      userId,
      bookId,
    }).lean();

    if (!access) {
      console.error("GET preferences: access not found", { userId, bookId });
      return NextResponse.json(
        { error: "You do not have access to this book" },
        { status: 403 }
      );
    }

    // Return preferences with defaults if not set
    const preferences = {
      lastPage: access.readingPreferences?.lastPage || 1,
      viewMode: access.readingPreferences?.viewMode || "one-page",
      scale: access.readingPreferences?.scale || 1.0,
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Error fetching book preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// Helper function to update preferences
async function updatePreferences(req, params) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { bookId } = await params;
  if (!bookId) {
    return NextResponse.json({ error: "Book ID is required" }, { status: 400 });
  }
  const userId = session.user.id;
  const body = await req.json();

  const { lastPage, viewMode, scale } = body;

  // Validate inputs
  if (
    lastPage !== undefined &&
    (typeof lastPage !== "number" || lastPage < 1)
  ) {
    return NextResponse.json(
      { error: "Invalid lastPage. Must be a positive number" },
      { status: 400 }
    );
  }

  if (
    viewMode !== undefined &&
    !["one-page", "continuous"].includes(viewMode)
  ) {
    return NextResponse.json(
      { error: "Invalid viewMode. Must be 'one-page' or 'continuous'" },
      { status: 400 }
    );
  }

  if (
    scale !== undefined &&
    (typeof scale !== "number" || scale < 0.5 || scale > 3.0)
  ) {
    return NextResponse.json(
      { error: "Invalid scale. Must be a number between 0.5 and 3.0" },
      { status: 400 }
    );
  }

  await connectMongo();

  // Build update object for preferences
  const updateObj = {};
  if (lastPage !== undefined) {
    updateObj["readingPreferences.lastPage"] = Math.floor(lastPage);
  }
  if (viewMode !== undefined) {
    updateObj["readingPreferences.viewMode"] = viewMode;
  }
  if (scale !== undefined) {
    updateObj["readingPreferences.scale"] = scale;
  }

  // Only update if there's something to update
  if (Object.keys(updateObj).length === 0) {
    return NextResponse.json(
      { error: "No valid preferences provided" },
      { status: 400 }
    );
  }

  // Update the access record with new preferences
  const access = await UserBookAccess.findOneAndUpdate(
    { userId, bookId },
    { $set: updateObj },
    // strict: false lets us persist fields even if the schema cache is stale
    { new: true, runValidators: true, strict: false }
  ).lean();

  if (!access) {
    console.error("PUT/POST preferences: access not found", {
      userId,
      bookId,
      updateObj,
    });
    return NextResponse.json(
      { error: "You do not have access to this book" },
      { status: 403 }
    );
  }
  // Return updated preferences
  const preferences = {
    lastPage: access.readingPreferences?.lastPage || 1,
    viewMode: access.readingPreferences?.viewMode || "one-page",
    scale: access.readingPreferences?.scale || 1.0,
  };

  return NextResponse.json({ preferences });
}

// PUT /api/user/books/[bookId]/preferences - Update reading preferences for a book
export async function PUT(req, { params }) {
  try {
    return await updatePreferences(req, params);
  } catch (error) {
    console.error("Error updating book preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

// POST /api/user/books/[bookId]/preferences - Update reading preferences (for sendBeacon)
export async function POST(req, { params }) {
  try {
    return await updatePreferences(req, params);
  } catch (error) {
    console.error("Error updating book preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
