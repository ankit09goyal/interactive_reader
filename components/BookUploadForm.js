"use client";

import { useState, useRef } from "react";
import { toast } from "react-hot-toast";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ["application/pdf", "application/epub+zip"];

export default function BookUploadForm({ onUploadSuccess, onCancel }) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

    if (!formData.title.trim() || !formData.author.trim()) {
      toast.error("Title and author are required");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("author", formData.author.trim());
      data.append("description", formData.description.trim());
      data.append("file", selectedFile);

      const response = await fetch("/api/admin/books", {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload book");
      }

      toast.success("Book uploaded successfully!");
      
      // Reset form
      setFormData({ title: "", author: "", description: "" });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onUploadSuccess?.(result.book);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload book");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="bg-base-200 rounded-xl p-6 border border-base-300">
      <h2 className="text-xl font-semibold mb-4">Upload New Book</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Title *</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter book title"
            className="input input-bordered w-full"
            disabled={isLoading}
            required
          />
        </div>

        {/* Author */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Author *</span>
          </label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleInputChange}
            placeholder="Enter author name"
            className="input input-bordered w-full"
            disabled={isLoading}
            required
          />
        </div>

        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Description</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter book description (optional)"
            className="textarea textarea-bordered w-full h-24"
            disabled={isLoading}
          />
        </div>

        {/* File Upload */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Book File (PDF or EPUB) *</span>
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
              <span className="ml-2">({formatFileSize(selectedFile.size)})</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isLoading && uploadProgress > 0 && (
          <div className="w-full">
            <progress
              className="progress progress-primary w-full"
              value={uploadProgress}
              max="100"
            ></progress>
            <p className="text-sm text-base-content/70 text-center mt-1">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Uploading...
              </>
            ) : (
              <>
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Upload Book
              </>
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

