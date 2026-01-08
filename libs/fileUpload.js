import fs from "fs";
import path from "path";
import { formatFileSize } from "./bookUtils";

// Allowed MIME types for book uploads
export const ALLOWED_MIME_TYPES = {
  "application/pdf": ".pdf",
  "application/epub+zip": ".epub",
};

// Maximum file size (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validate file type
 * @param {string} mimeType - The MIME type of the file
 * @returns {boolean} - True if valid
 */
export function isValidFileType(mimeType) {
  return Object.keys(ALLOWED_MIME_TYPES).includes(mimeType);
}

/**
 * Validate file size
 * @param {number} size - The file size in bytes
 * @returns {boolean} - True if valid
 */
export function isValidFileSize(size) {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - The MIME type
 * @returns {string} - The file extension
 */
export function getExtensionFromMimeType(mimeType) {
  return ALLOWED_MIME_TYPES[mimeType] || "";
}

/**
 * Sanitize filename to prevent path traversal and other issues
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  // Remove path components and keep only the filename
  const basename = path.basename(filename);
  // Replace any potentially dangerous characters
  return basename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
}

/**
 * Generate unique filename with timestamp
 * @param {string} originalFilename - Original filename
 * @returns {string} - Unique filename
 */
export function generateUniqueFilename(originalFilename) {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(originalFilename);
  return `${timestamp}-${sanitized}`;
}

/**
 * Get the upload directory path for a specific user
 * @param {string} userId - The user's ID
 * @returns {string} - Full path to the user's upload directory
 */
export function getUserUploadDir(userId) {
  return path.join(process.cwd(), "public", "uploads", "books", userId);
}

/**
 * Ensure upload directory exists for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<string>} - Path to the created directory
 */
export async function ensureUploadDir(userId) {
  const uploadDir = getUserUploadDir(userId);

  try {
    await fs.promises.mkdir(uploadDir, { recursive: true });
    return uploadDir;
  } catch (error) {
    console.error("Error creating upload directory:", error);
    throw new Error("Failed to create upload directory");
  }
}

/**
 * Save uploaded file to disk
 * @param {Buffer} buffer - File buffer
 * @param {string} userId - User ID for directory
 * @param {string} filename - Filename to save as
 * @returns {Promise<{filePath: string, fullPath: string}>} - Saved file paths
 */
export async function saveFile(buffer, userId, filename) {
  const uploadDir = await ensureUploadDir(userId);
  const fullPath = path.join(uploadDir, filename);
  const relativePath = `/uploads/books/${userId}/${filename}`;

  try {
    await fs.promises.writeFile(fullPath, buffer);
    return {
      filePath: relativePath,
      fullPath,
    };
  } catch (error) {
    console.error("Error saving file:", error);
    throw new Error("Failed to save file");
  }
}

/**
 * Delete a file from disk
 * @param {string} filePath - Relative path to file (e.g., /uploads/books/userId/filename)
 * @returns {Promise<boolean>} - True if deleted successfully
 */
export async function deleteFile(filePath) {
  const fullPath = path.join(process.cwd(), "public", filePath);

  try {
    await fs.promises.unlink(fullPath);
    return true;
  } catch (error) {
    // File might not exist, log but don't throw
    console.error("Error deleting file:", error.message);
    return false;
  }
}

/**
 * Validate uploaded file
 * @param {File|{size: number, type: string}} file - File object
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (!isValidFileType(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Only PDF and EPUB files are allowed.",
    };
  }

  if (!isValidFileSize(file.size)) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatFileSize(
        MAX_FILE_SIZE
      )}.`,
    };
  }

  return { valid: true };
}
