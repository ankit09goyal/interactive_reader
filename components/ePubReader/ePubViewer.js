"use client";

import { useEffect, useRef } from "react";

// Unique ID for the view settings style element
const VIEW_SETTINGS_STYLE_ID = "epub-view-settings";

// Mapping for spacing to line-height values
const SPACING_MAP = {
  narrow: 1.4,
  normal: 1.6,
  wide: 1.8,
};

// Mapping for margins to padding values (in pixels)
const MARGINS_MAP = {
  narrow: 10,
  normal: 20,
  wide: 40,
};

/**
 * Helper function to inject view settings CSS into the ePub document
 * Uses !important to override any inline or internal CSS
 * This is more comprehensive than epubjs themes API
 */
function injectViewSettingsCSS(document, settings) {
  const {
    fontSize = 16,
    fontFamily = "Georgia",
    spacing = "normal",
    alignment = "justify",
    margins = "normal",
  } = settings;

  // Remove existing style if present
  try {
    const existingStyle = document.getElementById?.(VIEW_SETTINGS_STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }
  } catch (e) {
    // Ignore errors if getElementById is not available
  }

  const lineHeight = SPACING_MAP[spacing] || 1.6;
  const padding = MARGINS_MAP[margins] || 20;
  const textAlign = alignment === "left" ? "left" : "justify";

  // Create new style element with view settings
  const style = document.createElement("style");
  style.id = VIEW_SETTINGS_STYLE_ID;
  style.textContent = `
    /* Base styles for body */
    body {
      font-family: "${fontFamily}", serif !important;
      line-height: ${lineHeight} !important;
      text-align: ${textAlign} !important;
      padding: ${padding}px !important;
    }

    /* Base font size for body text elements - excludes headings */
    body, p, div, span, a, li, td, th, dd, dt, figcaption, blockquote, cite, q, em, strong, b, i, u, s,
    .calibre, .calibre1, .calibre2, .calibre3, .calibre4, .calibre5,
    [class*="calibre"], [class*="text"], [class*="para"], [class*="body"] {
      font-size: ${fontSize}px !important;
      font-family: "${fontFamily}", serif !important;
      line-height: ${lineHeight} !important;
    }

    /* Apply text alignment to paragraphs and text containers */
    p, div, li, blockquote, figcaption {
      text-align: ${textAlign} !important;
    }

    /* Heading hierarchy with scaled sizes - use high specificity */
    h1, h1 > span, h1[class], [class] h1, div h1, section h1, article h1 { 
      font-size: ${fontSize * 2}px !important;
      font-family: "${fontFamily}", serif !important;
      line-height: ${lineHeight} !important;
    }
    h2, h2 > span, h2[class], [class] h2, div h2, section h2, article h2 { 
      font-size: ${fontSize * 1.4}px !important;
      font-family: "${fontFamily}", serif !important;
      line-height: ${lineHeight} !important;
    }
    h3, h3 > span, h3[class], [class] h3, div h3, section h3, article h3 { 
      font-size: ${fontSize * 1.3}px !important;
      font-family: "${fontFamily}", serif !important;
      line-height: ${lineHeight} !important;
    }
    h4, h4 > span, h4[class], [class] h4, div h4, section h4, article h4 { 
      font-size: ${fontSize * 1.2}px !important;
      font-family: "${fontFamily}", serif !important;
      line-height: ${lineHeight} !important;
    }
    h5, h5 > span, h5[class], [class] h5, div h5, section h5, article h5 { 
      font-size: ${fontSize * 1.1}px !important;
      font-family: "${fontFamily}", serif !important;
      line-height: ${lineHeight} !important;
    }
    h6, h6 > span, h6[class], [class] h6, div h6, section h6, article h6 { 
      font-size: ${fontSize}px !important;
      font-family: "${fontFamily}", serif !important;
      line-height: ${lineHeight} !important;
    }
    
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
 * Safely call rendition.resize() only if manager is initialized
 * The manager is only available after rendition.display() is called
 */
function safeResize(rendition) {
  try {
    // Only resize if manager is initialized (after display() is called)
    if (rendition && rendition.manager) {
      rendition.resize();
    }
  } catch (e) {
    // Ignore errors if rendition is not ready
  }
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
  fontFamily = "Georgia",
  spacing = "normal",
  alignment = "justify",
  margins = "normal",
  spread = "always",
}) {
  const containerRef = useRef(null);
  const renditionRef = useRef(null);
  const isInitializedRef = useRef(false);
  const currentBookRef = useRef(null);
  const isDisplayedRef = useRef(false);
  const viewSettingsRef = useRef({
    fontSize,
    fontFamily,
    spacing,
    alignment,
    margins,
    spread,
  });

  // Keep viewSettingsRef in sync
  useEffect(() => {
    viewSettingsRef.current = {
      fontSize,
      fontFamily,
      spacing,
      alignment,
      margins,
      spread,
    };
  }, [fontSize, fontFamily, spacing, alignment, margins, spread]);

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
      isDisplayedRef.current = false;
    }

    currentBookRef.current = book;

    // Create new rendition with initial spread setting
    const rendition = createRendition(containerRef.current, {
      width: "100%",
      height: "100%",
      spread: viewSettingsRef.current.spread || "always",
      flow: "paginated",
    });

    if (rendition) {
      renditionRef.current = rendition;
      isInitializedRef.current = true;

      // Set up themes with defaults
      rendition.themes.default({
        body: {
          "font-family": `"${viewSettingsRef.current.fontFamily}", serif !important`,
          "line-height": "1.6 !important",
          padding: "20px !important",
        },
        a: {
          color: "inherit !important",
          "text-decoration": "underline !important",
        },
      });

      // Use epubjs themes.fontSize() for font size
      rendition.themes.fontSize(`${viewSettingsRef.current.fontSize}px`);

      // Apply spread setting
      rendition.spread(viewSettingsRef.current.spread || "always");

      // Inject CSS for comprehensive view settings on content load
      rendition.hooks.content.register((contents) => {
        const document = contents.document;

        // Inject view settings CSS for comprehensive styling
        injectViewSettingsCSS(document, viewSettingsRef.current);

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

      // Mark as displayed once the book is rendered
      rendition.on("displayed", () => {
        isDisplayedRef.current = true;
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
        isDisplayedRef.current = false;
        currentBookRef.current = null;
      }
    };
  }, [book, createRendition]); // Only depend on book and createRendition, NOT fontSize

  // Update view settings when they change
  useEffect(() => {
    if (renditionRef.current) {
      try {
        // Save current location before applying settings changes
        const currentCfi = renditionRef.current.location?.start?.cfi;

        // Use epubjs themes.fontSize() for font size
        renditionRef.current.themes.fontSize(`${fontSize}px`);

        // Apply spread setting (single or two columns)
        renditionRef.current.spread(spread);

        // Get all loaded contents (iframes) and update view settings CSS in each
        const contents = renditionRef.current.getContents();
        const settings = {
          fontSize,
          fontFamily,
          spacing,
          alignment,
          margins,
        };
        contents.forEach((content) => {
          if (content.document) {
            injectViewSettingsCSS(content.document, settings);
          }
        });

        // Safely call resize only if manager is ready
        safeResize(renditionRef.current);

        // Restore position after settings change and resize
        // Use a small delay to allow the reflow to complete
        if (currentCfi && isDisplayedRef.current) {
          setTimeout(() => {
            try {
              if (renditionRef.current) {
                renditionRef.current.display(currentCfi);
              }
            } catch (e) {
              // Ignore errors during position restoration
            }
          }, 50);
        }
      } catch (e) {
        // Ignore errors if rendition is not ready
      }
    }
  }, [fontSize, fontFamily, spacing, alignment, margins, spread]);

  // Handle window resize - call rendition.resize() when window size changes
  useEffect(() => {
    const handleResize = () => {
      if (renditionRef.current) {
        safeResize(renditionRef.current);
      }
    };

    // Debounce resize to avoid excessive calls
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener("resize", debouncedResize);

    return () => {
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

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
