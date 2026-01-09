import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock apiClient
vi.mock("@/libs/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

import QuestionModal from "@/components/QuestionModal";
import apiClient from "@/libs/api";

describe("QuestionModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    selectedText: "Selected text from the book",
    pageNumber: 42,
    epubCfi: null,
    epubCfiRange: null,
    epubChapter: null,
    bookId: "book-123",
    isAdmin: false,
    onQuestionCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<QuestionModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Ask a Question")).not.toBeInTheDocument();
    });

    it("should render the modal when isOpen is true", () => {
      render(<QuestionModal {...defaultProps} />);

      expect(screen.getByText("Ask a Question")).toBeInTheDocument();
    });

    it("should render selected text preview", () => {
      render(<QuestionModal {...defaultProps} />);

      expect(screen.getByText("Selected Text:")).toBeInTheDocument();
      expect(
        screen.getByText(/Selected text from the book/i)
      ).toBeInTheDocument();
    });

    it("should render page number for PDF", () => {
      render(<QuestionModal {...defaultProps} />);

      expect(screen.getByText("Page 42")).toBeInTheDocument();
    });

    it("should render chapter for ePub when no page number", () => {
      render(
        <QuestionModal
          {...defaultProps}
          pageNumber={null}
          epubChapter="Chapter 5: Introduction"
        />
      );

      expect(
        screen.getByText("Chapter: Chapter 5: Introduction")
      ).toBeInTheDocument();
    });

    it("should render question input textarea", () => {
      render(<QuestionModal {...defaultProps} />);

      expect(screen.getByPlaceholderText(/What would you like to know/i)).toBeInTheDocument();
    });

    it("should render submit and cancel buttons", () => {
      render(<QuestionModal {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /submit question/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
    });
  });

  describe("Admin Features", () => {
    it("should show public checkbox for admin users", () => {
      render(<QuestionModal {...defaultProps} isAdmin={true} />);

      expect(
        screen.getByText(/Make this Q&A public/i)
      ).toBeInTheDocument();
    });

    it("should not show public checkbox for regular users", () => {
      render(<QuestionModal {...defaultProps} isAdmin={false} />);

      expect(
        screen.queryByText(/Make this Q&A public/i)
      ).not.toBeInTheDocument();
    });

    it("should show answer field when public is checked for admin", async () => {
      render(<QuestionModal {...defaultProps} isAdmin={true} />);

      // Public should be checked by default for admins
      // The title "Create Public Q&A" appears both in header and button
      const createPublicTexts = screen.getAllByText("Create Public Q&A");
      expect(createPublicTexts.length).toBeGreaterThan(0);
      expect(
        screen.getByPlaceholderText(/Provide an answer for this public Q&A/i)
      ).toBeInTheDocument();
    });

    it("should hide answer field when public is unchecked for admin", async () => {
      const user = userEvent.setup();
      render(<QuestionModal {...defaultProps} isAdmin={true} />);

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      expect(
        screen.queryByPlaceholderText(/Provide an answer for this public Q&A/i)
      ).not.toBeInTheDocument();
    });

    it("should change title based on public checkbox state", async () => {
      const user = userEvent.setup();
      render(<QuestionModal {...defaultProps} isAdmin={true} />);

      // Initially should show Create Public Q&A for admin (in header)
      const header = screen.getByRole("heading", { level: 3 });
      expect(header).toHaveTextContent("Create Public Q&A");

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      expect(header).toHaveTextContent("Ask a Question");
    });
  });

  describe("Form Submission", () => {
    it("should submit question for regular user", async () => {
      const user = userEvent.setup();
      apiClient.post.mockResolvedValueOnce({ question: { _id: "q-1" } });

      render(<QuestionModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/What would you like to know/i);
      await user.type(textarea, "What does this passage mean?");

      const submitButton = screen.getByRole("button", { name: /submit question/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith("/user/questions", {
          bookId: "book-123",
          question: "What does this passage mean?",
          selectedText: "Selected text from the book",
          pageNumber: 42,
          epubCfi: null,
          epubCfiRange: null,
          epubChapter: null,
        });
      });

      expect(defaultProps.onQuestionCreated).toHaveBeenCalledWith({ _id: "q-1" });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should submit public question for admin", async () => {
      const user = userEvent.setup();
      apiClient.post.mockResolvedValueOnce({ question: { _id: "q-2" } });

      render(<QuestionModal {...defaultProps} isAdmin={true} />);

      const textarea = screen.getByPlaceholderText(/What would you like to know/i);
      await user.type(textarea, "What is the significance?");

      const answerTextarea = screen.getByPlaceholderText(/Provide an answer/i);
      await user.type(answerTextarea, "This is the answer.");

      const submitButton = screen.getByRole("button", { name: /create public q&a/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith("/admin/questions/create", {
          bookId: "book-123",
          question: "What is the significance?",
          selectedText: "Selected text from the book",
          pageNumber: 42,
          epubCfi: null,
          epubCfiRange: null,
          epubChapter: null,
          answer: "This is the answer.",
          isPublic: true,
        });
      });
    });

    it("should show error when question is empty", async () => {
      const user = userEvent.setup();
      render(<QuestionModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /submit question/i });
      
      // Submit button should be disabled when question is empty
      expect(submitButton).toBeDisabled();
    });

    it("should show error message on API failure", async () => {
      const user = userEvent.setup();
      apiClient.post.mockRejectedValueOnce(new Error("API Error"));

      render(<QuestionModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/What would you like to know/i);
      await user.type(textarea, "Test question");

      const submitButton = screen.getByRole("button", { name: /submit question/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("API Error")).toBeInTheDocument();
      });
    });

    it("should show loading state while submitting", async () => {
      const user = userEvent.setup();
      let resolvePromise;
      apiClient.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      render(<QuestionModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/What would you like to know/i);
      await user.type(textarea, "Test question");

      const submitButton = screen.getByRole("button", { name: /submit question/i });
      await user.click(submitButton);

      expect(screen.getByText("Submitting...")).toBeInTheDocument();

      resolvePromise({ question: { _id: "q-1" } });
    });
  });

  describe("Modal Close Behavior", () => {
    it("should call onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<QuestionModal {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when backdrop is clicked", () => {
      render(<QuestionModal {...defaultProps} />);

      const backdrop = document.querySelector(".bg-black\\/50");
      fireEvent.click(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", () => {
      render(<QuestionModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when X button is clicked", async () => {
      const user = userEvent.setup();
      render(<QuestionModal {...defaultProps} />);

      const closeButton = screen.getAllByRole("button").find(
        (btn) => btn.classList.contains("btn-square")
      );
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Form Reset", () => {
    it("should reset form when modal reopens", () => {
      const { rerender } = render(
        <QuestionModal {...defaultProps} isOpen={false} />
      );

      rerender(<QuestionModal {...defaultProps} isOpen={true} />);

      const textarea = screen.getByPlaceholderText(/What would you like to know/i);
      expect(textarea.value).toBe("");
    });
  });

  describe("ePub specific fields", () => {
    it("should handle epubCfi and epubCfiRange", async () => {
      const user = userEvent.setup();
      apiClient.post.mockResolvedValueOnce({ question: { _id: "q-1" } });

      render(
        <QuestionModal
          {...defaultProps}
          pageNumber={null}
          epubCfi="epubcfi(/6/4)"
          epubCfiRange="epubcfi(/6/4,/1:0,/1:10)"
          epubChapter="Chapter 1"
        />
      );

      const textarea = screen.getByPlaceholderText(/What would you like to know/i);
      await user.type(textarea, "ePub question");

      const submitButton = screen.getByRole("button", { name: /submit question/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith("/user/questions", {
          bookId: "book-123",
          question: "ePub question",
          selectedText: "Selected text from the book",
          pageNumber: null,
          epubCfi: "epubcfi(/6/4)",
          epubCfiRange: "epubcfi(/6/4,/1:0,/1:10)",
          epubChapter: "Chapter 1",
        });
      });
    });
  });

  describe("Without selected text", () => {
    it("should show page number when no selected text for PDF", () => {
      render(
        <QuestionModal {...defaultProps} selectedText={null} pageNumber={10} />
      );

      expect(screen.getByText("Page 10")).toBeInTheDocument();
      expect(screen.queryByText("Selected Text:")).not.toBeInTheDocument();
    });

    it("should show chapter when no selected text and no page number for ePub", () => {
      render(
        <QuestionModal
          {...defaultProps}
          selectedText={null}
          pageNumber={null}
          epubChapter="Introduction"
        />
      );

      expect(screen.getByText("Chapter: Introduction")).toBeInTheDocument();
    });
  });
});
