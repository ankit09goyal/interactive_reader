"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/libs/api";

export default function QuestionDetailClient({ question, questionId, book }) {
  const router = useRouter();
  const [answer, setAnswer] = useState(question.answer || "");
  const [isPublic, setIsPublic] = useState(question.isPublic || false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Edit form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(question.question);
  const [editedAnswer, setEditedAnswer] = useState("");
  const [useOriginalAnswer, setUseOriginalAnswer] = useState(false);
  const [editedIsPublic, setEditedIsPublic] = useState(true);
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.put(`/admin/questions/${questionId}`, {
        answer: answer.trim() || null,
        isPublic,
      });

      setSuccess("Question updated successfully");
      router.refresh();
    } catch (err) {
      console.error("Error saving question:", err);
      setError(err.message || "Failed to save question");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEditedVersion = async () => {
    if (!editedQuestion.trim()) {
      setError("Question text is required");
      return;
    }

    setIsEditLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post(`/admin/questions/${questionId}/edit`, {
        question: editedQuestion.trim(),
        isPublic: editedIsPublic,
        answer: useOriginalAnswer ? null : editedAnswer.trim() || null,
        useOriginalAnswer,
      });

      setSuccess("Edited version created successfully");
      // Navigate to the new question
      router.push(`/admin/questions/${response.question._id || response.question.id}`);
    } catch (err) {
      console.error("Error creating edited version:", err);
      setError(err.message || "Failed to create edited version");
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await apiClient.delete(`/admin/questions/${questionId}`);
      router.push("/admin/questions");
    } catch (err) {
      console.error("Error deleting question:", err);
      setError(err.message || "Failed to delete question");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Answer Section */}
      <div className="bg-base-100 border border-base-300 rounded-lg p-6">
        <h3 className="font-semibold mb-4">Answer Question</h3>

        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text font-medium">Your Answer</span>
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Provide an answer to this question..."
              className="textarea textarea-bordered w-full h-32"
              disabled={isLoading}
            />
          </div>

          {/* Make public checkbox */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="checkbox checkbox-primary"
                disabled={isLoading || question.isPublic}
              />
              <span className="label-text">
                Make this Q&A public (visible to all users with book access)
                {question.isPublic && (
                  <span className="text-success ml-2">(Already public)</span>
                )}
              </span>
            </label>
          </div>

          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Create Edited Version Section */}
      <div className="bg-base-100 border border-base-300 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Create Edited Version</h3>
          <button
            onClick={() => setShowEditForm(!showEditForm)}
            className="btn btn-ghost btn-sm"
          >
            {showEditForm ? "Hide" : "Show"}
          </button>
        </div>

        {showEditForm && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              Create a new version of this question. The original question remains unchanged.
            </p>

            <div>
              <label className="label">
                <span className="label-text font-medium">Edited Question *</span>
              </label>
              <textarea
                value={editedQuestion}
                onChange={(e) => setEditedQuestion(e.target.value)}
                placeholder="Edit the question text..."
                className="textarea textarea-bordered w-full h-24"
                disabled={isEditLoading}
              />
            </div>

            {/* Use original answer checkbox */}
            {question.answer && (
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={useOriginalAnswer}
                    onChange={(e) => {
                      setUseOriginalAnswer(e.target.checked);
                      if (e.target.checked) {
                        setEditedAnswer("");
                      }
                    }}
                    className="checkbox"
                    disabled={isEditLoading}
                  />
                  <span className="label-text">
                    Use the same answer as the original question
                  </span>
                </label>
              </div>
            )}

            {/* Answer for edited version */}
            {!useOriginalAnswer && (
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    Answer for Edited Version (optional)
                  </span>
                </label>
                <textarea
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  placeholder="Provide an answer for the edited version..."
                  className="textarea textarea-bordered w-full h-24"
                  disabled={isEditLoading}
                />
              </div>
            )}

            {/* Make public checkbox */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  checked={editedIsPublic}
                  onChange={(e) => setEditedIsPublic(e.target.checked)}
                  className="checkbox checkbox-primary"
                  disabled={isEditLoading}
                />
                <span className="label-text">
                  Make the edited version public
                </span>
              </label>
            </div>

            <button
              onClick={handleCreateEditedVersion}
              className="btn btn-secondary"
              disabled={isEditLoading || !editedQuestion.trim()}
            >
              {isEditLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                "Create Edited Version"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Delete Section */}
      <div className="bg-base-100 border border-error/30 rounded-lg p-6">
        <h3 className="font-semibold text-error mb-4">Danger Zone</h3>

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              Are you sure you want to delete this question? This action cannot be undone.
              {question.isEditedVersion
                ? ""
                : " All edited versions will also be deleted."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="btn btn-error"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost"
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-outline btn-error"
          >
            Delete Question
          </button>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}

