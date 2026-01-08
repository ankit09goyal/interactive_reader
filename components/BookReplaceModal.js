"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import { formatFileSize, getFileType } from "@/libs/bookUtils";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ["application/pdf", "application/epub+zip"];

export default function BookReplaceModal({ book, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isLoading, onClose]);

  // Focus trap and body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Only PDF and EPUB files are allowed.");
      e.target.value = "";
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 50MB.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`/api/admin/books/${book._id}`, {
        method: "PUT",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to replace file");
      }

      toast.success("Book file replaced successfully!");
      onSuccess?.(result.book);
    } catch (error) {
      console.error("Replace error:", error);
      toast.error(error.message || "Failed to replace file");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-base-100 rounded-xl shadow-xl w-full max-w-md p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Replace Book File</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-ghost btn-sm btn-circle"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Book Info */}
        <div className="bg-base-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold">{book.title}</h4>
          <p className="text-sm text-base-content/70">by {book.author}</p>
          <div className="flex gap-2 mt-2">
            <span className="badge badge-sm">
              {book.fileType || getFileType(book.mimeType)}
            </span>
            <span className="badge badge-sm badge-ghost">
              {book.fileSizeFormatted}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Select New File (PDF or EPUB)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,application/pdf,application/epub+zip"
              onChange={handleFileChange}
              className="file-input file-input-bordered w-full"
              disabled={isLoading}
              required
            />
            {selectedFile && (
              <div className="mt-2 text-sm text-base-content/70">
                <span className="font-medium">{selectedFile.name}</span>
                <span className="ml-2">
                  ({formatFileSize(selectedFile.size)})
                </span>
              </div>
            )}
          </div>

          <div className="alert alert-warning mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm">
              This will permanently replace the current file.
            </span>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isLoading || !selectedFile}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Replacing...
                </>
              ) : (
                "Replace File"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
