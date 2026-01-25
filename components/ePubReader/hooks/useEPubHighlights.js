"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/libs/api";
import {
  ICON_CONFIGS,
  DEFAULT_HIGHLIGHT_STYLE,
  HIGHLIGHT_COLORS,
  setupHighlightRendering,
  insertIconAtCfiRange,
  removeHighlightFromRendition,
  filterHighlightsByValidRange,
} from "@/libs/epubHighlightUtils";

/**
 * useEPubHighlights - Custom hook for managing highlights in ePub
 * Fetches, creates, updates, and deletes highlights
 */
export function useEPubHighlights({
  bookId,
  rendition,
  refreshTrigger = 0,
  onHighlightClick,
  fontSize = 16,
}) {
  const [highlights, setHighlights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const renditionRef = useRef(rendition);
  const isMountedRef = useRef(true);
  // Track current highlights in a ref for use in callbacks without stale closures
  const highlightsRef = useRef(highlights);
  // Track callback in ref to avoid effect re-runs
  const onHighlightClickRef = useRef(onHighlightClick);

  // Keep rendition ref updated
  useEffect(() => {
    renditionRef.current = rendition;
  }, [rendition]);

  // Keep highlights ref updated
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  // Keep callback ref updated
  useEffect(() => {
    onHighlightClickRef.current = onHighlightClick;
  }, [onHighlightClick]);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  // Helper function to check if a highlight has notes
  const hasNotes = useCallback((highlight) => {
    return highlight.notes && highlight.notes.trim().length > 0;
  }, []);

  // Apply highlights to rendition when highlights or rendition change
  useEffect(() => {
    if (!renditionRef.current || highlights.length === 0) return;

    let isCancelled = false;
    let cleanup = null;

    const renderHighlights = async () => {
      const validHighlights = await filterHighlightsByValidRange(
        renditionRef.current,
        highlights,
        (h) => h.cfiRange
      );

      if (isCancelled || validHighlights.length === 0) return;

      const { cleanup: localCleanup } = setupHighlightRendering(
        renditionRef.current,
        validHighlights,
        {
          type: "highlight",
          iconConfig: ICON_CONFIGS.notes,
          getStyle: (h) => HIGHLIGHT_COLORS[h.color] || DEFAULT_HIGHLIGHT_STYLE,
          onClick: (id, highlight) => {
            if (onHighlightClickRef.current)
              onHighlightClickRef.current(id, highlight);
          },
          getCfiRange: (h) => h.cfiRange,
          getId: (h) => h._id,
          getTitle: (h) => h.notes || "This highlight has notes",
          showIcons: true,
          // Only show icons for highlights that have notes
          filterForIcons: hasNotes,
        }
      );

      cleanup = localCleanup;
    };

    renderHighlights();

    return () => {
      isCancelled = true;
      if (cleanup) cleanup();
    };
  }, [rendition, highlights, fontSize, hasNotes]);

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

        // Note: The annotation will be added by the useEffect that watches
        // the highlights array. We don't add it manually here to avoid
        // duplicate annotations (which would cause deletion bugs).

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

      // Handle notes icon updates using common utility
      if (renditionRef.current && "notes" in updates) {
        const hasNotesNow =
          updatedHighlight.notes && updatedHighlight.notes.trim().length > 0;

        if (hasNotesNow) {
          // Add notes icon if notes were added
          insertIconAtCfiRange(
            renditionRef.current,
            updatedHighlight.cfiRange,
            highlightId,
            ICON_CONFIGS.notes,
            updatedHighlight.notes || "This highlight has notes"
          );
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
   * Directly removes annotation and icon from the rendition, then updates state
   */
  const deleteHighlight = useCallback(
    async (highlightId) => {
      try {
        await apiClient.delete(`/user/highlights/${highlightId}`);

        const currentRendition = renditionRef.current;
        const currentHighlights = highlightsRef.current;
        
        // Find the highlight to get its CFI range
        const highlight = currentHighlights.find((h) => h._id === highlightId);
        
        // Use utility to remove annotation and icon directly
        if (currentRendition && highlight) {
          removeHighlightFromRendition(
            currentRendition, 
            highlightId, 
            highlight, 
            ICON_CONFIGS.notes
          );
        }

        // Update state to keep in sync
        if (isMountedRef.current) {
          setHighlights((prev) => prev.filter((h) => h._id !== highlightId));
        }

        return true;
      } catch (err) {
        console.error("Error deleting highlight:", err);
        throw err;
      }
    },
    []
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
