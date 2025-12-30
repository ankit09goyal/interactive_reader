"use client";

import { useState, useEffect, useRef } from "react";
import icons from "@/libs/icons";

/**
 * NotesModal - Modal for adding/editing notes on highlights
 */
export default function NotesModal({
  isOpen,
  onClose,
  highlight,
  onSave,
  isLoading = false,
}) {
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("yellow");
  const textareaRef = useRef(null);

  // Color options
  const colorOptions = [
    { value: "yellow", label: "Yellow", class: "bg-yellow-300" },
    { value: "green", label: "Green", class: "bg-green-300" },
    { value: "blue", label: "Blue", class: "bg-blue-300" },
    { value: "pink", label: "Pink", class: "bg-pink-300" },
    { value: "orange", label: "Orange", class: "bg-orange-300" },
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && highlight) {
      setNotes(highlight.notes || "");
      setColor(highlight.color || "yellow");
      // Focus textarea
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, highlight]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (onSave) {
      await onSave({
        notes: notes.trim() || null,
        color,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold">
            {highlight?.notes ? "Edit Note" : "Add Note"}
          </h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square"
            disabled={isLoading}
          >
            {icons.close}
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Highlighted text preview */}
          {highlight?.selectedText && (
            <div className="bg-base-200 rounded-lg p-3">
              <p className="text-xs text-base-content/60 mb-1">
                Highlighted Text:
              </p>
              <p className="text-sm italic line-clamp-3">
                &ldquo;{highlight.selectedText}&rdquo;
              </p>
              {highlight.chapterTitle && (
                <p className="text-xs text-base-content/50 mt-1">
                  Chapter: {highlight.chapterTitle}
                </p>
              )}
            </div>
          )}

          {/* Highlight color selector */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Highlight Color</span>
            </label>
            <div className="flex gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setColor(option.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    option.class
                  } ${
                    color === option.value
                      ? "border-base-content scale-110"
                      : "border-transparent hover:border-base-content/30"
                  }`}
                  title={option.label}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Notes input */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Your Notes</span>
            </label>
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes about this highlight..."
              className="textarea textarea-bordered w-full h-32 resize-none"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-base-300">
          {/* Save/Cancel buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={isLoading || !notes.trim()}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
