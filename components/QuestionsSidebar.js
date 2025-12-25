"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";
import QuestionDeleteModal from "./QuestionDeleteModal";

/**
 * QuestionsSidebar - Sidebar panel showing questions for the current book
 * Shows "My Questions" and "Public Q&A" sections
 */
export default function QuestionsSidebar({
  isOpen,
  onClose,
  bookId,
  onGoToPage,
  refreshTrigger = 0,
  onAddQuestion,
}) {
  const [questions, setQuestions] = useState({
    myQuestions: [],
    publicQuestions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // "all", "answered", "unanswered"
  const [myQuestionsFilter, setMyQuestionsFilter] = useState(true);
  const [deleteModalQuestion, setDeleteModalQuestion] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Fetch questions when sidebar opens or refresh is triggered
  useEffect(() => {
    if (isOpen && bookId) {
      fetchQuestions();
    }
  }, [isOpen, bookId, refreshTrigger]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/user/questions?bookId=${bookId}`);
      setQuestions({
        myQuestions: response.myQuestions || [],
        publicQuestions: response.publicQuestions || [],
      });
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError("Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter questions based on filter state
  const filterQuestions = (questionsList) => {
    if (filter === "all") return questionsList;
    if (filter === "answered") return questionsList.filter((q) => q.answer);
    if (filter === "unanswered") return questionsList.filter((q) => !q.answer);
    return questionsList;
  };

  const filteredMyQuestions = filterQuestions(questions.myQuestions);
  const filteredPublicQuestions = filterQuestions(questions.publicQuestions);

  // Handle click on question to go to page
  const handleQuestionClick = (question) => {
    if (question.pageNumber && onGoToPage) {
      onGoToPage(question.pageNumber);
    }
  };

  // Handle delete question - opens modal
  const handleDeleteQuestion = (question) => {
    setDeleteModalQuestion(question);
  };

  // Confirm delete question
  const handleDeleteConfirm = async () => {
    if (!deleteModalQuestion) return;

    setIsDeleting(true);
    try {
      await apiClient.delete(
        `/user/questions/${deleteModalQuestion._id || deleteModalQuestion.id}`
      );
      toast.success("Question deleted successfully");
      setDeleteModalQuestion(null);
      // Refresh questions list
      fetchQuestions();
    } catch (err) {
      console.error("Error deleting question:", err);
      toast.error(err.message || "Failed to delete question");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-base-100 shadow-2xl z-[150] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-base-300">
        <h3 className="text-lg font-semibold">Questions & Answers</h3>
        <div className="flex items-center gap-2">
          {/* Add Question button */}
          {onAddQuestion && (
            <button
              onClick={onAddQuestion}
              className="btn btn-primary btn-sm gap-1"
              title="Add Question"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden sm:inline text-xs">Add</span>
            </button>
          )}
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex tabs border-b border-base-100 py-2">
        <button
          onClick={() => setMyQuestionsFilter(true)}
          className={`flex-1 tab text-sm font-medium ${
            myQuestionsFilter === true
              ? "text-primary tab-active"
              : "text-base-content/60"
          }`}
        >
          My Questions
        </button>
        <button
          onClick={() => setMyQuestionsFilter(false)}
          className={`flex-1 tab text-sm font-medium ${
            myQuestionsFilter === false
              ? "text-primary tab-active"
              : "text-base-content/60"
          }`}
        >
          Public Questions
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex tabs tabs-box">
        <button
          onClick={() => setFilter("all")}
          className={`tab flex-1 py-2 text-sm font-medium ${
            filter === "all"
              ? "text-primary tab-active"
              : "text-base-content/60"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("answered")}
          className={`tab flex-1 py-2 text-sm font-medium ${
            filter === "answered"
              ? "text-primary tab-active"
              : "text-base-content/60"
          }`}
        >
          Answered
        </button>
        <button
          onClick={() => setFilter("unanswered")}
          className={`tab flex-1 py-2 text-sm font-medium ${
            filter === "unanswered"
              ? "text-primary tab-active"
              : "text-base-content/60"
          }`}
        >
          Unanswered
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {isLoading ? (
          <div className="p-4 space-y-5">
            <div className="skeleton h-32 w-full"></div>
            <div className="skeleton h-32 w-full"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-error">
            <p>{error}</p>
            <button
              onClick={fetchQuestions}
              className="btn btn-sm btn-ghost mt-2"
            >
              Try Again
            </button>
          </div>
        ) : myQuestionsFilter ? (
          <>
            {/* My Questions Section */}
            <div>
              <h4 className="text-sm font-semibold text-base-content/70 mb-3 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                My Questions ({filteredMyQuestions.length})
              </h4>

              {filteredMyQuestions.length === 0 ? (
                <p className="text-sm text-base-content/50 py-4">
                  No questions yet. Select text and click &ldquo;Ask
                  Question&rdquo; to get started.
                </p>
              ) : (
                <div className="space-y-5">
                  {filteredMyQuestions.map((question) => (
                    <QuestionCard
                      key={question._id || question.id}
                      question={question}
                      onClick={() => handleQuestionClick(question)}
                      currentUserId={currentUserId}
                      onDelete={handleDeleteQuestion}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Public Q&A Section */}
            <div>
              <h4 className="text-sm font-semibold text-base-content/70 mb-3 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Public Q&A ({filteredPublicQuestions.length})
              </h4>

              {filteredPublicQuestions.length === 0 ? (
                <p className="text-sm text-base-content/50 py-4">
                  No public Q&A available for this book yet.
                </p>
              ) : (
                <div className="space-y-5">
                  {filteredPublicQuestions.map((question) => (
                    <QuestionCard
                      key={question._id || question.id}
                      question={question}
                      onClick={() => handleQuestionClick(question)}
                      isPublic
                      currentUserId={currentUserId}
                      onDelete={handleDeleteQuestion}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Refresh button */}
      <div className="p-4 border-t border-base-300">
        <button
          onClick={fetchQuestions}
          className="btn btn-ghost btn-sm w-full gap-2"
          disabled={isLoading}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Delete Question Modal */}
      {deleteModalQuestion && (
        <QuestionDeleteModal
          question={deleteModalQuestion}
          onClose={() => setDeleteModalQuestion(null)}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

/**
 * QuestionCard - Individual question display card
 */
function QuestionCard({
  question,
  onClick,
  isPublic = false,
  currentUserId,
  onDelete,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if current user owns this question and can delete it
  const canDelete =
    currentUserId &&
    question.userId &&
    question.userId.toString() === currentUserId &&
    !question.isAdminCreated &&
    !isPublic;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!canDelete || !onDelete) return;
    onDelete(question);
  };

  return (
    <div
      className={`rounded-lg p-3 border border-base-300 ${
        question.answer ? "" : "bg-base-200"
      }`}
    >
      {/* Question header with delete button */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium line-clamp-2 flex-1">
          Q: {question.question}
        </p>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="btn btn-ghost btn-xs text-error hover:bg-error/20 shrink-0"
            title="Delete question"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Answer (if exists) */}
      {question.answer && (
        <div className={`mt-2 mb-2 pb-2 pt-2 border-b border-base-300`}>
          <p className="text-xs text-base-content/60 mb-1">Answer:</p>
          <p
            className={`text-sm text-base-content/80 ${
              isExpanded ? "" : "line-clamp-3"
            }`}
          >
            {question.answer}
          </p>
          {question.answer.length > 150 && (
            <button
              className="text-xs text-primary mt-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* footer */}
      <div className="flex items-start justify-between gap-2 mb-2 ">
        <div className="flex flex-wrap gap-1">
          {question.pageNumber && (
            <span className="text-xs text-base-content/40 mt-2">
              Page {question.pageNumber}
            </span>
          )}

          {/* Selected text preview */}
          {question.selectedText && (
            <p
              className="text-xs text-base-content/40 italic mb-2 line-clamp-2 cursor-pointer"
              onClick={onClick}
            >
              &ldquo;{question.selectedText}&rdquo;
            </p>
          )}
        </div>
      </div>
      {/* Timestamp */}
      <p className="text-xs text-base-content/40 mt-2">
        {new Date(question.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
