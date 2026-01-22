"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/libs/api";

/**
 * useEPubSuggestionHighlights
 * Fetches user's suggestions (with epubCfiRange) and renders them as clickable
 * highlights inside the ePub rendition, with a lightbulb icon (view-only).
 */
export function useEPubSuggestionHighlights({
  bookId,
  rendition,
  refreshTrigger = 0,
  onHighlightClick,
  fontSize = 16,
}) {
  const [highlights, setHighlights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const renditionRef = useRef(rendition);

  useEffect(() => {
    renditionRef.current = rendition;
  }, [rendition]);

  // Fetch user's suggestions for highlighting
  useEffect(() => {
    if (!bookId || !currentUserId) {
      setHighlights([]);
      return;
    }

    const fetchHighlights = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(
          `/user/suggestions?bookId=${bookId}`
        );

        // Only include suggestions that have selected text and epubCfiRange
        const suggestions = (response.suggestions || []).filter(
          (s) =>
            s.selectedText &&
            s.epubCfiRange &&
            s.userId?.toString() === currentUserId
        );

        const mapped = suggestions.map((s) => ({
          id: s._id || s.id,
          text: s.selectedText,
          cfi: s.epubCfiRange, // Use CFI range for highlighting
          suggestionId: s._id || s.id,
        }));

        setHighlights(mapped);
      } catch (err) {
        console.error("Error fetching EPUB suggestion highlights:", err);
        setHighlights([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHighlights();
  }, [bookId, currentUserId, refreshTrigger]);

  // Render highlights into rendition
  useEffect(() => {
    if (!renditionRef.current || highlights.length === 0) return;

    const r = renditionRef.current;
    const applied = [];

    // Function to add lightbulb icons to highlights (view-only)
    const addSuggestionIcons = () => {
      try {
        const contents = r.getContents();
        if (!contents || contents.length === 0) return;

        contents.forEach((content) => {
          const doc = content.document;
          if (!doc) return;

          highlights.forEach((highlight) => {
            // Check if icon already exists for this suggestion
            const existingIcon = doc.querySelector(
              `.suggestion-icon[data-suggestion-id="${highlight.id}"]`
            );
            if (existingIcon) return;

            // Use the CFI to get the exact range in the document
            if (!highlight.cfi) return;

            try {
              // Use epub.js to get the range from the CFI
              const range = r.getRange(highlight.cfi);
              if (!range) return; // Highlight may be on different page

              // Create the suggestion icon span with inline SVG (view-only, not clickable)
              const icon = doc.createElement("span");
              icon.className = "suggestion-icon";
              icon.setAttribute("data-suggestion-id", highlight.id);
              icon.setAttribute(
                "style",
                `
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 16px !important;
                height: 16px !important;
                min-width: 16px !important;
                min-height: 16px !important;
                margin-left: 2px !important;
                vertical-align: top !important;
                cursor: default !important;
                position: relative !important;
                z-index: 9999 !important;
                visibility: visible !important;
                opacity: 1 !important;
                background-color: #0075de !important;
                border-radius: 50% !important;
              `
              );
              // Add lightbulb SVG icon (view-only indicator)
              icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>`;
              icon.title = "You made a suggestion about this text";

              // Icon is view-only (no click handler)

              // Insert icon at the end of the range
              const insertRange = range.cloneRange();
              insertRange.collapse(false); // collapse to end
              insertRange.insertNode(icon);
            } catch (err) {
              // Ignore errors for highlights not on current page
            }
          });
        });
      } catch (err) {
        console.warn("Failed to add suggestion icons:", err);
      }
    };

    // Event handler for when pages are displayed
    const handleDisplayed = () => {
      setTimeout(addSuggestionIcons, 150);
    };

    try {
      highlights.forEach((h) => {
        if (!h.cfi) return;
        try {
          r.annotations.add(
            "highlight",
            h.cfi,
            {},
            () => {
              // Clickable highlight - opens sidebar and scrolls to suggestion
              if (onHighlightClick) onHighlightClick(h.suggestionId);
            },
            `suggestion-${h.id}`,
            {
              fill: "rgba(255, 255, 0, 0.4)", // soft yellow (same as questions)
              "fill-opacity": "0.35",
              "mix-blend-mode": "multiply",
            }
          );
          applied.push(h.cfi);
        } catch (err) {
          console.warn("Failed to add suggestion highlight:", err);
        }
      });

      // Add event listeners for page display
      r.on("rendered", handleDisplayed);
      r.on("displayed", handleDisplayed);

      // Add suggestion icons after highlights are applied
      setTimeout(addSuggestionIcons, 200);
    } catch (err) {
      console.error("Error applying EPUB suggestion highlights:", err);
    }

    return () => {
      // Remove event listeners
      try {
        r.off("rendered", handleDisplayed);
        r.off("displayed", handleDisplayed);
      } catch (err) {
        // Ignore cleanup errors
      }

      // Remove suggestion icons
      try {
        const contents = r.getContents();
        if (contents && contents.length > 0) {
          contents.forEach((content) => {
            const doc = content.document;
            if (doc) {
              const icons = doc.querySelectorAll(".suggestion-icon");
              icons.forEach((icon) => icon.remove());
            }
          });
        }
      } catch (err) {
        // Ignore cleanup errors
      }

      // Remove annotations
      if (!r?.annotations) return;
      applied.forEach((cfi) => {
        try {
          r.annotations.remove(cfi, "highlight");
        } catch (err) {
          // ignore cleanup errors
        }
      });
    };
  }, [highlights, onHighlightClick, fontSize]);

  return { highlights, isLoading };
}
