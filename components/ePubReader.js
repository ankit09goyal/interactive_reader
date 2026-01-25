"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";

// Hooks
import { useEPubLoader } from "./ePubReader/hooks/useEPubLoader";
import { useEPubNavigation } from "./ePubReader/hooks/useEPubNavigation";
import { useEPubTextSelection } from "./ePubReader/hooks/useEPubTextSelection";
import { useEPubHighlights } from "./ePubReader/hooks/useEPubHighlights";
import { useEPubQuestionHighlights } from "./ePubReader/hooks/useEPubQuestionHighlights";
import { useEPubSuggestionHighlights } from "./ePubReader/hooks/useEPubSuggestionHighlights";
import { useReadingAnalytics } from "@/libs/useReadingAnalytics";

// Components
import EPubToolbar from "./ePubReader/ePubToolbar";
import EPubViewer from "./ePubReader/ePubViewer";
import EPubTOC from "./ePubReader/ePubTOC";
import EPubSearchPanel from "./ePubReader/EPubSearchPanel";
import NotesModal from "./NotesModal";
import TextSelectionMenu from "./TextSelectionMenu";
import QuestionModal from "./QuestionModal";
import SuggestionModal from "./SuggestionModal";
import QuestionsSidebar from "./QuestionsSidebar";
import HighlightsSidebar from "./HighlightsSidebar";
import SuggestionsSidebar from "./SuggestionsSidebar";
import PageViewSettingsSidebar from "./PageViewSettingsSidebar";

// Default page view settings
const DEFAULT_PAGE_VIEW_SETTINGS = {
  fontFamily: "Georgia",
  fontSize: 16,
  spacing: "normal",
  alignment: "justify",
  margins: "normal",
  spread: "always",
};

/**
 * ePubReader - Main component for reading ePub files
 * Integrates all hooks and sub-components for a complete reading experience
 */
export default function EPubReader({
  filePath,
  title,
  backHref = "/dashboard",
  bookId = null,
  isAdmin = false,
}) {
  // UI state
  const [showTOC, setShowTOC] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showQuestionsSidebar, setShowQuestionsSidebar] = useState(false);
  const [showHighlightsSidebar, setShowHighlightsSidebar] = useState(false);
  const [showSuggestionsSidebar, setShowSuggestionsSidebar] = useState(false);
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState(null);
  const [highlightedTextClicked, setHighlightedTextClicked] = useState(0);
  const [highlightedNoteId, setHighlightedNoteId] = useState(null);
  const [highlightedNoteClicked, setHighlightedNoteClicked] = useState(0);
  const [highlightedSuggestionId, setHighlightedSuggestionId] = useState(null);
  const [highlightedSuggestionClicked, setHighlightedSuggestionClicked] = useState(0);

  // Page view settings state (global user preferences)
  const [pageViewSettings, setPageViewSettings] = useState(
    DEFAULT_PAGE_VIEW_SETTINGS
  );
  const [pageViewSettingsLoaded, setPageViewSettingsLoaded] = useState(false);

  // Preferences state
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [initialLocation, setInitialLocation] = useState(null);
  const [initialFontSize, setInitialFontSize] = useState(16);

  // Store selected text for modal (persists even if selection is cleared)
  const [modalSelectedText, setModalSelectedText] = useState(null);
  const [modalSelectionCfi, setModalSelectionCfi] = useState(null);
  const [modalSelectionCfiRange, setModalSelectionCfiRange] = useState(null);
  const [modalChapter, setModalChapter] = useState(null);

  // Load global page view settings (user preferences)
  useEffect(() => {
    const loadPageViewSettings = async () => {
      try {
        const response = await apiClient.get("/user/preferences");
        if (response?.preferences?.pageViewSettings) {
          setPageViewSettings({
            ...DEFAULT_PAGE_VIEW_SETTINGS,
            ...response.preferences.pageViewSettings,
          });
        }
      } catch (err) {
        console.error("Failed to load page view settings:", err);
      } finally {
        setPageViewSettingsLoaded(true);
      }
    };

    loadPageViewSettings();
  }, []);

  // Load book preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!bookId) {
        setPreferencesLoaded(true);
        return;
      }

      try {
        const response = await apiClient.get(
          `/user/books/${bookId}/preferences`
        );
        if (response?.preferences) {
          const { lastLocation, fontSize } = response.preferences;
          setInitialLocation(lastLocation || null);
          setInitialFontSize(fontSize || 16);
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setPreferencesLoaded(true);
      }
    };

    loadPreferences();
  }, [bookId]);

  // Load ePub
  const { book, rendition, toc, isLoading, error, createRendition } =
    useEPubLoader(filePath);

  // Navigation
  const {
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
  } = useEPubNavigation({
    rendition,
    bookId,
    toc,
    initialLocation,
    initialFontSize,
    preferencesLoaded,
  });

  // Text selection
  const {
    selectedText,
    selectionCfi,
    selectionCfiRange,
    selectionPosition,
    selectionChapter,
    clearSelection,
  } = useEPubTextSelection({
    rendition,
    currentChapter,
    toc,
    showNotesModal,
    showQuestionModal,
    showSidebar: showQuestionsSidebar || showHighlightsSidebar || showSuggestionsSidebar,
  });

  // Highlights
  const {
    highlights,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    getHighlight,
  } = useEPubHighlights({
    bookId,
    rendition,
    refreshTrigger: sidebarRefreshTrigger,
    onHighlightClick: (highlightId) => {
      setHighlightedNoteId(highlightId);
      // Close questions sidebar if open, open highlights sidebar
      setShowQuestionsSidebar(false);
      setShowHighlightsSidebar(true);
      setHighlightedNoteClicked((prev) => prev + 1);
    },
    fontSize: pageViewSettings.fontSize,
  });

  // Question highlights (clickable)
  const { highlights: questionHighlights } = useEPubQuestionHighlights({
    bookId,
    rendition,
    refreshTrigger: sidebarRefreshTrigger,
    onHighlightClick: (questionId) => {
      setHighlightedQuestionId(questionId);
      // Close other sidebars if open, open questions sidebar
      setShowHighlightsSidebar(false);
      setShowSuggestionsSidebar(false);
      setShowQuestionsSidebar(true);
      setHighlightedTextClicked((prev) => prev + 1);
    },
    fontSize: pageViewSettings.fontSize,
  });

  // Suggestion highlights (clickable)
  const { highlights: suggestionHighlights } = useEPubSuggestionHighlights({
    bookId,
    rendition,
    refreshTrigger: sidebarRefreshTrigger,
    onHighlightClick: (suggestionId) => {
      setHighlightedSuggestionId(suggestionId);
      // Close other sidebars if open, open suggestions sidebar
      setShowHighlightsSidebar(false);
      setShowQuestionsSidebar(false);
      setShowSuggestionsSidebar(true);
      setHighlightedSuggestionClicked((prev) => prev + 1);
    },
    fontSize: pageViewSettings.fontSize,
  });

  // Reading analytics tracking (GDPR compliant - no personal data)
  const { trackLocation } = useReadingAnalytics({
    bookId,
    locationType: "cfi",
    totalChapters: toc?.length || null,
  });

  // Track location changes for analytics (using CFI which changes on every navigation)
  useEffect(() => {
    if (currentLocation && bookId) {
      trackLocation(currentLocation);
    }
  }, [currentLocation, bookId, trackLocation]);

  // Handle asking question from selection menu
  const handleAskQuestion = useCallback(() => {
    setModalSelectedText(selectedText);
    setModalSelectionCfi(selectionCfi);
    setModalSelectionCfiRange(selectionCfiRange);
    setModalChapter(selectionChapter);
    setShowQuestionModal(true);
  }, [selectedText, selectionCfi, selectionCfiRange, selectionChapter]);

  // Handle creating public Q&A from selection menu (admin only)
  const handleCreatePublicQA = useCallback(() => {
    setModalSelectedText(selectedText);
    setModalSelectionCfi(selectionCfi);
    setModalSelectionCfiRange(selectionCfiRange);
    setModalChapter(selectionChapter);
    setShowQuestionModal(true);
  }, [selectedText, selectionCfi, selectionCfiRange, selectionChapter]);

  // Handle suggesting improvement from selection menu
  const handleSuggestImprovement = useCallback(() => {
    setModalSelectedText(selectedText);
    setModalSelectionCfi(selectionCfi);
    setModalSelectionCfiRange(selectionCfiRange);
    setModalChapter(selectionChapter);
    setEditingSuggestion(null);
    setShowSuggestionModal(true);
  }, [selectedText, selectionCfi, selectionCfiRange, selectionChapter]);

  // Handle adding notes from selection menu
  const handleAddNotes = useCallback(() => {
    if (!selectedText || !selectionCfiRange) {
      toast.error("Please select some text to add a note.");
      return;
    }

    // Store a draft highlight object so the modal can show the selected text
    setSelectedHighlight({
      _id: null,
      selectedText,
      cfi: selectionCfi,
      cfiRange: selectionCfiRange,
      chapterTitle: selectionChapter?.label || null,
      chapterHref: selectionChapter?.href || null,
      notes: "",
      color: "yellow",
    });
    setShowNotesModal(true);
  }, [selectedText, selectionCfi, selectionCfiRange, selectionChapter]);

  // Handle adding highlight from selection menu
  const handleAddHighlight = useCallback(
    async (color) => {
      if (!selectedText || !selectionCfiRange) return;

      try {
        const newHighlight = await createHighlight({
          selectedText,
          cfi: selectionCfi,
          cfiRange: selectionCfiRange,
          chapterTitle: selectionChapter?.label || null,
          chapterHref: selectionChapter?.href || null,
          notes: null,
          color: color || "yellow",
        });

        if (newHighlight) {
          toast.success("Highlight added");
          clearSelection();
          setSelectedHighlight(newHighlight);
        }
      } catch (err) {
        toast.error("Failed to add highlight");
      }
    },
    [
      selectedText,
      selectionCfi,
      selectionCfiRange,
      selectionChapter,
      createHighlight,
      clearSelection,
    ]
  );

  // Handle highlight click (open notes modal)
  const handleHighlightClick = useCallback(
    (highlightId) => {
      const highlight = getHighlight(highlightId);
      if (highlight) {
        setSelectedHighlight(highlight);
        setShowNotesModal(true);
      }
    },
    [getHighlight]
  );

  // Handle saving notes
  const handleSaveNotes = useCallback(
    async (updates) => {
      if (!selectedHighlight) return;

      const {
        _id,
        selectedText: draftText,
        cfi,
        cfiRange,
        chapterTitle,
        chapterHref,
        color,
      } = selectedHighlight;

      // If we don't yet have a persisted highlight, create one with the note
      if (!_id) {
        if (!draftText || !cfiRange) {
          toast.error("Missing selection details to save the note.");
          return;
        }

        setIsNotesLoading(true);
        try {
          const newHighlight = await createHighlight({
            selectedText: draftText,
            cfi,
            cfiRange,
            chapterTitle,
            chapterHref,
            notes: updates.notes ?? "",
            color: updates.color || color || "yellow",
          });

          if (newHighlight) {
            setSelectedHighlight(newHighlight);
            toast.success("Note saved");
            clearSelection();
          }
        } catch (err) {
          toast.error("Failed to save note");
        } finally {
          setIsNotesLoading(false);
        }
        return;
      }

      // Existing highlight: just update
      setIsNotesLoading(true);
      try {
        const updated = await updateHighlight(_id, updates);
        if (updated) {
          setSelectedHighlight(updated);
        }
        toast.success("Note saved");
      } catch (err) {
        toast.error("Failed to save note");
      } finally {
        setIsNotesLoading(false);
      }
    },
    [createHighlight, selectedHighlight, updateHighlight, clearSelection]
  );

  // Handle deleting highlight
  const handleDeleteHighlight = useCallback(
    async (highlightId) => {
      setIsNotesLoading(true);
      try {
        await deleteHighlight(highlightId);
        toast.success("Highlight deleted");
      } catch (err) {
        toast.error("Failed to delete highlight");
      } finally {
        setIsNotesLoading(false);
      }
    },
    [deleteHighlight]
  );

  // Handle question created
  const handleQuestionCreated = useCallback(() => {
    clearSelection();
    setSidebarRefreshTrigger((prev) => prev + 1);
    toast.success("Question created successfully");
  }, [clearSelection]);

  // Handle question deleted
  const handleQuestionDeleted = useCallback(() => {
    setSidebarRefreshTrigger((prev) => prev + 1);
  }, []);

  // Handle suggestion created
  const handleSuggestionCreated = useCallback(() => {
    clearSelection();
    setSidebarRefreshTrigger((prev) => prev + 1);
    toast.success("Suggestion submitted successfully");
  }, [clearSelection]);

  // Handle suggestion updated
  const handleSuggestionUpdated = useCallback(() => {
    setSidebarRefreshTrigger((prev) => prev + 1);
    toast.success("Suggestion updated successfully");
  }, []);

  // Handle suggestion deleted
  const handleSuggestionDeleted = useCallback(() => {
    setSidebarRefreshTrigger((prev) => prev + 1);
  }, []);

  // Handle edit suggestion from sidebar
  const handleEditSuggestion = useCallback((suggestion) => {
    setEditingSuggestion(suggestion);
    setShowSuggestionModal(true);
  }, []);

  // Handle adding suggestion without text selection
  const handleAddSuggestion = useCallback(() => {
    setEditingSuggestion(null);
    setShowSuggestionModal(true);
  }, []);

  // Handle adding question without text selection
  const handleAddQuestion = useCallback(() => {
    setShowQuestionModal(true);
  }, []);

  // Navigate to location from sidebar
  const handleGoToLocation = useCallback(
    (location) => {
      if (location) {
        goToLocation(location);
      }
    },
    [goToLocation]
  );

  // Toggle questions sidebar (close other sidebars if open)
  const handleToggleQuestionsSidebar = useCallback(() => {
    if (showQuestionsSidebar) {
      // Close questions sidebar
      setShowQuestionsSidebar(false);
      setHighlightedQuestionId(null);
      setHighlightedTextClicked(0);
    } else {
      // Open questions sidebar, close other sidebars
      setShowHighlightsSidebar(false);
      setHighlightedNoteId(null);
      setHighlightedNoteClicked(0);
      setShowSuggestionsSidebar(false);
      setHighlightedSuggestionId(null);
      setHighlightedSuggestionClicked(0);
      setShowSettingsSidebar(false);
      setShowQuestionsSidebar(true);
    }
  }, [showQuestionsSidebar]);

  // Toggle highlights sidebar (close other sidebars if open)
  const handleToggleHighlightsSidebar = useCallback(() => {
    if (showHighlightsSidebar) {
      // Close highlights sidebar
      setShowHighlightsSidebar(false);
      setHighlightedNoteId(null);
      setHighlightedNoteClicked(0);
    } else {
      // Open highlights sidebar, close other sidebars
      setShowQuestionsSidebar(false);
      setHighlightedQuestionId(null);
      setHighlightedTextClicked(0);
      setShowSuggestionsSidebar(false);
      setHighlightedSuggestionId(null);
      setHighlightedSuggestionClicked(0);
      setShowSettingsSidebar(false);
      setShowHighlightsSidebar(true);
    }
  }, [showHighlightsSidebar]);

  // Toggle suggestions sidebar (close other sidebars if open)
  const handleToggleSuggestionsSidebar = useCallback(() => {
    if (showSuggestionsSidebar) {
      // Close suggestions sidebar
      setShowSuggestionsSidebar(false);
      setHighlightedSuggestionId(null);
      setHighlightedSuggestionClicked(0);
    } else {
      // Open suggestions sidebar, close other sidebars
      setShowQuestionsSidebar(false);
      setHighlightedQuestionId(null);
      setHighlightedTextClicked(0);
      setShowHighlightsSidebar(false);
      setHighlightedNoteId(null);
      setHighlightedNoteClicked(0);
      setShowSettingsSidebar(false);
      setShowSuggestionsSidebar(true);
    }
  }, [showSuggestionsSidebar]);

  // Toggle settings sidebar (close other sidebars if open)
  const handleToggleSettingsSidebar = useCallback(() => {
    if (showSettingsSidebar) {
      // Close settings sidebar
      setShowSettingsSidebar(false);
    } else {
      // Open settings sidebar, close other sidebars
      setShowQuestionsSidebar(false);
      setHighlightedQuestionId(null);
      setHighlightedTextClicked(0);
      setShowHighlightsSidebar(false);
      setHighlightedNoteId(null);
      setHighlightedNoteClicked(0);
      setShowSuggestionsSidebar(false);
      setHighlightedSuggestionId(null);
      setHighlightedSuggestionClicked(0);
      setShowSettingsSidebar(true);
    }
  }, [showSettingsSidebar]);

  // Close settings sidebar
  const handleCloseSettingsSidebar = useCallback(() => {
    setShowSettingsSidebar(false);
  }, []);

  // Toggle search panel
  const handleToggleSearchPanel = useCallback(() => {
    setShowSearchPanel((prev) => !prev);
    // Close TOC if open
    if (!showSearchPanel) {
      setShowTOC(false);
    }
  }, [showSearchPanel]);

  // Close search panel
  const handleCloseSearchPanel = useCallback(() => {
    setShowSearchPanel(false);
  }, []);

  // Ref to track current search highlight annotation
  const searchHighlightRef = useRef(null);

  // Helper function to extract a navigation CFI from a range CFI
  // Range CFIs look like: epubcfi(/6/4!/4/2,/1:0,/1:5) - has comma-separated range parts
  // Point CFIs look like: epubcfi(/6/4!/4/2/1:0)
  const getNavigationCfi = useCallback((cfi) => {
    if (!cfi) return null;
    
    // Check if this is a range CFI (contains commas after the base path)
    // epub.js range CFI format: epubcfi(base,startOffset,endOffset)
    const match = cfi.match(/^(epubcfi\([^,]+),/);
    if (match) {
      // It's a range CFI - extract just the base + start for navigation
      // The format is epubcfi(/6/4!/4/2,/1:0,/1:5) where base=/6/4!/4/2
      // For navigation, we can use the base path + first range part
      const baseMatch = cfi.match(/^(epubcfi\()([^,]+),([^,]+),/);
      if (baseMatch) {
        // Construct point CFI from base + start offset
        // base = /6/4!/4/2, startOffset = /1:0
        // result = epubcfi(/6/4!/4/2/1:0)
        const prefix = baseMatch[1]; // "epubcfi("
        const basePath = baseMatch[2]; // "/6/4!/4/2"
        const startOffset = baseMatch[3]; // "/1:0"
        return `${prefix}${basePath}${startOffset})`;
      }
    }
    // Already a point CFI or couldn't parse, return as-is
    return cfi;
  }, []);

  // Navigate to search result and flash highlight the text using epub.js annotations
  const handleNavigateToSearchResult = useCallback(
    async (result, searchQuery) => {
      if (!result || !rendition) return;

      const { cfi, href } = result;

      try {
        // Remove any existing search highlight
        if (searchHighlightRef.current) {
          try {
            rendition.annotations.remove(searchHighlightRef.current, "highlight");
          } catch (e) {
            // Ignore if removal fails
          }
          searchHighlightRef.current = null;
        }

        // Close the search panel
        setShowSearchPanel(false);

        // Log for debugging
        console.log("Search navigation - CFI:", cfi, "Href:", href);

        // Try to navigate using CFI first (for precise location), fall back to href
        let navigationSucceeded = false;
        let usedCfiNavigation = false;

        // First try with the original CFI (epub.js should handle range CFIs)
        if (cfi) {
          try {
            console.log("Trying original CFI navigation:", cfi);
            await rendition.display(cfi);
            navigationSucceeded = true;
            usedCfiNavigation = true;
            console.log("Original CFI navigation succeeded");
          } catch (e) {
            console.warn("Original CFI navigation failed:", e);
            
            // Try with converted point CFI
            const navigationCfi = getNavigationCfi(cfi);
            if (navigationCfi && navigationCfi !== cfi) {
              try {
                console.log("Trying converted CFI navigation:", navigationCfi);
                await rendition.display(navigationCfi);
                navigationSucceeded = true;
                usedCfiNavigation = true;
                console.log("Converted CFI navigation succeeded");
              } catch (e2) {
                console.warn("Converted CFI navigation also failed:", e2);
              }
            }
          }
        }

        // If CFI navigation failed, fall back to href (will go to chapter start)
        if (!navigationSucceeded && href) {
          try {
            console.log("Trying href navigation (fallback):", href);
            await rendition.display(href);
            navigationSucceeded = true;
            console.log("Href navigation succeeded (at chapter start)");
          } catch (e) {
            console.warn("Href navigation failed:", e);
          }
        }

        if (!navigationSucceeded) {
          toast.error("Could not navigate to search result");
          return;
        }

        // Wait for the page to render, then add a temporary highlight
        setTimeout(() => {
          try {
            const contents = rendition.getContents();
            
            // Add flash highlight styles
            contents.forEach((content) => {
              const doc = content.document;
              if (doc && !doc.getElementById("search-flash-style")) {
                const styleEl = doc.createElement("style");
                styleEl.id = "search-flash-style";
                styleEl.textContent = `
                  .search-flash-highlight {
                    background-color: rgba(59, 130, 246, 0.5) !important;
                    animation: searchFlash 2s ease-out forwards;
                    border-radius: 2px;
                  }
                  .search-text-highlight {
                    background-color: rgba(59, 130, 246, 0.5);
                    animation: searchFlash 2s ease-out forwards;
                    border-radius: 2px;
                  }
                  @keyframes searchFlash {
                    0% { background-color: rgba(59, 130, 246, 0.6); }
                    50% { background-color: rgba(59, 130, 246, 0.3); }
                    100% { background-color: transparent; }
                  }
                `;
                doc.head.appendChild(styleEl);
              }
            });

            let highlightApplied = false;

            // Try using epub.js annotations API if we used CFI navigation
            if (usedCfiNavigation && cfi) {
              try {
                rendition.annotations.highlight(
                  cfi,
                  { searchQuery },
                  null,
                  "search-flash-highlight",
                  { fill: "rgba(59, 130, 246, 0.5)" }
                );
                searchHighlightRef.current = cfi;
                highlightApplied = true;
                console.log("Annotation highlight applied successfully");

                // Remove the highlight after 2 seconds
                setTimeout(() => {
                  try {
                    if (searchHighlightRef.current === cfi) {
                      rendition.annotations.remove(cfi, "highlight");
                      searchHighlightRef.current = null;
                    }
                  } catch (e) {
                    // Ignore removal errors
                  }
                }, 2000);
              } catch (e) {
                console.warn("Could not apply annotation highlight, trying text-based:", e);
              }
            }

            // Fallback: use text-based highlighting if annotation failed
            if (!highlightApplied && searchQuery) {
              contents.forEach((content) => {
                const doc = content.document;
                if (!doc) return;

                // Find the text in the document using window.find or manual search
                const highlightId = `search-text-highlight-${Date.now()}`;
                
                // Use TreeWalker to find text nodes containing the search query
                const walker = doc.createTreeWalker(
                  doc.body,
                  NodeFilter.SHOW_TEXT,
                  null,
                  false
                );

                let node;
                let found = false;
                while ((node = walker.nextNode()) && !found) {
                  const text = node.textContent;
                  const lowerText = text.toLowerCase();
                  const lowerQuery = searchQuery.toLowerCase();
                  const index = lowerText.indexOf(lowerQuery);

                  if (index !== -1) {
                    try {
                      const range = doc.createRange();
                      range.setStart(node, index);
                      range.setEnd(node, index + searchQuery.length);

                      const span = doc.createElement("span");
                      span.className = "search-text-highlight";
                      span.id = highlightId;
                      
                      range.surroundContents(span);
                      found = true;
                      highlightApplied = true;
                      console.log("Text-based highlight applied");

                      // Scroll the highlight into view
                      span.scrollIntoView({ behavior: "smooth", block: "center" });

                      // Remove after 2 seconds (just remove the span, keep text)
                      setTimeout(() => {
                        const el = doc.getElementById(highlightId);
                        if (el && el.parentNode) {
                          const parent = el.parentNode;
                          while (el.firstChild) {
                            parent.insertBefore(el.firstChild, el);
                          }
                          parent.removeChild(el);
                          parent.normalize(); // Merge adjacent text nodes
                        }
                      }, 2100);
                    } catch (e) {
                      console.warn("Could not apply text highlight:", e);
                    }
                  }
                }
              });
            }
          } catch (e) {
            console.warn("Could not apply search highlight:", e);
          }
        }, 300);
      } catch (err) {
        console.error("Failed to navigate to search result:", err);
        toast.error("Failed to navigate to search result");
      }
    },
    [rendition, getNavigationCfi]
  );

  // Refs for debounced settings save
  const saveSettingsTimeoutRef = useRef(null);
  const pendingSettingsRef = useRef(null);

  // Handle page view settings change (with debounced API save)
  const handlePageViewSettingsChange = useCallback((newSettings) => {
    setPageViewSettings(newSettings);
    pendingSettingsRef.current = newSettings;

    // Debounced save to API
    if (saveSettingsTimeoutRef.current) {
      clearTimeout(saveSettingsTimeoutRef.current);
    }
    saveSettingsTimeoutRef.current = setTimeout(async () => {
      try {
        await apiClient.put("/user/preferences", {
          pageViewSettings: newSettings,
        });
        pendingSettingsRef.current = null;
      } catch (error) {
        console.error("Failed to save page view settings:", error);
      }
    }, 500);
  }, []);

  // Save pending settings immediately on unmount
  useEffect(() => {
    return () => {
      if (saveSettingsTimeoutRef.current) {
        clearTimeout(saveSettingsTimeoutRef.current);
      }
      // Save any pending settings immediately before unmounting
      if (pendingSettingsRef.current) {
        apiClient
          .put("/user/preferences", {
            pageViewSettings: pendingSettingsRef.current,
          })
          .catch((error) => {
            console.error(
              "Failed to save page view settings on unmount:",
              error
            );
          });
      }
    };
  }, []);

  // Close questions sidebar
  const handleCloseQuestionsSidebar = useCallback(() => {
    setShowQuestionsSidebar(false);
    setHighlightedQuestionId(null);
    setHighlightedTextClicked(0);
  }, []);

  // Close highlights sidebar
  const handleCloseHighlightsSidebar = useCallback(() => {
    setShowHighlightsSidebar(false);
    setHighlightedNoteId(null);
    setHighlightedNoteClicked(0);
  }, []);

  // Close suggestions sidebar
  const handleCloseSuggestionsSidebar = useCallback(() => {
    setShowSuggestionsSidebar(false);
    setHighlightedSuggestionId(null);
    setHighlightedSuggestionClicked(0);
  }, []);

  return (
    <div className="flex flex-col w-full h-full bg-base-100 overflow-hidden">
      {/* Toolbar */}
      <EPubToolbar
        title={title}
        backHref={backHref}
        isLoading={isLoading}
        fontSize={pageViewSettings.fontSize}
        showTOC={showTOC}
        showSearchPanel={showSearchPanel}
        showQuestionsSidebar={showQuestionsSidebar}
        showHighlightsSidebar={showHighlightsSidebar}
        showSuggestionsSidebar={showSuggestionsSidebar}
        showSettingsSidebar={showSettingsSidebar}
        bookId={bookId}
        isAdmin={isAdmin}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onIncreaseFontSize={() =>
          handlePageViewSettingsChange({
            ...pageViewSettings,
            fontSize: Math.min(24, pageViewSettings.fontSize + 1),
          })
        }
        onDecreaseFontSize={() =>
          handlePageViewSettingsChange({
            ...pageViewSettings,
            fontSize: Math.max(12, pageViewSettings.fontSize - 1),
          })
        }
        onToggleTOC={() => setShowTOC(!showTOC)}
        onToggleSearchPanel={handleToggleSearchPanel}
        onToggleQuestionsSidebar={handleToggleQuestionsSidebar}
        onToggleHighlightsSidebar={handleToggleHighlightsSidebar}
        onToggleSuggestionsSidebar={handleToggleSuggestionsSidebar}
        onToggleSettingsSidebar={handleToggleSettingsSidebar}
        atStart={atStart}
        atEnd={atEnd}
      />

      {/* ePub Viewer */}
      <EPubViewer
        book={book}
        isLoading={isLoading}
        error={error}
        createRendition={createRendition}
        fontSize={pageViewSettings.fontSize}
        fontFamily={pageViewSettings.fontFamily}
        spacing={pageViewSettings.spacing}
        alignment={pageViewSettings.alignment}
        margins={pageViewSettings.margins}
        spread={pageViewSettings.spread}
      />

      {/* Table of Contents */}
      <EPubTOC
        isOpen={showTOC}
        onClose={() => setShowTOC(false)}
        toc={toc}
        currentChapter={currentChapter}
        onNavigate={goToChapter}
      />

      {/* Search Panel */}
      <EPubSearchPanel
        isOpen={showSearchPanel}
        onClose={handleCloseSearchPanel}
        book={book}
        onNavigateToResult={handleNavigateToSearchResult}
        isSearching={isSearching}
        setIsSearching={setIsSearching}
      />

      {/* Search Panel Backdrop */}
      {showSearchPanel && (
        <div
          className="fixed inset-0 bg-black/20 z-[150]"
          onClick={handleCloseSearchPanel}
        />
      )}

      {/* Text Selection Menu */}
      {selectionPosition && selectedText && (
        <div className="text-selection-menu">
          <TextSelectionMenu
            position={selectionPosition}
            selectedText={selectedText}
            onAskQuestion={handleAskQuestion}
            onCreatePublicQA={handleCreatePublicQA}
            onClose={clearSelection}
            isAdmin={isAdmin}
            isEPub={true}
            onAddHighlight={handleAddHighlight}
            onAddNotes={handleAddNotes}
            onSuggestImprovement={handleSuggestImprovement}
          />
        </div>
      )}

      {/* Notes Modal */}
      <NotesModal
        isOpen={showNotesModal}
        onClose={() => {
          setShowNotesModal(false);
          setSelectedHighlight(null);
        }}
        highlight={selectedHighlight}
        onSave={handleSaveNotes}
        isLoading={isNotesLoading}
      />

      {/* Question Modal */}
      {bookId && (
        <QuestionModal
          isOpen={showQuestionModal}
          onClose={() => {
            setShowQuestionModal(false);
            setModalSelectedText(null);
            setModalSelectionCfi(null);
            setModalSelectionCfiRange(null);
            setModalChapter(null);
            clearSelection();
          }}
          selectedText={modalSelectedText || selectedText}
          pageNumber={null}
          epubCfi={modalSelectionCfi || selectionCfi}
          epubCfiRange={modalSelectionCfiRange || selectionCfiRange}
          epubChapter={modalChapter?.label || selectionChapter?.label}
          bookId={bookId}
          isAdmin={isAdmin}
          onQuestionCreated={handleQuestionCreated}
        />
      )}

      {/* Suggestion Modal */}
      {bookId && (
        <SuggestionModal
          isOpen={showSuggestionModal}
          onClose={() => {
            setShowSuggestionModal(false);
            setEditingSuggestion(null);
            setModalSelectedText(null);
            setModalSelectionCfi(null);
            setModalSelectionCfiRange(null);
            setModalChapter(null);
            clearSelection();
          }}
          selectedText={editingSuggestion ? null : (modalSelectedText || selectedText)}
          epubCfi={editingSuggestion ? null : (modalSelectionCfi || selectionCfi)}
          epubCfiRange={editingSuggestion ? null : (modalSelectionCfiRange || selectionCfiRange)}
          epubChapter={editingSuggestion ? null : (modalChapter?.label || selectionChapter?.label)}
          chapterHref={editingSuggestion ? null : (modalChapter?.href || selectionChapter?.href)}
          bookId={bookId}
          existingSuggestion={editingSuggestion}
          onSuggestionCreated={handleSuggestionCreated}
          onSuggestionUpdated={handleSuggestionUpdated}
        />
      )}

      {/* Sidebar Backdrop - closes sidebar when clicking outside */}
      {(showQuestionsSidebar || showHighlightsSidebar || showSuggestionsSidebar) && (
        <div
          className="fixed inset-0 bg-black/20 z-[140]"
          onClick={() => {
            if (showQuestionsSidebar) handleCloseQuestionsSidebar();
            if (showHighlightsSidebar) handleCloseHighlightsSidebar();
            if (showSuggestionsSidebar) handleCloseSuggestionsSidebar();
          }}
        />
      )}

      {/* Questions Sidebar */}
      {bookId && (
        <QuestionsSidebar
          isOpen={showQuestionsSidebar}
          onClose={handleCloseQuestionsSidebar}
          bookId={bookId}
          onGoToPage={handleGoToLocation}
          refreshTrigger={sidebarRefreshTrigger}
          onAddQuestion={handleAddQuestion}
          onQuestionDeleted={handleQuestionDeleted}
          isEPub={true}
          highlightedQuestionId={highlightedQuestionId}
          highlightedTextClicked={highlightedTextClicked}
        />
      )}

      {/* Highlights Sidebar */}
      {bookId && (
        <HighlightsSidebar
          isOpen={showHighlightsSidebar}
          onClose={handleCloseHighlightsSidebar}
          highlights={highlights}
          onHighlightClick={handleHighlightClick}
          onGoToLocation={handleGoToLocation}
          onHighlightDeleted={handleDeleteHighlight}
          highlightedNoteId={highlightedNoteId}
          highlightedNoteClicked={highlightedNoteClicked}
        />
      )}

      {/* Suggestions Sidebar */}
      {bookId && (
        <SuggestionsSidebar
          isOpen={showSuggestionsSidebar}
          onClose={handleCloseSuggestionsSidebar}
          bookId={bookId}
          onGoToPage={handleGoToLocation}
          refreshTrigger={sidebarRefreshTrigger}
          onAddSuggestion={handleAddSuggestion}
          onEditSuggestion={handleEditSuggestion}
          onSuggestionDeleted={handleSuggestionDeleted}
          isEPub={true}
          highlightedSuggestionId={highlightedSuggestionId}
          highlightedTextClicked={highlightedSuggestionClicked}
        />
      )}

      {/* Page View Settings Sidebar */}
      <PageViewSettingsSidebar
        isOpen={showSettingsSidebar}
        onClose={handleCloseSettingsSidebar}
        settings={pageViewSettings}
        onSettingsChange={handlePageViewSettingsChange}
      />
    </div>
  );
}
