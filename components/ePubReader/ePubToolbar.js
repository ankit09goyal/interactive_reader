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
  showSettingsSidebar,
  bookId,
  isAdmin = false,
  onPrevPage,
  onNextPage,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onToggleTOC,
  onToggleQuestionsSidebar,
  onToggleHighlightsSidebar,
  onToggleSettingsSidebar,
  atStart,
  atEnd,
}) {
  return (
    <div className="toolbar flex flex-row justify-between p-2 bg-base-200 border-b border-base-300 gap-2 flex-shrink-0">
      {/* Left: Back button and title */}
      <div className="basis-auto items-center min-w-0 ">
        <Link
          href={backHref}
          className="btn btn-ghost btn-sm btn-square mr-2"
          title="Back to Dashboard"
        >
          {icons.chevronLeft}
        </Link>

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
      </div>

      {/* Center: Navigation */}
      <div className="basis-auto items-center gap-1">
        <div className="">
          <h1 className="font-semibold text-sm truncate">{title}</h1>
          {currentChapter && (
            <p className="text-xs text-base-content/60 truncate">
              {currentChapter.label}
            </p>
          )}
        </div>
      </div>

      {/* Right: Font size, TOC, and sidebar controls */}
      <div className="items-center gap-1 basis-auto">
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

        {/* Settings Sidebar toggle */}
        <button
          onClick={onToggleSettingsSidebar}
          className={`btn btn-ghost btn-sm btn-square ${
            showSettingsSidebar ? "bg-primary/20" : ""
          }`}
          title="Page View Settings"
        >
          {icons.settings}
        </button>
      </div>
    </div>
  );
}
