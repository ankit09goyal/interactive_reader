"use client";

import { useState, useEffect } from "react";
import apiClient from "@/libs/api";

/**
 * StatCard - Reusable stat card component
 */
function StatCard({ title, value, subtitle, colorClass = "text-primary" }) {
  return (
    <div className="bg-base-200 rounded-xl p-6 border border-base-300">
      <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-sm text-base-content/70 mt-1">{title}</div>
      {subtitle && (
        <div className="text-xs text-base-content/50 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

/**
 * ProgressBar - Simple progress bar component
 */
function ProgressBar({
  value,
  max,
  colorClass = "bg-primary",
  label,
  showValue = true,
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span
          className="w-24 text-sm text-base-content/70 truncate"
          title={label}
        >
          {label}
        </span>
      )}
      <div className="flex-1 bg-base-300 rounded-full h-4">
        <div
          className={`${colorClass} h-4 rounded-full flex items-center justify-end pr-2`}
          style={{
            width: `${Math.max(percentage, showValue && value > 0 ? 10 : 0)}%`,
          }}
        >
          {showValue && value > 0 && (
            <span className="text-xs font-semibold text-white">{value}</span>
          )}
        </div>
      </div>
      {!showValue && (
        <span className="text-xs text-base-content/50 w-12 text-right">
          {value}
        </span>
      )}
    </div>
  );
}

/**
 * SimpleBarChart - Simple horizontal bar chart
 */
function SimpleBarChart({
  data,
  labelKey,
  valueKey,
  colorClass = "bg-primary",
  maxItems = 10,
}) {
  if (!data || data.length === 0) {
    return <p className="text-base-content/50 text-sm">No data available</p>;
  }

  const items = data.slice(0, maxItems);
  const maxValue = Math.max(...items.map((item) => item[valueKey]), 1);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <ProgressBar
          key={index}
          value={item[valueKey]}
          max={maxValue}
          colorClass={colorClass}
          label={item[labelKey]}
          showValue={false}
        />
      ))}
    </div>
  );
}

/**
 * HourlyChart - Display reading activity by hour
 */
function HourlyChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-base-content/50 text-sm">No data available</p>;
  }

  const maxTime = Math.max(...data.map((h) => h.totalTime), 1);

  return (
    <div className="grid grid-cols-12 gap-1 h-32">
      {data.map((hour) => {
        const height = maxTime > 0 ? (hour.totalTime / maxTime) * 100 : 0;
        return (
          <div
            key={hour.hour}
            className="flex flex-col items-center justify-end"
            title={`${hour.hourFormatted}: ${hour.totalTime}s (${hour.sessionCount} sessions)`}
          >
            <div
              className="w-full bg-primary rounded-t transition-all"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            {hour.hour % 4 === 0 && (
              <span className="text-xs text-base-content/50 mt-1">
                {hour.hour}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * BookAnalyticsClient - Client component for displaying book analytics
 */
export default function BookAnalyticsClient({ bookId }) {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient.get(`/admin/books/${bookId}/analytics`);
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        setError(err.message || "Failed to load analytics");
      } finally {
        setIsLoading(false);
      }
    };

    if (bookId) {
      fetchAnalytics();
    }
  }, [bookId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error rounded-xl p-6">
        <p className="text-error">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-error btn-sm mt-4"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <p className="text-base-content/70">No analytics data available yet.</p>
        <p className="text-sm text-base-content/50 mt-2">
          Analytics will appear here once users start reading this book.
        </p>
      </div>
    );
  }

  // Destructure with default values to handle missing data
  const {
    summary = {
      totalReadingTime: 0,
      totalReadingTimeFormatted: "0s",
      totalSessions: 0,
      avgSessionDuration: 0,
      avgSessionDurationFormatted: "0s",
    },
    timePerLocation = [],
    dropOffAnalysis = [],
    highlights = {
      byLocation: [],
      withNotes: {
        total: 0,
        withNotes: 0,
        withoutNotes: 0,
        notesPercentage: 0,
      },
    },
    questions = {
      byLocation: [],
      summary: { total: 0, answered: 0, unanswered: 0, answeredPercentage: 0 },
    },
    peakReadingTimes = [],
    sessionsOverTime = [],
    readingActivity = [],
  } = analytics;

  // Ensure nested objects have defaults
  const highlightsWithNotes = highlights?.withNotes || {
    total: 0,
    withNotes: 0,
    withoutNotes: 0,
    notesPercentage: 0,
  };
  const highlightsByLocation = highlights?.byLocation || [];
  const questionsSummary = questions?.summary || {
    total: 0,
    answered: 0,
    unanswered: 0,
    answeredPercentage: 0,
  };
  const questionsByLocation = questions?.byLocation || [];

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Reading Time"
          value={summary?.totalReadingTimeFormatted || "0s"}
          colorClass="text-primary"
        />
        <StatCard
          title="Total Sessions"
          value={summary?.totalSessions || 0}
          colorClass="text-success"
        />
        <StatCard
          title="Avg Session Duration"
          value={summary?.avgSessionDurationFormatted || "0s"}
          colorClass="text-info"
        />
        <StatCard
          title="Total Highlights"
          value={highlightsWithNotes.total || 0}
          subtitle={`${highlightsWithNotes.withNotes || 0} with notes`}
          colorClass="text-warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Per Location */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">
            Time Spent Per Location
          </h2>
          {timePerLocation.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {timePerLocation.map((item, index) => {
                const maxTime = Math.max(
                  ...timePerLocation.map((t) => t.totalTime),
                  1
                );
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span
                      className="w-20 text-sm text-base-content/70 truncate"
                      title={`${item.locationType}: ${item.location}`}
                    >
                      {item.locationType === "page"
                        ? `Page ${item.location}`
                        : item.location}
                    </span>
                    <div className="flex-1 bg-base-300 rounded-full h-4">
                      <div
                        className="bg-primary h-4 rounded-full"
                        style={{
                          width: `${(item.totalTime / maxTime) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-base-content/50 w-16 text-right">
                      {item.totalTimeFormatted}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-base-content/50 text-sm">No reading data yet</p>
          )}
        </div>

        {/* Drop-off Analysis */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">Drop-off Points</h2>
          <p className="text-xs text-base-content/50 mb-4">
            Where readers stop reading (last location per session)
          </p>
          {dropOffAnalysis.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {dropOffAnalysis.map((item, index) => {
                const maxCount = Math.max(
                  ...dropOffAnalysis.map((d) => d.dropOffCount),
                  1
                );
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span
                      className="w-20 text-sm text-base-content/70 truncate"
                      title={item.location}
                    >
                      {item.locationType === "page"
                        ? `Page ${item.location}`
                        : item.location}
                    </span>
                    <div className="flex-1 bg-base-300 rounded-full h-4">
                      <div
                        className="bg-warning h-4 rounded-full"
                        style={{
                          width: `${(item.dropOffCount / maxCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-base-content/50 w-12 text-right">
                      {item.dropOffCount} readers
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-base-content/50 text-sm">No drop-off data yet</p>
          )}
        </div>

        {/* Highlights by Location */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">
            Most Highlighted Sections
          </h2>
          {highlightsByLocation.length > 0 ? (
            <SimpleBarChart
              data={highlightsByLocation}
              labelKey="location"
              valueKey="highlightCount"
              colorClass="bg-accent"
            />
          ) : (
            <p className="text-base-content/50 text-sm">No highlights yet</p>
          )}
        </div>

        {/* Questions by Location */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">Questions by Location</h2>
          <div className="mb-4 flex gap-4 text-sm">
            <span className="text-base-content/70">
              Total: <strong>{questionsSummary.total}</strong>
            </span>
            <span className="text-success">
              Answered: <strong>{questionsSummary.answered}</strong>
            </span>
            <span className="text-warning">
              Pending: <strong>{questionsSummary.unanswered}</strong>
            </span>
          </div>
          {questionsByLocation.length > 0 ? (
            <SimpleBarChart
              data={questionsByLocation}
              labelKey="location"
              valueKey="questionCount"
              colorClass="bg-info"
            />
          ) : (
            <p className="text-base-content/50 text-sm">No questions yet</p>
          )}
        </div>
      </div>

      {/* Peak Reading Times */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">Peak Reading Times</h2>
        <p className="text-xs text-base-content/50 mb-4">
          Reading activity by hour of day (UTC)
        </p>
        <HourlyChart data={peakReadingTimes} />
        <div className="flex justify-between text-xs text-base-content/50 mt-2">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* Sessions Over Time */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">
          Reading Sessions (Last 30 Days)
        </h2>
        {sessionsOverTime.length > 0 ? (
          <div className="space-y-2">
            {sessionsOverTime.slice(-14).map((item) => {
              const maxSessions = Math.max(
                ...sessionsOverTime.map((s) => s.sessionCount),
                1
              );
              return (
                <div key={item.date} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-base-content/70">
                    {new Date(item.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex-1 bg-base-300 rounded-full h-4">
                    <div
                      className="bg-success h-4 rounded-full"
                      style={{
                        width: `${(item.sessionCount / maxSessions) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-base-content/50 w-12 text-right">
                    {item.sessionCount}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-base-content/50 text-sm">
            No sessions recorded yet
          </p>
        )}
      </div>

      {/* Reading Activity Over Time */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">
          Reading Time (Last 30 Days)
        </h2>
        {readingActivity.length > 0 ? (
          <div className="space-y-2">
            {readingActivity.slice(-14).map((item) => {
              const maxTime = Math.max(
                ...readingActivity.map((r) => r.totalTime),
                1
              );
              return (
                <div key={item.date} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-base-content/70">
                    {new Date(item.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex-1 bg-base-300 rounded-full h-4">
                    <div
                      className="bg-primary h-4 rounded-full"
                      style={{
                        width: `${(item.totalTime / maxTime) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-base-content/50 w-16 text-right">
                    {item.totalTimeFormatted}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-base-content/50 text-sm">
            No reading activity yet
          </p>
        )}
      </div>

      {/* Highlight Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h3 className="text-sm font-medium text-base-content/70 mb-2">
            Highlights Overview
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-base-content/70">Total Highlights</span>
              <span className="font-semibold">{highlightsWithNotes.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/70">With Notes</span>
              <span className="font-semibold text-success">
                {highlightsWithNotes.withNotes}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/70">Without Notes</span>
              <span className="font-semibold text-warning">
                {highlightsWithNotes.withoutNotes}
              </span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-3 mt-2">
              <div
                className="bg-success h-3 rounded-full"
                style={{ width: `${highlightsWithNotes.notesPercentage}%` }}
              />
            </div>
            <p className="text-xs text-base-content/50 text-center">
              {highlightsWithNotes.notesPercentage}% of highlights have notes
            </p>
          </div>
        </div>

        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h3 className="text-sm font-medium text-base-content/70 mb-2">
            Questions Overview
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-base-content/70">Total Questions</span>
              <span className="font-semibold">{questionsSummary.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/70">Answered</span>
              <span className="font-semibold text-success">
                {questionsSummary.answered}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/70">Pending</span>
              <span className="font-semibold text-warning">
                {questionsSummary.unanswered}
              </span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-3 mt-2">
              <div
                className="bg-success h-3 rounded-full"
                style={{ width: `${questionsSummary.answeredPercentage}%` }}
              />
            </div>
            <p className="text-xs text-base-content/50 text-center">
              {questionsSummary.answeredPercentage}% of questions answered
            </p>
          </div>
        </div>

        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h3 className="text-sm font-medium text-base-content/70 mb-2">
            Engagement Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-base-content/70">Avg Time/Session</span>
              <span className="font-semibold">
                {summary?.avgSessionDurationFormatted || "0s"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/70">Total Sessions</span>
              <span className="font-semibold">
                {summary?.totalSessions || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/70">Total Reading Time</span>
              <span className="font-semibold">
                {summary?.totalReadingTimeFormatted || "0s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GDPR Notice */}
      <div className="bg-base-200 rounded-xl p-4 border border-base-300 text-center">
        <p className="text-xs text-base-content/50">
          All analytics are aggregated and anonymized. No personal user data is
          displayed or stored. Reading patterns are tracked without identifying
          individual users.
        </p>
      </div>
    </div>
  );
}
