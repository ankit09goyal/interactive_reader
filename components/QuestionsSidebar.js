"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";
import QuestionDeleteModal from "./QuestionDeleteModal";
import icons from "@/libs/icons";

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
  isEPub = false,
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
              isEPub={isEPub}
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
  isEPub = false,
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

  // Check if question has a location to navigate to
  const hasLocation = isEPub ? question.epubCfi : question.pageNumber;

  return (
    <div className={`rounded-lg p-3 border border-base-300`}>
      {/* Question header with delete button */}
      <div className="flex items-start justify-between gap-2 mb-2 ">
        <p className="text-sm font-medium line-clamp-2 flex-1">
          Q: {question.question}
        </p>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="btn btn-ghost btn-xs text-error hover:bg-error/20 shrink-0"
            title="Delete question"
          >
            {icons.delete}
          </button>
        )}
      </div>
      {/* Answer (if exists) */}
      {question.answer ? (
        <div className="mt-2 mb-2 pb-4 pt-2 border-b border-base-300">
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
      ) : (
        <div className="mt-2 mb-2 pb-4 pt-2 border-b border-base-300">
          <p className="text-xs text-base-content/60 mb-1">Not answered yet.</p>
        </div>
      )}
      {/* Footer */}
      <div className="flex flex-col items-start justify-between pb-2 pt-2 mb-2 mt-2 border-l-3 border-primary pl-2">
        {/* Selected text preview */}
        {question.selectedText && !isPublic && (
          <p className="text-xs text-base-content/40 italic mb-2 line-clamp-2">
            {question.selectedText}
          </p>
        )}
      </div>

      {question.selectedText && !isPublic && hasLocation && (
        <div className="flex justify-between mt-2 text-xs pt-4 border-t border-base-300">
          <span className="text-xs text-base-content/50">
            {new Date(question.createdAt).toLocaleDateString()}
          </span>
          <button className="btn btn-ghost btn-xs" onClick={onClick}>
            Go to highlight
          </button>
        </div>
      )}
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
  isEPub = false,
}) {
  const [questions, setQuestions] = useState({
    myQuestions: [],
    publicQuestions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("my"); // "my", "public"
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

  // Handle click on question to go to page/location
  const handleQuestionClick = useCallback(
    (question) => {
      if (onGoToPage) {
        // For ePub, use CFI location if available
        if (isEPub && question.epubCfi) {
          onGoToPage(question.epubCfi);
        } else if (question.pageNumber) {
          onGoToPage(question.pageNumber);
        }
      }
    },
    [onGoToPage, isEPub]
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
              {icons.plus}
              <span className="hidden sm:inline text-xs">Add</span>
            </button>
          )}
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            {icons.close}
          </button>
        </div>
      </div>

      {/* Question type tabs (My Questions / Public Questions) */}
      <div className="flex tabs border-b border-base-100 py-2">
        <FilterTab
          isActive={activeTab === "my"}
          onClick={() => setActiveTab("my")}
        >
          My Questions
        </FilterTab>
        <FilterTab
          isActive={activeTab === "public"}
          onClick={() => setActiveTab("public")}
        >
          Public Q&A
        </FilterTab>
      </div>

      {/* Answer status filter tabs */}
      {activeTab === "my" && (
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
                activeTab === "my"
                  ? filteredMyQuestions
                  : filteredPublicQuestions
              }
              emptyMessage={
                activeTab === "my"
                  ? 'No questions yet. Select text and click "Ask Question" to get started.'
                  : "No public Q&A available for this book yet."
              }
              activeHighlightId={activeHighlightId}
              questionRefs={questionRefs}
              onQuestionClick={handleQuestionClick}
              currentUserId={currentUserId}
              onDelete={handleDeleteQuestion}
              isPublic={activeTab !== "my"}
              isEPub={isEPub}
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
          {icons.refresh}
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
