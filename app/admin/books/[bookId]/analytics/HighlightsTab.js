import StatCard from "@/components/StatCard";
import GdprNotice from "@/components/GdprNotice";

/**
 * HighlightsTab - Displays highlights analytics for a book
 */
function HighlightsTab({ data, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
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
        <button onClick={onRetry} className="btn btn-error btn-sm mt-4">
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <p className="text-base-content/70">
          No highlights data available yet.
        </p>
        <p className="text-sm text-base-content/50 mt-2">
          Highlights analytics will appear here once users start highlighting in
          this book.
        </p>
      </div>
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
          colorClass="text-primary"
        />
        <StatCard
          title="With Notes"
          value={summary?.withNotes || 0}
          subtitle={`${summary?.notesPercentage || 0}% of highlights`}
          colorClass="text-success"
        />
        <StatCard
          title="Without Notes"
          value={summary?.withoutNotes || 0}
          colorClass="text-warning"
        />
        <StatCard
          title="Avg Highlights/User"
          value={userEngagement?.avgHighlightsPerUser || 0}
          subtitle={`Based on ${
            userEngagement?.totalUsersWithAccess || 0
          } users`}
          colorClass="text-info"
        />
      </div>

      {/* User Engagement Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Engagement Stats */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">User Engagement</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">
                Total Users with Access
              </span>
              <span className="font-semibold text-lg">
                {userEngagement?.totalUsersWithAccess || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">
                Users Who Highlighted
              </span>
              <span className="font-semibold text-lg text-success">
                {userEngagement?.usersWhoHighlighted || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">
                Users Who Didn&apos;t Highlight
              </span>
              <span className="font-semibold text-lg text-warning">
                {userEngagement?.usersWhoDidntHighlight || 0}
              </span>
            </div>

            {/* Highlighting Rate Progress Bar */}
            <div className="pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-base-content/70">Highlighting Rate</span>
                <span className="font-medium">
                  {userEngagement?.highlightingRate || 0}%
                </span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-4">
                <div
                  className="bg-success h-4 rounded-full transition-all"
                  style={{ width: `${userEngagement?.highlightingRate || 0}%` }}
                />
              </div>
              <p className="text-xs text-base-content/50 mt-2 text-center">
                Percentage of users who have created at least one highlight
              </p>
            </div>
          </div>
        </div>

        {/* Notes Distribution */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">Notes Distribution</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">Total Highlights</span>
              <span className="font-semibold text-lg">
                {summary?.totalHighlights || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">
                Highlights with Notes
              </span>
              <span className="font-semibold text-lg text-success">
                {summary?.withNotes || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">
                Highlights without Notes
              </span>
              <span className="font-semibold text-lg text-warning">
                {summary?.withoutNotes || 0}
              </span>
            </div>

            {/* Notes Percentage Progress Bar */}
            <div className="pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-base-content/70">Notes Percentage</span>
                <span className="font-medium">
                  {summary?.notesPercentage || 0}%
                </span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all"
                  style={{ width: `${summary?.notesPercentage || 0}%` }}
                />
              </div>
              <p className="text-xs text-base-content/50 mt-2 text-center">
                Percentage of highlights that have accompanying notes
              </p>
            </div>
          </div>
        </div>
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
