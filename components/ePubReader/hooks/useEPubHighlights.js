"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/libs/api";

/**
 * useEPubHighlights - Custom hook for managing highlights in ePub
 * Fetches, creates, updates, and deletes highlights
 */
export function useEPubHighlights({
  bookId,
  rendition,
  refreshTrigger = 0,
  onHighlightClick,
}) {
  const [highlights, setHighlights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const renditionRef = useRef(rendition);
  const isMountedRef = useRef(true);

  // Keep rendition ref updated
  useEffect(() => {
    renditionRef.current = rendition;
  }, [rendition]);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Highlight color mapping
  const colorMap = {
    yellow: "rgba(255, 255, 0, 0.4)",
    green: "rgba(0, 255, 0, 0.3)",
    blue: "rgba(0, 0, 255, 0.2)",
    pink: "rgba(255, 192, 203, 0.4)",
    orange: "rgba(255, 165, 0, 0.4)",
  };

  // Fetch highlights from API
  useEffect(() => {
    if (!bookId) {
      setHighlights([]);
      return;
    }

    const fetchHighlights = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(
          `/user/highlights?bookId=${bookId}`
        );
        if (isMountedRef.current) {
          setHighlights(response.highlights || []);
        }
      } catch (err) {
        console.error("Error fetching highlights:", err);
        if (isMountedRef.current) {
          setHighlights([]);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchHighlights();
  }, [bookId, refreshTrigger]);

  // Apply highlights to rendition when highlights or rendition change
  useEffect(() => {
    if (!rendition || highlights.length === 0) return;

    // Store a local reference for cleanup
    const currentRendition = rendition;
    const appliedHighlights = [];

    // Helper function to check if a highlight has notes
    const hasNotes = (highlight) => {
      return highlight.notes && highlight.notes.trim().length > 0;
    };

    // Helper function to create a notes icon SVG element
    const createNotesIcon = (doc, bbox, highlightId) => {
      const iconGroup = doc.createElementNS("http://www.w3.org/2000/svg", "g");
      iconGroup.setAttribute("class", "notes-icon");
      iconGroup.setAttribute("data-highlight-id", highlightId);
      iconGroup.setAttribute(
        "transform",
        `translate(${bbox.x + bbox.width + 2}, ${bbox.y})`
      );

      // Create circle background
      const circle = doc.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", "7");
      circle.setAttribute("cy", "7");
      circle.setAttribute("r", "7");
      circle.setAttribute("fill", "rgba(99, 102, 241, 0.9)"); // Indigo color
      circle.setAttribute("stroke", "#4338ca");
      circle.setAttribute("stroke-width", "0.5");

      // Create document/notes icon path (simple document with lines)
      const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute(
        "d",
        "M4 3h4.5L11 5.5V11a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm4 0v3h3M5 7h4M5 9h4"
      );
      path.setAttribute("stroke", "white");
      path.setAttribute("stroke-width", "0.8");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");

      iconGroup.appendChild(circle);
      iconGroup.appendChild(path);

      return iconGroup;
    };

    // Function to add notes icons to highlights that have notes
    const addNotesIcons = () => {
      try {
        const contents = currentRendition.getContents();
        if (!contents || contents.length === 0) return;

        contents.forEach((content) => {
          const doc = content.document;
          if (!doc) return;

          // Get highlights that have notes
          const highlightsWithNotes = highlights.filter(hasNotes);
          if (highlightsWithNotes.length === 0) return;

          highlightsWithNotes.forEach((highlight) => {
            // Check if icon already exists for this highlight
            const existingIcon = doc.querySelector(
              `.notes-icon[data-highlight-id="${highlight._id}"]`
            );
            if (existingIcon) return;

            // Use the cfiRange to get the exact range in the document
            if (!highlight.cfiRange) return;

            try {
              // Use epub.js to get the range from the CFI
              const range = currentRendition.getRange(highlight.cfiRange);
              if (!range) return; // Highlight may be on different page

              // Create the notes icon with SVG document icon
              const icon = doc.createElement("span");
              icon.className = "notes-icon";
              icon.setAttribute("data-highlight-id", highlight._id);
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
              `
              );
              // Add SVG document icon
              icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0075de" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
              icon.title = highlight.notes || "This highlight has notes";

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
        console.warn("Failed to add notes icons:", err);
      }
    };

    // Event handler for when pages are displayed
    const handleDisplayed = () => {
      setTimeout(addNotesIcons, 150);
    };

    // Apply highlights
    try {
      highlights.forEach((highlight) => {
        if (!highlight.cfiRange) return;

        try {
          currentRendition.annotations.add(
            "highlight",
            highlight.cfiRange,
            {},
            () => {
              if (onHighlightClick) onHighlightClick(highlight._id, highlight);
            },
            `highlight-${highlight._id}`,
            {
              fill: colorMap[highlight.color] || colorMap.yellow,
              "fill-opacity": "0.4",
              "mix-blend-mode": "multiply",
              "data-highlight-id": highlight._id,
              "data-has-notes": hasNotes(highlight),
            }
          );
          appliedHighlights.push(highlight.cfiRange);
        } catch (err) {
          // Ignore errors for invalid CFI ranges
          console.warn("Failed to add highlight:", err);
        }
      });

      // Add event listeners for page display
      currentRendition.on("rendered", handleDisplayed);
      currentRendition.on("displayed", handleDisplayed);

      // Add notes icons after highlights are applied
      setTimeout(addNotesIcons, 200);
    } catch (err) {
      console.error("Error applying highlights:", err);
    }

    // Cleanup function to remove highlights and icons
    return () => {
      // Remove event listeners
      try {
        currentRendition.off("rendered", handleDisplayed);
        currentRendition.off("displayed", handleDisplayed);
      } catch (err) {
        // Ignore cleanup errors
      }

      // Remove notes icons
      try {
        const contents = currentRendition.getContents();
        if (contents && contents.length > 0) {
          contents.forEach((content) => {
            const doc = content.document;
            if (doc) {
              const icons = doc.querySelectorAll(".notes-icon");
              icons.forEach((icon) => icon.remove());
            }
          });
        }
      } catch (err) {
        // Ignore cleanup errors
      }

      // Check if rendition still exists and has annotations
      if (!currentRendition?.annotations) return;

      appliedHighlights.forEach((cfiRange) => {
        try {
          currentRendition.annotations.remove(cfiRange, "highlight");
        } catch (err) {
          // Ignore errors during cleanup
        }
      });
    };
  }, [rendition, highlights]);

  /**
   * Create a new highlight
   */
  const createHighlight = useCallback(
    async ({
      selectedText,
      cfi,
      cfiRange,
      chapterTitle,
      chapterHref,
      notes,
      color,
    }) => {
      if (!bookId) return null;

      try {
        const response = await apiClient.post("/user/highlights", {
          bookId,
          selectedText,
          cfi,
          cfiRange,
          chapterTitle,
          chapterHref,
          notes,
          color: color || "yellow",
        });

        const newHighlight = response.highlight;

        if (isMountedRef.current) {
          setHighlights((prev) => [newHighlight, ...prev]);
        }

        // Add annotation to rendition
        if (renditionRef.current && cfiRange) {
          try {
            renditionRef.current.annotations.add(
              "highlight",
              cfiRange,
              {},
              () => {},
              `highlight-${newHighlight._id}`,
              {
                fill: colorMap[color] || colorMap.yellow,
                "fill-opacity": "0.4",
                "mix-blend-mode": "multiply",
                "data-highlight-id": newHighlight._id,
                "data-has-notes":
                  newHighlight.notes &&
                  typeof newHighlight.notes === "string" &&
                  newHighlight.notes.trim().length > 0,
              }
            );
          } catch (err) {
            console.warn("Failed to add annotation:", err);
          }
        }

        return newHighlight;
      } catch (err) {
        console.error("Error creating highlight:", err);
        throw err;
      }
    },
    [bookId]
  );

  /**
   * Update a highlight (notes or color)
   */
  const updateHighlight = useCallback(async (highlightId, updates) => {
    try {
      const response = await apiClient.put(
        `/user/highlights/${highlightId}`,
        updates
      );

      const updatedHighlight = response.highlight;

      if (isMountedRef.current) {
        setHighlights((prev) =>
          prev.map((h) => (h._id === highlightId ? updatedHighlight : h))
        );
      }

      // Handle notes icon updates
      if (renditionRef.current && "notes" in updates) {
        try {
          const contents = renditionRef.current.getContents();
          if (contents && contents.length > 0) {
            contents.forEach((content) => {
              const doc = content.document;
              if (!doc) return;

              const existingIcon = doc.querySelector(
                `.notes-icon[data-highlight-id="${highlightId}"]`
              );
              const hasNotes =
                updatedHighlight.notes &&
                updatedHighlight.notes.trim().length > 0;

              if (hasNotes && !existingIcon) {
                // Add notes icon if notes were added
                const selectors = [
                  `[data-highlight-id="${highlightId}"]`,
                  `[data-epubjs-annotation-id="highlight-${highlightId}"]`,
                  `[data-annotation-id="highlight-${highlightId}"]`,
                  `[data-annotation="highlight-${highlightId}"]`,
                  `[id="highlight-${highlightId}"]`,
                  `[data-epubjs-annotation="highlight"][data-epubjs-annotation-id]`,
                  `[data-annotation-type="highlight"][data-annotation-id]`,
                ];

                const highlightEl =
                  selectors
                    .map((sel) => doc.querySelector(sel))
                    .find(Boolean) || null;
                if (highlightEl) {
                  const svg = highlightEl.closest("svg");
                  if (svg) {
                    try {
                      const bbox = highlightEl.getBBox();
                      if (bbox && bbox.width > 0) {
                        // Create notes icon
                        const iconGroup = doc.createElementNS(
                          "http://www.w3.org/2000/svg",
                          "g"
                        );
                        iconGroup.setAttribute("class", "notes-icon");
                        iconGroup.setAttribute(
                          "data-highlight-id",
                          highlightId
                        );
                        iconGroup.setAttribute(
                          "transform",
                          `translate(${bbox.x + bbox.width + 2}, ${bbox.y})`
                        );

                        const circle = doc.createElementNS(
                          "http://www.w3.org/2000/svg",
                          "circle"
                        );
                        circle.setAttribute("cx", "7");
                        circle.setAttribute("cy", "7");
                        circle.setAttribute("r", "7");
                        circle.setAttribute("fill", "rgba(99, 102, 241, 0.9)");
                        circle.setAttribute("stroke", "#4338ca");
                        circle.setAttribute("stroke-width", "0.5");

                        const path = doc.createElementNS(
                          "http://www.w3.org/2000/svg",
                          "path"
                        );
                        path.setAttribute(
                          "d",
                          "M4 3h4.5L11 5.5V11a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm4 0v3h3M5 7h4M5 9h4"
                        );
                        path.setAttribute("stroke", "white");
                        path.setAttribute("stroke-width", "0.8");
                        path.setAttribute("fill", "none");
                        path.setAttribute("stroke-linecap", "round");
                        path.setAttribute("stroke-linejoin", "round");

                        iconGroup.appendChild(circle);
                        iconGroup.appendChild(path);
                        svg.appendChild(iconGroup);
                        // Mark annotation element so future queries are faster
                        highlightEl.setAttribute(
                          "data-highlight-id",
                          highlightId
                        );
                        highlightEl.setAttribute("data-has-notes", "true");
                      }
                    } catch (err) {
                      // Ignore icon errors
                    }
                  }
                }
              } else if (!hasNotes && existingIcon) {
                // Remove notes icon if notes were deleted
                existingIcon.remove();
                // Also clear markers on the annotation element(s)
                doc
                  .querySelectorAll(
                    `[data-epubjs-annotation-id="highlight-${highlightId}"], [data-highlight-id="${highlightId}"]`
                  )
                  .forEach((el) => {
                    el.removeAttribute("data-has-notes");
                  });
              }
            });
          }
        } catch (err) {
          // Ignore icon update errors
        }
      }

      return updatedHighlight;
    } catch (err) {
      console.error("Error updating highlight:", err);
      throw err;
    }
  }, []);

  /**
   * Delete a highlight
   */
  const deleteHighlight = useCallback(
    async (highlightId) => {
      const highlight = highlights.find((h) => h._id === highlightId);

      try {
        await apiClient.delete(`/user/highlights/${highlightId}`);

        // Remove from state
        if (isMountedRef.current) {
          setHighlights((prev) => prev.filter((h) => h._id !== highlightId));
        }

        // Remove notes icon for this highlight
        if (renditionRef.current) {
          try {
            const contents = renditionRef.current.getContents();
            if (contents && contents.length > 0) {
              contents.forEach((content) => {
                const doc = content.document;
                if (doc) {
                  const icon = doc.querySelector(
                    `.notes-icon[data-highlight-id="${highlightId}"]`
                  );
                  if (icon) icon.remove();
                }
              });
            }
          } catch (err) {
            // Ignore cleanup errors
          }
        }

        // Remove annotation from rendition
        if (renditionRef.current && highlight?.cfiRange) {
          try {
            renditionRef.current.annotations.remove(
              highlight.cfiRange,
              "highlight"
            );
          } catch (err) {
            // Ignore errors
          }
        }

        return true;
      } catch (err) {
        console.error("Error deleting highlight:", err);
        throw err;
      }
    },
    [highlights]
  );

  /**
   * Get a highlight by ID
   */
  const getHighlight = useCallback(
    (highlightId) => {
      return highlights.find((h) => h._id === highlightId);
    },
    [highlights]
  );

  return {
    highlights,
    isLoading,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    getHighlight,
  };
}
