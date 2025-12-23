import { auth } from "@/libs/auth";
import { notFound, redirect } from "next/navigation";
import connectMongo from "@/libs/mongoose";
import Question from "@/models/Question";
import Book from "@/models/Book";
import User from "@/models/User";
import Link from "next/link";
import QuestionDetailClient from "./QuestionDetailClient";

export const dynamic = "force-dynamic";

async function getQuestion(questionId, adminId) {
  await connectMongo();

  // Get the question
  const question = await Question.findById(questionId).lean();

  if (!question) {
    return { error: "not_found" };
  }

  // Verify admin owns the book
  const book = await Book.findById(question.bookId).lean();

  if (!book || book.uploadedBy.toString() !== adminId) {
    return { error: "forbidden" };
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
    _id: q._id.toString(),
    question: q.question,
    selectedText: q.selectedText,
    pageNumber: q.pageNumber,
    answer: q.answer,
    isPublic: q.isPublic,
    isAdminCreated: q.isAdminCreated,
    isEditedVersion: q.isEditedVersion,
    originalQuestionId: q.originalQuestionId?.toString() || null,
    createdAt: q.createdAt?.toISOString(),
    answeredAt: q.answeredAt?.toISOString(),
    madePublicAt: q.madePublicAt?.toISOString(),
  });

  return {
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
  };
}

export default async function AdminQuestionDetailPage({ params }) {
  const session = await auth();
  const { questionId } = await params;

  const result = await getQuestion(questionId, session.user.id);

  if (result.error === "not_found") {
    notFound();
  }

  if (result.error === "forbidden") {
    redirect("/admin/questions");
  }

  const { question, user, book, editedVersions } = result;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/questions" className="btn btn-ghost btn-sm gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Questions
        </Link>
      </div>

      {/* Question Info */}
      <div className="bg-base-200 rounded-lg p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {question.isPublic && (
            <span className="badge badge-primary">Public</span>
          )}
          {question.answer ? (
            <span className="badge badge-success">Answered</span>
          ) : (
            <span className="badge badge-warning">Unanswered</span>
          )}
          {question.isAdminCreated && (
            <span className="badge badge-ghost">Admin Created</span>
          )}
          {question.isEditedVersion && (
            <span className="badge badge-info">Edited Version</span>
          )}
        </div>

        {/* Book info */}
        <div className="mb-4">
          <p className="text-sm text-base-content/60">Book</p>
          <p className="font-medium">
            {book.title} <span className="text-base-content/50">by {book.author}</span>
          </p>
        </div>

        {/* User info */}
        {user && (
          <div className="mb-4">
            <p className="text-sm text-base-content/60">Asked by</p>
            <p className="font-medium">{user.name || user.email}</p>
          </div>
        )}

        {/* Selected text */}
        {question.selectedText && (
          <div className="mb-4">
            <p className="text-sm text-base-content/60">Selected Text</p>
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-2 bg-base-100 rounded-r-lg">
              <p className="italic">&ldquo;{question.selectedText}&rdquo;</p>
              {question.pageNumber && (
                <p className="text-xs text-base-content/50 mt-1">
                  Page {question.pageNumber}
                </p>
              )}
            </blockquote>
          </div>
        )}

        {/* Question */}
        <div className="mb-4">
          <p className="text-sm text-base-content/60">Question</p>
          <p className="text-lg font-medium">{question.question}</p>
        </div>

        {/* Timestamps */}
        <div className="flex gap-4 text-xs text-base-content/50">
          <span>Created: {new Date(question.createdAt).toLocaleString()}</span>
          {question.answeredAt && (
            <span>Answered: {new Date(question.answeredAt).toLocaleString()}</span>
          )}
          {question.madePublicAt && (
            <span>Made public: {new Date(question.madePublicAt).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Edited versions */}
      {editedVersions.length > 0 && (
        <div className="bg-base-200 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Edited Versions ({editedVersions.length})</h3>
          <div className="space-y-3">
            {editedVersions.map((ev) => (
              <Link
                key={ev._id}
                href={`/admin/questions/${ev._id}`}
                className="block bg-base-100 rounded-lg p-4 hover:bg-base-300 transition-colors"
              >
                <div className="flex gap-2 mb-2">
                  {ev.isPublic && (
                    <span className="badge badge-primary badge-sm">Public</span>
                  )}
                  {ev.answer ? (
                    <span className="badge badge-success badge-sm">Answered</span>
                  ) : (
                    <span className="badge badge-warning badge-sm">Unanswered</span>
                  )}
                </div>
                <p className="line-clamp-2">{ev.question}</p>
                <p className="text-xs text-base-content/50 mt-2">
                  {new Date(ev.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <QuestionDetailClient
        question={question}
        questionId={questionId}
        book={book}
      />
    </div>
  );
}

