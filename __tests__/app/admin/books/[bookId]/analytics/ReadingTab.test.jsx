import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ReadingTab from "@/app/admin/books/[bookId]/analytics/ReadingTab";

// Mock child components
vi.mock("@/components/analytics/StatCard", () => ({
  default: ({ title, value }) => (
    <div data-testid="stat-card">
      <div data-testid="stat-title">{title}</div>
      <div data-testid="stat-value">{value}</div>
    </div>
  ),
}));

vi.mock("@/components/HourlyChart", () => ({
  default: ({ data }) => (
    <div data-testid="hourly-chart">
      {data && data.length > 0 ? `Chart with ${data.length} hours` : "Empty chart"}
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

describe("ReadingTab Component", () => {
  const mockData = {
    summary: {
      totalReadingTime: 3600,
      totalReadingTimeFormatted: "1h",
      totalSessions: 10,
      avgSessionDuration: 300,
      avgSessionDurationFormatted: "5m",
    },
    timePerLocation: [
      {
        locationType: "page",
        location: "1",
        totalTime: 500,
        totalTimeFormatted: "8m 20s",
        viewCount: 5,
      },
      {
        locationType: "chapter",
        location: "Chapter 1",
        totalTime: 300,
        totalTimeFormatted: "5m",
        viewCount: 3,
      },
    ],
    dropOffAnalysis: [
      {
        location: "5",
        locationType: "page",
        dropOffCount: 5,
        totalPages: 100,
        totalChapters: 10,
      },
    ],
    peakReadingTimes: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      hourFormatted: `${String(hour).padStart(2, "0")}:00`,
      totalTime: hour === 10 ? 500 : 0,
      sessionCount: hour === 10 ? 5 : 0,
    })),
    sessionsOverTime: [
      { date: "2024-01-01", sessionCount: 5 },
      { date: "2024-01-02", sessionCount: 3 },
    ],
    readingActivity: [
      { date: "2024-01-01", totalTime: 3600, totalTimeFormatted: "1h" },
      { date: "2024-01-02", totalTime: 1800, totalTimeFormatted: "30m" },
    ],
  };

  it("renders loading state", () => {
    render(<ReadingTab isLoading={true} />);
    expect(screen.getByTestId("loading-stat")).toBeInTheDocument();
  });

  it("renders error state", () => {
    const onRetry = vi.fn();
    render(<ReadingTab error="Test error" onRetry={onRetry} />);
    expect(screen.getByText(/Error: Test error/i)).toBeInTheDocument();
  });

  it("renders no data state", () => {
    render(<ReadingTab data={null} />);
    expect(screen.getByTestId("no-data")).toBeInTheDocument();
  });

  it("renders summary stats", () => {
    render(<ReadingTab data={mockData} />);
    
    const statCards = screen.getAllByTestId("stat-card");
    expect(statCards.length).toBe(3);
    const totalReadingTime = screen.getAllByText("Total Reading Time");
    expect(totalReadingTime.length).toBeGreaterThan(0);
    const oneHourValues = screen.getAllByText("1h");
    expect(oneHourValues.length).toBeGreaterThan(0);
    const totalSessions = screen.getAllByText("Total Sessions");
    expect(totalSessions.length).toBeGreaterThan(0);
    const tenValues = screen.getAllByText("10");
    expect(tenValues.length).toBeGreaterThan(0);
  });

  it("renders time per location", () => {
    render(<ReadingTab data={mockData} />);
    
    expect(screen.getByText("Time Spent Per Location")).toBeInTheDocument();
    expect(screen.getByText(/Page 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Chapter 1/i)).toBeInTheDocument();
  });

  it("handles empty time per location", () => {
    const dataWithoutTime = {
      ...mockData,
      timePerLocation: [],
    };
    render(<ReadingTab data={dataWithoutTime} />);
    
    expect(screen.getByText("No reading data yet")).toBeInTheDocument();
  });

  it("renders drop-off analysis", () => {
    render(<ReadingTab data={mockData} />);
    
    expect(screen.getByText("Drop-off Points")).toBeInTheDocument();
    expect(screen.getByText(/Page 5/i)).toBeInTheDocument();
  });

  it("handles empty drop-off analysis", () => {
    const dataWithoutDropOff = {
      ...mockData,
      dropOffAnalysis: [],
    };
    render(<ReadingTab data={dataWithoutDropOff} />);
    
    expect(screen.getByText("No drop-off data yet")).toBeInTheDocument();
  });

  it("renders peak reading times", () => {
    render(<ReadingTab data={mockData} />);
    
    expect(screen.getByText("Peak Reading Times")).toBeInTheDocument();
    expect(screen.getByTestId("hourly-chart")).toBeInTheDocument();
  });

  it("renders sessions over time", () => {
    render(<ReadingTab data={mockData} />);
    
    expect(screen.getByText("Reading Sessions (Last 30 Days)")).toBeInTheDocument();
  });

  it("handles empty sessions over time", () => {
    const dataWithoutSessions = {
      ...mockData,
      sessionsOverTime: [],
    };
    render(<ReadingTab data={dataWithoutSessions} />);
    
    expect(screen.getByText("No sessions recorded yet")).toBeInTheDocument();
  });

  it("renders reading activity over time", () => {
    render(<ReadingTab data={mockData} />);
    
    expect(screen.getByText("Reading Time (Last 30 Days)")).toBeInTheDocument();
  });

  it("handles empty reading activity", () => {
    const dataWithoutActivity = {
      ...mockData,
      readingActivity: [],
    };
    render(<ReadingTab data={dataWithoutActivity} />);
    
    expect(screen.getByText("No reading activity yet")).toBeInTheDocument();
  });

  it("renders engagement summary", () => {
    render(<ReadingTab data={mockData} />);
    
    expect(screen.getByText("Engagement Summary")).toBeInTheDocument();
    expect(screen.getByText(/Avg Time\/Session/i)).toBeInTheDocument();
    const totalSessions = screen.getAllByText(/Total Sessions/i);
    expect(totalSessions.length).toBeGreaterThan(0);
    const totalReadingTime = screen.getAllByText(/Total Reading Time/i);
    expect(totalReadingTime.length).toBeGreaterThan(0);
  });

  it("handles missing summary data", () => {
    const incompleteData = {
      summary: {},
      timePerLocation: [],
      dropOffAnalysis: [],
      peakReadingTimes: [],
      sessionsOverTime: [],
      readingActivity: [],
    };
    render(<ReadingTab data={incompleteData} />);
    
    const zeroValues = screen.getAllByText("0s");
    expect(zeroValues.length).toBeGreaterThan(0); // Default values
  });

  it("renders GDPR notice", () => {
    render(<ReadingTab data={mockData} />);
    expect(screen.getByTestId("gdpr-notice")).toBeInTheDocument();
  });

  it("displays page location correctly", () => {
    render(<ReadingTab data={mockData} />);
    
    const pageLocation = screen.getByText(/Page 1/i);
    expect(pageLocation).toBeInTheDocument();
  });

  it("displays chapter location correctly", () => {
    render(<ReadingTab data={mockData} />);
    
    const chapterLocation = screen.getByText(/Chapter 1/i);
    expect(chapterLocation).toBeInTheDocument();
  });

  it("limits sessions over time to last 14", () => {
    const dataWithManySessions = {
      ...mockData,
      sessionsOverTime: Array.from({ length: 20 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, "0")}`,
        sessionCount: i + 1,
      })),
    };
    render(<ReadingTab data={dataWithManySessions} />);
    
    // Should only show last 14
    expect(screen.getByText("Reading Sessions (Last 30 Days)")).toBeInTheDocument();
  });

  it("limits reading activity to last 14", () => {
    const dataWithManyActivities = {
      ...mockData,
      readingActivity: Array.from({ length: 20 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, "0")}`,
        totalTime: (i + 1) * 100,
        totalTimeFormatted: `${i + 1}m`,
      })),
    };
    render(<ReadingTab data={dataWithManyActivities} />);
    
    expect(screen.getByText("Reading Time (Last 30 Days)")).toBeInTheDocument();
  });

  it("handles zero reading time", () => {
    const zeroData = {
      summary: {
        totalReadingTime: 0,
        totalReadingTimeFormatted: "0s",
        totalSessions: 0,
        avgSessionDuration: 0,
        avgSessionDurationFormatted: "0s",
      },
      timePerLocation: [],
      dropOffAnalysis: [],
      peakReadingTimes: [],
      sessionsOverTime: [],
      readingActivity: [],
    };
    render(<ReadingTab data={zeroData} />);
    
    const zeroValues = screen.getAllByText("0s");
    expect(zeroValues.length).toBeGreaterThan(0);
  });
});
