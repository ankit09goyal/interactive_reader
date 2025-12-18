"use client";

import { useState } from "react";
import BookUploadForm from "@/components/BookUploadForm";
import BookList from "@/components/BookList";

export default function AdminBooksClient({ initialBooks }) {
  const [books, setBooks] = useState(initialBooks);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const handleUploadSuccess = (newBook) => {
    setBooks((prev) => [newBook, ...prev]);
    setShowUploadForm(false);
  };

  const handleBooksChange = (updatedBooks) => {
    setBooks(updatedBooks);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {showUploadForm ? (
        <BookUploadForm
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowUploadForm(true)}
          className="btn btn-primary gap-2"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Upload New Book
        </button>
      )}

      {/* Books List */}
      <BookList books={books} onBooksChange={handleBooksChange} />
    </div>
  );
}

