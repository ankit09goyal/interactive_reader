"use client";

import { useState, useCallback } from "react";

/**
 * ePubTOC - Table of Contents sidebar for ePub reader
 * Displays hierarchical navigation structure
 */
export default function EPubTOC({
  isOpen,
  onClose,
  toc = [],
  currentChapter,
  onNavigate,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Sidebar */}
      <div className="relative w-150 max-w-[80vw] bg-base-100 shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="font-semibold text-lg">Table of Contents</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* TOC List */}
        <div className="flex-1 overflow-y-auto p-2">
          {toc.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              No table of contents available
            </div>
          ) : (
            <TOCList
              items={toc}
              currentChapter={currentChapter}
              onNavigate={(href) => {
                onNavigate(href);
                onClose();
              }}
              level={0}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * TOCList - Recursive component for rendering TOC items
 */
function TOCList({ items, currentChapter, onNavigate, level = 0 }) {
  return (
    <ul className={`space-y-1 ${level > 0 ? "ml-4" : ""}`}>
      {items.map((item, index) => (
        <TOCItem
          key={item.id || index}
          item={item}
          currentChapter={currentChapter}
          onNavigate={onNavigate}
          level={level}
        />
      ))}
    </ul>
  );
}

/**
 * TOCItem - Individual TOC item with collapsible children
 */
function TOCItem({ item, currentChapter, onNavigate, level }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.subitems && item.subitems.length > 0;

  // Check if this item is the current chapter
  const isActive = currentChapter?.href === item.href;

  const handleClick = useCallback(() => {
    if (item.href) {
      onNavigate(item.href);
    }
  }, [item.href, onNavigate]);

  const toggleExpand = useCallback((e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <li>
      <div
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
          isActive ? "bg-primary/20 text-primary" : "hover:bg-base-200"
        }`}
        onClick={handleClick}
      >
        {/* Expand/Collapse button for items with children */}
        {hasChildren ? (
          <button
            onClick={toggleExpand}
            className="btn btn-ghost btn-xs btn-square flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        ) : (
          <span className="w-6 flex-shrink-0" />
        )}

        {/* Item label */}
        <span className="text-sm text-wrap flex-1">{item.label}</span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <TOCList
          items={item.subitems}
          currentChapter={currentChapter}
          onNavigate={onNavigate}
          level={level + 1}
        />
      )}
    </li>
  );
}
