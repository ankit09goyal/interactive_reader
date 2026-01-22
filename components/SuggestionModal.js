"use client";

import { useState, useEffect, useRef } from "react";
import apiClient from "@/libs/api";

/**
 * SuggestionModal - Modal for users to suggest improvements about selected text
 * Supports both create and edit modes
 * Only for ePub (epubCfi, epubChapter) format
 */
export default function SuggestionModal({
  isOpen,
  onClose,
  selectedText,
  epubCfi = null,
  epubCfiRange = null,
  epubChapter = null,
  chapterHref = null,
  bookId,
  existingSuggestion = null, // For editing an existing suggestion
  onSuggestionCreated,
  onSuggestionUpdated,
}) {
  const [suggestion, setSuggestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const isEditMode = !!existingSuggestion;

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Reset/populate form when modal opens/closes or existingSuggestion changes
  useEffect(() => {
    if (isOpen) {
      if (existingSuggestion) {
        setSuggestion(existingSuggestion.suggestion || "");
      } else {
        setSuggestion("");
      }
      setError(null);
    }
  }, [isOpen, existingSuggestion]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!suggestion.trim()) {
      setError("Please enter a suggestion");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (isEditMode) {
        // Update existing suggestion
        response = await apiClient.put(
          `/user/suggestions/${existingSuggestion._id}`,
          {
            suggestion: suggestion.trim(),
          }
        );

        if (onSuggestionUpdated) {
          onSuggestionUpdated(response.suggestion);
        }
      } else {
        // Create new suggestion
        response = await apiClient.post("/user/suggestions", {
          bookId,
          suggestion: suggestion.trim(),
          selectedText: selectedText || null,
          epubCfi: epubCfi || null,
          epubCfiRange: epubCfiRange || null,
          epubChapter: epubChapter || null,
          chapterHref: chapterHref || null,
        });

        if (onSuggestionCreated) {
          onSuggestionCreated(response.suggestion);
        }
      }

      onClose();
    } catch (err) {
      console.error("Error saving suggestion:", err);
      setError(
        err.message ||
          `Failed to ${isEditMode ? "update" : "create"} suggestion. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Get the text to display - either from existingSuggestion (edit mode) or selectedText (create mode)
  const displayText = isEditMode
    ? existingSuggestion.selectedText
    : selectedText;
  const displayChapter = isEditMode
    ? existingSuggestion.epubChapter
    : epubChapter;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold">
            {isEditMode ? "Edit Suggestion" : "Suggest Improvement"}
          </h3>
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Selected text preview */}
          {displayText && (
            <div className="bg-base-200 rounded-lg p-3">
              <p className="text-xs text-base-content/60 mb-1">Selected Text:</p>
              <p className="text-sm italic line-clamp-3">
                &ldquo;{displayText}&rdquo;
              </p>
              {displayChapter && (
                <p className="text-xs text-base-content/50 mt-1">
                  Chapter: {displayChapter}
                </p>
              )}
            </div>
          )}

          {/* ePub chapter (shown when no selected text) */}
          {!displayText && displayChapter && (
            <div className="bg-base-200 rounded-lg p-3">
              <p className="text-xs text-base-content/60">
                Chapter: {displayChapter}
              </p>
            </div>
          )}

          {/* Suggestion input */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Your Suggestion</span>
            </label>
            <textarea
              ref={textareaRef}
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder={
                displayText
                  ? "What improvement would you suggest for this text?"
                  : "What improvement would you like to suggest?"
              }
              className="textarea textarea-bordered w-full h-32 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="alert alert-error text-sm">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !suggestion.trim()}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {isEditMode ? "Saving..." : "Submitting..."}
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Submit Suggestion"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
