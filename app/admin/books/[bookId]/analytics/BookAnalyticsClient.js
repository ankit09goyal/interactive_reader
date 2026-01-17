"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/libs/api";
import HighlightsTab from "./HighlightsTab";
import QuestionsTab from "./QuestionsTab";
import ReadingTab from "./ReadingTab";

/**
 * BookAnalyticsClient - Client component for displaying book analytics with tabs
 * Implements lazy loading - fetches data only when a tab is selected
 */
export default function BookAnalyticsClient({ bookId }) {
  const [activeTab, setActiveTab] = useState("highlights");

  // Separate state for each tab's data
  const [highlightsData, setHighlightsData] = useState(null);
  const [questionsData, setQuestionsData] = useState(null);
  const [readingData, setReadingData] = useState(null);

  // Loading states for each tab
  const [loadingStates, setLoadingStates] = useState({
    highlights: false,
    questions: false,
    reading: false,
  });

  // Error states for each tab
  const [errorStates, setErrorStates] = useState({
    highlights: null,
    questions: null,
    reading: null,
  });

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState({
    highlights: false,
    questions: false,
    reading: false,
  });

  // Fetch highlights analytics
  const fetchHighlightsData = useCallback(async () => {
    if (loadedTabs.highlights) return;

    setLoadingStates((prev) => ({ ...prev, highlights: true }));
    setErrorStates((prev) => ({ ...prev, highlights: null }));

    try {
      const data = await apiClient.get(
        `/admin/books/${bookId}/analytics/highlights`
      );
      setHighlightsData(data);
      setLoadedTabs((prev) => ({ ...prev, highlights: true }));
    } catch (err) {
      console.error("Failed to fetch highlights analytics:", err);
      setErrorStates((prev) => ({
        ...prev,
        highlights: err.message || "Failed to load highlights analytics",
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, highlights: false }));
    }
  }, [bookId, loadedTabs.highlights]);

  // Fetch questions analytics
  const fetchQuestionsData = useCallback(async () => {
    if (loadedTabs.questions) return;

    setLoadingStates((prev) => ({ ...prev, questions: true }));
    setErrorStates((prev) => ({ ...prev, questions: null }));

    try {
      const data = await apiClient.get(
        `/admin/books/${bookId}/analytics/questions`
      );
      setQuestionsData(data);
      setLoadedTabs((prev) => ({ ...prev, questions: true }));
    } catch (err) {
      console.error("Failed to fetch questions analytics:", err);
      setErrorStates((prev) => ({
        ...prev,
        questions: err.message || "Failed to load questions analytics",
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, questions: false }));
    }
  }, [bookId, loadedTabs.questions]);

  // Fetch reading analytics
  const fetchReadingData = useCallback(async () => {
    if (loadedTabs.reading) return;

    setLoadingStates((prev) => ({ ...prev, reading: true }));
    setErrorStates((prev) => ({ ...prev, reading: null }));

    try {
      const data = await apiClient.get(
        `/admin/books/${bookId}/analytics/reading`
      );
      setReadingData(data);
      setLoadedTabs((prev) => ({ ...prev, reading: true }));
    } catch (err) {
      console.error("Failed to fetch reading analytics:", err);
      setErrorStates((prev) => ({
        ...prev,
        reading: err.message || "Failed to load reading analytics",
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, reading: false }));
    }
  }, [bookId, loadedTabs.reading]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!bookId) return;

    if (activeTab === "highlights") {
      fetchHighlightsData();
    } else if (activeTab === "questions") {
      fetchQuestionsData();
    } else if (activeTab === "reading") {
      fetchReadingData();
    }
  }, [
    activeTab,
    bookId,
    fetchHighlightsData,
    fetchQuestionsData,
    fetchReadingData,
  ]);

  const tabs = [
    { id: "highlights", label: "Highlights" },
    { id: "questions", label: "Questions" },
    { id: "reading", label: "Reading" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="tabs tabs-lift">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-content"
                : "bg-base-200 text-base-content/70 hover:bg-base-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "highlights" && (
        <HighlightsTab
          data={highlightsData}
          isLoading={loadingStates.highlights}
          error={errorStates.highlights}
          onRetry={() => {
            setLoadedTabs((prev) => ({ ...prev, highlights: false }));
            fetchHighlightsData();
          }}
        />
      )}
      {activeTab === "questions" && (
        <QuestionsTab
          data={questionsData}
          isLoading={loadingStates.questions}
          error={errorStates.questions}
          onRetry={() => {
            setLoadedTabs((prev) => ({ ...prev, questions: false }));
            fetchQuestionsData();
          }}
        />
      )}
      {activeTab === "reading" && (
        <ReadingTab
          data={readingData}
          isLoading={loadingStates.reading}
          error={errorStates.reading}
          onRetry={() => {
            setLoadedTabs((prev) => ({ ...prev, reading: false }));
            fetchReadingData();
          }}
        />
      )}
    </div>
  );
}
