"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import TextSelectionMenu from "./TextSelectionMenu";
import QuestionModal from "./QuestionModal";
import AdminCreateQuestionModal from "./AdminCreateQuestionModal";
import QuestionsSidebar from "./QuestionsSidebar";
import PDFError from "./PDFReader/PDFError";
import PDFFooter from "./PDFReader/PDFFooter";
import PDFToolbar from "./PDFReader/PDFToolbar";
import PDFViewer from "./PDFReader/PDFViewer";
import apiClient from "@/libs/api";
import { usePDFLoader } from "./PDFReader/hooks/usePDFLoader";
import { usePDFRenderer } from "./PDFReader/hooks/usePDFRenderer";
import { usePDFNavigation } from "./PDFReader/hooks/usePDFNavigation";
import { usePDFTextSelection } from "./PDFReader/hooks/usePDFTextSelection";
import { usePDFContinuousMode } from "./PDFReader/hooks/usePDFContinuousMode";
import { usePDFHighlights } from "./PDFReader/hooks/usePDFHighlights";
import { useReadingAnalytics } from "@/libs/useReadingAnalytics";
import { toast } from "react-hot-toast";

export default function PDFReader({
  filePath,
  title,
  backHref = "/dashboard",
  bookId = null,
  isAdmin = false,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const canvasRefs = useRef(new Map());
  const textLayerRefs = useRef(new Map());

  // Modal states
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAdminCreateModal, setShowAdminCreateModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Store selected text for modal (persists even if selection is cleared)
  const [modalSelectedText, setModalSelectedText] = useState(null);
  const [modalPageNumber, setModalPageNumber] = useState(null);

  // Store question ID to highlight in sidebar
  const [highlightedQuestionId, setHighlightedQuestionId] = useState(null);
  const [highlightedTextClicked, setHighlightedTextClicked] = useState(0);

  // Load PDF.js and PDF document
  const { pdfjsLibRef, pdfDoc, totalPages, isLoading, error, renderTasksRef } =
    usePDFLoader(filePath);

  // View mode management (needs to be initialized first)
  const [viewModeState, setViewModeState] = useState("one-page");
  const [renderedPages, setRenderedPages] = useState(new Set([1]));
  const renderedPagesRef = useRef(new Set([1]));
  const isTransitioningModeRef = useRef(false);
  const scrolledToInitialRef = useRef(false);

  // Book preferences state
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [initialPage, setInitialPage] = useState(1);
  const [initialScale, setInitialScale] = useState(1.0);

  // Refs for debounced saving and tracking pending changes
  const savePageTimeoutRef = useRef(null);
  const saveScaleTimeoutRef = useRef(null);
  const pendingPageRef = useRef(null);
  const pendingScaleRef = useRef(null);
  const bookIdRef = useRef(bookId);

  // Keep bookId ref updated
  useEffect(() => {
    bookIdRef.current = bookId;
  }, [bookId]);

  // Load book-specific preferences on mount
  useEffect(() => {
    const loadBookPreferences = async () => {
      if (!bookId) {
        setPreferencesLoaded(true);
        return;
      }

      try {
        const response = await apiClient.get(
          `/user/books/${bookId}/preferences`
        );
        if (response?.preferences) {
          const { lastPage, viewMode, scale } = response.preferences;
          setInitialPage(lastPage || 1);
          setViewModeState(viewMode || "one-page");
          setInitialScale(scale || 1.0);
        }
      } catch (err) {
        // Silently use defaults on error
        console.error("Failed to load book preferences:", err);
      } finally {
        setPreferencesLoaded(true);
      }
    };

    loadBookPreferences();
  }, [bookId]);

  // Save pending preferences before unmount or page unload
  useEffect(() => {
    const flushPendingPreferences = () => {
      if (!bookIdRef.current) return;

      const updates = {};
      if (pendingPageRef.current !== null) {
        updates.lastPage = pendingPageRef.current;
      }
      if (pendingScaleRef.current !== null) {
        updates.scale = pendingScaleRef.current;
      }

      if (Object.keys(updates).length > 0) {
        // Use sendBeacon for reliable save on page unload
        const url = `/api/user/books/${bookIdRef.current}/preferences`;
        const data = JSON.stringify(updates);
        navigator.sendBeacon(
          url,
          new Blob([data], { type: "application/json" })
        );
      }
    };

    // Handle page unload (closing tab, navigating to external URL)
    window.addEventListener("beforeunload", flushPendingPreferences);

    // Handle component unmount (internal navigation)
    return () => {
      window.removeEventListener("beforeunload", flushPendingPreferences);

      // Clear timeouts
      if (savePageTimeoutRef.current) clearTimeout(savePageTimeoutRef.current);
      if (saveScaleTimeoutRef.current)
        clearTimeout(saveScaleTimeoutRef.current);

      if (!bookIdRef.current) return;

      const updates = {};
      if (pendingPageRef.current !== null) {
        updates.lastPage = pendingPageRef.current;
      }
      if (pendingScaleRef.current !== null) {
        updates.scale = pendingScaleRef.current;
      }

      if (Object.keys(updates).length > 0) {
        // Fire and forget - we're unmounting so can't await
        apiClient
          .put(`/user/books/${bookIdRef.current}/preferences`, updates)
          .catch((err) =>
            console.error("[PDFReader] Unmount save failed:", err)
          );
      }
    };
  }, []);

  // Save book preferences (debounced for page/scale, immediate for viewMode)
  const saveBookPreferences = useCallback(
    async (updates, immediate = false) => {
      if (!bookId) return;

      const savePrefs = async () => {
        try {
          const result = await apiClient.put(
            `/user/books/${bookId}/preferences`,
            updates
          );
          // Clear pending refs after successful save
          if (updates.lastPage !== undefined) pendingPageRef.current = null;
          if (updates.scale !== undefined) pendingScaleRef.current = null;
        } catch (err) {
          console.error("Failed to save book preferences:", err);
        }
      };

      if (immediate) {
        savePrefs();
      } else if (updates.lastPage !== undefined) {
        // Track pending page change
        pendingPageRef.current = updates.lastPage;
        // Debounce page saves by 2 seconds
        if (savePageTimeoutRef.current)
          clearTimeout(savePageTimeoutRef.current);
        savePageTimeoutRef.current = setTimeout(savePrefs, 2000);
      } else if (updates.scale !== undefined) {
        // Track pending scale change
        pendingScaleRef.current = updates.scale;
        // Debounce scale saves by 1 second
        if (saveScaleTimeoutRef.current)
          clearTimeout(saveScaleTimeoutRef.current);
        saveScaleTimeoutRef.current = setTimeout(savePrefs, 1000);
      }
    },
    [bookId]
  );

  // Save view mode immediately when changed
  const saveViewModePreference = useCallback(
    async (mode) => {
      saveBookPreferences({ viewMode: mode }, true);
    },
    [saveBookPreferences]
  );

  // Stable callbacks for page and scale changes
  const handlePageChange = useCallback(
    (page) => {
      saveBookPreferences({ lastPage: page });
    },
    [saveBookPreferences]
  );

  const handleScaleChange = useCallback(
    (newScale) => {
      saveBookPreferences({ scale: newScale });
    },
    [saveBookPreferences]
  );

  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    const newMode = viewModeState === "one-page" ? "continuous" : "one-page";
    setViewModeState(newMode);
    saveViewModePreference(newMode);
  }, [viewModeState, saveViewModePreference]);

  // Navigation and zoom controls
  const {
    currentPage,
    setCurrentPage,
    scale,
    setScale,
    goToPreviousPage,
    goToNextPage,
    handlePageInput,
    goToPage,
    zoomIn,
    zoomOut,
    resetZoom,
  } = usePDFNavigation({
    totalPages,
    viewMode: viewModeState,
    viewerRef,
    isFullscreen,
    showQuestionModal,
    showAdminCreateModal,
    showSidebar,
    toggleViewMode,
    clearSelection: () => {}, // Will be set after text selection hook
    setShowSidebar,
    initialPage: preferencesLoaded ? initialPage : 1,
    initialScale: preferencesLoaded ? initialScale : 1.0,
    preferencesLoaded,
    onPageChange: handlePageChange,
    onScaleChange: handleScaleChange,
  });

  // Update toggleViewMode to use currentPage
  const toggleViewModeWithPage = useCallback(() => {
    const newMode = viewModeState === "one-page" ? "continuous" : "one-page";
    isTransitioningModeRef.current = true;

    setViewModeState(newMode);
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
  }, [viewModeState, currentPage]);

  // Text selection handling
  const {
    selectedText,
    selectionPosition,
    selectionPageNumber,
    clearSelection,
  } = usePDFTextSelection({
    currentPage,
    showQuestionModal,
    showAdminCreateModal,
    showSidebar,
  });

  // Question highlights
  const { highlights } = usePDFHighlights({
    bookId,
    refreshTrigger: sidebarRefreshTrigger,
  });

  // Reading analytics tracking (GDPR compliant - no personal data)
  const { trackLocation } = useReadingAnalytics({
    bookId,
    locationType: "page",
    totalPages,
  });

  // Track page changes for analytics
  useEffect(() => {
    if (currentPage && bookId && totalPages > 0) {
      trackLocation(String(currentPage));
    }
  }, [currentPage, bookId, totalPages, trackLocation]);

  // Handle highlight click - open sidebar and highlight question
  const handleHighlightClick = useCallback((questionId) => {
    setHighlightedQuestionId(questionId);
    setShowSidebar(true);
    // Use functional update to always get the latest value
    setHighlightedTextClicked((prev) => prev + 1);
  }, []);

  // Page rendering logic
  const { renderPageToCanvas } = usePDFRenderer({
    pdfDoc,
    pdfjsLibRef,
    scale,
    viewMode: viewModeState,
    isFullscreen,
    containerRef,
    renderTasksRef,
    textLayerRefs,
    highlights,
    onHighlightClick: handleHighlightClick,
  });

  // Continuous mode rendering with intersection observer
  usePDFContinuousMode({
    viewMode: viewModeState,
    pdfDoc,
    isLoading,
    totalPages,
    renderedPages,
    setRenderedPages,
    renderedPagesRef,
    isTransitioningModeRef,
    viewerRef,
    setCurrentPage,
    renderPageToCanvas,
    canvasRefs,
    scale,
  });

  // Initialize current page when PDF loads and preferences are ready
  useEffect(() => {
    if (pdfDoc && totalPages > 0 && preferencesLoaded) {
      // Clamp initial page to valid range
      const validPage = Math.min(Math.max(1, initialPage), totalPages);
      setCurrentPage(validPage);
      const initialSet = new Set([validPage]);
      renderedPagesRef.current = initialSet;
      setRenderedPages(initialSet);
    }
  }, [
    pdfDoc,
    totalPages,
    preferencesLoaded,
    initialPage,
    setCurrentPage,
    renderedPagesRef,
    setRenderedPages,
  ]);

  // In continuous mode, scroll to the saved page after preferences load
  useEffect(() => {
    if (
      viewModeState === "continuous" &&
      preferencesLoaded &&
      pdfDoc &&
      !isLoading &&
      !scrolledToInitialRef.current
    ) {
      scrolledToInitialRef.current = true;
      const validPage = Math.min(Math.max(1, initialPage), totalPages || 1);
      // Defer to allow DOM to paint
      setTimeout(() => {
        const target = document.querySelector(`[data-page="${validPage}"]`);
        if (target) {
          target.scrollIntoView({ behavior: "auto", block: "start" });
        }
      }, 50);
    }
  }, [
    viewModeState,
    preferencesLoaded,
    pdfDoc,
    isLoading,
    initialPage,
    totalPages,
  ]);

  // Render current page for one-page mode
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || viewModeState !== "one-page") return;

    const canvas = canvasRefs.current.get(currentPage);
    if (!canvas) return;

    setIsRendering(true);
    try {
      await renderPageToCanvas(currentPage, canvas, true);
    } finally {
      setIsRendering(false);
    }
  }, [pdfDoc, currentPage, viewModeState, renderPageToCanvas]);

  // Effect to render page in one-page mode
  useEffect(() => {
    if (viewModeState === "one-page" && pdfDoc && !isLoading) {
      renderCurrentPage();
    }
  }, [
    viewModeState,
    pdfDoc,
    currentPage,
    scale,
    isLoading,
    isFullscreen,
    renderCurrentPage,
    highlights,
  ]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc) {
        canvasRefs.current.forEach((canvas) => {
          if (canvas) canvas.dataset.rendered = "";
        });
        if (viewModeState === "one-page") {
          renderCurrentPage();
        } else {
          setRenderedPages((prev) => new Set([...prev]));
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pdfDoc, viewModeState, renderCurrentPage, setRenderedPages]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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

  // Handle asking question from selection menu
  const handleAskQuestion = () => {
    // Store selected text and page number before opening modal
    // This ensures they persist even if selection gets cleared
    setModalSelectedText(selectedText);
    setModalPageNumber(selectionPageNumber || currentPage);
    setShowQuestionModal(true);
  };

  // Handle adding question without text selection
  const handleAddQuestion = () => {
    setShowQuestionModal(true);
  };

  // Handle creating public Q&A from selection menu (admin only)
  const handleCreatePublicQA = () => {
    // Store selected text and page number before opening modal
    // This ensures they persist even if selection gets cleared
    setModalSelectedText(selectedText);
    setModalPageNumber(selectionPageNumber || currentPage);
    setShowAdminCreateModal(true);
  };

  // Handle question created
  const handleQuestionCreated = () => {
    clearSelection();
    setSidebarRefreshTrigger((prev) => prev + 1);
    toast.success("Question created successfully");
  };

  // Handle question deleted - refresh highlights
  const handleQuestionDeleted = () => {
    setSidebarRefreshTrigger((prev) => prev + 1);
  };

  if (error) {
    return <PDFError error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col w-full h-full bg-base-100 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* Toolbar */}
      <PDFToolbar
        title={title}
        backHref={backHref}
        currentPage={currentPage}
        totalPages={totalPages}
        isLoading={isLoading}
        scale={scale}
        viewMode={viewModeState}
        bookId={bookId}
        isAdmin={isAdmin}
        showSidebar={showSidebar}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
        onPageInput={handlePageInput}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToggleViewMode={toggleViewModeWithPage}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onCreatePublicQA={handleCreatePublicQA}
      />

      {/* PDF Viewer */}
      <PDFViewer
        viewerRef={viewerRef}
        isLoading={isLoading}
        viewMode={viewModeState}
        currentPage={currentPage}
        totalPages={totalPages}
        renderedPages={renderedPages}
        isRendering={isRendering}
        isFullscreen={isFullscreen}
        setCanvasRef={setCanvasRef}
        setTextLayerRef={setTextLayerRef}
      />

      {/* Footer */}
      <PDFFooter viewMode={viewModeState} />

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
            setModalSelectedText(null);
            setModalPageNumber(null);
            clearSelection();
          }}
          selectedText={modalSelectedText || selectedText}
          pageNumber={modalPageNumber || selectionPageNumber || currentPage}
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
            setModalSelectedText(null);
            setModalPageNumber(null);
            clearSelection();
          }}
          bookId={bookId}
          selectedText={modalSelectedText || selectedText}
          pageNumber={modalPageNumber || selectionPageNumber}
          onQuestionCreated={handleQuestionCreated}
        />
      )}

      {/* Questions Sidebar */}
      {bookId && (
        <QuestionsSidebar
          isOpen={showSidebar}
          onClose={() => {
            setShowSidebar(false);
            setHighlightedQuestionId(null);
          }}
          bookId={bookId}
          onGoToPage={goToPage}
          refreshTrigger={sidebarRefreshTrigger}
          onAddQuestion={handleAddQuestion}
          highlightedQuestionId={highlightedQuestionId}
          highlightedTextClicked={highlightedTextClicked}
          onQuestionDeleted={handleQuestionDeleted}
          isEPub={false}
        />
      )}
    </div>
  );
}
