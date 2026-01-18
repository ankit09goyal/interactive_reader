import StatCard from "@/components/analytics/StatCard";
import GdprNotice from "@/components/GdprNotice";
import ProgressBar from "@/components/analytics/ProgressBar";
import StatsPanel from "@/components/analytics/StatsPanel";
import LoadingStat from "@/components/analytics/LoadingStat";
import ErrorStat from "@/components/analytics/ErrorStat";
import NoData from "@/components/analytics/NoData";
/**
 * QuestionsTab - Displays questions analytics for a book
 */
function QuestionsTab({ data, isLoading, error, onRetry }) {
  if (isLoading) {
    return <LoadingStat />;
  }

  if (error) {
    return <ErrorStat error={error} onRetry={onRetry} />;
  }

  if (!data) {
    return (
      <NoData
        label="No questions data available yet."
        description="Questions analytics will appear here once users start asking questions in this book."
      />
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
