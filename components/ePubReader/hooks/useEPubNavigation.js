"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/libs/api";
import {
  flattenTOC,
  getBaseHref,
  findChapterFromNode,
} from "../../../libs/chapterUtils";

/**
 * Find the current chapter for navigation/TOC highlighting
 * Uses DOM inspection to find the nearest chapter heading before current position
 */
async function findChapterForLocation(location, toc, rendition) {
  if (!location || !toc || toc.length === 0 || !rendition || !rendition.book) return null;

  try {
    const flatToc = flattenTOC(toc);
    if (flatToc.length === 0) return null;

    const currentCfi = location.start?.cfi;
    if (!currentCfi) return null;

    // Get DOM range for this CFI
    const range = await rendition.getRange(currentCfi);
    
    if (range && range.startContainer) {
      const contentDocument = range.startContainer.ownerDocument;
      if (!contentDocument) return flatToc[0];

      // Use shared utility to find chapter
      const chapter = findChapterFromNode(range.startContainer, contentDocument, toc);
      if (chapter) return chapter;
    }

    // Fallback: simple spine-based matching
    const spineItem = rendition.book.spine.get(currentCfi);
    if (spineItem) {
      const spineHref = getBaseHref(spineItem.href);
      const match = flatToc.find(item => getBaseHref(item.href) === spineHref);
      return match || flatToc[0];
    }

    return flatToc[0];
  } catch (err) {
    console.warn("Error finding chapter for location:", err);
    return flattenTOC(toc)[0] || null;
  }
}

/**
 * useEPubNavigation - Custom hook for ePub navigation
 * Handles chapter navigation, location tracking, and preferences
 */
export function useEPubNavigation({
  rendition,
  bookId,
  toc = [],
  initialLocation = null,
  initialFontSize = 16,
  preferencesLoaded = false,
  onLocationChange,
  onFontSizeChange,
}) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [fontSizeInitialized, setFontSizeInitialized] = useState(false);

  // Refs for debounced saving
  const saveLocationTimeoutRef = useRef(null);
  const saveFontSizeTimeoutRef = useRef(null);
  const pendingLocationRef = useRef(null);
  const pendingFontSizeRef = useRef(null);
  const bookIdRef = useRef(bookId);
  const renditionRef = useRef(rendition);
  const isMountedRef = useRef(true);
  const hasDisplayedRef = useRef(false);

  const isCfiString = useCallback((location) => {
    if (typeof location !== "string") return false;
    const trimmed = location.trim();
    return trimmed.startsWith("epubcfi(") && trimmed.endsWith(")");
  }, []);

  const normalizeCfiLocation = useCallback(
    (location) => {
      if (!isCfiString(location)) return location;
      if (location.includes(",")) {
        return `${location.split(",")[0]})`;
      }
      return location;
    },
    [isCfiString]
  );

  const canResolveLocation = useCallback(
    async (target) => {
      if (!renditionRef.current || !target) return false;
      if (!isCfiString(target)) return true;

      try {
        const range = await renditionRef.current.getRange(target);
        return !!range;
      } catch (err) {
        return false;
      }
    },
    [isCfiString]
  );

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keep refs updated
  useEffect(() => {
    bookIdRef.current = bookId;
  }, [bookId]);

  useEffect(() => {
    renditionRef.current = rendition;
  }, [rendition]);

  // Sync font size when preferences are loaded (initialFontSize changes from API)
  useEffect(() => {
    if (preferencesLoaded && !fontSizeInitialized && initialFontSize !== 16) {
      setFontSize(initialFontSize);
      setFontSizeInitialized(true);
    } else if (preferencesLoaded && !fontSizeInitialized) {
      setFontSizeInitialized(true);
    }
  }, [preferencesLoaded, initialFontSize, fontSizeInitialized]);

  // Save pending preferences before unmount
  useEffect(() => {
    const flushPendingPreferences = () => {
      if (!bookIdRef.current) return;

      const updates = {};
      if (pendingLocationRef.current !== null) {
        updates.lastLocation = pendingLocationRef.current;
      }
      if (pendingFontSizeRef.current !== null) {
        updates.fontSize = pendingFontSizeRef.current;
      }

      if (Object.keys(updates).length > 0) {
        const url = `/api/user/books/${bookIdRef.current}/preferences`;
        const data = JSON.stringify(updates);
        navigator.sendBeacon(
          url,
          new Blob([data], { type: "application/json" })
        );
      }
    };

    window.addEventListener("beforeunload", flushPendingPreferences);

    return () => {
      window.removeEventListener("beforeunload", flushPendingPreferences);

      // Clear timeouts
      if (saveLocationTimeoutRef.current)
        clearTimeout(saveLocationTimeoutRef.current);
      if (saveFontSizeTimeoutRef.current)
        clearTimeout(saveFontSizeTimeoutRef.current);

      if (!bookIdRef.current) return;

      const updates = {};
      if (pendingLocationRef.current !== null) {
        updates.lastLocation = pendingLocationRef.current;
      }
      if (pendingFontSizeRef.current !== null) {
        updates.fontSize = pendingFontSizeRef.current;
      }

      if (Object.keys(updates).length > 0) {
        apiClient
          .put(`/user/books/${bookIdRef.current}/preferences`, updates)
          .catch((err) =>
            console.error("[ePubReader] Unmount save failed:", err)
          );
      }
    };
  }, []);

  // Save location (debounced)
  const saveLocation = useCallback((location) => {
    if (!bookIdRef.current) return;

    pendingLocationRef.current = location;
    if (saveLocationTimeoutRef.current)
      clearTimeout(saveLocationTimeoutRef.current);

    saveLocationTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      try {
        await apiClient.put(`/user/books/${bookIdRef.current}/preferences`, {
          lastLocation: location,
        });
        pendingLocationRef.current = null;
      } catch (err) {
        console.error("Failed to save location:", err);
      }
    }, 2000);
  }, []);

  // Save font size (debounced)
  const saveFontSize = useCallback((size) => {
    if (!bookIdRef.current) return;

    pendingFontSizeRef.current = size;
    if (saveFontSizeTimeoutRef.current)
      clearTimeout(saveFontSizeTimeoutRef.current);

    saveFontSizeTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      try {
        await apiClient.put(`/user/books/${bookIdRef.current}/preferences`, {
          fontSize: size,
        });
        pendingFontSizeRef.current = null;
      } catch (err) {
        console.error("Failed to save font size:", err);
      }
    }, 1000);
  }, []);

  // Navigate to initial location when rendition is ready
  useEffect(() => {
    if (!rendition || !preferencesLoaded || hasDisplayedRef.current) return;

    const displayBook = async () => {
      try {
        if (initialLocation) {
          const normalizedLocation = normalizeCfiLocation(initialLocation);
          const canResolve = await canResolveLocation(normalizedLocation);
          if (canResolve) {
            await rendition.display(normalizedLocation);
          } else {
            await rendition.display();
          }
        } else {
          await rendition.display();
        }
        hasDisplayedRef.current = true;
      } catch (err) {
        console.error("Failed to display initial location:", err);
        // Try displaying without location
        try {
          await rendition.display();
          hasDisplayedRef.current = true;
        } catch (e) {
          console.error("Failed to display book:", e);
        }
      }
    };

    displayBook();
  }, [rendition, initialLocation, preferencesLoaded, normalizeCfiLocation, canResolveLocation]);

  // Listen for location changes
  useEffect(() => {
    if (!rendition) return;

    const handleRelocated = (location) => {
      if (!isMountedRef.current) return;

      const cfi = location.start?.cfi;
      setCurrentLocation(cfi);

      // Check if at start or end
      setAtStart(location.atStart || false);
      setAtEnd(location.atEnd || false);

      // Determine current chapter (for TOC highlighting)
      findChapterForLocation(location, toc, rendition)
        .then((chapter) => {
          if (isMountedRef.current) {
            setCurrentChapter(chapter);
          }
        })
        .catch((err) => {
          console.warn("Error detecting chapter:", err);
        });

      // Save location
      if (cfi) {
        saveLocation(cfi);
      }

      // Callback
      if (onLocationChange) {
        onLocationChange(cfi, location);
      }
    };

    rendition.on("relocated", handleRelocated);

    return () => {
      try {
        rendition.off("relocated", handleRelocated);
      } catch (err) {
        // Ignore errors during cleanup
      }
    };
  }, [rendition, toc, saveLocation, onLocationChange]);

  /**
   * Go to next page
   */
  const nextPage = useCallback(() => {
    if (renditionRef.current) {
      try {
        renditionRef.current.next();
      } catch (err) {
        // Ignore errors
      }
    }
  }, []);

  /**
   * Go to previous page
   */
  const prevPage = useCallback(() => {
    if (renditionRef.current) {
      try {
        renditionRef.current.prev();
      } catch (err) {
        // Ignore errors
      }
    }
  }, []);

  /**
   * Go to a specific location (CFI or href)
   */
  const goToLocation = useCallback((location) => {
    if (!renditionRef.current || !location) return;

    const attemptDisplay = async (target) => {
      if (!target || !renditionRef.current) return false;

      try {
        if (isCfiString(target)) {
          const range = await renditionRef.current.getRange(target);
          if (!range) return false;
        }
        await renditionRef.current.display(target);
        return true;
      } catch (err) {
        return false;
      }
    };

    const normalizedLocation = normalizeCfiLocation(location);

    void (async () => {
      let didDisplay = await attemptDisplay(normalizedLocation);
      if (!didDisplay && normalizedLocation !== location) {
        didDisplay = await attemptDisplay(location);
      }
      if (!didDisplay) {
        console.warn("Failed to display location:", location);
      }
    })();
  }, [isCfiString, normalizeCfiLocation]);

  /**
   * Go to a chapter by href
   */
  const goToChapter = useCallback((href) => {
    if (renditionRef.current && href) {
      try {
        renditionRef.current.display(href);
      } catch (err) {
        console.error("Failed to go to chapter:", err);
      }
    }
  }, []);

  /**
   * Increase font size
   */
  const increaseFontSize = useCallback(() => {
    setFontSize((prev) => {
      const newSize = Math.min(24, prev + 2);
      saveFontSize(newSize);
      if (onFontSizeChange) onFontSizeChange(newSize);
      return newSize;
    });
  }, [saveFontSize, onFontSizeChange]);

  /**
   * Decrease font size
   */
  const decreaseFontSize = useCallback(() => {
    setFontSize((prev) => {
      const newSize = Math.max(12, prev - 2);
      saveFontSize(newSize);
      if (onFontSizeChange) onFontSizeChange(newSize);
      return newSize;
    });
  }, [saveFontSize, onFontSizeChange]);

  /**
   * Set font size directly
   */
  const setFontSizeValue = useCallback(
    (size) => {
      const clampedSize = Math.min(24, Math.max(12, size));
      setFontSize(clampedSize);
      saveFontSize(clampedSize);
      if (onFontSizeChange) onFontSizeChange(clampedSize);
    },
    [saveFontSize, onFontSizeChange]
  );

  return {
    currentLocation,
    currentChapter,
    fontSize,
    atStart,
    atEnd,
    nextPage,
    prevPage,
    goToLocation,
    goToChapter,
    increaseFontSize,
    decreaseFontSize,
    setFontSize: setFontSizeValue,
  };
}
