import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import { handleApiError } from "@/libs/apiHelpers";

// Default page view settings
const DEFAULT_PAGE_VIEW_SETTINGS = {
  fontFamily: "Georgia",
  fontSize: 16,
  spacing: "normal",
  alignment: "justify",
  margins: "normal",
};

// Valid options for page view settings
const VALID_SPACING = ["narrow", "normal", "wide"];
const VALID_ALIGNMENT = ["left", "justify"];
const VALID_MARGINS = ["narrow", "normal", "wide"];
const VALID_FONT_FAMILIES = [
  "Georgia",
  "Times New Roman",
  "Arial",
  "Verdana",
  "Helvetica",
  "Palatino",
  "Garamond",
  "Book Antiqua",
  "Courier New",
  "Trebuchet MS",
];

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
      pageViewSettings: {
        fontFamily: user.preferences?.pageViewSettings?.fontFamily || DEFAULT_PAGE_VIEW_SETTINGS.fontFamily,
        fontSize: user.preferences?.pageViewSettings?.fontSize || DEFAULT_PAGE_VIEW_SETTINGS.fontSize,
        spacing: user.preferences?.pageViewSettings?.spacing || DEFAULT_PAGE_VIEW_SETTINGS.spacing,
        alignment: user.preferences?.pageViewSettings?.alignment || DEFAULT_PAGE_VIEW_SETTINGS.alignment,
        margins: user.preferences?.pageViewSettings?.margins || DEFAULT_PAGE_VIEW_SETTINGS.margins,
      },
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    return handleApiError(error, "Failed to fetch preferences", "fetching preferences");
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
    const { readerViewMode, pageViewSettings } = body;

    // Validate readerViewMode if provided
    if (readerViewMode !== undefined) {
      if (!["one-page", "continuous"].includes(readerViewMode)) {
        return NextResponse.json(
          { error: "Invalid readerViewMode. Must be 'one-page' or 'continuous'" },
          { status: 400 }
        );
      }
    }

    // Validate pageViewSettings if provided
    if (pageViewSettings !== undefined) {
      const { fontFamily, fontSize, spacing, alignment, margins } = pageViewSettings;

      if (fontFamily !== undefined && !VALID_FONT_FAMILIES.includes(fontFamily)) {
        return NextResponse.json(
          { error: `Invalid fontFamily. Must be one of: ${VALID_FONT_FAMILIES.join(", ")}` },
          { status: 400 }
        );
      }

      if (fontSize !== undefined && (typeof fontSize !== "number" || fontSize < 12 || fontSize > 24)) {
        return NextResponse.json(
          { error: "Invalid fontSize. Must be a number between 12 and 24" },
          { status: 400 }
        );
      }

      if (spacing !== undefined && !VALID_SPACING.includes(spacing)) {
        return NextResponse.json(
          { error: `Invalid spacing. Must be one of: ${VALID_SPACING.join(", ")}` },
          { status: 400 }
        );
      }

      if (alignment !== undefined && !VALID_ALIGNMENT.includes(alignment)) {
        return NextResponse.json(
          { error: `Invalid alignment. Must be one of: ${VALID_ALIGNMENT.join(", ")}` },
          { status: 400 }
        );
      }

      if (margins !== undefined && !VALID_MARGINS.includes(margins)) {
        return NextResponse.json(
          { error: `Invalid margins. Must be one of: ${VALID_MARGINS.join(", ")}` },
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

    // Add pageViewSettings fields if provided
    if (pageViewSettings !== undefined) {
      const { fontFamily, fontSize, spacing, alignment, margins } = pageViewSettings;

      if (fontFamily !== undefined) {
        updateObj["preferences.pageViewSettings.fontFamily"] = fontFamily;
      }
      if (fontSize !== undefined) {
        updateObj["preferences.pageViewSettings.fontSize"] = fontSize;
      }
      if (spacing !== undefined) {
        updateObj["preferences.pageViewSettings.spacing"] = spacing;
      }
      if (alignment !== undefined) {
        updateObj["preferences.pageViewSettings.alignment"] = alignment;
      }
      if (margins !== undefined) {
        updateObj["preferences.pageViewSettings.margins"] = margins;
      }
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
      pageViewSettings: {
        fontFamily: user.preferences?.pageViewSettings?.fontFamily || DEFAULT_PAGE_VIEW_SETTINGS.fontFamily,
        fontSize: user.preferences?.pageViewSettings?.fontSize || DEFAULT_PAGE_VIEW_SETTINGS.fontSize,
        spacing: user.preferences?.pageViewSettings?.spacing || DEFAULT_PAGE_VIEW_SETTINGS.spacing,
        alignment: user.preferences?.pageViewSettings?.alignment || DEFAULT_PAGE_VIEW_SETTINGS.alignment,
        margins: user.preferences?.pageViewSettings?.margins || DEFAULT_PAGE_VIEW_SETTINGS.margins,
      },
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    return handleApiError(error, "Failed to update preferences", "updating preferences");
  }
}

