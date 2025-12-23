"use client";

import Link from "next/link";

/**
 * PDFToolbar - Toolbar component with navigation, zoom, and view controls
 */
export default function PDFToolbar({
  title,
  backHref,
  currentPage,
  totalPages,
  isLoading,
  scale,
  viewMode,
  bookId,
  isAdmin,
  showSidebar,
  onPreviousPage,
  onNextPage,
  onPageInput,
  onZoomIn,
  onZoomOut,
  onToggleViewMode,
  onToggleSidebar,
  onCreatePublicQA,
}) {
  return (
    <div className="toolbar flex items-center justify-between p-3 bg-base-200 border-b border-base-300 flex-wrap gap-2 sticky top-0 z-50">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-2">
        <Link href={backHref} className="btn btn-ghost btn-sm gap-1">
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="hidden sm:inline text-xs">Back</span>
        </Link>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">{title}</span>
        </div>
      </div>

      {/* Center: Page Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPreviousPage}
          disabled={currentPage <= 1 || isLoading}
          className="btn btn-ghost btn-sm btn-square"
          title="Previous page (Left Arrow)"
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

        <div className="flex items-center gap-1 text-sm">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={onPageInput}
            className="input input-bordered input-sm w-16 text-center"
            disabled={isLoading}
          />
          <span className="text-base-content/70">/ {totalPages || "-"}</span>
        </div>

        <button
          onClick={onNextPage}
          disabled={currentPage >= totalPages || isLoading}
          className="btn btn-ghost btn-sm btn-square"
          title="Next page (Right Arrow)"
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

      {/* Right: Tools */}
      <div className="flex items-center gap-2">
        {/* Zoom Controls */}
        <button
          onClick={onZoomOut}
          disabled={scale <= 0.5 || isLoading}
          className="btn btn-ghost btn-sm btn-square"
          title="Zoom out (-)"
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
            />
          </svg>
        </button>

        <button
          onClick={onZoomIn}
          disabled={scale >= 3 || isLoading}
          className="btn btn-ghost btn-sm btn-square"
          title="Zoom in (+)"
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
            />
          </svg>
        </button>

        {/* View Mode Toggle */}
        <button
          onClick={onToggleViewMode}
          className="btn btn-ghost btn-sm gap-1"
          title={`Switch to ${
            viewMode === "one-page" ? "continuous scroll" : "one page"
          } view (V)`}
        >
          {viewMode === "one-page" ? (
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
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          ) : (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          )}
          <span className="hidden sm:inline text-xs">
            {viewMode === "one-page" ? "Scroll" : "Page"}
          </span>
        </button>

        {/* Questions Sidebar Toggle */}
        {bookId && (
          <button
            onClick={onToggleSidebar}
            className={`btn btn-ghost btn-sm gap-1 ${
              showSidebar ? "btn-active" : ""
            }`}
            title="Questions & Answers (Q)"
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
            <span className="hidden sm:inline text-xs">Q&A</span>
          </button>
        )}

        {/* Admin: Create Public Q&A button */}
        {isAdmin && bookId && (
          <button
            onClick={onCreatePublicQA}
            className="btn btn-primary btn-sm gap-1"
            title="Create Public Q&A"
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
            <span className="hidden sm:inline text-xs">Create Q&A</span>
          </button>
        )}
      </div>
    </div>
  );
}

