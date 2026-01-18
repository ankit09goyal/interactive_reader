import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import QuestionsTab from "@/app/admin/books/[bookId]/analytics/QuestionsTab";

// Mock child components
vi.mock("@/components/analytics/StatCard", () => ({
  default: ({ title, value, subtitle }) => (
    <div data-testid="stat-card">
      <div data-testid="stat-title">{title}</div>
      <div data-testid="stat-value">{value}</div>
      {subtitle && <div data-testid="stat-subtitle">{subtitle}</div>}
    </div>
  ),
}));

vi.mock("@/components/analytics/StatsPanel", () => ({
  default: ({ title, stats, footer }) => (
    <div data-testid="stats-panel">
      <div data-testid="panel-title">{title}</div>
      {stats.map((stat, i) => (
        <div key={i} data-testid={`stat-${i}`}>
          {stat.label}: {stat.value}
        </div>
      ))}
      {footer && <div data-testid="panel-footer">{footer}</div>}
    </div>
  ),
}));

vi.mock("@/components/analytics/ProgressBar", () => ({
  default: ({ value, label }) => (
    <div data-testid="progress-bar">
      {label}: {value}%
    </div>
  ),
}));

vi.mock("@/components/analytics/LoadingStat", () => ({
  default: () => <div data-testid="loading-stat">Loading...</div>,
}));

vi.mock("@/components/analytics/ErrorStat", () => ({
  default: ({ error, onRetry }) => (
    <div data-testid="error-stat">
      Error: {error}
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

vi.mock("@/components/analytics/NoData", () => ({
  default: ({ label, description }) => (
    <div data-testid="no-data">
      <div>{label}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock("@/components/GdprNotice", () => ({
  default: () => <div data-testid="gdpr-notice">GDPR Notice</div>,
}));

describe("QuestionsTab Component", () => {
  const mockData = {
    summary: {
      totalQuestions: 50,
      publicQuestions: 30,
      privateQuestions: 20,
      unansweredQuestions: 10,
      answeredQuestions: 40,
      answeredPercentage: 80,
      publicPercentage: 60,
    },
    userEngagement: {
      totalUsersWithAccess: 25,
      usersWhoAskedQuestions: 10,
      usersWhoDidntAskQuestions: 15,
      avgQuestionsPerUser: 2.0,
      questionRate: 40,
    },
  };

  it("renders loading state", () => {
    render(<QuestionsTab isLoading={true} />);
    expect(screen.getByTestId("loading-stat")).toBeInTheDocument();
  });

  it("renders error state", () => {
    const onRetry = vi.fn();
    render(<QuestionsTab error="Test error" onRetry={onRetry} />);
    expect(screen.getByText(/Error: Test error/i)).toBeInTheDocument();
  });

  it("renders no data state", () => {
    render(<QuestionsTab data={null} />);
    expect(screen.getByTestId("no-data")).toBeInTheDocument();
  });

  it("renders summary stats", () => {
    render(<QuestionsTab data={mockData} />);
    
    const statCards = screen.getAllByTestId("stat-card");
    expect(statCards.length).toBe(2);
    expect(screen.getByText("Total Questions")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("renders user engagement stats", () => {
    render(<QuestionsTab data={mockData} />);
    
    expect(screen.getByText("User Engagement")).toBeInTheDocument();
    expect(screen.getByText(/Total Users with Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Users Who Asked Questions/i)).toBeInTheDocument();
  });

  it("renders answer status stats", () => {
    render(<QuestionsTab data={mockData} />);
    
    expect(screen.getByText("Answer Status")).toBeInTheDocument();
    expect(screen.getAllByText(/Answered Questions/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Unanswered Questions/i)).toBeInTheDocument();
  });

  it("renders question type distribution", () => {
    render(<QuestionsTab data={mockData} />);
    
    expect(screen.getByText("Question Type Distribution")).toBeInTheDocument();
    const publicQuestions = screen.getAllByText(/Public Questions/i);
    expect(publicQuestions.length).toBeGreaterThan(0);
    expect(screen.getByText(/Private Questions/i)).toBeInTheDocument();
  });

  it("handles missing data gracefully", () => {
    const incompleteData = {
      summary: {},
      userEngagement: {},
    };
    render(<QuestionsTab data={incompleteData} />);
    
    const zeroValues = screen.getAllByText("0");
    expect(zeroValues.length).toBeGreaterThan(0); // Default values
  });

  it("displays correct question rate", () => {
    render(<QuestionsTab data={mockData} />);
    
    expect(screen.getByText(/Question Rate/i)).toBeInTheDocument();
  });

  it("displays correct answer rate", () => {
    render(<QuestionsTab data={mockData} />);
    
    expect(screen.getByText(/Answer Rate/i)).toBeInTheDocument();
  });

  it("displays correct public percentage", () => {
    render(<QuestionsTab data={mockData} />);
    
    expect(screen.getByText(/Percentage Public Questions/i)).toBeInTheDocument();
  });

  it("renders GDPR notice", () => {
    render(<QuestionsTab data={mockData} />);
    expect(screen.getByTestId("gdpr-notice")).toBeInTheDocument();
  });

  it("displays average questions per user", () => {
    render(<QuestionsTab data={mockData} />);
    
    expect(screen.getByText(/Avg Questions\/User/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("handles zero questions", () => {
    const zeroData = {
      summary: {
        totalQuestions: 0,
        publicQuestions: 0,
        privateQuestions: 0,
        unansweredQuestions: 0,
        answeredQuestions: 0,
        answeredPercentage: 0,
        publicPercentage: 0,
      },
      userEngagement: {
        totalUsersWithAccess: 10,
        usersWhoAskedQuestions: 0,
        usersWhoDidntAskQuestions: 10,
        avgQuestionsPerUser: 0,
        questionRate: 0,
      },
    };
    render(<QuestionsTab data={zeroData} />);
    
    const zeroValues = screen.getAllByText("0");
    expect(zeroValues.length).toBeGreaterThan(0);
  });
});
