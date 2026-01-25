"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import icons from "@/libs/icons";

/**
 * EPubSearchPanel - Search panel for searching within an ePub book
 * Shows search input and results list
 */
export default function EPubSearchPanel({
  isOpen,
  onClose,
  book,
  onNavigateToResult,
  isSearching,
  setIsSearching,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Clear search when panel closes
  useEffect(() => {
    if (!isOpen) {
      // Cancel any ongoing search
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [isOpen]);

  // Search function using epub.js spine
  const performSearch = useCallback(async (query) => {
    if (!query.trim() || !book) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    // Cancel any previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const results = [];
      const spine = book.spine;
      
      // Search through each spine item (chapter)
      for (let i = 0; i < spine.spineItems.length; i++) {
        if (signal.aborted) break;
        
        const item = spine.spineItems[i];
        try {
          // Get the section - use index-based access which is more reliable
          const section = spine.get(i);
          if (!section) continue;
          
          // Load the section content if not already loaded
          // This is required for the find() method to work properly
          await section.load(book.load.bind(book));
          
          // Use the find method from epub.js Section
          const sectionResults = await section.find(query.trim());
          
          if (sectionResults && sectionResults.length > 0) {
            // Get chapter title from TOC if available
            let chapterTitle = `Section ${i + 1}`;
            if (book.navigation && book.navigation.toc) {
              const tocItem = book.navigation.toc.find(t => {
                const tocHref = t.href?.split('#')[0];
                const itemHref = item.href?.split('#')[0];
                return tocHref === itemHref || 
                  t.href === item.href || 
                  tocHref?.endsWith(itemHref) ||
                  itemHref?.endsWith(tocHref);
              });
              if (tocItem) {
                chapterTitle = tocItem.label?.trim() || chapterTitle;
              }
            }
            
            // Add results with chapter info and section href for navigation
            sectionResults.forEach((result) => {
              results.push({
                cfi: result.cfi,
                excerpt: result.excerpt,
                chapterTitle,
                chapterIndex: i,
                href: item.href,
              });
            });
          }
        } catch (err) {
          // Continue to next section if one fails
          console.warn(`Failed to search section ${i}:`, err);
        }
      }

      if (!signal.aborted) {
        setSearchResults(results);
      }
    } catch (err) {
      console.error("Search failed:", err);
      if (!signal.aborted) {
        setSearchResults([]);
      }
    } finally {
      if (!signal.aborted) {
        setIsSearching(false);
      }
    }
  }, [book, setIsSearching]);

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  // Handle result click
  const handleResultClick = (result) => {
    // Pass the full result object so we have access to href as fallback
    onNavigateToResult(result, searchQuery);
  };

  // Highlight search term in excerpt
  const highlightExcerpt = (excerpt, query) => {
    if (!query.trim()) return excerpt;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = excerpt.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-300 text-base-content rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-base-100 shadow-xl z-[200] flex flex-col border-r border-base-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <h2 className="font-semibold text-lg">Search Book</h2>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-square"
          title="Close"
        >
          {icons.close}
        </button>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="p-4 border-b border-base-300">
        <div className="join w-full">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search text..."
            className="input input-bordered join-item flex-1 input-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary join-item btn-sm"
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              icons.search
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className="flex flex-col items-center justify-center p-8 text-base-content/60">
            <span className="loading loading-spinner loading-md mb-2"></span>
            <p className="text-sm">Searching...</p>
          </div>
        )}

        {!isSearching && hasSearched && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-base-content/60">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">No results found</p>
            <p className="text-xs mt-1">Try different keywords</p>
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <div className="divide-y divide-base-200">
            <div className="px-4 py-2 bg-base-200/50 text-sm text-base-content/70">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </div>
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleResultClick(result)}
                className="w-full text-left p-4 hover:bg-base-200/50 transition-colors"
              >
                <div className="text-xs text-primary font-medium mb-1 truncate">
                  {result.chapterTitle}
                </div>
                <div className="text-sm text-base-content/80 line-clamp-3">
                  {highlightExcerpt(result.excerpt, searchQuery)}
                </div>
              </button>
            ))}
          </div>
        )}

        {!isSearching && !hasSearched && (
          <div className="flex flex-col items-center justify-center p-8 text-base-content/60">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-sm">Enter text to search</p>
            <p className="text-xs mt-1">Search across all chapters</p>
          </div>
        )}
      </div>
    </div>
  );
}
