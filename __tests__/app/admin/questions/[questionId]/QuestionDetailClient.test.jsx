import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockRouterPush = vi.fn();
const mockRouterRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    refresh: mockRouterRefresh,
  }),
}));

// Mock apiClient
vi.mock("@/libs/api", () => ({
  default: {
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mocks
import QuestionDetailClient from "@/app/admin/questions/[questionId]/QuestionDetailClient";
import apiClient from "@/libs/api";

describe("QuestionDetailClient Component", () => {
  const mockQuestion = {
    _id: "question-1",
    question: "Test question?",
    answer: "Test answer",
    isPublic: false,
    isEditedVersion: false,
  };

  const mockBook = {
    id: "book-1",
    title: "Test Book",
    author: "Test Author",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.put.mockResolvedValue({});
    apiClient.post.mockResolvedValue({ question: { _id: "new-q" } });
    apiClient.delete.mockResolvedValue({});
  });

  it("should render answer section", () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    expect(screen.getByText("Answer Question")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Provide an answer/)
    ).toBeInTheDocument();
  });

  it("should initialize with existing answer", () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    const textarea = screen.getByPlaceholderText(/Provide an answer/);
    expect(textarea.value).toBe("Test answer");
  });

  it("should update answer text", () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    const textarea = screen.getByPlaceholderText(/Provide an answer/);
    fireEvent.change(textarea, { target: { value: "New answer" } });

    expect(textarea.value).toBe("New answer");
  });

  it("should toggle public checkbox", () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    const checkbox = screen.getByLabelText(/Make this Q&A public/);
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("should disable public checkbox if question is already public", () => {
    const publicQuestion = { ...mockQuestion, isPublic: true };

    render(
      <QuestionDetailClient
        question={publicQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    const checkbox = screen.getByLabelText(/Make this Q&A public/);
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.checked).toBe(true);
  });

  it("should save answer and public status", async () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    const textarea = screen.getByPlaceholderText(/Provide an answer/);
    fireEvent.change(textarea, { target: { value: "Updated answer" } });

    const checkbox = screen.getByLabelText(/Make this Q&A public/);
    fireEvent.click(checkbox);

    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        "/admin/questions/question-1",
        {
          answer: "Updated answer",
          isPublic: true,
        }
      );
    });
  });

  it("should show success message after saving", async () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText("Question updated successfully")
      ).toBeInTheDocument();
    });
  });

  it("should refresh page after saving", async () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("should show edit form when toggle is clicked", async () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    // Find the Show button in the Create Edited Version section
    const buttons = screen.getAllByRole("button");
    const toggleButton = buttons.find((btn) => btn.textContent === "Show");
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Edit the question text/)
      ).toBeInTheDocument();
    });
  });

  it("should create edited version", async () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    // Show edit form
    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    const questionTextarea = screen.getByPlaceholderText(
      /Edit the question text/
    );
    fireEvent.change(questionTextarea, {
      target: { value: "Edited question?" },
    });

    const createButton = screen.getByRole("button", {
      name: "Create Edited Version",
    });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/admin/questions/question-1/edit",
        expect.objectContaining({
          question: "Edited question?",
          isPublic: true,
        })
      );
    });
  });

  it("should use original answer when checkbox is checked", async () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    const useOriginalCheckbox = screen.getByLabelText(
      /Use the same answer as the original question/
    );
    fireEvent.click(useOriginalCheckbox);

    const createButton = screen.getByRole("button", {
      name: "Create Edited Version",
    });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/admin/questions/question-1/edit",
        expect.objectContaining({
          useOriginalAnswer: true,
        })
      );
    });
  });

  it("should navigate to new question after creating edited version", async () => {
    apiClient.post.mockResolvedValue({ question: { _id: "new-q-id" } });

    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    const questionTextarea = screen.getByPlaceholderText(
      /Edit the question text/
    );
    fireEvent.change(questionTextarea, { target: { value: "Edited?" } });

    fireEvent.click(
      screen.getByRole("button", { name: "Create Edited Version" })
    );

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/admin/questions/new-q-id");
    });
  });

  it("should show delete confirmation", () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    const deleteButton = screen.getByText("Delete Question");
    fireEvent.click(deleteButton);

    expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    expect(screen.getByText("Yes, Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("should delete question when confirmed", async () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    fireEvent.click(screen.getByText("Delete Question"));
    fireEvent.click(screen.getByText("Yes, Delete"));

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith(
        "/admin/questions/question-1"
      );
      expect(mockRouterPush).toHaveBeenCalledWith("/admin/questions");
    });
  });

  it("should cancel delete confirmation", () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    fireEvent.click(screen.getByText("Delete Question"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText(/Are you sure/)).not.toBeInTheDocument();
    expect(screen.getByText("Delete Question")).toBeInTheDocument();
  });

  it("should show error message on save failure", async () => {
    apiClient.put.mockRejectedValue(new Error("Save failed"));

    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Save failed")).toBeInTheDocument();
    });
  });

  it("should require question text for edited version", async () => {
    render(
      <QuestionDetailClient
        question={mockQuestion}
        questionId="question-1"
        book={mockBook}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    const questionTextarea = screen.getByPlaceholderText(
      /Edit the question text/
    );
    fireEvent.change(questionTextarea, { target: { value: "" } });

    const createButton = screen.getByRole("button", {
      name: "Create Edited Version",
    });
    expect(createButton.disabled).toBe(true);
  });
});
