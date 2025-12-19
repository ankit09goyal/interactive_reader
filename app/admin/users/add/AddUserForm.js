"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/libs/api";

export default function AddUserForm({
  books,
  initialTemplate,
  isDefaultTemplate,
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [notifyUser, setNotifyUser] = useState(false);

  // Email template
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [template, setTemplate] = useState(initialTemplate);
  const [isTemplateDefault, setIsTemplateDefault] = useState(isDefaultTemplate);

  // Email validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Toggle book selection
  const toggleBook = (bookId) => {
    setSelectedBooks((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  };

  // Select/deselect all books
  const toggleAllBooks = () => {
    if (selectedBooks.length === books.length) {
      setSelectedBooks([]);
    } else {
      setSelectedBooks(books.map((b) => b._id));
    }
  };

  // Save email template
  const handleSaveTemplate = async () => {
    if (!template.subject || !template.htmlBody) {
      setError("Template subject and HTML body are required");
      return;
    }

    setIsSavingTemplate(true);
    setError("");

    try {
      await apiClient.put("/admin/email-template", {
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
      });
      setSuccess("Template saved successfully");
      setIsTemplateDefault(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Reset template to default
  const handleResetTemplate = async () => {
    setIsSavingTemplate(true);
    setError("");

    try {
      const response = await apiClient.delete("/admin/email-template");
      setTemplate(response.template);
      setIsTemplateDefault(true);
      setSuccess("Template reset to default");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to reset template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim() || undefined,
        email: email.trim().toLowerCase(),
        bookIds: selectedBooks,
        notifyUser: notifyUser && selectedBooks.length > 0,
      };

      // If template was customized, include it
      if (!isTemplateDefault) {
        payload.customEmailTemplate = template;
      }

      const response = await apiClient.post("/admin/users", payload);

      // Redirect back to users list with success message
      router.push("/admin/users");
    } catch (err) {
      setError(err.message || "Failed to add user");
      setIsSubmitting(false);
    }
  };

  // Replace template variables for preview
  const getPreviewHtml = () => {
    let html = template.htmlBody || "";
    const variables = {
      userName: name || email?.split("@")[0] || "User",
      userEmail: email || "user@example.com",
      adminName: "Admin",
      bookList: selectedBooks.length
        ? selectedBooks
            .map((id) => {
              const book = books.find((b) => b._id === id);
              return book
                ? `<li><strong>${book.title}</strong> by ${book.author}</li>`
                : "";
            })
            .join("")
        : "<li>No books selected</li>",
      loginUrl: "https://example.com/login",
      appName: "Interactive Reader",
    };

    Object.keys(variables).forEach((key) => {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
    });

    return html;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error/Success alerts */}
      {error && (
        <div className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* User Details Card */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">User Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Name</span>
                <span className="label-text-alt text-base-content/50">
                  Optional
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
                <span className="label-text-alt text-error">Required</span>
              </label>
              <input
                type="email"
                className="input input-bordered"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Book Access Card */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Book Access</h2>
            {books.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={toggleAllBooks}
              >
                {selectedBooks.length === books.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            )}
          </div>

          {books.length === 0 ? (
            <div className="text-base-content/50 text-center py-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 mx-auto mb-2 opacity-50"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
              <p>You haven't uploaded any books yet.</p>
              <a href="/admin" className="link link-primary">
                Upload a book first
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {books.map((book) => (
                <label
                  key={book._id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedBooks.includes(book._id)
                      ? "border-primary bg-primary/5"
                      : "border-base-300 hover:border-base-content/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary mt-1"
                    checked={selectedBooks.includes(book._id)}
                    onChange={() => toggleBook(book._id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{book.title}</div>
                    <div className="text-sm text-base-content/70 truncate">
                      by {book.author}
                    </div>
                    <span className="badge badge-sm badge-ghost mt-1">
                      {book.fileType}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          {selectedBooks.length > 0 && (
            <div className="text-sm text-base-content/70 mt-2">
              {selectedBooks.length} book(s) selected
            </div>
          )}
        </div>
      </div>

      {/* Email Notification Card */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Email Notification</h2>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={notifyUser}
                onChange={(e) => setNotifyUser(e.target.checked)}
                disabled={selectedBooks.length === 0}
              />
              <div>
                <span className="label-text font-medium">
                  Notify user via email
                </span>
                <p className="text-sm text-base-content/50">
                  {selectedBooks.length === 0
                    ? "Select at least one book to enable email notification"
                    : "Send an email to the user about their book access"}
                </p>
              </div>
            </label>
          </div>

          {/* Template Editor Toggle */}
          {selectedBooks.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-2"
                onClick={() => setShowTemplateEditor(!showTemplateEditor)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`w-4 h-4 transition-transform ${
                    showTemplateEditor ? "rotate-180" : ""
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
                {showTemplateEditor ? "Hide" : "Customize"} Email Template
                {isTemplateDefault && (
                  <span className="badge badge-ghost badge-sm">Default</span>
                )}
              </button>

              {showTemplateEditor && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  {/* Template Variable Help */}
                  <div className="bg-base-200 rounded-lg p-3 text-sm">
                    <div className="font-medium mb-2">Available Variables:</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "{{userName}}",
                        "{{userEmail}}",
                        "{{adminName}}",
                        "{{bookList}}",
                        "{{loginUrl}}",
                        "{{appName}}",
                      ].map((v) => (
                        <code
                          key={v}
                          className="bg-base-100 px-2 py-0.5 rounded text-xs"
                        >
                          {v}
                        </code>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Subject</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={template.subject}
                      onChange={(e) =>
                        setTemplate({ ...template, subject: e.target.value })
                      }
                    />
                  </div>

                  {/* HTML Body */}
                  <div className="form-control">
                    <div className="flex items-center justify-between">
                      <label className="label">
                        <span className="label-text">HTML Body</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() =>
                          setShowTemplatePreview(!showTemplatePreview)
                        }
                      >
                        {showTemplatePreview ? "Edit" : "Preview"}
                      </button>
                    </div>

                    {showTemplatePreview ? (
                      <div className="border rounded-lg p-4 min-h-[200px] bg-white">
                        <div
                          dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                        />
                      </div>
                    ) : (
                      <textarea
                        className="textarea textarea-bordered h-48 font-mono text-sm"
                        value={template.htmlBody}
                        onChange={(e) =>
                          setTemplate({ ...template, htmlBody: e.target.value })
                        }
                      />
                    )}
                  </div>

                  {/* Text Body (optional) */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Plain Text Body</span>
                      <span className="label-text-alt text-base-content/50">
                        Optional - fallback for email clients
                      </span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered h-32 font-mono text-sm"
                      value={template.textBody || ""}
                      onChange={(e) =>
                        setTemplate({ ...template, textBody: e.target.value })
                      }
                      placeholder="Plain text version of the email..."
                    />
                  </div>

                  {/* Template Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                    >
                      {isSavingTemplate ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        "Save Template"
                      )}
                    </button>
                    {!isTemplateDefault && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleResetTemplate}
                        disabled={isSavingTemplate}
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <a href="/admin/users" className="btn btn-ghost">
          Cancel
        </a>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || !email}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Adding User...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add User
            </>
          )}
        </button>
      </div>
    </form>
  );
}
