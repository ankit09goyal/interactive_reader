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
import { useReadingAnalytics } from "@/libs/useReadingAnalytics";

// Components
import EPubToolbar from "./ePubReader/ePubToolbar";
import EPubViewer from "./ePubReader/ePubViewer";
import EPubTOC from "./ePubReader/ePubTOC";
import NotesModal from "./NotesModal";
import TextSelectionMenu from "./TextSelectionMenu";
import QuestionModal from "./QuestionModal";
import QuestionsSidebar from "./QuestionsSidebar";
import HighlightsSidebar from "./HighlightsSidebar";
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
  const [showQuestionsSidebar, setShowQuestionsSidebar] = useState(false);
  const [showHighlightsSidebar, setShowHighlightsSidebar] = useState(false);
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState(null);
  const [highlightedTextClicked, setHighlightedTextClicked] = useState(0);
  const [highlightedNoteId, setHighlightedNoteId] = useState(null);
  const [highlightedNoteClicked, setHighlightedNoteClicked] = useState(0);

  // Page view settings state (global user preferences)
  const [pageViewSettings, setPageViewSettings] = useState(
    DEFAULT_PAGE_VIEW_SETTINGS
  );
  const [pageViewSettingsLoaded, setPageViewSettingsLoaded] = useState(false);

  // Refs for click outside handling
  const questionsSidebarRef = useRef(null);
  const highlightsSidebarRef = useRef(null);

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
    showNotesModal,
    showQuestionModal,
    showSidebar: showQuestionsSidebar || showHighlightsSidebar,
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
      // Close highlights sidebar if open, open questions sidebar
      setShowHighlightsSidebar(false);
      setShowQuestionsSidebar(true);
      setHighlightedTextClicked((prev) => prev + 1);
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
      setShowSettingsSidebar(false);
      setShowQuestionsSidebar(true);
    }
  }, [showQuestionsSidebar]);

  // Toggle highlights sidebar (close questions sidebar if open)
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
      setShowSettingsSidebar(false);
      setShowHighlightsSidebar(true);
    }
  }, [showHighlightsSidebar]);

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
      setShowSettingsSidebar(true);
    }
  }, [showSettingsSidebar]);

  // Close settings sidebar
  const handleCloseSettingsSidebar = useCallback(() => {
    setShowSettingsSidebar(false);
  }, []);

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

  // Handle click outside sidebars to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close sidebars if clicking on modals
      if (showNotesModal || showQuestionModal) return;

      // Don't close if clicking on toolbar buttons
      if (event.target.closest(".toolbar")) return;

      // Check if click is outside both sidebars
      const isOutsideQuestionsSidebar =
        !showQuestionsSidebar ||
        !event.target.closest('[data-sidebar="questions"]');
      const isOutsideHighlightsSidebar =
        !showHighlightsSidebar ||
        !event.target.closest('[data-sidebar="highlights"]');

      // Close questions sidebar if clicking outside
      if (showQuestionsSidebar && isOutsideQuestionsSidebar) {
        handleCloseQuestionsSidebar();
      }

      // Close highlights sidebar if clicking outside
      if (showHighlightsSidebar && isOutsideHighlightsSidebar) {
        handleCloseHighlightsSidebar();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showQuestionsSidebar,
    showHighlightsSidebar,
    showNotesModal,
    showQuestionModal,
    handleCloseQuestionsSidebar,
    handleCloseHighlightsSidebar,
  ]);

  return (
    <div className="flex flex-col w-full h-full bg-base-100 overflow-hidden">
      {/* Toolbar */}
      <EPubToolbar
        title={title}
        backHref={backHref}
        isLoading={isLoading}
        fontSize={pageViewSettings.fontSize}
        showTOC={showTOC}
        showQuestionsSidebar={showQuestionsSidebar}
        showHighlightsSidebar={showHighlightsSidebar}
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
        onToggleQuestionsSidebar={handleToggleQuestionsSidebar}
        onToggleHighlightsSidebar={handleToggleHighlightsSidebar}
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

      {/* Questions Sidebar */}
      {bookId && (
        <div data-sidebar="questions">
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
        </div>
      )}

      {/* Highlights Sidebar */}
      {bookId && (
        <div data-sidebar="highlights">
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
        </div>
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
