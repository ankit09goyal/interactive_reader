import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      },
    },
    status: "authenticated",
  })),
}));

// Mock apiClient
vi.mock("@/libs/api", () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock QuestionDeleteModal
vi.mock("@/components/QuestionDeleteModal", () => ({
  default: ({ question, onClose, onConfirm, isDeleting }) => (
    <div data-testid="delete-modal">
      <span>Delete Modal for {question.question}</span>
      <button onClick={onClose}>Cancel Delete</button>
      <button onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? "Deleting..." : "Confirm Delete"}
      </button>
    </div>
  ),
}));

// Mock icons
vi.mock("@/libs/icons", () => ({
  default: {
    close: <span data-testid="close-icon">×</span>,
    plus: <span data-testid="plus-icon">+</span>,
    refresh: <span data-testid="refresh-icon">↻</span>,
    delete: <span data-testid="delete-icon">🗑</span>,
  },
}));

import QuestionsSidebar from "@/components/QuestionsSidebar";
import apiClient from "@/libs/api";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

describe("QuestionsSidebar Component", () => {
  const mockMyQuestions = [
    {
      _id: "question-1",
      question: "What is the main theme of this chapter?",
      answer: "The main theme is about persistence.",
      selectedText: "Selected text for question 1",
      pageNumber: 42,
      userId: "user-123",
      createdAt: "2024-01-15T10:00:00.000Z",
    },
    {
      _id: "question-2",
      question: "What does the author mean by this?",
      answer: null,
      selectedText: "Selected text for question 2",
      pageNumber: 55,
      userId: "user-123",
      createdAt: "2024-01-20T10:00:00.000Z",
    },
  ];

  const mockPublicQuestions = [
    {
      _id: "public-1",
      question: "What is the significance of this event?",
      answer: "This event signifies a turning point in the story.",
      selectedText: "Selected text for public question",
      pageNumber: 100,
      isAdminCreated: true,
      createdAt: "2024-01-10T10:00:00.000Z",
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    bookId: "book-123",
    onGoToPage: vi.fn(),
    refreshTrigger: 0,
    onAddQuestion: vi.fn(),
    highlightedQuestionId: null,
    highlightedTextClicked: 0,
    onQuestionDeleted: vi.fn(),
    isEPub: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({
      myQuestions: mockMyQuestions,
      publicQuestions: mockPublicQuestions,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<QuestionsSidebar {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Questions & Answers")).not.toBeInTheDocument();
    });

    it("should render the sidebar when isOpen is true", async () => {
      render(<QuestionsSidebar {...defaultProps} />);

      expect(screen.getByText("Questions & Answers")).toBeInTheDocument();
    });

    it("should render Add button when onAddQuestion is provided", () => {
      render(<QuestionsSidebar {...defaultProps} />);

      expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(<QuestionsSidebar {...defaultProps} />);

      expect(screen.getByTestId("close-icon")).toBeInTheDocument();
    });

    it("should render tab buttons for My Questions and Public Q&A", () => {
      render(<QuestionsSidebar {...defaultProps} />);

      expect(screen.getByText("My Questions")).toBeInTheDocument();
      expect(screen.getByText("Public Q&A")).toBeInTheDocument();
    });

    it("should render filter tabs for My Questions", () => {
      render(<QuestionsSidebar {...defaultProps} />);

      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("Answered")).toBeInTheDocument();
      expect(screen.getByText("Unanswered")).toBeInTheDocument();
    });

    it("should render refresh button", () => {
      render(<QuestionsSidebar {...defaultProps} />);

      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("should fetch questions when sidebar opens", async () => {
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(
          "/user/questions?bookId=book-123"
        );
      });
    });

    it("should display my questions after fetching", async () => {
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        // Question text is rendered with "Q:" prefix, so use regex
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });
    });

    it("should show loading state while fetching", async () => {
      apiClient.get.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ myQuestions: [], publicQuestions: [] }), 100)
          )
      );

      render(<QuestionsSidebar {...defaultProps} />);

      expect(screen.getByText("Questions & Answers")).toBeInTheDocument();
      // Loading skeletons should be shown
      expect(document.querySelector(".skeleton")).toBeInTheDocument();
    });

    it("should show error message when fetching fails", async () => {
      apiClient.get.mockRejectedValue(new Error("Failed to fetch"));

      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load questions")).toBeInTheDocument();
      });

      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    it("should refetch when refresh button is clicked", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(1);
      });

      await user.click(screen.getByText("Refresh"));

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(2);
      });
    });

    it("should refetch when refreshTrigger changes", async () => {
      const { rerender } = render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(1);
      });

      rerender(<QuestionsSidebar {...defaultProps} refreshTrigger={1} />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Tab Switching", () => {
    it("should show My Questions by default", async () => {
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });
    });

    it("should switch to Public Q&A when tab is clicked", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText("Public Q&A"));

      await waitFor(() => {
        expect(
          screen.getByText(/What is the significance of this event/)
        ).toBeInTheDocument();
      });
    });

    it("should hide filter tabs when Public Q&A is selected", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Public Q&A"));

      // Filter tabs should not be visible for public questions
      // The All/Answered/Unanswered filters are only for My Questions
      await waitFor(() => {
        expect(screen.queryByText("All")).not.toBeInTheDocument();
      });
    });
  });

  describe("Filtering", () => {
    it("should filter to show only answered questions", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText("Answered"));

      // Only the answered question should be visible
      expect(
        screen.getByText(/What is the main theme of this chapter/)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/What does the author mean by this/)
      ).not.toBeInTheDocument();
    });

    it("should filter to show only unanswered questions", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText("Unanswered"));

      // Only the unanswered question should be visible
      expect(
        screen.getByText(/What does the author mean by this/)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/What is the main theme of this chapter/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Question Actions", () => {
    it("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").closest("button");
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onAddQuestion when add button is clicked", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      const addButton = screen.getByTestId("plus-icon").closest("button");
      await user.click(addButton);

      expect(defaultProps.onAddQuestion).toHaveBeenCalled();
    });

    it("should call onGoToPage when Go to highlight is clicked", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      const goToButtons = screen.getAllByText("Go to highlight");
      await user.click(goToButtons[0]);

      expect(defaultProps.onGoToPage).toHaveBeenCalledWith(42);
    });
  });

  describe("Delete Functionality", () => {
    it("should show delete button only for user's own questions", async () => {
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      // Delete buttons should be present for user's questions
      // Wait for the delete buttons to appear since component may still be rendering
      await waitFor(() => {
        const deleteButtons = screen.queryAllByTestId("delete-icon");
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it("should open delete modal when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
    });

    it("should close delete modal when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      expect(screen.getByTestId("delete-modal")).toBeInTheDocument();

      await user.click(screen.getByText("Cancel Delete"));

      expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    });

    it("should delete question and show success toast on confirm", async () => {
      const user = userEvent.setup();
      apiClient.delete.mockResolvedValue({});

      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      await user.click(screen.getByText("Confirm Delete"));

      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith(
          "/user/questions/question-1"
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Question deleted successfully"
        );
      });
    });

    it("should show error toast on delete failure", async () => {
      const user = userEvent.setup();
      apiClient.delete.mockRejectedValue(new Error("Delete failed"));

      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTestId("delete-icon");
      await user.click(deleteButtons[0].closest("button"));

      await user.click(screen.getByText("Confirm Delete"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Delete failed");
      });
    });
  });

  describe("Empty States", () => {
    it("should show empty message for My Questions when no questions", async () => {
      apiClient.get.mockResolvedValue({
        myQuestions: [],
        publicQuestions: mockPublicQuestions,
      });

      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/No questions yet/i)
        ).toBeInTheDocument();
      });
    });

    it("should show empty message for Public Q&A when no public questions", async () => {
      const user = userEvent.setup();
      apiClient.get.mockResolvedValue({
        myQuestions: mockMyQuestions,
        publicQuestions: [],
      });

      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      await user.click(screen.getByText("Public Q&A"));

      await waitFor(() => {
        expect(
          screen.getByText(/No public Q&A available for this book yet/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("ePub Mode", () => {
    it("should use epubCfi for navigation in ePub mode", async () => {
      const user = userEvent.setup();
      const epubQuestion = {
        ...mockMyQuestions[0],
        pageNumber: null,
        epubCfi: "epubcfi(/6/4)",
      };

      apiClient.get.mockResolvedValue({
        myQuestions: [epubQuestion],
        publicQuestions: [],
      });

      render(<QuestionsSidebar {...defaultProps} isEPub={true} />);

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      const goToButtons = screen.getAllByText("Go to highlight");
      await user.click(goToButtons[0]);

      expect(defaultProps.onGoToPage).toHaveBeenCalledWith("epubcfi(/6/4)");
    });
  });

  describe("Question Highlighting", () => {
    it("should scroll to highlighted question when highlightedTextClicked changes", async () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      const { rerender } = render(
        <QuestionsSidebar
          {...defaultProps}
          highlightedQuestionId="question-1"
          highlightedTextClicked={0}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/What is the main theme of this chapter/)
        ).toBeInTheDocument();
      });

      rerender(
        <QuestionsSidebar
          {...defaultProps}
          highlightedQuestionId="question-1"
          highlightedTextClicked={1}
        />
      );

      await waitFor(
        () => {
          expect(scrollIntoViewMock).toHaveBeenCalled();
        },
        { timeout: 500 }
      );
    });
  });

  describe("Answer Display", () => {
    it("should show answer when question has one", async () => {
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText("The main theme is about persistence.")
        ).toBeInTheDocument();
      });
    });

    it("should show Not answered yet for unanswered questions", async () => {
      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Not answered yet.")).toBeInTheDocument();
      });
    });

    it("should expand long answers when Show more is clicked", async () => {
      const user = userEvent.setup();
      const longAnswer = "A".repeat(200);
      apiClient.get.mockResolvedValue({
        myQuestions: [
          {
            ...mockMyQuestions[0],
            answer: longAnswer,
          },
        ],
        publicQuestions: [],
      });

      render(<QuestionsSidebar {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Show more")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Show more"));

      expect(screen.getByText("Show less")).toBeInTheDocument();
    });
  });
});
