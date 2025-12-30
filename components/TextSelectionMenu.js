"use client";

import { useEffect, useRef } from "react";
import icons from "@/libs/icons";

/**
 * TextSelectionMenu - Floating menu that appears when user selects text in PDF/ePub
 * Shows "Ask Question" button for all users
 * Shows "Create Public Q&A" button for admins
 * Shows "Add Highlight" button for ePub books only
 */
export default function TextSelectionMenu({
  position,
  selectedText,
  onAskQuestion,
  onCreatePublicQA,
  onClose,
  isAdmin = false,
  isEPub = false,
  onAddHighlight,
  onAddNotes,
}) {
  const menuRef = useRef(null);
  const colorOptions = [
    { value: "yellow", label: "Yellow", class: "bg-yellow-300" },
    { value: "green", label: "Green", class: "bg-green-300" },
    { value: "blue", label: "Blue", class: "bg-blue-300" },
    { value: "pink", label: "Pink", class: "bg-pink-300" },
    { value: "orange", label: "Orange", class: "bg-orange-300" },
  ];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!position || !selectedText) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-base-100 rounded-lg shadow-xl border border-base-300 p-4 flex flex-col gap-1 space-y-2"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, 8px)",
      }}
    >
      {/* Add Highlight button */}
      {onAddHighlight && (
        <div className="flex gap-2">
          {colorOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onAddHighlight(option.value)}
              className={`btn btn-circle w-6 h-6 transition-all ${option.class}`}
              title={option.label}
            />
          ))}
        </div>
      )}

      {/* add notes button - for all users */}
      <button
        onClick={() => onAddNotes(selectedText)}
        className="btn btn-sm btn-ghost gap-2 justify-start"
      >
        {icons.pencil}
        Take Notes
      </button>

      {/* Ask Question button - for all users */}
      <button
        onClick={() => onAskQuestion(selectedText)}
        className="btn btn-sm btn-ghost gap-2 justify-start"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Ask Question
      </button>

      {/* Create Public Q&A button - for admins only */}
      {isAdmin && (
        <button
          onClick={() => onCreatePublicQA(selectedText)}
          className="btn btn-sm btn-primary gap-2 justify-start"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          Create Public Q&A
        </button>
      )}

      {/* Selected text preview */}
      <div className="px-2 pt-1 border-t border-base-300 mt-1">
        <p className="text-xs text-base-content/50 truncate max-w-[200px]">
          &ldquo;{selectedText.substring(0, 50)}
          {selectedText.length > 50 ? "..." : ""}&rdquo;
        </p>
      </div>
    </div>
  );
}
