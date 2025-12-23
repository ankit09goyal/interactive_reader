"use client";

/**
 * PDFPage - Individual page component with canvas and text layer
 */
export default function PDFPage({
  pageNum,
  canvasRef,
  textLayerRef,
  isRendering = false,
  isVisible = true,
  showPageNumber = false,
}) {
  return (
    <div
      data-page={pageNum}
      className="flex flex-col items-center"
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="shadow-lg bg-white"
          style={{
            display: isVisible && !isRendering ? "block" : "none",
          }}
        />
        {/* Text layer for selection */}
        <div
          ref={textLayerRef}
          className="absolute top-0 left-0 overflow-hidden pointer-events-auto"
          style={{
            display: isVisible && !isRendering ? "block" : "none",
            userSelect: "text",
          }}
        />
      </div>
      {!isVisible && (
        <div className="flex items-center justify-center bg-base-200 rounded-lg min-h-[400px] min-w-[300px]">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      )}
      {showPageNumber && (
        <span className="text-xs text-base-content/50 mt-2">
          Page {pageNum}
        </span>
      )}
    </div>
  );
}

