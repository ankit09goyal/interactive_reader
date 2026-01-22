"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";
import SuggestionDeleteModal from "./SuggestionDeleteModal";
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
 * SuggestionsList - List of suggestions
 */
function SuggestionsList({
  suggestions,
  emptyMessage,
  activeHighlightId,
  suggestionRefs,
  onSuggestionClick,
  currentUserId,
  onEdit,
  onDelete,
  isEPub = false,
}) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-base-content/50 py-4">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-5">
      {suggestions.map((suggestion) => {
        const suggestionId = suggestion._id || suggestion.id;
        const isHighlighted = activeHighlightId === suggestionId;
        return (
          <div
            key={suggestionId}
            ref={(el) => (suggestionRefs.current[suggestionId] = el)}
            data-suggestion-id={suggestionId}
            className={`transition-all duration-300 rounded-lg ${
              isHighlighted
                ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100 bg-primary/10 animate-pulse"
                : ""
            }`}
          >
            <SuggestionCard
              suggestion={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              currentUserId={currentUserId}
              onEdit={onEdit}
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
 * SuggestionCard - Individual suggestion display card
 */
function SuggestionCard({
  suggestion,
  onClick,
  currentUserId,
  onEdit,
  onDelete,
  isEPub = false,
}) {
  const [isSuggestionExpanded, setIsSuggestionExpanded] = useState(false);
  const [isSelectedTextExpanded, setIsSelectedTextExpanded] = useState(false);
  const [isReplyExpanded, setIsReplyExpanded] = useState(false);

  // Check if current user owns this suggestion
  const canEditDelete =
    currentUserId &&
    suggestion.userId &&
    suggestion.userId.toString() === currentUserId;

  const handleEdit = (e) => {
    e.stopPropagation();
    if (!canEditDelete || !onEdit) return;
    onEdit(suggestion);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!canEditDelete || !onDelete) return;
    onDelete(suggestion);
  };

  const toggleSuggestionExpand = (e) => {
    e.stopPropagation();
    setIsSuggestionExpanded(!isSuggestionExpanded);
  };

  const toggleSelectedTextExpand = (e) => {
    e.stopPropagation();
    setIsSelectedTextExpanded(!isSelectedTextExpanded);
  };

  const toggleReplyExpand = (e) => {
    e.stopPropagation();
    setIsReplyExpanded(!isReplyExpanded);
  };

  // Check if suggestion has a location to navigate to
  const hasLocation = isEPub ? suggestion.epubCfi : false;

  return (
    <div className="rounded-lg p-3 border border-base-content/15">
      {/* Header with edit/delete buttons */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-base-content/50 uppercase">
          Suggestion
        </p>
        {canEditDelete && (
          <div className="flex gap-1">
            <button
              onClick={handleEdit}
              className="btn btn-ghost btn-xs text-primary hover:bg-primary/20 shrink-0"
              title="Edit suggestion"
            >
              {icons.pencil}
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-ghost btn-xs text-error hover:bg-error/20 shrink-0"
              title="Delete suggestion"
            >
              {icons.delete}
            </button>
          </div>
        )}
      </div>

      {/* Suggestion text */}
      <div className="mb-3">
        <p
          className={`text-sm text-base-content ${
            isSuggestionExpanded ? "" : "line-clamp-3"
          }`}
        >
          {suggestion.suggestion}
        </p>
        {suggestion.suggestion && suggestion.suggestion.length > 150 && (
          <button
            className="text-xs text-primary mt-1 cursor-pointer"
            onClick={toggleSuggestionExpand}
          >
            {isSuggestionExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Selected text preview */}
      {suggestion.selectedText && (
        <div className="mb-3 pt-3 border-t border-base-content/10">
          <p className="text-xs text-base-content/50 mb-1">Selected Text:</p>
          <div className="border-l-3 border-primary pl-2">
            <p
              className={`text-xs text-base-content/60 italic ${
                isSelectedTextExpanded ? "" : "line-clamp-2"
              }`}
            >
              &ldquo;{suggestion.selectedText}&rdquo;
            </p>
            {suggestion.selectedText.length > 100 && (
              <button
                className="text-xs text-primary mt-1 cursor-pointer"
                onClick={toggleSelectedTextExpand}
              >
                {isSelectedTextExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin reply (if exists) */}
      {suggestion.adminReply ? (
        <div className="mb-3 pt-3 border-t border-base-content/10">
          <p className="text-xs text-base-content/50 mb-1">Author&apos;s Reply:</p>
          <div className="bg-base-200 rounded-lg p-2">
            <p
              className={`text-sm text-base-content/80 ${
                isReplyExpanded ? "" : "line-clamp-3"
              }`}
            >
              {suggestion.adminReply}
            </p>
            {suggestion.adminReply.length > 150 && (
              <button
                className="text-xs text-primary mt-1 cursor-pointer"
                onClick={toggleReplyExpand}
              >
                {isReplyExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-3 pt-3 border-t border-base-content/10">
          <p className="text-xs text-base-content/40 italic">
            No reply yet from the author.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center mt-2 text-xs pt-3 border-t border-base-content/10">
        <span className="text-base-content/50">
          {new Date(suggestion.createdAt).toLocaleDateString()}
        </span>
        {suggestion.selectedText && hasLocation && (
          <button className="btn btn-ghost btn-xs" onClick={onClick}>
            Go to highlight
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * SuggestionsSidebar - Sidebar panel showing suggestions for the current book
 * Shows user's suggestions with admin replies
 */
export default function SuggestionsSidebar({
  isOpen,
  onClose,
  bookId,
  onGoToPage,
  refreshTrigger = 0,
  onAddSuggestion,
  highlightedSuggestionId = null,
  highlightedTextClicked = 0,
  onSuggestionDeleted,
  onEditSuggestion,
  isEPub = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [deleteModalSuggestion, setDeleteModalSuggestion] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const suggestionRefs = useRef({});
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Filter suggestions based on filter state
  const filterSuggestions = useCallback(
    (suggestionsList) => {
      if (filter === "all") return suggestionsList;
      if (filter === "replied")
        return suggestionsList.filter((s) => s.adminReply);
      if (filter === "unreplied")
        return suggestionsList.filter((s) => !s.adminReply);
      return suggestionsList;
    },
    [filter]
  );

  const filteredSuggestions = filterSuggestions(suggestions);

  // Fetch suggestions when sidebar opens or refresh is triggered
  const fetchSuggestions = useCallback(async () => {
    if (!bookId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(
        `/user/suggestions?bookId=${bookId}`
      );
      setSuggestions(response.suggestions || []);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError("Failed to load suggestions");
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (isOpen && bookId) {
      fetchSuggestions();
    }
  }, [isOpen, bookId, refreshTrigger, fetchSuggestions]);

  // Scroll to and highlight suggestion when highlightedTextClicked changes
  useEffect(() => {
    if (
      highlightedSuggestionId &&
      isOpen &&
      !isLoading &&
      highlightedTextClicked > 0
    ) {
      const timeoutId = setTimeout(() => {
        // Set active highlight for visual feedback
        setActiveHighlightId(highlightedSuggestionId);

        // Scroll to the suggestion using ref
        const suggestionRef = suggestionRefs.current[highlightedSuggestionId];
        if (suggestionRef) {
          suggestionRef.scrollIntoView({
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
  }, [highlightedSuggestionId, isOpen, isLoading, highlightedTextClicked]);

  // Handle click on suggestion to go to location
  const handleSuggestionClick = useCallback(
    (suggestion) => {
      if (onGoToPage) {
        // For ePub, use CFI location if available
        if (isEPub && suggestion.epubCfi) {
          onGoToPage(suggestion.epubCfi);
        }
      }
    },
    [onGoToPage, isEPub]
  );

  // Handle edit suggestion
  const handleEditSuggestion = useCallback(
    (suggestion) => {
      if (onEditSuggestion) {
        onEditSuggestion(suggestion);
      }
    },
    [onEditSuggestion]
  );

  // Handle delete suggestion - opens modal
  const handleDeleteSuggestion = useCallback((suggestion) => {
    setDeleteModalSuggestion(suggestion);
  }, []);

  // Confirm delete suggestion
  const handleDeleteConfirm = async () => {
    if (!deleteModalSuggestion) return;

    setIsDeleting(true);
    try {
      await apiClient.delete(
        `/user/suggestions/${deleteModalSuggestion._id || deleteModalSuggestion.id}`
      );
      toast.success("Suggestion deleted successfully");
      setDeleteModalSuggestion(null);
      fetchSuggestions();
      // Notify parent to refresh highlights
      if (onSuggestionDeleted) {
        onSuggestionDeleted();
      }
    } catch (err) {
      console.error("Error deleting suggestion:", err);
      toast.error(err.message || "Failed to delete suggestion");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  // Filter options configuration
  const filterOptions = [
    { value: "all", label: "All" },
    { value: "replied", label: "Replied" },
    { value: "unreplied", label: "Unreplied" },
  ];

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-base-100 shadow-2xl z-[150] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-base-300">
        <h3 className="text-lg font-semibold">Suggest Improvements</h3>
        <div className="flex items-center gap-2">
          {onAddSuggestion && (
            <button
              onClick={onAddSuggestion}
              className="btn btn-primary btn-sm gap-1"
              title="Add Suggestion"
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

      {/* Filter tabs */}
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
              onClick={fetchSuggestions}
              className="btn btn-sm btn-ghost mt-2"
            >
              Try Again
            </button>
          </div>
        ) : (
          <SuggestionsList
            suggestions={filteredSuggestions}
            emptyMessage='No suggestions yet. Select text and click "Suggest Improvements" to get started.'
            activeHighlightId={activeHighlightId}
            suggestionRefs={suggestionRefs}
            onSuggestionClick={handleSuggestionClick}
            currentUserId={currentUserId}
            onEdit={handleEditSuggestion}
            onDelete={handleDeleteSuggestion}
            isEPub={isEPub}
          />
        )}
      </div>

      {/* Refresh button */}
      <div className="p-4 border-t border-base-300">
        <button
          onClick={fetchSuggestions}
          className="btn btn-ghost btn-sm w-full gap-2"
          disabled={isLoading}
        >
          {icons.refresh}
          Refresh
        </button>
      </div>

      {/* Delete Suggestion Modal */}
      {deleteModalSuggestion && (
        <SuggestionDeleteModal
          suggestion={deleteModalSuggestion}
          onClose={() => setDeleteModalSuggestion(null)}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
