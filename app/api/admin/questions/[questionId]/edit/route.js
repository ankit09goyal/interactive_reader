import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Question from "@/models/Question";
import Book from "@/models/Book";

// POST /api/admin/questions/[questionId]/edit - Create an edited version of a question
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

    const adminId = session.user.id;
    const { questionId } = await params;
    const body = await req.json();
    const { question, isPublic, answer, useOriginalAnswer } = body;

    // Validate required fields
    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Get the original question
    const originalQuestion = await Question.findById(questionId).lean();

    if (!originalQuestion) {
      return NextResponse.json(
        { error: "Original question not found" },
        { status: 404 }
      );
    }

    // Verify admin owns the book
    const book = await Book.findById(originalQuestion.bookId).lean();

    if (!book || book.uploadedBy.toString() !== adminId) {
      return NextResponse.json(
        { error: "You can only edit questions for books you uploaded" },
        { status: 403 }
      );
    }

    // Determine the answer for the edited version
    let editedAnswer = null;
    let answeredBy = null;
    let answeredAt = null;

    if (useOriginalAnswer && originalQuestion.answer) {
      editedAnswer = originalQuestion.answer;
      answeredBy = originalQuestion.answeredBy;
      answeredAt = originalQuestion.answeredAt;
    } else if (answer?.trim()) {
      editedAnswer = answer.trim();
      answeredBy = adminId;
      answeredAt = new Date();
    }

    const now = new Date();

    // Create the edited version
    const editedQuestion = await Question.create({
      bookId: originalQuestion.bookId,
      userId: originalQuestion.userId, // Keep reference to original questioner
      question: question.trim(),
      selectedText: originalQuestion.selectedText,
      pageNumber: originalQuestion.pageNumber,
      answer: editedAnswer,
      answeredBy,
      answeredAt,
      isPublic: isPublic === true,
      madePublicAt: isPublic === true ? now : null,
      originalQuestionId: originalQuestion._id, // Reference to original
      isEditedVersion: true,
      isAdminCreated: false,
      createdByAdmin: adminId,
    });

    return NextResponse.json({
      question: editedQuestion.toJSON(),
      originalQuestion: {
        ...originalQuestion,
        _id: originalQuestion._id.toString(),
        bookId: originalQuestion.bookId.toString(),
        userId: originalQuestion.userId?.toString() || null,
      },
    });
  } catch (error) {
    console.error("Error creating edited question:", error);
    return NextResponse.json(
      { error: "Failed to create edited question" },
      { status: 500 }
    );
  }
}

