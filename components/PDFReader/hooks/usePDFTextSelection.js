"use client";

import { useEffect, useState } from "react";

/**
 * usePDFTextSelection - Custom hook for handling text selection in PDF
 */
export function usePDFTextSelection({
  currentPage,
  showQuestionModal,
  showAdminCreateModal,
  showSidebar,
}) {
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [selectionPageNumber, setSelectionPageNumber] = useState(null);

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = (e) => {
      // Ignore if clicking on toolbar or modals
      if (
        e.target.closest(".toolbar") ||
        e.target.closest("[role='dialog']") ||
        showQuestionModal ||
        showAdminCreateModal ||
        showSidebar
      ) {
        return;
      }

      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        // Get page number from selection
        const anchorNode = selection?.anchorNode?.parentElement;
        const pageNum = anchorNode?.dataset?.pageNum
          ? parseInt(anchorNode.dataset.pageNum)
          : currentPage;

        // Get position for menu
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectedText(text);
        setSelectionPageNumber(pageNum);
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom,
        });
      } else {
        // Clear selection if clicking elsewhere
        if (!e.target.closest(".text-selection-menu")) {
          clearSelection();
        }
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [currentPage, showQuestionModal, showAdminCreateModal, showSidebar]);

  // Clear text selection
  const clearSelection = () => {
    setSelectedText("");
    setSelectionPosition(null);
    setSelectionPageNumber(null);
    window.getSelection()?.removeAllRanges();
  };

  return {
    selectedText,
    selectionPosition,
    selectionPageNumber,
    clearSelection,
  };
}

