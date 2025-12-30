"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/libs/api";

/**
 * useEPubHighlights - Custom hook for managing highlights in ePub
 * Fetches, creates, updates, and deletes highlights
 */
export function useEPubHighlights({ bookId, rendition, refreshTrigger = 0 }) {
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
              // Click handler for highlight - can be handled elsewhere
            },
            "epub-highlight",
            {
              fill: colorMap[highlight.color] || colorMap.yellow,
              "fill-opacity": "0.4",
              "mix-blend-mode": "multiply",
            }
          );
          appliedHighlights.push(highlight.cfiRange);
        } catch (err) {
          // Ignore errors for invalid CFI ranges
          console.warn("Failed to add highlight:", err);
        }
      });
    } catch (err) {
      console.error("Error applying highlights:", err);
    }

    // Cleanup function to remove highlights
    return () => {
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
              "epub-highlight",
              {
                fill: colorMap[color] || colorMap.yellow,
                "fill-opacity": "0.4",
                "mix-blend-mode": "multiply",
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
