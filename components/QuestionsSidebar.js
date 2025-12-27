"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";
import QuestionDeleteModal from "./QuestionDeleteModal";

// Icons as constants to avoid repetition
const ICONS = {
  plus: (
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
  ),
  close: (
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
  ),
  refresh: (
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
  ),
  trash: (
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
  ),
};

/**
 * FilterTab - Reusable tab button component
 */
function FilterTab({ isActive, onClick, children, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 tab text-sm font-medium ${
        isActive ? "text-primary tab-active" : "text-base-content/60"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * QuestionsList - Reusable questions list component
 */
function QuestionsList({
  questions,
  emptyMessage,
  activeHighlightId,
  questionRefs,
  onQuestionClick,
  currentUserId,
  onDelete,
  isPublic = false,
}) {
  if (questions.length === 0) {
    return <p className="text-sm text-base-content/50 py-4">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-5">
      {questions.map((question) => {
        const questionId = question._id || question.id;
        const isHighlighted = activeHighlightId === questionId;
        return (
          <div
            key={questionId}
            ref={(el) => (questionRefs.current[questionId] = el)}
            data-question-id={questionId}
            className={`transition-all duration-300 rounded-lg ${
              isHighlighted
                ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100 bg-primary/10 animate-pulse"
                : ""
            }`}
          >
            <QuestionCard
              question={question}
              onClick={() => onQuestionClick(question)}
              isPublic={isPublic}
              currentUserId={currentUserId}
              onDelete={onDelete}
            />
          </div>
        );
      })}
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

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
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
            {ICONS.trash}
          </button>
        )}
      </div>

      {/* Answer (if exists) */}
      {question.answer && (
        <div className="mt-2 mb-2 pb-2 pt-2 border-b border-base-300">
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
              onClick={toggleExpand}
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      {!isPublic && (
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-col flex-wrap gap-1">
            {question.pageNumber && (
              <p className="text-xs text-base-content/40 mt-2">
                Page {question.pageNumber}
              </p>
            )}

            {/* Selected text preview */}
            {question.selectedText && (
              <p
                className="text-xs text-base-content/40 italic mb-2 line-clamp-2 cursor-pointer"
                onClick={onClick}
              >
                {question.selectedText}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-base-content/40 mt-2">
        {new Date(question.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

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
  highlightedQuestionId = null,
  highlightedTextClicked = 0,
  onQuestionDeleted,
}) {
  const [questions, setQuestions] = useState({
    myQuestions: [],
    publicQuestions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showMyQuestions, setShowMyQuestions] = useState(true);
  const [deleteModalQuestion, setDeleteModalQuestion] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const questionRefs = useRef({});
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Filter questions based on filter state
  const filterQuestions = useCallback(
    (questionsList) => {
      if (filter === "all") return questionsList;
      if (filter === "answered") return questionsList.filter((q) => q.answer);
      if (filter === "unanswered")
        return questionsList.filter((q) => !q.answer);
      return questionsList;
    },
    [filter]
  );

  const filteredMyQuestions = filterQuestions(questions.myQuestions);
  const filteredPublicQuestions = filterQuestions(questions.publicQuestions);

  // Fetch questions when sidebar opens or refresh is triggered
  const fetchQuestions = useCallback(async () => {
    if (!bookId) return;

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
  }, [bookId]);

  useEffect(() => {
    if (isOpen && bookId) {
      fetchQuestions();
    }
  }, [isOpen, bookId, refreshTrigger, fetchQuestions]);

  // Scroll to and highlight question when highlightedTextClicked changes
  useEffect(() => {
    if (
      highlightedQuestionId &&
      isOpen &&
      !isLoading &&
      highlightedTextClicked > 0
    ) {
      const timeoutId = setTimeout(() => {
        // Set active highlight for visual feedback
        setActiveHighlightId(highlightedQuestionId);

        // Scroll to the question using ref
        const questionRef = questionRefs.current[highlightedQuestionId];
        if (questionRef) {
          questionRef.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }

        // Remove highlight after 2 seconds
        setTimeout(() => {
          setActiveHighlightId(null);
        }, 2000);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [highlightedQuestionId, isOpen, isLoading, highlightedTextClicked]);

  // Handle click on question to go to page
  const handleQuestionClick = useCallback(
    (question) => {
      if (question.pageNumber && onGoToPage) {
        onGoToPage(question.pageNumber);
      }
    },
    [onGoToPage]
  );

  // Handle delete question - opens modal
  const handleDeleteQuestion = useCallback((question) => {
    setDeleteModalQuestion(question);
  }, []);

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
      fetchQuestions();
      // Notify parent to refresh highlights
      if (onQuestionDeleted) {
        onQuestionDeleted();
      }
    } catch (err) {
      console.error("Error deleting question:", err);
      toast.error(err.message || "Failed to delete question");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  // Filter options configuration
  const filterOptions = [
    { value: "all", label: "All" },
    { value: "answered", label: "Answered" },
    { value: "unanswered", label: "Unanswered" },
  ];

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-base-100 shadow-2xl z-[150] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-base-300">
        <h3 className="text-lg font-semibold">Questions & Answers</h3>
        <div className="flex items-center gap-2">
          {onAddQuestion && (
            <button
              onClick={onAddQuestion}
              className="btn btn-primary btn-sm gap-1"
              title="Add Question"
            >
              {ICONS.plus}
              <span className="hidden sm:inline text-xs">Add</span>
            </button>
          )}
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            {ICONS.close}
          </button>
        </div>
      </div>

      {/* Question type tabs (My Questions / Public Questions) */}
      <div className="flex tabs border-b border-base-100 py-2">
        <FilterTab
          isActive={showMyQuestions}
          onClick={() => setShowMyQuestions(true)}
        >
          My Questions
        </FilterTab>
        <FilterTab
          isActive={!showMyQuestions}
          onClick={() => setShowMyQuestions(false)}
        >
          Public Questions
        </FilterTab>
      </div>

      {/* Answer status filter tabs */}
      {showMyQuestions && (
        <div className="flex tabs tabs-box">
          {filterOptions.map(({ value, label }) => (
            <FilterTab
              key={value}
              isActive={filter === value}
              onClick={() => setFilter(value)}
              className="py-2"
            >
              {label}
            </FilterTab>
          ))}
        </div>
      )}

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
        ) : (
          <div>
            <QuestionsList
              questions={
                showMyQuestions ? filteredMyQuestions : filteredPublicQuestions
              }
              emptyMessage={
                showMyQuestions
                  ? 'No questions yet. Select text and click "Ask Question" to get started.'
                  : "No public Q&A available for this book yet."
              }
              activeHighlightId={activeHighlightId}
              questionRefs={questionRefs}
              onQuestionClick={handleQuestionClick}
              currentUserId={currentUserId}
              onDelete={handleDeleteQuestion}
              isPublic={!showMyQuestions}
            />
          </div>
        )}
      </div>

      {/* Refresh button */}
      <div className="p-4 border-t border-base-300">
        <button
          onClick={fetchQuestions}
          className="btn btn-ghost btn-sm w-full gap-2"
          disabled={isLoading}
        >
          {ICONS.refresh}
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
