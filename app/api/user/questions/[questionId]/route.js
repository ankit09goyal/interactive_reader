import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Question from "@/models/Question";

// DELETE /api/user/questions/[questionId] - Delete a question (only if user owns it)
export async function DELETE(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { questionId } = await params;

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Find the question
    const question = await Question.findById(questionId).lean();

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Check if user owns this question
    // Users can only delete their own questions, not admin-created ones
    if (!question.userId || question.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own questions" },
        { status: 403 }
      );
    }

    // Prevent deletion of admin-created questions
    if (question.isAdminCreated) {
      return NextResponse.json(
        { error: "Cannot delete admin-created questions" },
        { status: 403 }
      );
    }

    // Delete the question
    await Question.findByIdAndDelete(questionId);

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}

