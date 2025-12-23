"use client";

import { useState, useEffect } from "react";
import apiClient from "@/libs/api";

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
}) {
  const [questions, setQuestions] = useState({ myQuestions: [], publicQuestions: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // "all", "answered", "unanswered"

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

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-base-100 shadow-2xl z-[150] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <h3 className="text-lg font-semibold">Questions & Answers</h3>
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

      {/* Filter tabs */}
      <div className="flex border-b border-base-300">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2 text-sm font-medium ${
            filter === "all"
              ? "text-primary border-b-2 border-primary"
              : "text-base-content/60"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("answered")}
          className={`flex-1 py-2 text-sm font-medium ${
            filter === "answered"
              ? "text-primary border-b-2 border-primary"
              : "text-base-content/60"
          }`}
        >
          Answered
        </button>
        <button
          onClick={() => setFilter("unanswered")}
          className={`flex-1 py-2 text-sm font-medium ${
            filter === "unanswered"
              ? "text-primary border-b-2 border-primary"
              : "text-base-content/60"
          }`}
        >
          Unanswered
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-error">
            <p>{error}</p>
            <button onClick={fetchQuestions} className="btn btn-sm btn-ghost mt-2">
              Try Again
            </button>
          </div>
        ) : (
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
                  No questions yet. Select text and click &ldquo;Ask Question&rdquo; to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredMyQuestions.map((question) => (
                    <QuestionCard
                      key={question._id || question.id}
                      question={question}
                      onClick={() => handleQuestionClick(question)}
                    />
                  ))}
                </div>
              )}
            </div>

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
                <div className="space-y-3">
                  {filteredPublicQuestions.map((question) => (
                    <QuestionCard
                      key={question._id || question.id}
                      question={question}
                      onClick={() => handleQuestionClick(question)}
                      isPublic
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
    </div>
  );
}

/**
 * QuestionCard - Individual question display card
 */
function QuestionCard({ question, onClick, isPublic = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-base-200 rounded-lg p-3 cursor-pointer hover:bg-base-300 transition-colors ${
        isPublic ? "border-l-4 border-primary" : ""
      }`}
      onClick={onClick}
    >
      {/* Header with badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1">
          {isPublic && (
            <span className="badge badge-primary badge-xs">Public</span>
          )}
          {question.answer ? (
            <span className="badge badge-success badge-xs">Answered</span>
          ) : (
            <span className="badge badge-warning badge-xs">Pending</span>
          )}
          {question.pageNumber && (
            <span className="badge badge-ghost badge-xs">
              Page {question.pageNumber}
            </span>
          )}
        </div>
      </div>

      {/* Selected text preview */}
      {question.selectedText && (
        <p className="text-xs text-base-content/50 italic mb-2 line-clamp-2">
          &ldquo;{question.selectedText}&rdquo;
        </p>
      )}

      {/* Question */}
      <p className="text-sm font-medium mb-2 line-clamp-2">{question.question}</p>

      {/* Answer (if exists) */}
      {question.answer && (
        <div
          className={`mt-2 pt-2 border-t border-base-300 ${
            isExpanded ? "" : "line-clamp-3"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          <p className="text-xs text-base-content/60 mb-1">Answer:</p>
          <p className="text-sm text-base-content/80">{question.answer}</p>
          {question.answer.length > 150 && (
            <button className="text-xs text-primary mt-1">
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-base-content/40 mt-2">
        {new Date(question.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

