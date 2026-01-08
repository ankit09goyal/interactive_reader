/**
 * Client-safe book utility functions
 * These functions don't require Node.js modules and can be used in client components
 */

/**
 * Format file size to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get file type string from MIME type
 * @param {string} mimeType - The MIME type (e.g., "application/pdf")
 * @returns {string} - File type string ("PDF" or "EPUB")
 */
export function getFileType(mimeType) {
  return mimeType === "application/pdf" ? "PDF" : "EPUB";
}

/**
 * Transform a book object to include formatted fields
 * @param {Object} book - Book object from database
 * @param {Object} options - Optional transformation options
 * @param {string} options.grantedAt - ISO string for when access was granted (optional)
 * @returns {Object} - Transformed book object
 */
export function transformBook(book, options = {}) {
  if (!book) return null;

  const transformed = {
    _id: book._id?.toString() || book._id,
    title: book.title,
    author: book.author,
    description: book.description,
    fileName: book.fileName,
    filePath: book.filePath,
    fileSize: book.fileSize,
    mimeType: book.mimeType,
    createdAt: book.createdAt?.toISOString?.() || book.createdAt,
    fileSizeFormatted: formatFileSize(book.fileSize),
    fileType: getFileType(book.mimeType),
  };

  // Add optional fields
  if (book.uploadedBy) {
    transformed.uploadedBy = book.uploadedBy?.toString?.() || book.uploadedBy;
  }
  if (book.updatedAt) {
    transformed.updatedAt = book.updatedAt?.toISOString?.() || book.updatedAt;
  }
  if (options.grantedAt) {
    transformed.grantedAt = options.grantedAt;
  }

  return transformed;
}

