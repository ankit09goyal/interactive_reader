"use client";

import PDFPage from "./PDFPage";

/**
 * PDFViewer - Main viewer component that handles one-page and continuous modes
 */
export default function PDFViewer({
  viewerRef,
  isLoading,
  viewMode,
  currentPage,
  totalPages,
  renderedPages,
  isRendering,
  isFullscreen,
  setCanvasRef,
  setTextLayerRef,
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-base-content/70">Loading PDF...</p>
      </div>
    );
  }

  return (
    <div
      ref={viewerRef}
      className={`flex-1 bg-base-200 ${
        viewMode === "one-page" ? "overflow-auto" : "overflow-y-auto"
      } ${isFullscreen ? "h-[calc(100vh-96px)]" : "h-full"}`}
    >
      {viewMode === "one-page" ? (
        <div className="flex justify-center items-start min-h-full p-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <canvas
                ref={setCanvasRef(currentPage)}
                key={currentPage}
                className="shadow-lg bg-white mx-auto"
                style={{ display: isRendering ? "none" : "block" }}
              />
              {/* Text layer for selection */}
              <div
                ref={setTextLayerRef(currentPage)}
                className="absolute top-0 left-0 overflow-hidden pointer-events-auto"
                style={{
                  display: isRendering ? "none" : "block",
                  userSelect: "text",
                }}
              />
            </div>
            {isRendering && (
              <div className="flex items-center justify-center">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 p-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <PDFPage
                key={pageNum}
                pageNum={pageNum}
                canvasRef={setCanvasRef(pageNum)}
                textLayerRef={setTextLayerRef(pageNum)}
                isRendering={false}
                isVisible={renderedPages.has(pageNum)}
                showPageNumber={true}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
