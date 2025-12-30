"use client";

import Link from "next/link";

/**
 * ePubToolbar - Toolbar component for ePub reader
 * Includes navigation, font size controls, and TOC toggle
 */
export default function EPubToolbar({
  title,
  backHref = "/dashboard",
  currentChapter,
  isLoading,
  fontSize,
  showTOC,
  showSidebar,
  bookId,
  isAdmin = false,
  onPrevPage,
  onNextPage,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onToggleTOC,
  onToggleSidebar,
  atStart,
  atEnd,
}) {
  return (
    <div className="toolbar flex items-center justify-between p-2 bg-base-200 border-b border-base-300 gap-2 flex-shrink-0">
      {/* Left: Back button and title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Link
          href={backHref}
          className="btn btn-ghost btn-sm btn-square flex-shrink-0"
          title="Back to Dashboard"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-sm truncate">{title}</h1>
          {currentChapter && (
            <p className="text-xs text-base-content/60 truncate">
              {currentChapter.label}
            </p>
          )}
        </div>
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onPrevPage}
          disabled={isLoading || atStart}
          className="btn btn-ghost btn-sm btn-square"
          title="Previous Page"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={onNextPage}
          disabled={isLoading || atEnd}
          className="btn btn-ghost btn-sm btn-square"
          title="Next Page"
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Right: Font size, TOC, and sidebar controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Font size controls */}
        <div className="flex items-center gap-1 border-r border-base-300 pr-2 mr-1">
          <button
            onClick={onDecreaseFontSize}
            disabled={isLoading || fontSize <= 12}
            className="btn btn-ghost btn-sm btn-square"
            title="Decrease Font Size"
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
                d="M20 12H4"
              />
            </svg>
          </button>
          <span className="text-xs font-mono w-8 text-center">{fontSize}</span>
          <button
            onClick={onIncreaseFontSize}
            disabled={isLoading || fontSize >= 24}
            className="btn btn-ghost btn-sm btn-square"
            title="Increase Font Size"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        {/* TOC toggle */}
        <button
          onClick={onToggleTOC}
          className={`btn btn-ghost btn-sm btn-square ${
            showTOC ? "bg-primary/20" : ""
          }`}
          title="Table of Contents"
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
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
        </button>

        {/* Sidebar toggle (Questions/Notes) */}
        {bookId && (
          <button
            onClick={onToggleSidebar}
            className={`btn btn-ghost btn-sm btn-square ${
              showSidebar ? "bg-primary/20" : ""
            }`}
            title="Questions & Notes"
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
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

