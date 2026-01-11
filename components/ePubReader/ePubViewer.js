"use client";

import { useEffect, useRef } from "react";

// Unique ID for the font size style element
const FONT_SIZE_STYLE_ID = "epub-custom-font-size";

/**
 * Helper function to inject font size CSS into the ePub document
 * Uses !important to override any inline or internal CSS
 */
function injectFontSizeCSS(document, fontSize) {
  // Remove existing font size style if present
  const existingStyle = document.getElementById(FONT_SIZE_STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with font size rules
  const style = document.createElement("style");
  style.id = FONT_SIZE_STYLE_ID;
  style.textContent = `
    /* Base font size for body text elements - excludes headings */
    body, p, div, span, a, li, td, th, dd, dt, figcaption, blockquote, cite, q, em, strong, b, i, u, s,
    .calibre, .calibre1, .calibre2, .calibre3, .calibre4, .calibre5,
    [class*="calibre"], [class*="text"], [class*="para"], [class*="body"] {
      font-size: ${fontSize}px !important;
    }
    /* Heading hierarchy with scaled sizes - use high specificity */
    h1 > span, h1[class], [class] h1, div h1, section h1, article h1 { font-size: ${
      fontSize * 2
    }px !important; }
    h2 > span, h2[class], [class] h2, div h2, section h2, article h2 { font-size: ${
      fontSize * 1.4
    }px !important; }
    h3 > span, h3[class], [class] h3, div h3, section h3, article h3 { font-size: ${
      fontSize * 1.3
    }px !important; }
    h4 > span, h4[class], [class] h4, div h4, section h4, article h4 { font-size: ${
      fontSize * 1.2
    }px !important; }
    h5 > span, h5[class], [class] h5, div h5, section h5, article h5 { font-size: ${
      fontSize * 1.1
    }px !important; }
    h6 > span, h6[class], [class] h6, div h6, section h6, article h6 { font-size: ${fontSize}px !important; }
    
    /* Table styles to prevent hiding */
    table {
      width: 100% !important;
      max-width: 100% !important;
      table-layout: auto !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    .table-scroll-wrapper {
      width: 100% !important;
      max-width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      overflow-x: auto !important;
    }
  `;
  document.head.appendChild(style);
}

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
  const fontSizeRef = useRef(fontSize);

  // Keep fontSizeRef in sync
  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

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
        a: {
          color: "inherit !important",
          "text-decoration": "underline !important",
        },
      });

      // Inject CSS for tables and font size on content load
      rendition.hooks.content.register((contents) => {
        const document = contents.document;

        // Inject font size CSS
        injectFontSizeCSS(document, fontSizeRef.current);

        // Wrap tables in scrollable containers
        const tables = document.querySelectorAll("table");

        tables.forEach((table) => {
          // Skip if already wrapped
          if (
            table.parentElement?.classList?.contains("table-scroll-wrapper")
          ) {
            return;
          }

          // Create wrapper div
          const wrapper = document.createElement("div");
          wrapper.className = "table-scroll-wrapper";
          wrapper.style.cssText = `
            display: block;
            width: 100%;
            max-width: 100%;
            max-height: 70vh;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
            margin: 1em 0;
            margin-left: 0;
            margin-right: 0;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            box-sizing: border-box;
          `;

          // Insert wrapper before table, then move table into wrapper
          table.parentNode.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        });
      });

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
        // Get all loaded contents (iframes) and update font size in each
        const contents = renditionRef.current.getContents();
        contents.forEach((content) => {
          if (content.document) {
            injectFontSizeCSS(content.document, fontSize);
          }
        });
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
