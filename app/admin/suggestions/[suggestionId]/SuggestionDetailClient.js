"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/libs/api";

export default function SuggestionDetailClient({
  suggestion,
  suggestionId,
  book,
}) {
  const router = useRouter();
  const [adminReply, setAdminReply] = useState(suggestion.adminReply || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.put(`/admin/suggestions/${suggestionId}`, {
        adminReply: adminReply.trim() || null,
      });

      setSuccess("Reply saved successfully");
      router.refresh();
    } catch (err) {
      console.error("Error saving reply:", err);
      setError(err.message || "Failed to save reply");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await apiClient.delete(`/admin/suggestions/${suggestionId}`);
      router.push("/admin/suggestions");
    } catch (err) {
      console.error("Error deleting suggestion:", err);
      setError(err.message || "Failed to delete suggestion");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reply Section */}
      <div className="bg-base-100 border border-base-300 rounded-lg p-6">
        <h3 className="font-semibold mb-4">Reply to Suggestion</h3>

        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text font-medium">Your Reply</span>
            </label>
            <textarea
              value={adminReply}
              onChange={(e) => setAdminReply(e.target.value)}
              placeholder="Provide a reply to this improvement suggestion..."
              className="textarea textarea-bordered w-full h-32"
              disabled={isLoading}
            />
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
              "Save Reply"
            )}
          </button>
        </div>
      </div>

      {/* Delete Section */}
      <div className="bg-base-100 border border-error/30 rounded-lg p-6">
        <h3 className="font-semibold text-error mb-4">Danger Zone</h3>

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              Are you sure you want to delete this suggestion? This action
              cannot be undone.
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
            Delete Suggestion
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
