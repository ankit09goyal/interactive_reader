"use client";

import { useState, useEffect, useRef } from "react";
import apiClient from "@/libs/api";

/**
 * AdminCreateQuestionModal - Modal for admins to create public questions
 * Can be used with or without text selection
 * Supports book selection if bookId not provided
 */
export default function AdminCreateQuestionModal({
  isOpen,
  onClose,
  bookId: initialBookId = null,
  books = [], // List of admin's books for selection
  selectedText: initialSelectedText = "",
  pageNumber: initialPageNumber = null,
  onQuestionCreated,
}) {
  const [bookId, setBookId] = useState(initialBookId || "");
  const [question, setQuestion] = useState("");
  const [selectedText, setSelectedText] = useState(initialSelectedText || "");
  const [pageNumber, setPageNumber] = useState(initialPageNumber || "");
  const [answer, setAnswer] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const questionRef = useRef(null);

  // Focus question textarea when modal opens
  useEffect(() => {
    if (isOpen && questionRef.current) {
      questionRef.current.focus();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes or initial values change
  useEffect(() => {
    if (isOpen) {
      setBookId(initialBookId || "");
      setQuestion("");
      setSelectedText(initialSelectedText || "");
      setPageNumber(initialPageNumber || "");
      setAnswer("");
      setIsPublic(true);
      setError(null);
    }
  }, [isOpen, initialBookId, initialSelectedText, initialPageNumber]);

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

    if (!bookId) {
      setError("Please select a book");
      return;
    }

    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post("/admin/questions/create", {
        bookId,
        question: question.trim(),
        selectedText: selectedText.trim() || null,
        pageNumber: pageNumber ? parseInt(pageNumber, 10) : null,
        answer: answer.trim() || null,
        isPublic,
      });

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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold">Create Public Q&A</h3>
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
          {/* Book selector (only if no initial bookId) */}
          {!initialBookId && books.length > 0 && (
            <div>
              <label className="label">
                <span className="label-text font-medium">Book</span>
              </label>
              <select
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                className="select select-bordered w-full"
                disabled={isLoading}
              >
                <option value="">Select a book...</option>
                {books.map((book) => (
                  <option key={book._id || book.id} value={book._id || book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Question input */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Question *</span>
            </label>
            <textarea
              ref={questionRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter the question..."
              className="textarea textarea-bordered w-full h-24 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Selected text input (optional) */}
          <div>
            <label className="label">
              <span className="label-text font-medium">
                Selected Text (optional)
              </span>
              <span className="label-text-alt text-base-content/50">
                Context for the question
              </span>
            </label>
            <textarea
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              placeholder="Paste or type the relevant text from the book..."
              className="textarea textarea-bordered w-full h-20 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Page number input (optional) */}
          <div>
            <label className="label">
              <span className="label-text font-medium">
                Page Number (optional)
              </span>
            </label>
            <input
              type="number"
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="e.g., 42"
              className="input input-bordered w-full"
              min="1"
              disabled={isLoading}
            />
          </div>

          {/* Answer input (optional) */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Answer (optional)</span>
              <span className="label-text-alt text-base-content/50">
                Can be added later
              </span>
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Provide an answer..."
              className="textarea textarea-bordered w-full h-24 resize-none"
              disabled={isLoading}
            />
          </div>

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
                Make public (visible to all users with book access)
              </span>
            </label>
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
              disabled={isLoading || !question.trim() || (!initialBookId && !bookId)}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                "Create Q&A"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

