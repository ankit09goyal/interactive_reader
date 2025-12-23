import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Question from "@/models/Question";
import Book from "@/models/Book";

// POST /api/admin/questions/create - Create a new public question as admin
export async function POST(req) {
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
    const body = await req.json();
    const { bookId, question, selectedText, pageNumber, answer, isPublic } = body;

    // Validate required fields
    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Verify admin owns this book
    const book = await Book.findById(bookId).lean();

    if (!book) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 }
      );
    }

    if (book.uploadedBy.toString() !== adminId) {
      return NextResponse.json(
        { error: "You can only create questions for books you uploaded" },
        { status: 403 }
      );
    }

    // Create the question
    const now = new Date();
    const newQuestion = await Question.create({
      bookId,
      userId: null, // Admin-created questions have no user
      question: question.trim(),
      selectedText: selectedText?.trim() || null,
      pageNumber: pageNumber || null,
      answer: answer?.trim() || null,
      answeredBy: answer?.trim() ? adminId : null,
      answeredAt: answer?.trim() ? now : null,
      isPublic: isPublic !== false, // Default to true for admin-created
      madePublicAt: isPublic !== false ? now : null,
      isAdminCreated: true,
      createdByAdmin: adminId,
      isEditedVersion: false,
      originalQuestionId: null,
    });

    return NextResponse.json({
      question: newQuestion.toJSON(),
    });
  } catch (error) {
    console.error("Error creating admin question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

