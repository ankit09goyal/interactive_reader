"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import apiClient from "@/libs/api";

export default function PDFReader({ filePath, title }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const pdfjsLibRef = useRef(null);
  const canvasRefs = useRef(new Map());
  const renderTasksRef = useRef(new Map()); // Track active render tasks per page
  const observerRef = useRef(null);
  const lastScrollY = useRef(0);
  const toolbarTimeoutRef = useRef(null);
  const renderedPagesRef = useRef(new Set([1]));
  const isTransitioningModeRef = useRef(false); // Prevent page updates during mode transitions
  const targetPageRef = useRef(1); // Track target page during mode switch

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState("one-page"); // "one-page" or "continuous"
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [renderedPages, setRenderedPages] = useState(new Set([1]));

  // Load user preferences in background (non-blocking)
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await apiClient.get("/user/preferences");
        if (response?.preferences?.readerViewMode) {
          setViewMode(response.preferences.readerViewMode);
        }
      } catch (err) {
        // Silently use default (one-page) on error
      }
    };

    loadPreferences();
  }, []);

  // Save view mode preference
  const saveViewModePreference = async (mode) => {
    try {
      await apiClient.put("/user/preferences", { readerViewMode: mode });
    } catch (err) {
      console.error("Failed to save preference:", err);
    }
  };

  // Toggle view mode
  const toggleViewMode = () => {
    const newMode = viewMode === "one-page" ? "continuous" : "one-page";

    // Save current page before switching
    targetPageRef.current = currentPage;
    isTransitioningModeRef.current = true;

    setViewMode(newMode);
    saveViewModePreference(newMode);

    // Reset rendered pages for continuous mode
    if (newMode === "continuous") {
      const newSet = new Set([currentPage]);
      renderedPagesRef.current = newSet;
      setRenderedPages(newSet);

      // Scroll to the current page after DOM updates
      setTimeout(() => {
        const pageElement = document.querySelector(
          `[data-page="${currentPage}"]`
        );
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: "auto", block: "start" });
        }
        // Allow IntersectionObserver to update currentPage again after scroll settles
        setTimeout(() => {
          isTransitioningModeRef.current = false;
        }, 100);
      }, 50);
    } else {
      // Clear transition flag after a short delay for one-page mode
      setTimeout(() => {
        isTransitioningModeRef.current = false;
      }, 100);
    }
  };

  // Load PDF.js library dynamically (only in browser)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadPDFJS = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLibRef.current = pdfjsLib;
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

    // Cancel all existing render tasks when loading new PDF
    renderTasksRef.current.forEach((task) => {
      try {
        task.cancel();
      } catch (e) {
        // Ignore cancel errors
      }
    });
    renderTasksRef.current.clear();

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadingTask = pdfjsLibRef.current.getDocument(filePath);
        const pdf = await loadingTask.promise;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        const initialSet = new Set([1]);
        renderedPagesRef.current = initialSet;
        setRenderedPages(initialSet);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();

    // Cleanup on unmount
    return () => {
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
      });
      renderTasksRef.current.clear();
    };
  }, [filePath, pdfjsLoaded]);

  // Render a single page to a canvas
  const renderPageToCanvas = useCallback(
    async (pageNum, canvas, fitToViewport = false) => {
      if (!pdfDoc || !canvas) return false;

      // Cancel any existing render task for this page
      const existingTask = renderTasksRef.current.get(pageNum);
      if (existingTask) {
        try {
          existingTask.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
        renderTasksRef.current.delete(pageNum);
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const context = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 1 });

        let effectiveScale;

        if (fitToViewport && viewMode === "one-page") {
          // For one-page mode: fit to viewport while maintaining aspect ratio
          const container = containerRef.current;
          const toolbarHeight = toolbarVisible ? 56 : 0;
          const footerHeight = 40;
          const padding = 32;

          const availableWidth =
            (container?.clientWidth || window.innerWidth) - padding;
          const availableHeight =
            (isFullscreen
              ? window.innerHeight
              : Math.min(window.innerHeight * 0.85, 800)) -
            toolbarHeight -
            footerHeight -
            padding;

          const scaleX = availableWidth / viewport.width;
          const scaleY = availableHeight / viewport.height;
          effectiveScale = Math.min(scaleX, scaleY, 2) * scale;
        } else {
          // For continuous mode: fit to container width
          const container = containerRef.current;
          const containerWidth = container?.clientWidth || 800;
          const fitScale = (containerWidth - 48) / viewport.width;
          effectiveScale = scale * Math.min(fitScale, 1.5);
        }

        const scaledViewport = page.getViewport({ scale: effectiveScale });

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = scaledViewport.width * pixelRatio;
        canvas.height = scaledViewport.height * pixelRatio;
        canvas.style.width = `${scaledViewport.width}px`;
        canvas.style.height = `${scaledViewport.height}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        // Start render and track the task
        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;

        // Clean up task reference
        renderTasksRef.current.delete(pageNum);
        return true;
      } catch (err) {
        // Ignore cancellation errors
        if (err?.name === "RenderingCancelledException") {
          return false;
        }
        console.error(`Error rendering page ${pageNum}:`, err);
        return false;
      }
    },
    [pdfDoc, scale, viewMode, toolbarVisible, isFullscreen]
  );

  // Render current page for one-page mode
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || viewMode !== "one-page") return;

    const canvas = canvasRefs.current.get(currentPage);
    if (!canvas) return;

    setIsRendering(true);
    try {
      await renderPageToCanvas(currentPage, canvas, true);
    } finally {
      setIsRendering(false);
    }
  }, [pdfDoc, currentPage, viewMode, renderPageToCanvas]);

  // Effect to render page in one-page mode
  useEffect(() => {
    if (viewMode === "one-page" && pdfDoc && !isLoading) {
      renderCurrentPage();
    }
  }, [
    viewMode,
    pdfDoc,
    currentPage,
    scale,
    isLoading,
    toolbarVisible,
    isFullscreen,
    renderCurrentPage,
  ]);

  // Setup intersection observer for continuous mode lazy loading
  useEffect(() => {
    if (viewMode !== "continuous" || !pdfDoc || isLoading) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.dataset.page);
            // Use ref to check rendered pages to avoid stale closure
            if (!isNaN(pageNum) && !renderedPagesRef.current.has(pageNum)) {
              renderedPagesRef.current.add(pageNum);
              setRenderedPages((prev) => new Set([...prev, pageNum]));
            }
            // Update current page based on what's most visible
            // Skip during mode transition to preserve the intended page
            if (
              entry.intersectionRatio > 0.5 &&
              !isTransitioningModeRef.current
            ) {
              setCurrentPage(pageNum);
            }
          }
        });
      },
      {
        root: viewerRef.current,
        rootMargin: "100px 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    observerRef.current = observer;

    // Observe all page containers
    const pageContainers = viewerRef.current?.querySelectorAll("[data-page]");
    pageContainers?.forEach((container) => observer.observe(container));

    return () => observer.disconnect();
  }, [viewMode, pdfDoc, isLoading, totalPages]);

  // Render pages when they become visible in continuous mode
  useEffect(() => {
    if (viewMode !== "continuous" || !pdfDoc) return;

    const renderVisiblePages = async () => {
      for (const pageNum of renderedPages) {
        const canvas = canvasRefs.current.get(pageNum);
        if (canvas && !canvas.dataset.rendered) {
          canvas.dataset.rendered = "true";
          await renderPageToCanvas(pageNum, canvas, false);
        }
      }
    };

    renderVisiblePages();
  }, [viewMode, renderedPages, pdfDoc, renderPageToCanvas]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc) {
        // Clear rendered flags to force re-render
        canvasRefs.current.forEach((canvas) => {
          if (canvas) canvas.dataset.rendered = "";
        });
        if (viewMode === "one-page") {
          renderCurrentPage();
        } else {
          // Re-render visible pages
          setRenderedPages((prev) => new Set([...prev]));
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pdfDoc, viewMode, renderCurrentPage]);

  // Auto-hide toolbar logic for one-page mode
  useEffect(() => {
    if (viewMode !== "one-page") {
      setToolbarVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingUp = currentScrollY < lastScrollY.current;

      if (scrollingUp || currentScrollY < 50) {
        setToolbarVisible(true);
        // Clear any existing timeout
        if (toolbarTimeoutRef.current) {
          clearTimeout(toolbarTimeoutRef.current);
        }
        // Auto-hide after 3 seconds of no scrolling
        toolbarTimeoutRef.current = setTimeout(() => {
          if (window.scrollY > 50) {
            setToolbarVisible(false);
          }
        }, 3000);
      } else if (currentScrollY > 100) {
        setToolbarVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    const handleMouseMove = (e) => {
      // Show toolbar when mouse is near top of screen
      if (e.clientY < 60) {
        setToolbarVisible(true);
        if (toolbarTimeoutRef.current) {
          clearTimeout(toolbarTimeoutRef.current);
        }
        toolbarTimeoutRef.current = setTimeout(() => {
          setToolbarVisible(false);
        }, 3000);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      if (toolbarTimeoutRef.current) {
        clearTimeout(toolbarTimeoutRef.current);
      }
    };
  }, [viewMode]);

  // Navigation handlers
  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      if (viewMode === "continuous") {
        // Scroll to page in continuous mode
        const pageElement = viewerRef.current?.querySelector(
          `[data-page="${newPage}"]`
        );
        pageElement?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [currentPage, viewMode]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      if (viewMode === "continuous") {
        const pageElement = viewerRef.current?.querySelector(
          `[data-page="${newPage}"]`
        );
        pageElement?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [currentPage, totalPages, viewMode]);

  const handlePageInput = (e) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      if (viewMode === "continuous") {
        const pageElement = viewerRef.current?.querySelector(
          `[data-page="${page}"]`
        );
        pageElement?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Zoom handlers
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1);

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
        case "v":
          // Toggle view mode with 'v' key
          toggleViewMode();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, isFullscreen, goToPreviousPage, goToNextPage]);

  // Register canvas ref
  const setCanvasRef = useCallback(
    (pageNum) => (el) => {
      if (el) {
        canvasRefs.current.set(pageNum, el);
      }
    },
    []
  );

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
      className={`flex flex-col w-full h-full bg-base-100 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* Toolbar - auto-hides in one-page mode, always visible in continuous mode */}
      <div
        className={`flex items-center justify-between p-3 bg-base-200 border-b border-base-300 flex-wrap gap-2 transition-all duration-300 sticky top-0 z-50 ${
          viewMode === "one-page" && !toolbarVisible
            ? "opacity-0 -translate-y-full"
            : "opacity-100 translate-y-0"
        }`}
        onMouseEnter={() => viewMode === "one-page" && setToolbarVisible(true)}
      >
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

        {/* View Mode Toggle & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <button
            onClick={toggleViewMode}
            className="btn btn-ghost btn-sm gap-1"
            title={`Switch to ${
              viewMode === "one-page" ? "continuous scroll" : "one page"
            } view (V)`}
          >
            {viewMode === "one-page" ? (
              // Scroll icon for switching to continuous
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
              // Single page icon for switching to one-page
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

          {/* Fullscreen */}
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
        ref={viewerRef}
        className={`flex-1 bg-base-300/30 ${
          viewMode === "one-page"
            ? "flex items-center justify-center overflow-hidden"
            : "overflow-y-auto"
        } ${isFullscreen ? "h-[calc(100vh-96px)]" : "h-full"}`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-base-content/70">Loading PDF...</p>
          </div>
        ) : viewMode === "one-page" ? (
          // One-page mode: single canvas that fits viewport
          <div className="flex items-center justify-center p-4 h-full">
            <canvas
              ref={setCanvasRef(currentPage)}
              key={currentPage}
              className="shadow-lg bg-white"
              style={{ display: isRendering ? "none" : "block" }}
            />
            {isRendering && (
              <div className="flex items-center justify-center">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            )}
          </div>
        ) : (
          // Continuous scroll mode: all pages stacked vertically with lazy loading
          <div className="flex flex-col items-center gap-4 p-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <div
                  key={pageNum}
                  data-page={pageNum}
                  className="flex flex-col items-center"
                >
                  <canvas
                    ref={setCanvasRef(pageNum)}
                    className="shadow-lg bg-white"
                    style={{
                      display: renderedPages.has(pageNum) ? "block" : "none",
                    }}
                  />
                  {!renderedPages.has(pageNum) && (
                    <div className="flex items-center justify-center bg-base-200 rounded-lg min-h-[400px] min-w-[300px]">
                      <span className="loading loading-spinner loading-md text-primary"></span>
                    </div>
                  )}
                  <span className="text-xs text-base-content/50 mt-2">
                    Page {pageNum}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Footer with keyboard shortcuts hint */}
      <div className="p-2 bg-base-200 border-t border-base-300 text-center text-xs text-base-content/50">
        {viewMode === "one-page"
          ? "Arrow keys to navigate • +/- zoom • V to switch view • Move mouse to top to show toolbar"
          : "Scroll to read • +/- zoom • V to switch view • Arrow keys to jump pages"}
      </div>
    </div>
  );
}
