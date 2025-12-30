"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useEPubTextSelection - Custom hook for handling text selection in ePub
 * Tracks selected text and CFI range for highlights and questions
 */
export function useEPubTextSelection({
  rendition,
  currentChapter,
  showNotesModal,
  showQuestionModal,
  showSidebar,
}) {
  const [selectedText, setSelectedText] = useState("");
  const [selectionCfi, setSelectionCfi] = useState(null);
  const [selectionCfiRange, setSelectionCfiRange] = useState(null);
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [selectionChapter, setSelectionChapter] = useState(null);

  const renditionRef = useRef(rendition);
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keep rendition ref updated
  useEffect(() => {
    renditionRef.current = rendition;
  }, [rendition]);

  // Handle text selection in rendition
  useEffect(() => {
    if (!rendition) return;

    const handleSelected = (cfiRange, contents) => {
      // Don't process if modals are open
      if (showNotesModal || showQuestionModal || showSidebar) return;
      if (!isMountedRef.current) return;

      try {
        const selection = contents.window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0) {
          // Get the range for positioning
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Get the iframe's position relative to the viewport
          const iframe = rendition.manager?.container?.querySelector("iframe");
          const iframeRect = iframe?.getBoundingClientRect() || {
            left: 0,
            top: 0,
          };

          setSelectedText(text);
          setSelectionCfiRange(cfiRange);
          setSelectionChapter(currentChapter);

          // Calculate position relative to viewport
          setSelectionPosition({
            x: iframeRect.left + rect.left + rect.width / 2,
            y: iframeRect.top + rect.bottom,
          });

          // Get the start CFI for the selection
          try {
            const cfi = cfiRange.split(",")[0] + ")";
            setSelectionCfi(cfi);
          } catch (e) {
            setSelectionCfi(cfiRange);
          }
        }
      } catch (err) {
        console.warn("Error handling selection:", err);
      }
    };

    rendition.on("selected", handleSelected);

    return () => {
      try {
        rendition.off("selected", handleSelected);
      } catch (err) {
        // Ignore errors during cleanup
      }
    };
  }, [
    rendition,
    currentChapter,
    showNotesModal,
    showQuestionModal,
    showSidebar,
  ]);

  // Clear selection when clicking elsewhere
  useEffect(() => {
    const handleClick = (e) => {
      // Don't clear if clicking on selection menu or modals
      if (
        e.target.closest(".text-selection-menu") ||
        e.target.closest("[role='dialog']")
      ) {
        return;
      }

      // Clear if clicking outside the selection
      if (selectedText && !e.target.closest(".epub-container")) {
        clearSelection();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectedText]);

  /**
   * Clear the current selection
   */
  const clearSelection = useCallback(() => {
    setSelectedText("");
    setSelectionCfi(null);
    setSelectionCfiRange(null);
    setSelectionPosition(null);
    setSelectionChapter(null);

    // Clear the window selection in the iframe
    if (renditionRef.current) {
      try {
        const iframe =
          renditionRef.current.manager?.container?.querySelector("iframe");
        if (iframe?.contentWindow) {
          iframe.contentWindow.getSelection()?.removeAllRanges();
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  return {
    selectedText,
    selectionCfi,
    selectionCfiRange,
    selectionPosition,
    selectionChapter,
    clearSelection,
  };
}
