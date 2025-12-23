import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Question from "@/models/Question";
import Book from "@/models/Book";
import User from "@/models/User";

// GET /api/admin/questions - List all questions for admin's books
export async function GET(req) {
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
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId");
    const status = searchParams.get("status"); // "answered", "unanswered", or null for all
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;

    await connectMongo();

    // Get all books uploaded by this admin
    const adminBooks = await Book.find({ uploadedBy: adminId })
      .select("_id title")
      .lean();
    const adminBookIds = adminBooks.map((b) => b._id);

    // Build query
    const query = {
      bookId: bookId ? bookId : { $in: adminBookIds },
    };

    // Filter by answered status if specified
    if (status === "answered") {
      query.answer = { $ne: null };
    } else if (status === "unanswered") {
      query.answer = null;
    }

    // Get total count for pagination
    const totalCount = await Question.countDocuments(query);

    // Fetch questions with pagination
    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get unique user IDs to fetch user info
    const userIds = [...new Set(questions.map((q) => q.userId).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email image")
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Create book map for quick lookup
    const bookMap = new Map(adminBooks.map((b) => [b._id.toString(), b]));

    // Format questions with user and book info
    const formattedQuestions = questions.map((q) => {
      const user = q.userId ? userMap.get(q.userId.toString()) : null;
      const book = bookMap.get(q.bookId.toString());

      return {
        ...q,
        _id: q._id.toString(),
        bookId: q.bookId.toString(),
        userId: q.userId?.toString() || null,
        originalQuestionId: q.originalQuestionId?.toString() || null,
        answeredBy: q.answeredBy?.toString() || null,
        createdByAdmin: q.createdByAdmin?.toString() || null,
        user: user
          ? {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              image: user.image,
            }
          : null,
        book: book
          ? {
              id: book._id.toString(),
              title: book.title,
            }
          : null,
      };
    });

    return NextResponse.json({
      questions: formattedQuestions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      books: adminBooks.map((b) => ({
        id: b._id.toString(),
        title: b.title,
      })),
    });
  } catch (error) {
    console.error("Error fetching admin questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

