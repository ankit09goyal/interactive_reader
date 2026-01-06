"use client";

import Link from "next/link";
import icons from "@/libs/icons";

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
    <div className="toolbar flex items-center justify-between p-3 bg-base-100 border-b border-base-300 flex-wrap gap-2 sticky top-0 z-50">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-2">
        <Link href={backHref} className="btn btn-ghost btn-sm gap-1">
          {icons.back}
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
          {icons.chevronLeft}
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
          {icons.chevronRight}
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
          {icons.zoomOut}
        </button>

        <button
          onClick={onZoomIn}
          disabled={scale >= 3 || isLoading}
          className="btn btn-ghost btn-sm btn-square"
          title="Zoom in (+)"
        >
          {icons.zoomIn}
        </button>

        {/* View Mode Toggle */}
        <button
          onClick={onToggleViewMode}
          className="btn btn-ghost btn-sm gap-1"
          title={`Switch to ${
            viewMode === "one-page" ? "continuous scroll" : "one page"
          } view (V)`}
        >
          {viewMode === "one-page" ? icons.scrollDown : icons.page}
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
            {icons.question}
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
            {icons.plus}
            <span className="hidden sm:inline text-xs">Create Q&A</span>
          </button>
        )}
      </div>
    </div>
  );
}
