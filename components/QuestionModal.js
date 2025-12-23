"use client";

import { useState, useEffect, useRef } from "react";
import apiClient from "@/libs/api";

/**
 * QuestionModal - Modal for users to ask questions about selected text
 * For admins: Also has option to create public question directly
 */
export default function QuestionModal({
  isOpen,
  onClose,
  selectedText,
  pageNumber,
  bookId,
  isAdmin = false,
  onQuestionCreated,
}) {
  const [question, setQuestion] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuestion("");
      setIsPublic(isAdmin); // Default to public for admins
      setAnswer("");
      setError(null);
    }
  }, [isOpen, isAdmin]);

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

    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (isAdmin && isPublic) {
        // Admin creating public question
        response = await apiClient.post("/admin/questions/create", {
          bookId,
          question: question.trim(),
          selectedText: selectedText || null,
          pageNumber: pageNumber || null,
          answer: answer.trim() || null,
          isPublic: true,
        });
      } else {
        // Regular user question
        response = await apiClient.post("/user/questions", {
          bookId,
          question: question.trim(),
          selectedText: selectedText || null,
          pageNumber: pageNumber || null,
        });
      }

      if (onQuestionCreated) {
        onQuestionCreated(response.question);
      }
      onClose();
    } catch (err) {
      console.error("Error creating question:", err);
      setError(err.message || "Failed to create question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold">
            {isAdmin && isPublic ? "Create Public Q&A" : "Ask a Question"}
          </h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square"
          >
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
          {selectedText && (
            <div className="bg-base-200 rounded-lg p-3">
              <p className="text-xs text-base-content/60 mb-1">Selected Text:</p>
              <p className="text-sm italic line-clamp-3">
                &ldquo;{selectedText}&rdquo;
              </p>
              {pageNumber && (
                <p className="text-xs text-base-content/50 mt-1">
                  Page {pageNumber}
                </p>
              )}
            </div>
          )}

          {/* Question input */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Your Question</span>
            </label>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know about this text?"
              className="textarea textarea-bordered w-full h-24 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Admin-only options */}
          {isAdmin && (
            <>
              {/* Make public checkbox */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="checkbox checkbox-primary"
                    disabled={isLoading}
                  />
                  <span className="label-text">
                    Make this Q&A public (visible to all users with book access)
                  </span>
                </label>
              </div>

              {/* Answer input (only shown if public) */}
              {isPublic && (
                <div>
                  <label className="label">
                    <span className="label-text font-medium">
                      Answer (optional)
                    </span>
                  </label>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Provide an answer for this public Q&A..."
                    className="textarea textarea-bordered w-full h-24 resize-none"
                    disabled={isLoading}
                  />
                </div>
              )}
            </>
          )}

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
              disabled={isLoading || !question.trim()}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Submitting...
                </>
              ) : isAdmin && isPublic ? (
                "Create Public Q&A"
              ) : (
                "Submit Question"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

