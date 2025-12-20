import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";

// GET /api/user/preferences - Get current user's preferences
export async function GET(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectMongo();

    const user = await User.findById(session.user.id)
      .select("preferences")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return preferences with defaults if not set
    const preferences = {
      readerViewMode: user.preferences?.readerViewMode || "one-page",
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// PUT /api/user/preferences - Update current user's preferences
export async function PUT(req) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { readerViewMode } = body;

    // Validate readerViewMode if provided
    if (readerViewMode !== undefined) {
      if (!["one-page", "continuous"].includes(readerViewMode)) {
        return NextResponse.json(
          { error: "Invalid readerViewMode. Must be 'one-page' or 'continuous'" },
          { status: 400 }
        );
      }
    }

    await connectMongo();

    // Build update object for preferences
    const updateObj = {};
    if (readerViewMode !== undefined) {
      updateObj["preferences.readerViewMode"] = readerViewMode;
    }

    // Only update if there's something to update
    if (Object.keys(updateObj).length === 0) {
      return NextResponse.json(
        { error: "No valid preferences provided" },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateObj },
      { new: true, runValidators: true }
    ).select("preferences");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const preferences = {
      readerViewMode: user.preferences?.readerViewMode || "one-page",
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

