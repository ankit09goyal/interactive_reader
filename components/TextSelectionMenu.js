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
        <span className="h-4 w-4 flex items-center justify-center">
          {icons.question}
        </span>
        Ask Question
      </button>

      {/* Create Public Q&A button - for admins only */}
      {isAdmin && (
        <button
          onClick={() => onCreatePublicQA(selectedText)}
          className="btn btn-sm btn-primary gap-2 justify-start"
        >
          {icons.book}
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
