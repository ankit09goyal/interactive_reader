import StatCard from "@/components/analytics/StatCard";
import SimpleBarChart from "@/components/SimpleBarChart";
import HourlyChart from "@/components/HourlyChart";
import GdprNotice from "@/components/GdprNotice";
import LoadingStat from "@/components/analytics/LoadingStat";
import ErrorStat from "@/components/analytics/ErrorStat";
import NoData from "@/components/analytics/NoData";
/**
 * ReadingTab - Reading analytics tab with all current stats
 */
export default function ReadingTab({ data, isLoading, error, onRetry }) {
  if (isLoading) {
    return <LoadingStat />;
  }

  if (error) {
    return <ErrorStat error={error} onRetry={onRetry} />;
  }

  if (!data) {
    return (
      <NoData
        label="No reading data available yet."
        description="Reading analytics will appear here once users start reading this book."
      />
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
    peakReadingTimes = [],
    sessionsOverTime = [],
    readingActivity = [],
  } = data;

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Reading Time"
          value={summary?.totalReadingTimeFormatted || "0s"}
        />
        <StatCard title="Total Sessions" value={summary?.totalSessions || 0} />
        <StatCard
          title="Avg Session Duration"
          value={summary?.avgSessionDurationFormatted || "0s"}
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
                        className="bg-neutral h-4 rounded-full"
                        style={{
                          width: `${(item.sessionCount / maxSessions) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-base-content/70 w-12 text-right">
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

      <GdprNotice />
    </div>
  );
}
