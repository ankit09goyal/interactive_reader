"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import DeleteModal from "./DeleteModal";
import icons from "@/libs/icons";

/**
 * HighlightCard - Individual highlight display card
 */
function HighlightCard({
  highlight,
  onHighlightClick,
  onGoToLocation,
  handleDeleteHighlight,
  activeNoteId,
  highlightRefs,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlightedTextExpanded, setIsHighlightedTextExpanded] =
    useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      highlightRefs.current[highlight._id] = cardRef.current;
    }
  }, [highlight._id, highlightRefs]);

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

  return (
    <div
      ref={cardRef}
      className={`rounded-lg transition-all ${
        activeNoteId === highlight._id
          ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100 bg-primary/10 animate-pulse"
          : ""
      }`}
    >
      <div className="p-3 border border-base-content/15 rounded-lg">
        {/* header */}
        <div className="flex justify-between border-b border-base-content/10 pb-2">
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
                <span className="h-3 w-3 mr-1">{icons.pencil}</span>
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
            <div className="pt-4 pb-4 border-b border-t border-base-content/10">
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
      </div>
    </div>
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
  activeNoteId,
  highlightRefs,
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
        <div key={highlight._id} className={`rounded-lg`}>
          <HighlightCard
            highlight={highlight}
            onHighlightClick={onHighlightClick}
            onGoToLocation={onGoToLocation}
            handleDeleteHighlight={handleDeleteHighlight}
            activeNoteId={activeNoteId}
            highlightRefs={highlightRefs}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * HighlightsSidebar - Sidebar panel showing highlights for the current book
 * Shows highlights with notes for ePub books
 */
export default function HighlightsSidebar({
  isOpen,
  onClose,
  highlights = [],
  onHighlightClick,
  onGoToLocation,
  onHighlightDeleted,
  highlightedNoteId = null,
  highlightedNoteClicked = 0,
}) {
  const [deleteModalHighlight, setDeleteModalHighlight] = useState(null);
  const [isDeletingHighlight, setIsDeletingHighlight] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const highlightRefs = useRef({});

  // Scroll to and highlight note when highlightedNoteClicked changes
  useEffect(() => {
    if (highlightedNoteId && isOpen && highlightedNoteClicked > 0) {
      const timeoutId = setTimeout(() => {
        setActiveNoteId(highlightedNoteId);
        const noteRef = highlightRefs.current[highlightedNoteId];
        if (noteRef) {
          noteRef.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
        setTimeout(() => {
          setActiveNoteId(null);
        }, 2000);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [highlightedNoteId, highlightedNoteClicked, isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-base-100 shadow-2xl z-[150] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-base-300">
        <h3 className="text-lg font-semibold">Highlights & Notes</h3>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            {icons.close}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        <HighlightsList
          highlights={highlights}
          onHighlightClick={onHighlightClick}
          onGoToLocation={onGoToLocation}
          handleDeleteHighlight={handleDeleteHighlight}
          activeNoteId={activeNoteId}
          highlightRefs={highlightRefs}
        />
      </div>

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
