"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function PDFReader({ filePath, title }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pdfjsLibRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  // Load PDF.js library dynamically (only in browser)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadPDFJS = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLibRef.current = pdfjsLib;

        // Configure PDF.js worker - use local worker file from public folder
        // This avoids CDN issues and works offline
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        setPdfjsLoaded(true);
      } catch (err) {
        console.error("Error loading PDF.js:", err);
        setError("Failed to load PDF viewer library");
      }
    };

    loadPDFJS();
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!pdfjsLoaded || !pdfjsLibRef.current || !filePath) return;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadingTask = pdfjsLibRef.current.getDocument(filePath);
        const pdf = await loadingTask.promise;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [filePath, pdfjsLoaded]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || isRendering) return;

    try {
      setIsRendering(true);
      const page = await pdfDoc.getPage(currentPage);

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Calculate scale to fit container width
      const container = containerRef.current;
      const containerWidth = container?.clientWidth || 800;
      const viewport = page.getViewport({ scale: 1 });
      const fitScale = (containerWidth - 40) / viewport.width; // 40px for padding
      const effectiveScale = scale * Math.min(fitScale, 1.5);

      const scaledViewport = page.getViewport({ scale: effectiveScale });

      // Set canvas dimensions
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = scaledViewport.width * pixelRatio;
      canvas.height = scaledViewport.height * pixelRatio;
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
    } finally {
      setIsRendering(false);
    }
  }, [pdfDoc, currentPage, scale, isRendering]);

  // Re-render when page or scale changes
  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc) {
        renderPage();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pdfDoc, renderPage]);

  // Navigation handlers
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageInput = (e) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Zoom handlers
  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
  };

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowLeft":
          goToPreviousPage();
          break;
        case "ArrowRight":
          goToNextPage();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "0":
          resetZoom();
          break;
        case "Escape":
          if (isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, isFullscreen]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-base-200 rounded-xl border border-base-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 text-error mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-error font-semibold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary mt-4"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-base-100 rounded-xl border border-base-300 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-base-200 border-b border-base-300 flex-wrap gap-2">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousPage}
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
              onChange={handlePageInput}
              className="input input-bordered input-sm w-16 text-center"
              disabled={isLoading}
            />
            <span className="text-base-content/70">/ {totalPages || "-"}</span>
          </div>

          <button
            onClick={goToNextPage}
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

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
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
            onClick={resetZoom}
            className="btn btn-ghost btn-sm min-w-[60px]"
            title="Reset zoom (0)"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={zoomIn}
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
        </div>

        {/* Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="btn btn-ghost btn-sm btn-square"
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
          >
            {isFullscreen ? (
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
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
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
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div
        className={`flex-1 overflow-auto bg-base-300/50 flex items-start justify-center p-4 ${
          isFullscreen ? "h-[calc(100vh-56px)]" : "min-h-[600px]"
        }`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-base-content/70">Loading PDF...</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white max-w-full"
            style={{ display: isRendering && !canvasRef.current?.width ? "none" : "block" }}
          />
        )}
      </div>

      {/* Footer with keyboard shortcuts hint */}
      <div className="p-2 bg-base-200 border-t border-base-300 text-center text-xs text-base-content/50">
        Use arrow keys to navigate • +/- to zoom • 0 to reset zoom • Esc to exit fullscreen
      </div>
    </div>
  );
}

