import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookAnalyticsClient from "@/app/admin/books/[bookId]/analytics/BookAnalyticsClient";

// Mock API client
vi.mock("@/libs/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock tab components
vi.mock("@/app/admin/books/[bookId]/analytics/HighlightsTab", () => ({
  default: ({ data, isLoading, error, onRetry }) => (
    <div data-testid="highlights-tab">
      {isLoading && <span>Loading highlights...</span>}
      {error && <span>Error: {error}</span>}
      {data && <span>Highlights data loaded</span>}
      {onRetry && <button onClick={onRetry}>Retry Highlights</button>}
    </div>
  ),
}));

vi.mock("@/app/admin/books/[bookId]/analytics/QuestionsTab", () => ({
  default: ({ data, isLoading, error, onRetry }) => (
    <div data-testid="questions-tab">
      {isLoading && <span>Loading questions...</span>}
      {error && <span>Error: {error}</span>}
      {data && <span>Questions data loaded</span>}
      {onRetry && <button onClick={onRetry}>Retry Questions</button>}
    </div>
  ),
}));

vi.mock("@/app/admin/books/[bookId]/analytics/ReadingTab", () => ({
  default: ({ data, isLoading, error, onRetry }) => (
    <div data-testid="reading-tab">
      {isLoading && <span>Loading reading...</span>}
      {error && <span>Error: {error}</span>}
      {data && <span>Reading data loaded</span>}
      {onRetry && <button onClick={onRetry}>Retry Reading</button>}
    </div>
  ),
}));

describe("BookAnalyticsClient Component", () => {
  const bookId = "test-book-id";
  let apiClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    const api = await import("@/libs/api");
    apiClient = vi.mocked(api.default);
    apiClient.get.mockResolvedValue({ data: "test" });
  });

  it("renders with highlights tab active by default", () => {
    render(<BookAnalyticsClient bookId={bookId} />);
    expect(screen.getByTestId("highlights-tab")).toBeInTheDocument();
  });

  it("renders all three tabs", () => {
    render(<BookAnalyticsClient bookId={bookId} />);
    expect(screen.getByText("Highlights")).toBeInTheDocument();
    expect(screen.getByText("Questions")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
  });

  it("switches to questions tab when clicked", async () => {
    render(<BookAnalyticsClient bookId={bookId} />);
    
    const questionsTab = screen.getByText("Questions");
    fireEvent.click(questionsTab);

    await waitFor(() => {
      expect(screen.getByTestId("questions-tab")).toBeInTheDocument();
    });
  });

  it("switches to reading tab when clicked", async () => {
    render(<BookAnalyticsClient bookId={bookId} />);
    
    const readingTab = screen.getByText("Reading");
    fireEvent.click(readingTab);

    await waitFor(() => {
      expect(screen.getByTestId("reading-tab")).toBeInTheDocument();
    });
  });

  it("fetches highlights data when highlights tab is active", async () => {
    render(<BookAnalyticsClient bookId={bookId} />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        `/admin/books/${bookId}/analytics/highlights`
      );
    });
  });

  it("fetches questions data when questions tab is clicked", async () => {
    render(<BookAnalyticsClient bookId={bookId} />);
    
    const questionsTab = screen.getByText("Questions");
    fireEvent.click(questionsTab);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        `/admin/books/${bookId}/analytics/questions`
      );
    });
  });

  it("fetches reading data when reading tab is clicked", async () => {
    render(<BookAnalyticsClient bookId={bookId} />);
    
    const readingTab = screen.getByText("Reading");
    fireEvent.click(readingTab);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        `/admin/books/${bookId}/analytics/reading`
      );
    });
  });

  it("does not fetch data again if tab is already loaded", async () => {
    render(<BookAnalyticsClient bookId={bookId} />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    // Switch to another tab and back
    const questionsTab = screen.getByText("Questions");
    fireEvent.click(questionsTab);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });

    const highlightsTab = screen.getByText("Highlights");
    fireEvent.click(highlightsTab);

    // Should not fetch again
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  it("handles API errors for highlights tab", async () => {
    apiClient.get.mockRejectedValueOnce(new Error("API Error"));
    render(<BookAnalyticsClient bookId={bookId} />);

    await waitFor(() => {
      expect(screen.getByText(/Error: API Error/i)).toBeInTheDocument();
    });
  });

  it("handles API errors for questions tab", async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: "highlights" })
      .mockRejectedValueOnce(new Error("Questions API Error"));
    
    render(<BookAnalyticsClient bookId={bookId} />);
    
    const questionsTab = screen.getByText("Questions");
    fireEvent.click(questionsTab);

    await waitFor(() => {
      expect(screen.getByText(/Error: Questions API Error/i)).toBeInTheDocument();
    });
  });

  it("handles API errors for reading tab", async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: "highlights" })
      .mockRejectedValueOnce(new Error("Reading API Error"));
    
    render(<BookAnalyticsClient bookId={bookId} />);
    
    const readingTab = screen.getByText("Reading");
    fireEvent.click(readingTab);

    await waitFor(() => {
      expect(screen.getByText(/Error: Reading API Error/i)).toBeInTheDocument();
    });
  });

  it("allows retry after error", async () => {
    apiClient.get.mockRejectedValueOnce(new Error("API Error"));
    render(<BookAnalyticsClient bookId={bookId} />);

    await waitFor(() => {
      expect(screen.getByText(/Error: API Error/i)).toBeInTheDocument();
    });

    apiClient.get.mockResolvedValueOnce({ data: "success" });
    const retryButton = screen.getByText("Retry Highlights");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  it("does not fetch if bookId is not provided", () => {
    render(<BookAnalyticsClient bookId={null} />);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("shows loading state while fetching highlights", async () => {
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    apiClient.get.mockReturnValue(promise);

    render(<BookAnalyticsClient bookId={bookId} />);

    expect(screen.getByText("Loading highlights...")).toBeInTheDocument();

    resolvePromise({ data: "test" });
    await waitFor(() => {
      expect(screen.queryByText("Loading highlights...")).not.toBeInTheDocument();
    });
  });

  it("applies active tab styling", () => {
    render(<BookAnalyticsClient bookId={bookId} />);
    
    const highlightsTab = screen.getByText("Highlights");
    expect(highlightsTab).toHaveClass("bg-primary", "text-primary-content");
  });

  it("applies inactive tab styling", () => {
    render(<BookAnalyticsClient bookId={bookId} />);
    
    const questionsTab = screen.getByText("Questions");
    expect(questionsTab).toHaveClass("bg-base-200", "text-base-content/70");
  });
});
