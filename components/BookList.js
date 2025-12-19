"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import BookReplaceModal from "./BookReplaceModal";
import BookDeleteModal from "./BookDeleteModal";

export default function BookList({ books: initialBooks, onBooksChange }) {
  const [books, setBooks] = useState(initialBooks);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalBook, setDeleteModalBook] = useState(null);
  const [replaceModalBook, setReplaceModalBook] = useState(null);

  // Sync books state when initialBooks prop changes (e.g., when a new book is uploaded)
  useEffect(() => {
    setBooks(initialBooks);
  }, [initialBooks]);

  const handleDeleteClick = (book) => {
    setDeleteModalBook(book);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalBook) return;

    const bookId = deleteModalBook._id;
    setDeletingId(bookId);

    try {
      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete book");
      }

      const updatedBooks = books.filter((book) => book._id !== bookId);
      setBooks(updatedBooks);
      onBooksChange?.(updatedBooks);
      toast.success("Book deleted successfully");
      setDeleteModalBook(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete book");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReplaceSuccess = (updatedBook) => {
    const updatedBooks = books.map((book) =>
      book._id === updatedBook._id ? updatedBook : book
    );
    setBooks(updatedBooks);
    onBooksChange?.(updatedBooks);
    setReplaceModalBook(null);
  };

  const getFileIcon = (mimeType) => {
    if (mimeType === "application/pdf") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    }
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (books.length === 0) {
    return (
      <div className="bg-base-200 rounded-xl p-12 border border-base-300 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mx-auto text-base-content/30 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <h3 className="text-lg font-semibold text-base-content/70">
          No books uploaded yet
        </h3>
        <p className="text-sm text-base-content/50 mt-1">
          Upload your first book using the form above
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
        <div className="p-4 border-b border-base-300">
          <h3 className="font-semibold">Your Books ({books.length})</h3>
        </div>
        <div className="divide-y divide-base-300">
          {books.map((book) => (
            <div
              key={book._id}
              className="p-4 flex items-start gap-4 hover:bg-base-300/50 transition-colors"
            >
              {/* File Icon */}
              <div className="flex-shrink-0 mt-1">
                {getFileIcon(book.mimeType)}
              </div>

              {/* Book Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-lg truncate">{book.title}</h4>
                <p className="text-sm text-base-content/70">by {book.author}</p>
                {book.description && (
                  <p className="text-sm text-base-content/60 mt-1 line-clamp-2">
                    {book.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="badge badge-sm">
                    {book.fileType ||
                      (book.mimeType === "application/pdf" ? "PDF" : "EPUB")}
                  </span>
                  <span className="badge badge-sm badge-ghost">
                    {book.fileSizeFormatted}
                  </span>
                  <span className="text-xs text-base-content/50">
                    Uploaded {formatDate(book.createdAt)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* View/Download */}
                <a
                  href={book.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  title="View/Download"
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </a>

                {/* Replace */}
                <button
                  onClick={() => setReplaceModalBook(book)}
                  className="btn btn-ghost btn-sm"
                  title="Replace File"
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
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteClick(book)}
                  disabled={deletingId === book._id}
                  className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                  title="Delete"
                >
                  {deletingId === book._id ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
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
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Replace Modal */}
      {replaceModalBook && (
        <BookReplaceModal
          book={replaceModalBook}
          onClose={() => setReplaceModalBook(null)}
          onSuccess={handleReplaceSuccess}
        />
      )}

      {/* Delete Modal */}
      {deleteModalBook && (
        <BookDeleteModal
          book={deleteModalBook}
          onClose={() => setDeleteModalBook(null)}
          onConfirm={handleDeleteConfirm}
          isDeleting={deletingId === deleteModalBook._id}
        />
      )}
    </>
  );
}
