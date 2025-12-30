"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";

// Hooks
import { useEPubLoader } from "./ePubReader/hooks/useEPubLoader";
import { useEPubNavigation } from "./ePubReader/hooks/useEPubNavigation";
import { useEPubTextSelection } from "./ePubReader/hooks/useEPubTextSelection";
import { useEPubHighlights } from "./ePubReader/hooks/useEPubHighlights";
import { useEPubQuestionHighlights } from "./ePubReader/hooks/useEPubQuestionHighlights";

// Components
import EPubToolbar from "./ePubReader/ePubToolbar";
import EPubViewer from "./ePubReader/ePubViewer";
import EPubTOC from "./ePubReader/ePubTOC";
import NotesModal from "./NotesModal";
import TextSelectionMenu from "./TextSelectionMenu";
import QuestionModal from "./QuestionModal";
import QuestionsSidebar from "./QuestionsSidebar";

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
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState(null);
  const [highlightedTextClicked, setHighlightedTextClicked] = useState(0);

  // Preferences state
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [initialLocation, setInitialLocation] = useState(null);
  const [initialFontSize, setInitialFontSize] = useState(16);

  // Store selected text for modal (persists even if selection is cleared)
  const [modalSelectedText, setModalSelectedText] = useState(null);
  const [modalSelectionCfi, setModalSelectionCfi] = useState(null);
  const [modalSelectionCfiRange, setModalSelectionCfiRange] = useState(null);
  const [modalChapter, setModalChapter] = useState(null);

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
    showSidebar,
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
  });

  // Question highlights (clickable)
  const { highlights: questionHighlights } = useEPubQuestionHighlights({
    bookId,
    rendition,
    refreshTrigger: sidebarRefreshTrigger,
    onHighlightClick: (questionId) => {
      setHighlightedQuestionId(questionId);
      setShowSidebar(true);
      setHighlightedTextClicked((prev) => prev + 1);
    },
  });

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

  // Navigate to location from sidebar
  const handleCloseQuestionsSidebar = useCallback(() => {
    setShowSidebar(false);
    setHighlightedQuestionId(null);
    setHighlightedTextClicked(0);
  }, [setShowSidebar, setHighlightedQuestionId, setHighlightedTextClicked]);

  return (
    <div className="flex flex-col w-full h-full bg-base-100 overflow-hidden">
      {/* Toolbar */}
      <EPubToolbar
        title={title}
        backHref={backHref}
        currentChapter={currentChapter}
        isLoading={isLoading}
        fontSize={fontSize}
        showTOC={showTOC}
        showSidebar={showSidebar}
        bookId={bookId}
        isAdmin={isAdmin}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
        onToggleTOC={() => setShowTOC(!showTOC)}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        atStart={atStart}
        atEnd={atEnd}
      />

      {/* ePub Viewer */}
      <EPubViewer
        book={book}
        isLoading={isLoading}
        error={error}
        createRendition={createRendition}
        fontSize={fontSize}
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
        <QuestionsSidebar
          isOpen={showSidebar}
          onClose={handleCloseQuestionsSidebar}
          bookId={bookId}
          onGoToPage={handleGoToLocation}
          refreshTrigger={sidebarRefreshTrigger}
          onAddQuestion={handleAddQuestion}
          onQuestionDeleted={handleQuestionDeleted}
          isEPub={true}
          highlights={highlights}
          onHighlightClick={handleHighlightClick}
          highlightedQuestionId={highlightedQuestionId}
          highlightedTextClicked={highlightedTextClicked}
          onHighlightDeleted={handleDeleteHighlight}
        />
      )}
    </div>
  );
}
