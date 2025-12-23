"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import apiClient from "@/libs/api";
import Link from "next/link";
import TextSelectionMenu from "./TextSelectionMenu";
import QuestionModal from "./QuestionModal";
import AdminCreateQuestionModal from "./AdminCreateQuestionModal";
import QuestionsSidebar from "./QuestionsSidebar";

export default function PDFReader({
  filePath,
  title,
  backHref = "/dashboard",
  bookId = null,
  isAdmin = false,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const pdfjsLibRef = useRef(null);
  const canvasRefs = useRef(new Map());
  const textLayerRefs = useRef(new Map());
  const renderTasksRef = useRef(new Map());
  const observerRef = useRef(null);
  const renderedPagesRef = useRef(new Set([1]));
  const isTransitioningModeRef = useRef(false);
  const targetPageRef = useRef(1);

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
  const [viewMode, setViewMode] = useState("one-page");
  const [renderedPages, setRenderedPages] = useState(new Set([1]));

  // Text selection state
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [selectionPageNumber, setSelectionPageNumber] = useState(null);

  // Modal states
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAdminCreateModal, setShowAdminCreateModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

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

    targetPageRef.current = currentPage;
    isTransitioningModeRef.current = true;

    setViewMode(newMode);
    saveViewModePreference(newMode);

    if (newMode === "continuous") {
      const newSet = new Set([currentPage]);
      renderedPagesRef.current = newSet;
      setRenderedPages(newSet);

      setTimeout(() => {
        const pageElement = document.querySelector(
          `[data-page="${currentPage}"]`
        );
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: "auto", block: "start" });
        }
        setTimeout(() => {
          isTransitioningModeRef.current = false;
        }, 100);
      }, 50);
    } else {
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

  // Render a single page to a canvas with text layer
  const renderPageToCanvas = useCallback(
    async (pageNum, canvas, fitToViewport = false) => {
      if (!pdfDoc || !canvas) return false;

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
          const container = containerRef.current;
          const toolbarHeight = 56;
          const footerHeight = 40;
          const padding = 0;

          const availableWidth =
            (container?.clientWidth || window.innerWidth) - padding;
          const availableHeight =
            (isFullscreen
              ? window.innerHeight
              : Math.min(window.innerHeight, 900)) -
            toolbarHeight -
            footerHeight -
            padding;

          const scaleX = availableWidth / viewport.width;
          const scaleY = availableHeight / viewport.height;
          effectiveScale = Math.min(scaleX, scaleY, 2) * scale;
        } else {
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

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;

        // Render text layer for selection
        await renderTextLayer(page, scaledViewport, pageNum);

        renderTasksRef.current.delete(pageNum);
        return true;
      } catch (err) {
        if (err?.name === "RenderingCancelledException") {
          return false;
        }
        console.error(`Error rendering page ${pageNum}:`, err);
        return false;
      }
    },
    [pdfDoc, scale, viewMode, isFullscreen]
  );

  // Render text layer for a page
  const renderTextLayer = async (page, viewport, pageNum) => {
    const textLayerDiv = textLayerRefs.current.get(pageNum);
    if (!textLayerDiv) return;

    // Clear existing content
    textLayerDiv.innerHTML = "";
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;

    try {
      const textContent = await page.getTextContent();

      // Render each text item
      textContent.items.forEach((item) => {
        const tx = pdfjsLibRef.current.Util.transform(
          viewport.transform,
          item.transform
        );

        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
        const fontAscent = item.fontName ? fontSize * 0.8 : fontSize;

        const span = document.createElement("span");
        span.textContent = item.str;
        span.style.left = `${tx[4]}px`;
        span.style.top = `${tx[5] - fontAscent}px`;
        span.style.fontSize = `${fontSize}px`;
        span.style.fontFamily = item.fontName || "sans-serif";
        span.style.position = "absolute";
        span.style.whiteSpace = "pre";
        span.style.color = "transparent";
        span.style.cursor = "text";
        span.dataset.pageNum = pageNum;

        textLayerDiv.appendChild(span);
      });
    } catch (err) {
      console.error(`Error rendering text layer for page ${pageNum}:`, err);
    }
  };

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = (e) => {
      // Ignore if clicking on toolbar or modals
      if (
        e.target.closest(".toolbar") ||
        e.target.closest("[role='dialog']") ||
        showQuestionModal ||
        showAdminCreateModal ||
        showSidebar
      ) {
        return;
      }

      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        // Get page number from selection
        const anchorNode = selection?.anchorNode?.parentElement;
        const pageNum = anchorNode?.dataset?.pageNum
          ? parseInt(anchorNode.dataset.pageNum)
          : currentPage;

        // Get position for menu
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectedText(text);
        setSelectionPageNumber(pageNum);
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom,
        });
      } else {
        // Clear selection if clicking elsewhere
        if (!e.target.closest(".text-selection-menu")) {
          clearSelection();
        }
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [currentPage, showQuestionModal, showAdminCreateModal, showSidebar]);

  // Clear text selection
  const clearSelection = () => {
    setSelectedText("");
    setSelectionPosition(null);
    setSelectionPageNumber(null);
    window.getSelection()?.removeAllRanges();
  };

  // Handle asking question from selection menu
  const handleAskQuestion = (text) => {
    setShowQuestionModal(true);
    setSelectionPosition(null); // Hide selection menu
  };

  // Handle creating public Q&A from selection menu (admin only)
  const handleCreatePublicQA = (text) => {
    setShowAdminCreateModal(true);
    setSelectionPosition(null); // Hide selection menu
  };

  // Handle question created
  const handleQuestionCreated = () => {
    clearSelection();
    setSidebarRefreshTrigger((prev) => prev + 1);
  };

  // Navigate to page (from sidebar)
  const handleGoToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      if (viewMode === "continuous") {
        const pageElement = viewerRef.current?.querySelector(
          `[data-page="${pageNumber}"]`
        );
        pageElement?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

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
    isFullscreen,
    renderCurrentPage,
  ]);

  // Setup intersection observer for continuous mode lazy loading
  useEffect(() => {
    if (viewMode !== "continuous" || !pdfDoc || isLoading) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    renderedPagesRef.current = new Set(renderedPages);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.dataset.page);
            if (!isNaN(pageNum) && !renderedPagesRef.current.has(pageNum)) {
              renderedPagesRef.current.add(pageNum);
              setRenderedPages((prev) => new Set([...prev, pageNum]));
            }
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

    const pageContainers = viewerRef.current?.querySelectorAll("[data-page]");
    pageContainers?.forEach((container) => observer.observe(container));

    return () => observer.disconnect();
  }, [viewMode, pdfDoc, isLoading, totalPages]);

  // Clear rendered flags when scale changes in continuous mode
  useEffect(() => {
    if (viewMode !== "continuous" || !pdfDoc) return;

    canvasRefs.current.forEach((canvas) => {
      if (canvas) {
        canvas.dataset.rendered = "";
        delete canvas.dataset.lastScale;
      }
    });
  }, [scale, viewMode, pdfDoc]);

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
        canvasRefs.current.forEach((canvas) => {
          if (canvas) canvas.dataset.rendered = "";
        });
        if (viewMode === "one-page") {
          renderCurrentPage();
        } else {
          setRenderedPages((prev) => new Set([...prev]));
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pdfDoc, viewMode, renderCurrentPage]);

  // Navigation handlers
  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      if (viewMode === "continuous") {
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
      // Don't handle keys if modal is open
      if (showQuestionModal || showAdminCreateModal || showSidebar) return;

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
          clearSelection();
          break;
        case "v":
          toggleViewMode();
          break;
        case "q":
          setShowSidebar((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentPage,
    totalPages,
    isFullscreen,
    goToPreviousPage,
    goToNextPage,
    showQuestionModal,
    showAdminCreateModal,
    showSidebar,
  ]);

  // Register canvas ref
  const setCanvasRef = useCallback(
    (pageNum) => (el) => {
      if (el) {
        canvasRefs.current.set(pageNum, el);
      }
    },
    []
  );

  // Register text layer ref
  const setTextLayerRef = useCallback(
    (pageNum) => (el) => {
      if (el) {
        textLayerRefs.current.set(pageNum, el);
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
      {/* Toolbar */}
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

        {/* Right: Tools */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
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

          {/* View Mode Toggle */}
          <button
            onClick={toggleViewMode}
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
              onClick={() => setShowSidebar(!showSidebar)}
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
              onClick={() => setShowAdminCreateModal(true)}
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

      {/* PDF Viewer */}
      <div
        ref={viewerRef}
        className={`flex-1 bg-base-300/30 ${
          viewMode === "one-page" ? "overflow-auto" : "overflow-y-auto"
        } ${isFullscreen ? "h-[calc(100vh-96px)]" : "h-full"}`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-base-content/70">Loading PDF...</p>
          </div>
        ) : viewMode === "one-page" ? (
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
                <div
                  key={pageNum}
                  data-page={pageNum}
                  className="flex flex-col items-center"
                >
                  <div className="relative">
                    <canvas
                      ref={setCanvasRef(pageNum)}
                      className="shadow-lg bg-white"
                      style={{
                        display: renderedPages.has(pageNum) ? "block" : "none",
                      }}
                    />
                    {/* Text layer for selection */}
                    <div
                      ref={setTextLayerRef(pageNum)}
                      className="absolute top-0 left-0 overflow-hidden pointer-events-auto"
                      style={{
                        display: renderedPages.has(pageNum) ? "block" : "none",
                        userSelect: "text",
                      }}
                    />
                  </div>
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

      {/* Footer */}
      <div className="p-2 bg-base-200 border-t border-base-300 text-center text-xs text-base-content/50">
        {viewMode === "one-page"
          ? "Arrow keys to navigate • +/- zoom • V to switch view • Q to toggle Q&A"
          : "Scroll to read • +/- zoom • V to switch view • Q to toggle Q&A"}
        {" • Select text to ask questions"}
      </div>

      {/* Text Selection Menu */}
      {selectionPosition && selectedText && (
        <div className="text-selection-menu">
          <TextSelectionMenu
            position={selectionPosition}
            selectedText={selectedText}
            onAskQuestion={handleAskQuestion}
            onCreatePublicQA={handleCreatePublicQA}
            onClose={clearSelection}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Question Modal */}
      {bookId && (
        <QuestionModal
          isOpen={showQuestionModal}
          onClose={() => {
            setShowQuestionModal(false);
            clearSelection();
          }}
          selectedText={selectedText}
          pageNumber={selectionPageNumber}
          bookId={bookId}
          isAdmin={isAdmin}
          onQuestionCreated={handleQuestionCreated}
        />
      )}

      {/* Admin Create Question Modal */}
      {isAdmin && bookId && (
        <AdminCreateQuestionModal
          isOpen={showAdminCreateModal}
          onClose={() => {
            setShowAdminCreateModal(false);
            clearSelection();
          }}
          bookId={bookId}
          selectedText={selectedText}
          pageNumber={selectionPageNumber}
          onQuestionCreated={handleQuestionCreated}
        />
      )}

      {/* Questions Sidebar */}
      {bookId && (
        <QuestionsSidebar
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          bookId={bookId}
          onGoToPage={handleGoToPage}
          refreshTrigger={sidebarRefreshTrigger}
        />
      )}
    </div>
  );
}
