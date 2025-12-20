"use client";

import Link from "next/link";

export default function UserBookList({ books }) {
  const getFileIcon = (mimeType) => {
    if (mimeType === "application/pdf") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-red-500"
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
        className="h-10 w-10 text-blue-500"
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

  if (!books || books.length === 0) {
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
          No books available
        </h3>
        <p className="text-sm text-base-content/50 mt-1">
          You don&apos;t have access to any books yet. Contact your administrator
          to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
      <div className="p-4 border-b border-base-300">
        <h3 className="font-semibold">Your Library ({books.length})</h3>
      </div>
      <div className="divide-y divide-base-300">
        {books.map((book) => (
          <Link
            key={book._id}
            href={`/reader/${book._id}`}
            className="p-4 flex items-start gap-4 hover:bg-base-300/50 transition-colors cursor-pointer block"
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
                  Added {formatDate(book.grantedAt || book.createdAt)}
                </span>
              </div>
            </div>

            {/* Read Arrow */}
            <div className="flex items-center flex-shrink-0 self-center">
              <span className="text-sm text-base-content/50 mr-2">Read</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-base-content/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

