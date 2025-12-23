import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Question from "@/models/Question";
import Book from "@/models/Book";
import User from "@/models/User";

// GET /api/admin/questions/[questionId] - Get a single question
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
    const { questionId } = await params;

    await connectMongo();

    // Get the question
    const question = await Question.findById(questionId).lean();

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Verify admin owns the book
    const book = await Book.findById(question.bookId).lean();

    if (!book || book.uploadedBy.toString() !== adminId) {
      return NextResponse.json(
        { error: "You can only view questions for books you uploaded" },
        { status: 403 }
      );
    }

    // Get user info if question was asked by a user
    let user = null;
    if (question.userId) {
      user = await User.findById(question.userId)
        .select("name email image")
        .lean();
    }

    // Get edited versions of this question
    const editedVersions = await Question.find({
      originalQuestionId: question._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Format response
    const formatQuestion = (q) => ({
      ...q,
      _id: q._id.toString(),
      bookId: q.bookId.toString(),
      userId: q.userId?.toString() || null,
      originalQuestionId: q.originalQuestionId?.toString() || null,
      answeredBy: q.answeredBy?.toString() || null,
      createdByAdmin: q.createdByAdmin?.toString() || null,
    });

    return NextResponse.json({
      question: formatQuestion(question),
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
      editedVersions: editedVersions.map(formatQuestion),
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/questions/[questionId] - Answer or make question public
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
    const { questionId } = await params;
    const body = await req.json();
    const { answer, isPublic } = body;

    await connectMongo();

    // Get the question
    const question = await Question.findById(questionId);

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Verify admin owns the book
    const book = await Book.findById(question.bookId).lean();

    if (!book || book.uploadedBy.toString() !== adminId) {
      return NextResponse.json(
        { error: "You can only modify questions for books you uploaded" },
        { status: 403 }
      );
    }

    // Update fields
    const now = new Date();

    if (answer !== undefined) {
      question.answer = answer?.trim() || null;
      if (answer?.trim()) {
        question.answeredBy = adminId;
        question.answeredAt = now;
      } else {
        question.answeredBy = null;
        question.answeredAt = null;
      }
    }

    if (isPublic !== undefined && isPublic === true && !question.isPublic) {
      question.isPublic = true;
      question.madePublicAt = now;
    }

    await question.save();

    return NextResponse.json({
      question: question.toJSON(),
    });
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/questions/[questionId] - Delete a question
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
    const { questionId } = await params;

    await connectMongo();

    // Get the question
    const question = await Question.findById(questionId);

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Verify admin owns the book
    const book = await Book.findById(question.bookId).lean();

    if (!book || book.uploadedBy.toString() !== adminId) {
      return NextResponse.json(
        { error: "You can only delete questions for books you uploaded" },
        { status: 403 }
      );
    }

    // Delete the question and any edited versions
    await Question.deleteMany({
      $or: [{ _id: questionId }, { originalQuestionId: questionId }],
    });

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

