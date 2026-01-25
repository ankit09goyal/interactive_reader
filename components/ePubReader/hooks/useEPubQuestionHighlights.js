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
          cfiRange: q.epubCfiRange, // Use cfiRange for consistency with other hooks
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
          type: "question",
          iconConfig: ICON_CONFIGS.question,
          getStyle: () => DEFAULT_HIGHLIGHT_STYLE,
          onClick: (id) => {
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
   * Remove a question highlight from the rendition (icon and annotation)
   * Called when a question is deleted elsewhere
   * Directly removes annotation and icon, then updates state
   */
  const removeQuestionHighlight = useCallback((questionId) => {
    const currentRendition = renditionRef.current;
    const currentHighlights = highlightsRef.current;
    
    // Find the highlight to get its CFI range
    const highlight = currentHighlights.find((h) => h.id === questionId);
    
    // Use utility to remove annotation and icon directly
    if (currentRendition && highlight) {
      removeHighlightFromRendition(
        currentRendition, 
        questionId, 
        highlight, 
        ICON_CONFIGS.question
      );
    }
    
    // Update local state to keep in sync
    setHighlights((prev) => prev.filter((h) => h.id !== questionId));
  }, []);

  return { highlights, isLoading, removeQuestionHighlight };
}
