"use client";

import { useEffect, useRef } from "react";

/**
 * usePDFContinuousMode - Custom hook for managing continuous mode rendering with intersection observer
 */
export function usePDFContinuousMode({
  viewMode,
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
}) {
  const observerRef = useRef(null);

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
  }, [viewMode, pdfDoc, isLoading, totalPages, renderedPages, setRenderedPages, renderedPagesRef, isTransitioningModeRef, viewerRef, setCurrentPage]);

  // Clear rendered flags when scale changes in continuous mode
  useEffect(() => {
    if (viewMode !== "continuous" || !pdfDoc) return;

    canvasRefs.current.forEach((canvas) => {
      if (canvas) {
        canvas.dataset.rendered = "";
        delete canvas.dataset.lastScale;
      }
    });
  }, [scale, viewMode, pdfDoc, canvasRefs]);

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
  }, [viewMode, renderedPages, pdfDoc, renderPageToCanvas, canvasRefs]);

  return { observerRef };
}

