"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/libs/api";
import {
  ICON_CONFIGS,
  DEFAULT_HIGHLIGHT_STYLE,
  setupHighlightRendering,
  removeHighlightFromRendition,
  filterHighlightsByValidRange,
} from "@/libs/epubHighlightUtils";

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
  // Track current highlights in a ref for use in callbacks without stale closures
  const highlightsRef = useRef(highlights);
  // Track callback in ref to avoid effect re-runs
  const onHighlightClickRef = useRef(onHighlightClick);

  useEffect(() => {
    renditionRef.current = rendition;
  }, [rendition]);

  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  useEffect(() => {
    onHighlightClickRef.current = onHighlightClick;
  }, [onHighlightClick]);

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
          cfiRange: s.epubCfiRange, // Use cfiRange for consistency with other hooks
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

  // Render highlights into rendition using common utility
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
          type: "suggestion",
          iconConfig: ICON_CONFIGS.suggestion,
          getStyle: () => DEFAULT_HIGHLIGHT_STYLE,
          onClick: (id) => {
            // Clickable highlight - opens sidebar and scrolls to suggestion
            if (onHighlightClickRef.current) onHighlightClickRef.current(id);
          },
          getCfiRange: (h) => h.cfiRange,
          getId: (h) => h.id,
          showIcons: true,
        }
      );

      cleanup = localCleanup;
    };

    renderHighlights();

    return () => {
      isCancelled = true;
      if (cleanup) cleanup();
    };
  }, [highlights, fontSize]);

  /**
   * Remove a suggestion highlight from the rendition (icon and annotation)
   * Called when a suggestion is deleted elsewhere
   * Directly removes annotation and icon, then updates state
   */
  const removeSuggestionHighlight = useCallback((suggestionId) => {
    const currentRendition = renditionRef.current;
    const currentHighlights = highlightsRef.current;
    
    // Find the highlight to get its CFI range
    const highlight = currentHighlights.find((h) => h.id === suggestionId);
    
    // Use utility to remove annotation and icon directly
    if (currentRendition && highlight) {
      removeHighlightFromRendition(
        currentRendition, 
        suggestionId, 
        highlight, 
        ICON_CONFIGS.suggestion
      );
    }
    
    // Update local state to keep in sync
    setHighlights((prev) => prev.filter((h) => h.id !== suggestionId));
  }, []);

  return { highlights, isLoading, removeSuggestionHighlight };
}
