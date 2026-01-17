import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Question from "@/models/Question";
import Book from "@/models/Book";
import User from "@/models/User";
import Link from "next/link";
import AdminQuestionsClient from "./AdminQuestionsClient";

export const dynamic = "force-dynamic";

const QUESTIONS_PER_PAGE = 10;

async function getQuestions(adminId) {
  await connectMongo();

  // Get all books uploaded by this admin
  const adminBooks = await Book.find({ uploadedBy: adminId })
    .select("_id title")
    .lean();
  const adminBookIds = adminBooks.map((b) => b._id);

  // Get total count for stats
  const totalCount = await Question.countDocuments({
    bookId: { $in: adminBookIds },
  });
  const unansweredCount = await Question.countDocuments({
    bookId: { $in: adminBookIds },
    answer: null,
  });
  const publicCount = await Question.countDocuments({
    bookId: { $in: adminBookIds },
    isPublic: true,
  });

  // Get first page of questions
  const questions = await Question.find({
    bookId: { $in: adminBookIds },
  })
    .sort({ createdAt: -1 })
    .limit(QUESTIONS_PER_PAGE)
    .lean();

  // Get unique user IDs to fetch user info
  const userIds = [...new Set(questions.map((q) => q.userId).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email image")
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  // Create book map for quick lookup
  const bookMap = new Map(adminBooks.map((b) => [b._id.toString(), b]));

  // Format questions
  const formattedQuestions = questions.map((q) => {
    const user = q.userId ? userMap.get(q.userId.toString()) : null;
    const book = bookMap.get(q.bookId.toString());

    return {
      _id: q._id.toString(),
      question: q.question,
      selectedText: q.selectedText,
      pageNumber: q.pageNumber,
      answer: q.answer,
      isPublic: q.isPublic,
      isAdminCreated: q.isAdminCreated,
      isEditedVersion: q.isEditedVersion,
      createdAt: q.createdAt?.toISOString(),
      answeredAt: q.answeredAt?.toISOString(),
      user: user
        ? {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
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

  return {
    questions: formattedQuestions,
    books: adminBooks.map((b) => ({
      id: b._id.toString(),
      title: b.title,
    })),
    stats: {
      totalCount,
      unansweredCount,
      publicCount,
    },
    pagination: {
      page: 1,
      limit: QUESTIONS_PER_PAGE,
      totalCount,
      totalPages: Math.ceil(totalCount / QUESTIONS_PER_PAGE),
    },
  };
}

export default async function AdminQuestionsPage() {
  const session = await auth();
  const { questions, books, stats, pagination } = await getQuestions(
    session.user.id
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Questions & Answers</h1>
          <p className="text-base-content/70 mt-1">
            Manage questions from your readers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-sm text-base-content/70">
            <div>
              Total: <span className="font-semibold">{stats.totalCount}</span>
            </div>
            <div className="text-warning">
              Unanswered:{" "}
              <span className="font-semibold">{stats.unansweredCount}</span>
            </div>

            <div>
              Public: <span className="font-semibold">{stats.publicCount}</span>
            </div>
          </div>
        </div>
      </div>

      <AdminQuestionsClient
        initialQuestions={questions}
        books={books}
        initialPagination={pagination}
      />
    </div>
  );
}
