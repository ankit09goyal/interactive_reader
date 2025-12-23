"use client";

import { useEffect, useRef, useState } from "react";
import apiClient from "@/libs/api";

/**
 * usePDFViewMode - Custom hook for managing PDF view mode (one-page vs continuous)
 */
export function usePDFViewMode({ getCurrentPage, viewerRef }) {
  const [viewMode, setViewMode] = useState("one-page");
  const [renderedPages, setRenderedPages] = useState(new Set([1]));
  const renderedPagesRef = useRef(new Set([1]));
  const isTransitioningModeRef = useRef(false);
  const targetPageRef = useRef(1);

  // Load user preferences in background (non-blocking)
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await apiClient.get("/user/preferences");
        if (response?.preferences?.readerViewMode) {
          setViewMode(response.preferences.readerViewMode);
        }
      } catch (err) {
        // Silently use default (one-page) on error
      }
    };

    loadPreferences();
  }, []);

  // Save view mode preference
  const saveViewModePreference = async (mode) => {
    try {
      await apiClient.put("/user/preferences", { readerViewMode: mode });
    } catch (err) {
      console.error("Failed to save preference:", err);
    }
  };

  // Toggle view mode
  const toggleViewMode = () => {
    const currentPage = getCurrentPage();
    const newMode = viewMode === "one-page" ? "continuous" : "one-page";

    targetPageRef.current = currentPage;
    isTransitioningModeRef.current = true;

    setViewMode(newMode);
    saveViewModePreference(newMode);

    if (newMode === "continuous") {
      const newSet = new Set([currentPage]);
      renderedPagesRef.current = newSet;
      setRenderedPages(newSet);

      setTimeout(() => {
        const pageElement = document.querySelector(
          `[data-page="${currentPage}"]`
        );
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: "auto", block: "start" });
        }
        setTimeout(() => {
          isTransitioningModeRef.current = false;
        }, 100);
      }, 50);
    } else {
      setTimeout(() => {
        isTransitioningModeRef.current = false;
      }, 100);
    }
  };

  return {
    viewMode,
    setViewMode,
    renderedPages,
    setRenderedPages,
    renderedPagesRef,
    isTransitioningModeRef,
    toggleViewMode,
  };
}

