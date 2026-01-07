"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/libs/api";

/**
 * useEPubQuestionHighlights
 * Fetches user's questions (with epubCfi) and renders them as clickable
 * highlights inside the ePub rendition.
 */
export function useEPubQuestionHighlights({
  bookId,
  rendition,
  refreshTrigger = 0,
  onHighlightClick,
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
              fill: "rgba(255, 235, 59, 0.35)", // soft yellow
              "fill-opacity": "0.35",
              "mix-blend-mode": "multiply",
            }
          );
          applied.push(h.cfi);
        } catch (err) {
          console.warn("Failed to add question highlight:", err);
        }
      });
    } catch (err) {
      console.error("Error applying EPUB question highlights:", err);
    }

    return () => {
      if (!r?.annotations) return;
      applied.forEach((cfi) => {
        try {
          r.annotations.remove(cfi, "highlight");
        } catch (err) {
          // ignore cleanup errors
        }
      });
    };
  }, [highlights, onHighlightClick]);

  return { highlights, isLoading };
}
