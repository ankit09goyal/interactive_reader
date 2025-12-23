import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Question from "@/models/Question";
import Book from "@/models/Book";
import User from "@/models/User";
import Link from "next/link";
import AdminQuestionsClient from "./AdminQuestionsClient";

export const dynamic = "force-dynamic";

async function getQuestions(adminId) {
  await connectMongo();

  // Get all books uploaded by this admin
  const adminBooks = await Book.find({ uploadedBy: adminId })
    .select("_id title")
    .lean();
  const adminBookIds = adminBooks.map((b) => b._id);

  // Get all questions for admin's books
  const questions = await Question.find({
    bookId: { $in: adminBookIds },
  })
    .sort({ createdAt: -1 })
    .limit(100)
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
  };
}

export default async function AdminQuestionsPage() {
  const session = await auth();
  const { questions, books } = await getQuestions(session.user.id);

  // Stats
  const totalQuestions = questions.length;
  const unansweredCount = questions.filter((q) => !q.answer).length;
  const publicCount = questions.filter((q) => q.isPublic).length;

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
              Total: <span className="font-semibold">{totalQuestions}</span>
            </div>
            {unansweredCount > 0 && (
              <div className="text-warning">
                Unanswered: <span className="font-semibold">{unansweredCount}</span>
              </div>
            )}
            <div>
              Public: <span className="font-semibold">{publicCount}</span>
            </div>
          </div>
        </div>
      </div>

      <AdminQuestionsClient initialQuestions={questions} books={books} />
    </div>
  );
}

