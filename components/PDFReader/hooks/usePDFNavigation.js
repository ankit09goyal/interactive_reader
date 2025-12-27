"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";

/**
 * usePDFNavigation - Custom hook for PDF navigation, zoom, and keyboard controls
 */
export function usePDFNavigation({
  totalPages,
  viewMode,
  viewerRef,
  isFullscreen,
  showQuestionModal,
  showAdminCreateModal,
  showSidebar,
  toggleViewMode,
  clearSelection,
  setShowSidebar,
  initialPage = 1,
  initialScale = 1.0,
  preferencesLoaded = false,
  onPageChange,
  onScaleChange,
}) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(initialScale);
  const initializedRef = useRef(false);
  const prevPageRef = useRef(initialPage);
  const prevScaleRef = useRef(initialScale);

  // Initialize from preferences when they're loaded
  useEffect(() => {
    if (preferencesLoaded && !initializedRef.current) {
      setCurrentPage(initialPage);
      setScale(initialScale);
      prevPageRef.current = initialPage;
      prevScaleRef.current = initialScale;
      initializedRef.current = true;
    }
  }, [preferencesLoaded, initialPage, initialScale]);

  // Track page changes and notify parent (only when value actually changes from user action)
  useEffect(() => {
    if (
      initializedRef.current &&
      onPageChange &&
      currentPage !== prevPageRef.current
    ) {
      prevPageRef.current = currentPage;
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);

  // Track scale changes and notify parent (only when value actually changes from user action)
  useEffect(() => {
    if (
      initializedRef.current &&
      onScaleChange &&
      scale !== prevScaleRef.current
    ) {
      prevScaleRef.current = scale;
      onScaleChange(scale);
    }
  }, [scale, onScaleChange]);

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
  }, [currentPage, viewMode, viewerRef]);

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
  }, [currentPage, totalPages, viewMode, viewerRef]);

  const handlePageInput = useCallback(
    (e) => {
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
    },
    [totalPages, viewMode, viewerRef]
  );

  const goToPage = useCallback(
    (pageNumber) => {
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        setCurrentPage(pageNumber);
        if (viewMode === "continuous") {
          const pageElement = viewerRef.current?.querySelector(
            `[data-page="${pageNumber}"]`
          );
          pageElement?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [totalPages, viewMode, viewerRef]
  );

  // Zoom handlers
  const zoomIn = useCallback(
    () => setScale((prev) => Math.min(prev + 0.25, 3)),
    []
  );
  const zoomOut = useCallback(
    () => setScale((prev) => Math.max(prev - 0.25, 0.5)),
    []
  );
  const resetZoom = useCallback(() => setScale(1), []);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Fullscreen state is managed by parent
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle keys if modal is open
      if (showQuestionModal || showAdminCreateModal || showSidebar) {
        toast.error("To use keyboard navigation, please close the modal first");
        return;
      }
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
          if (toggleViewMode) toggleViewMode();
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
    zoomIn,
    zoomOut,
    resetZoom,
    toggleViewMode,
    clearSelection,
    showQuestionModal,
    showAdminCreateModal,
    showSidebar,
    setShowSidebar,
  ]);

  return {
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
  };
}
