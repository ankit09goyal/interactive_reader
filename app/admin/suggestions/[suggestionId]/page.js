import { auth } from "@/libs/auth";
import { notFound, redirect } from "next/navigation";
import connectMongo from "@/libs/mongoose";
import Suggestion from "@/models/Suggestion";
import Book from "@/models/Book";
import User from "@/models/User";
import Link from "next/link";
import SuggestionDetailClient from "./SuggestionDetailClient";

export const dynamic = "force-dynamic";

async function getSuggestion(suggestionId, adminId) {
  await connectMongo();

  // Get the suggestion
  const suggestion = await Suggestion.findById(suggestionId).lean();

  if (!suggestion) {
    return { error: "not_found" };
  }

  // Verify admin owns the book
  const book = await Book.findById(suggestion.bookId).lean();

  if (!book || book.uploadedBy.toString() !== adminId) {
    return { error: "forbidden" };
  }

  // Get user info if suggestion was made by a user
  let user = null;
  if (suggestion.userId) {
    user = await User.findById(suggestion.userId)
      .select("name email image")
      .lean();
  }

  // Format response
  const formatSuggestion = (s) => ({
    _id: s._id.toString(),
    suggestion: s.suggestion,
    selectedText: s.selectedText,
    epubChapter: s.epubChapter,
    adminReply: s.adminReply,
    createdAt: s.createdAt?.toISOString(),
    repliedAt: s.repliedAt?.toISOString(),
  });

  return {
    suggestion: formatSuggestion(suggestion),
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
  };
}

export default async function AdminSuggestionDetailPage({ params }) {
  const session = await auth();
  const { suggestionId } = await params;

  const result = await getSuggestion(suggestionId, session.user.id);

  if (result.error === "not_found") {
    notFound();
  }

  if (result.error === "forbidden") {
    redirect("/admin/suggestions");
  }

  const { suggestion, user, book } = result;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/suggestions" className="btn btn-ghost btn-sm gap-2">
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
          Back to Suggestions
        </Link>
      </div>

      {/* Suggestion Info */}
      <div className="bg-base-200 rounded-lg p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestion.adminReply ? (
            <span className="badge badge-success">Replied</span>
          ) : (
            <span className="badge badge-warning">Unreplied</span>
          )}
        </div>

        {/* Book info */}
        <div className="mb-4">
          <p className="text-sm text-base-content/60">Book</p>
          <p className="font-medium">
            {book.title}{" "}
            <span className="text-base-content/50">by {book.author}</span>
          </p>
        </div>

        {/* User info */}
        {user && (
          <div className="mb-4">
            <p className="text-sm text-base-content/60">Suggested by</p>
            <p className="font-medium">{user.name || user.email}</p>
          </div>
        )}

        {/* Selected text */}
        {suggestion.selectedText && (
          <div className="mb-4">
            <p className="text-sm text-base-content/60">Selected Text</p>
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-2 bg-base-100 rounded-r-lg">
              <p className="italic">&ldquo;{suggestion.selectedText}&rdquo;</p>
              {suggestion.epubChapter && (
                <p className="text-xs text-base-content/50 mt-1">
                  Chapter: {suggestion.epubChapter}
                </p>
              )}
            </blockquote>
          </div>
        )}

        {/* Suggestion */}
        <div className="mb-4">
          <p className="text-sm text-base-content/60">Improvement Suggestion</p>
          <p className="text-lg font-medium">{suggestion.suggestion}</p>
        </div>

        {/* Timestamps */}
        <div className="flex gap-4 text-xs text-base-content/50">
          <span>
            Created: {new Date(suggestion.createdAt).toLocaleString()}
          </span>
          {suggestion.repliedAt && (
            <span>
              Replied: {new Date(suggestion.repliedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <SuggestionDetailClient
        suggestion={suggestion}
        suggestionId={suggestionId}
        book={book}
      />
    </div>
  );
}
