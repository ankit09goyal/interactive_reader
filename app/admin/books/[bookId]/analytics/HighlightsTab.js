import StatCard from "@/components/analytics/StatCard";
import GdprNotice from "@/components/GdprNotice";
import ProgressBar from "@/components/ProgressBar";
import StatsPanel from "@/components/analytics/StatsPanel";
import LoadingStat from "@/components/analytics/LoadingStat";
import ErrorStat from "@/components/analytics/ErrorStat";
import NoData from "@/components/analytics/NoData";
/**
 * HighlightsTab - Displays highlights analytics for a book
 */
function HighlightsTab({ data, isLoading, error, onRetry }) {
  if (isLoading) {
    return <LoadingStat />;
  }

  if (error) {
    return <ErrorStat error={error} onRetry={onRetry} />;
  }

  if (!data) {
    return (
      <NoData
        label="No highlights data available yet."
        description="Highlights analytics will appear here once users start highlighting passages in this book."
      />
    );
  }

  const { summary, userEngagement, popularHighlights = [] } = data;

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Highlights"
          value={summary?.totalHighlights || 0}
        />
        <StatCard
          title="With Notes"
          value={summary?.withNotes || 0}
          subtitle={`${summary?.notesPercentage || 0}% of highlights`}
        />
        <StatCard title="Without Notes" value={summary?.withoutNotes || 0} />
        <StatCard
          title="Avg Highlights/User"
          value={userEngagement?.avgHighlightsPerUser || 0}
          subtitle={`Based on ${
            userEngagement?.totalUsersWithAccess || 0
          } users`}
        />
      </div>

      {/* User Engagement Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Engagement Stats */}
        <StatsPanel
          title="User Engagement"
          stats={[
            {
              label: "Total Users with Access",
              value: userEngagement?.totalUsersWithAccess || 0,
            },
            {
              label: "Users Who Highlighted",
              value: userEngagement?.usersWhoHighlighted || 0,
              valueColorClass: "text-primary",
            },
            {
              label: "Users Who Didn't Highlight",
              value: userEngagement?.usersWhoDidntHighlight || 0,
              valueColorClass: "text-primary/60",
            },
          ]}
          footer={
            <ProgressBar
              value={userEngagement?.highlightingRate || 0}
              label="Highlighting Rate"
              description="Percentage of users who have created at least one highlight"
            />
          }
        />

        {/* Notes Distribution */}
        <StatsPanel
          title="Notes Distribution"
          bgClass="bg-base-200 border border-base-300"
          stats={[
            {
              label: "Total Highlights",
              value: summary?.totalHighlights || 0,
            },
            {
              label: "Highlights with Notes",
              value: summary?.withNotes || 0,
              valueColorClass: "text-primary",
            },
            {
              label: "Highlights without Notes",
              value: summary?.withoutNotes || 0,
              valueColorClass: "text-primary/60",
            },
          ]}
          footer={
            <ProgressBar
              value={summary?.notesPercentage || 0}
              label="Notes Percentage"
              description="Percentage of highlights that have accompanying notes"
            />
          }
        />
      </div>

      {/* Popular Highlights */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-2">
          Most Popular Highlighted Passages
        </h2>
        <p className="text-xs text-base-content/50 mb-4">
          Text passages that multiple users have highlighted (70% text
          similarity threshold)
        </p>
        {popularHighlights.length > 0 ? (
          <div className="space-y-3">
            {popularHighlights.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-base-300/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-base-content line-clamp-3">
                    &ldquo;{item.text}&rdquo;
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="badge badge-primary badge-lg">
                    {item.userCount} {item.userCount === 1 ? "user" : "users"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base-content/50 text-sm">
            No passages have been highlighted by multiple users yet.
          </p>
        )}
      </div>

      {/* GDPR Notice */}
      <GdprNotice />
    </div>
  );
}

export default HighlightsTab;
