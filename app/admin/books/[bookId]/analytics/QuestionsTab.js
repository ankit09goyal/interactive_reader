import StatCard from "@/components/StatCard";
import GdprNotice from "@/components/GdprNotice";
import ProgressBar from "@/components/ProgressBar";
import StatsPanel from "@/components/StatsPanel";
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
        <p className="text-base-content/70">No questions data available yet.</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Questions"
          value={summary?.totalQuestions || 0}
          colorClass="text-neutral"
        />

        <StatCard
          title="Avg Questions/User"
          value={userEngagement?.avgQuestionsPerUser || 0}
          subtitle={`Based on ${
            userEngagement?.totalUsersWithAccess || 0
          } users`}
          colorClass="text-neutral"
        />
      </div>

      {/* User Engagement and Answer Status Section */}
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
              label: "Users Who Asked Questions",
              value: userEngagement?.usersWhoAskedQuestions || 0,
              valueColorClass: "text-primary",
            },
            {
              label: "Users Who Didn't Ask Questions",
              value: userEngagement?.usersWhoDidntAskQuestions || 0,
              valueColorClass: "text-primary/60",
            },
          ]}
          footer={
            <ProgressBar
              value={userEngagement?.questionRate || 0}
              label="Question Rate"
              description="Percentage of users who have asked at least one question"
            />
          }
        />

        {/* Answer Status */}
        <StatsPanel
          title="Answer Status"
          stats={[
            {
              label: "Total Questions",
              value: summary?.totalQuestions || 0,
            },
            {
              label: "Answered Questions",
              value: summary?.answeredQuestions || 0,
              valueColorClass: "text-primary",
            },
            {
              label: "Unanswered Questions",
              value: summary?.unansweredQuestions || 0,
              valueColorClass: "text-primary/60",
            },
          ]}
          footer={
            <ProgressBar
              value={summary?.answeredPercentage || 0}
              label="Answer Rate"
              description="Percentage of questions that have been answered"
            />
          }
        />
      </div>

      {/* Question Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatsPanel
          title="Question Type Distribution"
          stats={[
            {
              label: "Public Questions",
              value: summary?.publicQuestions || 0,
              valueColorClass: "text-neutral",
            },
            {
              label: "Private Questions",
              value: summary?.privateQuestions || 0,
              valueColorClass: "text-primary",
            },
          ]}
          footer={
            <ProgressBar
              value={summary?.publicPercentage || 0}
              label="Percentage Public Questions"
              description="Percentage of questions that are public vs private"
            />
          }
        />
      </div>

      {/* GDPR Notice */}
      <GdprNotice />
    </div>
  );
}

export default QuestionsTab;
