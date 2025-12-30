"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useEPubLoader - Custom hook for loading ePub files using epub.js
 * Handles dynamic import of epub.js (client-side only)
 */
export function useEPubLoader(filePath) {
  const [book, setBook] = useState(null);
  const [rendition, setRendition] = useState(null);
  const [toc, setToc] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const epubjsRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!filePath) {
      setError("No file path provided");
      setIsLoading(false);
      return;
    }

    const loadBook = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import epub.js (client-side only)
        const ePub = (await import("epubjs")).default;
        epubjsRef.current = ePub;

        // Create the book instance
        const newBook = ePub(filePath);
        bookRef.current = newBook;

        // Load the book
        await newBook.ready;

        if (!isMountedRef.current) {
          newBook.destroy();
          return;
        }

        // Get table of contents
        const navigation = await newBook.loaded.navigation;
        const tocItems = navigation?.toc || [];

        // Get metadata
        const meta = await newBook.loaded.metadata;

        if (isMountedRef.current) {
          setBook(newBook);
          setToc(tocItems);
          setMetadata(meta);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading ePub:", err);
        if (isMountedRef.current) {
          setError(err.message || "Failed to load ePub file");
          setIsLoading(false);
        }
      }
    };

    loadBook();

    return () => {
      isMountedRef.current = false;

      // Destroy rendition first, then book
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch (e) {
          // Ignore errors during cleanup
        }
        renditionRef.current = null;
      }

      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch (e) {
          // Ignore errors during cleanup
        }
        bookRef.current = null;
      }
    };
  }, [filePath]);

  /**
   * Create a rendition and render to a container
   * Memoized to prevent unnecessary re-creations
   */
  const createRendition = useCallback(
    (container, options = {}) => {
      // Guard against destroyed or unavailable book instances
      if (
        !bookRef.current ||
        !bookRef.current.resources ||
        bookRef.current.destroyed
      ) {
        return null;
      }

      try {
        const defaultOptions = {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: "paginated",
          ...options,
        };

        const newRendition = bookRef.current.renderTo(container, defaultOptions);
        renditionRef.current = newRendition;
        setRendition(newRendition);
        return newRendition;
      } catch (err) {
        console.error("Error creating rendition:", err);
        setError("Failed to render ePub");
        return null;
      }
    },
    [] // Empty deps - we use refs to access current values
  );

  /**
   * Destroy the current rendition
   */
  const destroyRendition = useCallback(() => {
    if (renditionRef.current) {
      try {
        renditionRef.current.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
      renditionRef.current = null;
      if (isMountedRef.current) {
        setRendition(null);
      }
    }
  }, []);

  return {
    book,
    rendition,
    toc,
    metadata,
    isLoading,
    error,
    epubjsRef,
    createRendition,
    destroyRendition,
    setRendition,
  };
}
