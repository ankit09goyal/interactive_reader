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

  // Load user preferences for view mode
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await apiClient.get("/user/preferences");
        if (response?.preferences?.readerViewMode) {
          setViewModeState(response.preferences.readerViewMode);
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
  const toggleViewMode = useCallback(() => {
    const newMode = viewModeState === "one-page" ? "continuous" : "one-page";
    setViewModeState(newMode);
    saveViewModePreference(newMode);
  }, [viewModeState]);

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

  // Reset current page when PDF loads
  useEffect(() => {
    if (pdfDoc && totalPages > 0) {
      setCurrentPage(1);
      const initialSet = new Set([1]);
      renderedPagesRef.current = initialSet;
      setRenderedPages(initialSet);
    }
  }, [pdfDoc, totalPages, setCurrentPage, renderedPagesRef, setRenderedPages]);

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
        />
      )}
    </div>
  );
}
