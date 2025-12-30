import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Question from "@/models/Question";
import UserBookAccess from "@/models/UserBookAccess";

// POST /api/user/questions - Create a new question
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
      question,
      selectedText,
      pageNumber,
      epubCfi,
      epubCfiRange,
      epubChapter,
    } = body;

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

    // Verify user has access to this book
    const access = await UserBookAccess.findOne({
      userId: session.user.id,
      bookId,
    }).lean();

    if (!access) {
      return NextResponse.json(
        { error: "You don't have access to this book" },
        { status: 403 }
      );
    }

    // Create the question
    const newQuestion = await Question.create({
      bookId,
      userId: session.user.id,
      question: question.trim(),
      selectedText: selectedText?.trim() || null,
      pageNumber: pageNumber || null,
      epubCfi: epubCfi || null,
      epubCfiRange: epubCfiRange || null,
      epubChapter: epubChapter || null,
      isPublic: false,
      isAdminCreated: false,
      isEditedVersion: false,
    });

    return NextResponse.json({
      question: newQuestion.toJSON(),
    });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

// GET /api/user/questions - List questions for a book
// Returns user's own questions and public questions
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
        { error: "You don't have access to this book" },
        { status: 403 }
      );
    }

    // Fetch user's own questions (private)
    const myQuestions = await Question.find({
      bookId,
      userId: session.user.id,
      isEditedVersion: false, // Don't show edited versions in "my questions"
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch public questions (excluding user's own to avoid duplicates)
    const publicQuestions = await Question.find({
      bookId,
      isPublic: true,
      // Include all public questions, user's own public ones will be shown
      // with a special indicator
    })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out user's own questions from public list to avoid duplicates
    const filteredPublicQuestions = publicQuestions.filter(
      (q) => !q.userId || q.userId.toString() !== session.user.id
    );

    // Also include user's own public questions in the public list for reference
    const userPublicQuestions = publicQuestions.filter(
      (q) => q.userId && q.userId.toString() === session.user.id
    );

    // Format questions for response
    const formatQuestion = (q) => ({
      ...q,
      _id: q._id.toString(),
      bookId: q.bookId.toString(),
      userId: q.userId?.toString() || null,
      originalQuestionId: q.originalQuestionId?.toString() || null,
      answeredBy: q.answeredBy?.toString() || null,
      createdByAdmin: q.createdByAdmin?.toString() || null,
      epubCfi: q.epubCfi || null,
      epubCfiRange: q.epubCfiRange || null,
      epubChapter: q.epubChapter || null,
      pageNumber: q.pageNumber || null,
      selectedText: q.selectedText || null,
    });

    return NextResponse.json({
      myQuestions: myQuestions.map(formatQuestion),
      publicQuestions: [...filteredPublicQuestions, ...userPublicQuestions].map(
        formatQuestion
      ),
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
