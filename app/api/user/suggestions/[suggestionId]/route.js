import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Suggestion from "@/models/Suggestion";
import { handleApiError } from "@/libs/apiHelpers";

// PUT /api/user/suggestions/[suggestionId] - Update a suggestion (only if user owns it)
export async function PUT(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { suggestionId } = await params;

    if (!suggestionId) {
      return NextResponse.json(
        { error: "Suggestion ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { suggestion } = body;

    if (!suggestion?.trim()) {
      return NextResponse.json(
        { error: "Suggestion text is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Find the suggestion
    const existingSuggestion = await Suggestion.findById(suggestionId);

    if (!existingSuggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    // Check if user owns this suggestion
    if (existingSuggestion.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own suggestions" },
        { status: 403 }
      );
    }

    // Update the suggestion
    existingSuggestion.suggestion = suggestion.trim();
    await existingSuggestion.save();

    return NextResponse.json({
      suggestion: existingSuggestion.toJSON(),
    });
  } catch (error) {
    return handleApiError(error, "Failed to update suggestion", "updating suggestion");
  }
}

// DELETE /api/user/suggestions/[suggestionId] - Delete a suggestion (only if user owns it)
export async function DELETE(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { suggestionId } = await params;

    if (!suggestionId) {
      return NextResponse.json(
        { error: "Suggestion ID is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Find the suggestion
    const suggestion = await Suggestion.findById(suggestionId).lean();

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    // Check if user owns this suggestion
    if (suggestion.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own suggestions" },
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
    return handleApiError(error, "Failed to delete suggestion", "deleting suggestion");
  }
}
