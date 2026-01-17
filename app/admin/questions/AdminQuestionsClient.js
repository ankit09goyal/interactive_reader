"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import AdminCreateQuestionModal from "@/components/AdminCreateQuestionModal";
import apiClient from "@/libs/api";
import icons from "@/libs/icons";

export default function AdminQuestionsClient({
  initialQuestions,
  books,
  initialPagination,
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [filter, setFilter] = useState("all"); // "all", "answered", "unanswered", "public"
  const [bookFilter, setBookFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch questions from API
  const fetchQuestions = useCallback(async (page, status, bookId) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "10");

      if (status && status !== "all") {
        params.set("status", status);
      }
      if (bookId && bookId !== "all") {
        params.set("bookId", bookId);
      }

      const response = await apiClient.get(
        `/admin/questions?${params.toString()}`
      );
      setQuestions(response.questions);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchQuestions(1, newFilter, bookFilter);
  };

  const handleBookFilterChange = (newBookFilter) => {
    setBookFilter(newBookFilter);
    fetchQuestions(1, filter, newBookFilter);
  };

  // Handle page changes
  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchQuestions(page, filter, bookFilter);
  };

  const handleQuestionCreated = (newQuestion) => {
    // Add new question to the list and refresh
    const book = books.find((b) => b.id === newQuestion.bookId);
    const formattedQuestion = {
      _id: newQuestion._id || newQuestion.id,
      question: newQuestion.question,
      selectedText: newQuestion.selectedText,
      pageNumber: newQuestion.pageNumber,
      answer: newQuestion.answer,
      isPublic: newQuestion.isPublic,
      isAdminCreated: true,
      createdAt: newQuestion.createdAt || new Date().toISOString(),
      user: null,
      book: book || null,
    };
    setQuestions([formattedQuestion, ...questions.slice(0, 9)]);
    setPagination((prev) => ({
      ...prev,
      totalCount: prev.totalCount + 1,
      totalPages: Math.ceil((prev.totalCount + 1) / prev.limit),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-base-200 rounded-lg p-4">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="select select-bordered select-sm"
            disabled={isLoading}
          >
            <option value="all">All</option>
            <option value="answered">Answered</option>
            <option value="unanswered">Unanswered</option>
            <option value="public">Public</option>
          </select>
        </div>

        {/* Book filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Book:</span>
          <select
            value={bookFilter}
            onChange={(e) => handleBookFilterChange(e.target.value)}
            className="select select-bordered select-sm"
            disabled={isLoading}
          >
            <option value="all">All Books</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </div>

        {/* Create button */}
        <div className="ml-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm gap-2"
          >
            {icons.plus}
            Create Public Q&A
          </button>
        </div>
      </div>

      {/* Questions list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <QuestionRowSkeleton key={i} />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 bg-base-200 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-base-content/30 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-base-content/70">No questions found</p>
          <p className="text-sm text-base-content/50 mt-1">
            {filter !== "all" || bookFilter !== "all"
              ? "Try adjusting your filters"
              : "Questions from your readers will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <QuestionRow key={question._id} question={question} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-base-300">
          <div className="text-sm text-base-content/70">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{" "}
            {Math.min(
              pagination.page * pagination.limit,
              pagination.totalCount
            )}{" "}
            of {pagination.totalCount} questions
          </div>
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => goToPage(1)}
              disabled={pagination.page === 1 || isLoading}
            >
              «
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1 || isLoading}
            >
              ‹
            </button>
            <div className="join-item btn-sm btn-active btn cursor-text">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <button
              className="join-item btn btn-sm"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || isLoading}
            >
              ›
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => goToPage(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages || isLoading}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Create Question Modal */}
      <AdminCreateQuestionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        books={books}
        onQuestionCreated={handleQuestionCreated}
      />
    </div>
  );
}

function QuestionRow({ question }) {
  return (
    <Link
      href={`/admin/questions/${question._id}`}
      className="block bg-base-100 border border-base-300 rounded-lg p-4 hover:bg-base-200 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-2">
            {question.isPublic && (
              <span className="badge badge-primary badge-sm">Public</span>
            )}
            {question.answer ? (
              <span className="badge badge-success badge-sm">Answered</span>
            ) : (
              <span className="badge badge-warning badge-sm">Unanswered</span>
            )}
            {question.isAdminCreated && (
              <span className="badge badge-ghost badge-sm">Admin Created</span>
            )}
            {question.isEditedVersion && (
              <span className="badge badge-info badge-sm">Edited Version</span>
            )}
            {question.book && (
              <span className="badge badge-outline badge-sm">
                {question.book.title}
              </span>
            )}
          </div>

          {/* Selected text preview */}
          {question.selectedText && (
            <p className="text-xs text-base-content/50 italic mb-2 truncate">
              &ldquo;{question.selectedText}&rdquo;
              {question.pageNumber && ` (Page ${question.pageNumber})`}
            </p>
          )}

          {/* Question */}
          <p className="font-medium line-clamp-2">{question.question}</p>

          {/* Answer preview */}
          {question.answer && (
            <p className="text-sm text-base-content/70 mt-2 line-clamp-1">
              <span className="font-medium">A:</span> {question.answer}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-3 text-xs text-base-content/50">
            {question.user ? (
              <span>From: {question.user.name || question.user.email}</span>
            ) : (
              <span>Admin created</span>
            )}
            <span>{new Date(question.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-base-content/30 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}

function QuestionRowSkeleton() {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {/* Badges skeleton */}
          <div className="flex flex-wrap gap-2">
            <div className="skeleton h-5 w-14 rounded-full"></div>
            <div className="skeleton h-5 w-20 rounded-full"></div>
            <div className="skeleton h-5 w-24 rounded-full"></div>
          </div>

          {/* Selected text skeleton */}
          <div className="skeleton h-3 w-3/4"></div>

          {/* Question skeleton */}
          <div className="space-y-2">
            <div className="skeleton h-5 w-full"></div>
            <div className="skeleton h-5 w-2/3"></div>
          </div>

          {/* Answer preview skeleton */}
          <div className="skeleton h-4 w-4/5"></div>

          {/* Meta info skeleton */}
          <div className="flex items-center gap-4">
            <div className="skeleton h-3 w-32"></div>
            <div className="skeleton h-3 w-20"></div>
          </div>
        </div>

        {/* Arrow skeleton */}
        <div className="skeleton h-5 w-5 flex-shrink-0"></div>
      </div>
    </div>
  );
}
