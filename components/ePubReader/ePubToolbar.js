"use client";

import Link from "next/link";
import icons from "@/libs/icons";

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
  showQuestionsSidebar,
  showHighlightsSidebar,
  bookId,
  isAdmin = false,
  onPrevPage,
  onNextPage,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onToggleTOC,
  onToggleQuestionsSidebar,
  onToggleHighlightsSidebar,
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
          {icons.chevronLeft}
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
          {icons.chevronLeft}
        </button>

        <button
          onClick={onNextPage}
          disabled={isLoading || atEnd}
          className="btn btn-ghost btn-sm btn-square"
          title="Next Page"
        >
          {icons.chevronRight}
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
            {icons.minus}
          </button>
          <span className="text-xs font-mono w-8 text-center">{fontSize}</span>
          <button
            onClick={onIncreaseFontSize}
            disabled={isLoading || fontSize >= 24}
            className="btn btn-ghost btn-sm btn-square"
            title="Increase Font Size"
          >
            {icons.plus}
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
          {icons.menu}
        </button>

        {/* Questions Sidebar toggle */}
        {bookId && (
          <button
            onClick={onToggleQuestionsSidebar}
            className={`btn btn-ghost btn-sm btn-square ${
              showQuestionsSidebar ? "bg-primary/20" : ""
            }`}
            title="Questions & Answers"
          >
            {icons.question}
          </button>
        )}

        {/* Highlights Sidebar toggle */}
        {bookId && (
          <button
            onClick={onToggleHighlightsSidebar}
            className={`btn btn-ghost btn-sm btn-square ${
              showHighlightsSidebar ? "bg-primary/20" : ""
            }`}
            title="Highlights & Notes"
          >
            {icons.highlight}
          </button>
        )}
      </div>
    </div>
  );
}
