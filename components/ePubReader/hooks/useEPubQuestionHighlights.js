"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/libs/api";

/**
 * useEPubQuestionHighlights
 * Fetches user's questions (with epubCfi) and renders them as clickable
 * highlights inside the ePub rendition, with a question mark icon.
 */
export function useEPubQuestionHighlights({
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

  // Fetch user's questions for highlighting
  useEffect(() => {
    if (!bookId || !currentUserId) {
      setHighlights([]);
      return;
    }

    const fetchHighlights = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(
          `/user/questions?bookId=${bookId}`
        );

        // Only include user's own questions that have selected text and epubCfiRange
        const userQuestions = (response.myQuestions || []).filter(
          (q) =>
            q.selectedText &&
            q.epubCfiRange &&
            q.userId?.toString() === currentUserId
        );

        const mapped = userQuestions.map((q) => ({
          id: q._id || q.id,
          text: q.selectedText,
          cfi: q.epubCfiRange, // Use CFI range for highlighting
          questionId: q._id || q.id,
        }));

        setHighlights(mapped);
      } catch (err) {
        console.error("Error fetching EPUB question highlights:", err);
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

    // Function to add question mark icons to highlights
    const addQuestionIcons = () => {
      try {
        const contents = r.getContents();
        if (!contents || contents.length === 0) return;

        contents.forEach((content) => {
          const doc = content.document;
          if (!doc) return;

          highlights.forEach((highlight) => {
            // Check if icon already exists for this question
            const existingIcon = doc.querySelector(
              `.question-icon[data-question-id="${highlight.id}"]`
            );
            if (existingIcon) return;

            // Use the CFI to get the exact range in the document
            if (!highlight.cfi) return;

            try {
              // Use epub.js to get the range from the CFI
              const range = r.getRange(highlight.cfi);
              if (!range) return; // Highlight may be on different page

              // Create the question icon span with inline SVG
              const icon = doc.createElement("span");
              icon.className = "question-icon";
              icon.setAttribute("data-question-id", highlight.id);
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
                position: relative !important;
                z-index: 9999 !important;
                visibility: visible !important;
                opacity: 1 !important;
                background-color: #0075de !important;
                border-radius: 50% !important;
              `
              );
              // Add question mark SVG icon (circle with ?)
              icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#0075de" stroke="#0075de"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white"></path><line x1="12" y1="17" x2="12.01" y2="17" stroke="white"></line></svg>`;
              icon.title = "You asked a question about this text";

              // Make the icon clickable
              /*icon.addEventListener("click", (e) => {
                e.stopPropagation();
                if (onHighlightClick) onHighlightClick(highlight.questionId);
              });*/

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
        console.warn("Failed to add question icons:", err);
      }
    };

    // Event handler for when pages are displayed
    const handleDisplayed = () => {
      setTimeout(addQuestionIcons, 150);
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
              if (onHighlightClick) onHighlightClick(h.questionId);
            },
            `question-${h.id}`,
            {
              fill: "rgba(255, 255, 0, 0.4)", // soft yellow
              "fill-opacity": "0.35",
              "mix-blend-mode": "multiply",
            }
          );
          applied.push(h.cfi);
        } catch (err) {
          console.warn("Failed to add question highlight:", err);
        }
      });

      // Add event listeners for page display
      r.on("rendered", handleDisplayed);
      r.on("displayed", handleDisplayed);

      // Add question icons after highlights are applied
      setTimeout(addQuestionIcons, 200);
    } catch (err) {
      console.error("Error applying EPUB question highlights:", err);
    }

    return () => {
      // Remove event listeners
      try {
        r.off("rendered", handleDisplayed);
        r.off("displayed", handleDisplayed);
      } catch (err) {
        // Ignore cleanup errors
      }

      // Remove question icons
      try {
        const contents = r.getContents();
        if (contents && contents.length > 0) {
          contents.forEach((content) => {
            const doc = content.document;
            if (doc) {
              const icons = doc.querySelectorAll(".question-icon");
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
