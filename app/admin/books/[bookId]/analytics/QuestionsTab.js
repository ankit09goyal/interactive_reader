import StatCard from "@/components/StatCard";
import GdprNotice from "@/components/GdprNotice";

/**
 * QuestionsTab - Displays questions analytics for a book
 */
function QuestionsTab({ data, isLoading, error, onRetry }) {
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
          No questions data available yet.
        </p>
        <p className="text-sm text-base-content/50 mt-2">
          Questions analytics will appear here once users start asking questions
          in this book.
        </p>
      </div>
    );
  }

  const { summary, userEngagement } = data;

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Questions"
          value={summary?.totalQuestions || 0}
          colorClass="text-primary"
        />
        <StatCard
          title="Public Questions"
          value={summary?.publicQuestions || 0}
          colorClass="text-success"
        />
        <StatCard
          title="Private Questions"
          value={summary?.privateQuestions || 0}
          colorClass="text-info"
        />
        <StatCard
          title="Avg Questions/User"
          value={userEngagement?.avgQuestionsPerUser || 0}
          subtitle={`Based on ${
            userEngagement?.totalUsersWithAccess || 0
          } users`}
          colorClass="text-accent"
        />
      </div>

      {/* User Engagement and Answer Status Section */}
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
                Users Who Asked Questions
              </span>
              <span className="font-semibold text-lg text-success">
                {userEngagement?.usersWhoAskedQuestions || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">
                Users Who Didn&apos;t Ask Questions
              </span>
              <span className="font-semibold text-lg text-warning">
                {userEngagement?.usersWhoDidntAskQuestions || 0}
              </span>
            </div>

            {/* Question Rate Progress Bar */}
            <div className="pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-base-content/70">Question Rate</span>
                <span className="font-medium">
                  {userEngagement?.questionRate || 0}%
                </span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-4">
                <div
                  className="bg-success h-4 rounded-full transition-all"
                  style={{ width: `${userEngagement?.questionRate || 0}%` }}
                />
              </div>
              <p className="text-xs text-base-content/50 mt-2 text-center">
                Percentage of users who have asked at least one question
              </p>
            </div>
          </div>
        </div>

        {/* Answer Status */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">Answer Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">Total Questions</span>
              <span className="font-semibold text-lg">
                {summary?.totalQuestions || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">Answered Questions</span>
              <span className="font-semibold text-lg text-success">
                {summary?.answeredQuestions || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">Unanswered Questions</span>
              <span className="font-semibold text-lg text-warning">
                {summary?.unansweredQuestions || 0}
              </span>
            </div>

            {/* Answer Percentage Progress Bar */}
            <div className="pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-base-content/70">Answer Rate</span>
                <span className="font-medium">
                  {summary?.answeredPercentage || 0}%
                </span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all"
                  style={{ width: `${summary?.answeredPercentage || 0}%` }}
                />
              </div>
              <p className="text-xs text-base-content/50 mt-2 text-center">
                Percentage of questions that have been answered
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Question Type Distribution */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">Question Type Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">Public Questions</span>
              <span className="font-semibold text-success text-lg">
                {summary?.publicQuestions || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">Private Questions</span>
              <span className="font-semibold text-info text-lg">
                {summary?.privateQuestions || 0}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {summary?.totalQuestions > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-base-content/70">
                    Public
                  </span>
                  <div className="flex-1 bg-base-300 rounded-full h-4">
                    <div
                      className="bg-success h-4 rounded-full"
                      style={{
                        width: `${
                          ((summary.publicQuestions || 0) /
                            summary.totalQuestions) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-base-content/50 w-12 text-right">
                    {Math.round(
                      ((summary.publicQuestions || 0) /
                        summary.totalQuestions) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-base-content/70">
                    Private
                  </span>
                  <div className="flex-1 bg-base-300 rounded-full h-4">
                    <div
                      className="bg-info h-4 rounded-full"
                      style={{
                        width: `${
                          ((summary.privateQuestions || 0) /
                            summary.totalQuestions) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-base-content/50 w-12 text-right">
                    {Math.round(
                      ((summary.privateQuestions || 0) /
                        summary.totalQuestions) *
                        100
                    )}
                    %
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* GDPR Notice */}
      <GdprNotice />
    </div>
  );
}

export default QuestionsTab;
