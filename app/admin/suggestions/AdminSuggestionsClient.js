"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import apiClient from "@/libs/api";
import icons from "@/libs/icons";

export default function AdminSuggestionsClient({
  initialSuggestions,
  books,
  initialPagination,
}) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [filter, setFilter] = useState("all"); // "all", "replied", "unreplied"
  const [bookFilter, setBookFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (page, status, bookId, search) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "10");

      if (status && status !== "all") {
        params.set("status", status);
      }
      if (bookId && bookId !== "all") {
        params.set("bookId", bookId);
      }
      if (search) {
        params.set("search", search);
      }

      const response = await apiClient.get(
        `/admin/suggestions?${params.toString()}`
      );
      setSuggestions(response.suggestions);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchSuggestions(1, newFilter, bookFilter, searchQuery);
  };

  const handleBookFilterChange = (newBookFilter) => {
    setBookFilter(newBookFilter);
    fetchSuggestions(1, filter, newBookFilter, searchQuery);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSuggestions(1, filter, bookFilter, searchQuery);
  };

  // Handle page changes
  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchSuggestions(page, filter, bookFilter, searchQuery);
  };

  // Refresh suggestions
  const handleRefresh = () => {
    fetchSuggestions(pagination.page, filter, bookFilter, searchQuery);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-base-200 rounded-lg p-4">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="select select-bordered select-sm"
            disabled={isLoading}
          >
            <option value="all">All</option>
            <option value="replied">Replied</option>
            <option value="unreplied">Unreplied</option>
          </select>
        </div>

        {/* Book filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Book:</span>
          <select
            value={bookFilter}
            onChange={(e) => handleBookFilterChange(e.target.value)}
            className="select select-bordered select-sm"
            disabled={isLoading}
          >
            <option value="all">All Books</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search suggestions..."
            className="input input-bordered input-sm w-48"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-ghost btn-sm btn-square"
            disabled={isLoading}
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </form>

        {/* Refresh button */}
        <div className="ml-auto">
          <button
            onClick={handleRefresh}
            className="btn btn-ghost btn-sm gap-2"
            disabled={isLoading}
          >
            {icons.refresh}
            Refresh
          </button>
        </div>
      </div>

      {/* Suggestions list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <SuggestionRowSkeleton key={i} />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12 bg-base-200 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-base-content/30 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-base-content/70">No suggestions found</p>
          <p className="text-sm text-base-content/50 mt-1">
            {filter !== "all" || bookFilter !== "all" || searchQuery
              ? "Try adjusting your filters"
              : "Improvement suggestions from your readers will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <SuggestionRow key={suggestion._id} suggestion={suggestion} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-base-300">
          <div className="text-sm text-base-content/70">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{" "}
            {Math.min(
              pagination.page * pagination.limit,
              pagination.totalCount
            )}{" "}
            of {pagination.totalCount} suggestions
          </div>
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => goToPage(1)}
              disabled={pagination.page === 1 || isLoading}
            >
              «
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1 || isLoading}
            >
              ‹
            </button>
            <div className="join-item btn-sm btn-active btn cursor-text">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <button
              className="join-item btn btn-sm"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || isLoading}
            >
              ›
            </button>
            <button
              className="join-item btn btn-sm"
              onClick={() => goToPage(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages || isLoading}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionRow({ suggestion }) {
  return (
    <Link
      href={`/admin/suggestions/${suggestion._id}`}
      className="block bg-base-100 border border-base-300 rounded-lg p-4 hover:bg-base-200 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-2">
            {suggestion.adminReply ? (
              <span className="badge badge-success badge-sm">Replied</span>
            ) : (
              <span className="badge badge-warning badge-sm">Unreplied</span>
            )}
            {suggestion.book && (
              <span className="badge badge-outline badge-sm">
                {suggestion.book.title}
              </span>
            )}
          </div>

          {/* Selected text preview */}
          {suggestion.selectedText && (
            <p className="text-xs text-base-content/50 italic mb-2 truncate">
              &ldquo;{suggestion.selectedText}&rdquo;
            </p>
          )}

          {/* Suggestion */}
          <p className="font-medium line-clamp-2">{suggestion.suggestion}</p>

          {/* Reply preview */}
          {suggestion.adminReply && (
            <p className="text-sm text-base-content/70 mt-2 line-clamp-1">
              <span className="font-medium">Reply:</span> {suggestion.adminReply}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-3 text-xs text-base-content/50">
            {suggestion.user ? (
              <span>From: {suggestion.user.name || suggestion.user.email}</span>
            ) : (
              <span>Unknown user</span>
            )}
            <span>{new Date(suggestion.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-base-content/30 flex-shrink-0"
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
      </div>
    </Link>
  );
}

function SuggestionRowSkeleton() {
  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {/* Badges skeleton */}
          <div className="flex flex-wrap gap-2">
            <div className="skeleton h-5 w-14 rounded-full"></div>
            <div className="skeleton h-5 w-24 rounded-full"></div>
          </div>

          {/* Selected text skeleton */}
          <div className="skeleton h-3 w-3/4"></div>

          {/* Suggestion skeleton */}
          <div className="space-y-2">
            <div className="skeleton h-5 w-full"></div>
            <div className="skeleton h-5 w-2/3"></div>
          </div>

          {/* Reply preview skeleton */}
          <div className="skeleton h-4 w-4/5"></div>

          {/* Meta info skeleton */}
          <div className="flex items-center gap-4">
            <div className="skeleton h-3 w-32"></div>
            <div className="skeleton h-3 w-20"></div>
          </div>
        </div>

        {/* Arrow skeleton */}
        <div className="skeleton h-5 w-5 flex-shrink-0"></div>
      </div>
    </div>
  );
}
