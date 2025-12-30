"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";
import QuestionDeleteModal from "./QuestionDeleteModal";
import DeleteModal from "./DeleteModal";
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

      {question.selectedText && !isPublic && (
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

function HighlightCard({
  highlight,
  onHighlightClick,
  onGoToLocation,
  handleDeleteHighlight,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlightedTextExpanded, setIsHighlightedTextExpanded] =
    useState(false);

  // Color mapping for visual display
  const colorClasses = {
    yellow: "border-yellow-400",
    green: "border-green-400",
    blue: "border-blue-400",
    pink: "border-pink-400",
    orange: "border-orange-400",
  };

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const toggleHighlightedTextExpand = (e) => {
    e.stopPropagation();
    setIsHighlightedTextExpanded(!isHighlightedTextExpanded);
  };

  {
    /* Notes (if any) */
  }
  return (
    <>
      {/* header */}
      <div className="flex justify-between border-b border-base-300 pb-2">
        <p className="text-xs font-medium mb-1 text-base-content/50">
          HIGHLIGHT
        </p>
        {/* header actions */}
        <div className="flex justify-end gap-2">
          {/* Edit note button */}
          <button
            className="btn btn-ghost btn-xs btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              if (onHighlightClick) onHighlightClick(highlight._id);
            }}
          >
            {highlight.notes ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="h-3 w-3 mr-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                />
              </svg>
            ) : (
              <span>Add Note</span>
            )}
          </button>
          {/* Delete note button */}
          <button
            className="btn btn-ghost btn-xs btn-error"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteHighlight(highlight);
            }}
          >
            {icons.delete}
          </button>
        </div>
      </div>
      {/* Highlighted text */}
      <div
        className={`mt-2 mb-2 pt-2 pb-2 border-l-3 pl-2 ${
          colorClasses[highlight.color] || colorClasses.yellow
        }`}
      >
        <p
          className={`text-xs italic text-base-content/60 ${
            isHighlightedTextExpanded ? "" : "line-clamp-3"
          }`}
        >
          {highlight.selectedText}
        </p>
        {highlight.selectedText.length > 150 && (
          <button
            className="text-xs text-primary mt-1 cursor-pointer"
            onClick={toggleHighlightedTextExpand}
          >
            {isHighlightedTextExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
      {/* notes */}
      {highlight && highlight.notes && (
        <>
          <div className="pt-4 pb-4 border-b border-t border-base-300">
            <p className="text-xs font-medium mb-1 text-base-content/50">
              NOTES
            </p>
            <p
              className={`text-sm text-base-content/80 ${
                isExpanded ? "" : "line-clamp-3"
              }`}
            >
              {highlight.notes}
            </p>
            {highlight.notes.length > 150 && (
              <button
                className="text-xs text-primary mt-1 cursor-pointer"
                onClick={toggleExpand}
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </>
      )}

      {/* footer */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-base-content/50">
          {new Date(highlight.createdAt).toLocaleDateString()}
        </span>
        <button
          className="btn btn-ghost btn-xs"
          onClick={(e) => {
            e.stopPropagation();
            if (onGoToLocation)
              onGoToLocation(highlight.cfiRange || highlight.cfi);
          }}
        >
          Go to Highlight
        </button>
      </div>
    </>
  );
}

/**
 * HighlightsList - List of highlights for ePub books
 */
function HighlightsList({
  highlights = [],
  onHighlightClick,
  onGoToLocation,
  handleDeleteHighlight,
}) {
  if (highlights.length === 0) {
    return (
      <p className="text-sm text-base-content/50 py-4">
        No highlights yet. Select text and click &quot;Highlight&quot; or
        &quot;Take Notes&quot; to get started.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {highlights.map((highlight) => (
        <div
          key={highlight._id}
          className={`rounded-lg p-3 border border-base-300`}
        >
          <HighlightCard
            highlight={highlight}
            onHighlightClick={onHighlightClick}
            onGoToLocation={onGoToLocation}
            handleDeleteHighlight={handleDeleteHighlight}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * QuestionsSidebar - Sidebar panel showing questions for the current book
 * Shows "My Questions" and "Public Q&A" sections
 * For ePub: Also shows "Highlights" section
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
  highlights = [],
  onHighlightClick,
  onHighlightDeleted,
}) {
  const [questions, setQuestions] = useState({
    myQuestions: [],
    publicQuestions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("my"); // "my", "public", "highlights"
  const [deleteModalQuestion, setDeleteModalQuestion] = useState(null);
  const [deleteModalHighlight, setDeleteModalHighlight] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingHighlight, setIsDeletingHighlight] = useState(false);
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

  // Handle delete highlight - opens modal
  const handleDeleteHighlight = useCallback((highlight) => {
    setDeleteModalHighlight(highlight);
  }, []);

  // Confirm delete highlight
  const handleDeleteHighlightConfirm = useCallback(async () => {
    if (!deleteModalHighlight) return;
    setIsDeletingHighlight(true);
    try {
      if (onHighlightDeleted) {
        await onHighlightDeleted(deleteModalHighlight._id);
      }
      setDeleteModalHighlight(null);
    } catch (err) {
      console.error("Error deleting highlight:", err);
      toast.error(err.message || "Failed to delete highlight");
    } finally {
      setIsDeletingHighlight(false);
    }
  }, [deleteModalHighlight, onHighlightDeleted]);

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

      {/* Question type tabs (My Questions / Public Questions / Highlights for ePub) */}
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
        {isEPub && (
          <FilterTab
            isActive={activeTab === "highlights"}
            onClick={() => setActiveTab("highlights")}
          >
            Highlights
          </FilterTab>
        )}
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
        ) : activeTab === "highlights" && isEPub ? (
          <div>
            <HighlightsList
              highlights={highlights}
              onHighlightClick={onHighlightClick}
              onGoToLocation={onGoToPage}
              handleDeleteHighlight={handleDeleteHighlight}
            />
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

      {/* Delete Highlight Modal */}
      {deleteModalHighlight && (
        <DeleteModal
          title="Delete Highlight/Note"
          itemPreview={
            <div className="space-y-2">
              {deleteModalHighlight.notes && (
                <p className="text-sm">
                  <strong>Note:</strong> {deleteModalHighlight.notes}
                </p>
              )}
              {deleteModalHighlight.selectedText && (
                <p className="text-xs italic text-base-content/60 mt-4">
                  <strong>Highlighted Text: </strong>
                  <br />
                  {deleteModalHighlight.selectedText}
                </p>
              )}
            </div>
          }
          warningMessage="This will permanently delete this highlight and its note (if any)."
          confirmButtonText="Delete"
          onClose={() => setDeleteModalHighlight(null)}
          onConfirm={handleDeleteHighlightConfirm}
          isDeleting={isDeletingHighlight}
        />
      )}
    </div>
  );
}
