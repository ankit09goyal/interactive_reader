"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * ePubViewer - Component that renders the ePub content
 * Manages the rendition container and styling
 */
export default function EPubViewer({
  book,
  isLoading,
  error,
  createRendition,
  fontSize,
}) {
  const containerRef = useRef(null);
  const renditionRef = useRef(null);
  const isInitializedRef = useRef(false);
  const currentBookRef = useRef(null);

  // Create rendition only once when book is loaded
  useEffect(() => {
    // Skip if no book or no container
    if (!book || !containerRef.current) return;

    // If same book is already initialized, skip
    if (isInitializedRef.current && currentBookRef.current === book) return;

    // Clean up previous rendition if book changed
    if (renditionRef.current) {
      try {
        renditionRef.current.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
      renditionRef.current = null;
      isInitializedRef.current = false;
    }

    currentBookRef.current = book;

    // Create new rendition
    const rendition = createRendition(containerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none",
      flow: "paginated",
    });

    if (rendition) {
      renditionRef.current = rendition;
      isInitializedRef.current = true;

      // Set up themes
      rendition.themes.default({
        body: {
          "font-family": "Georgia, serif !important",
          "line-height": "1.6 !important",
          padding: "20px !important",
        },
        "p, div, span": {
          "font-size": "inherit",
        },
        a: {
          color: "inherit !important",
          "text-decoration": "underline !important",
        },
      });

      // Apply initial font size
      rendition.themes.fontSize(`${fontSize}px`);

      // Register custom theme for highlights
      rendition.themes.register("highlight", {
        "::selection": {
          background: "rgba(255, 255, 0, 0.4)",
        },
      });

      // Handle keyboard navigation
      rendition.on("keyup", (e) => {
        if (e.key === "ArrowLeft" || e.key === "PageUp") {
          rendition.prev();
        }
        if (e.key === "ArrowRight" || e.key === "PageDown") {
          rendition.next();
        }
      });

      // NOTE: We intentionally disable click-to-turn-page so text selection
      // and context menus (highlight / notes / questions) work reliably.
      // Keyboard navigation (arrow keys/PageUp/PageDown) still works.
    }

    // Cleanup function
    return () => {
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch (e) {
          // Ignore errors during cleanup
        }
        renditionRef.current = null;
        isInitializedRef.current = false;
        currentBookRef.current = null;
      }
    };
  }, [book, createRendition]); // Only depend on book and createRendition, NOT fontSize

  // Update font size separately when it changes
  useEffect(() => {
    if (renditionRef.current && fontSize) {
      try {
        renditionRef.current.themes.fontSize(`${fontSize}px`);
      } catch (e) {
        // Ignore errors if rendition is not ready
      }
    }
  }, [fontSize]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base-200">
        <div className="text-center p-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-error mb-4"
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
          <h3 className="text-lg font-semibold mb-2">Failed to Load Book</h3>
          <p className="text-base-content/70">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base-200">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/70">Loading book...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="epub-container flex-1 overflow-hidden bg-base-100"
      style={{
        minHeight: 0,
      }}
    />
  );
}
