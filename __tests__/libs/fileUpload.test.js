import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import * as fileUpload from "@/libs/fileUpload";
import fs from "fs";

vi.mock("fs", () => ({
  default: {
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
    },
  },
}));

describe("FileUpload Library", () => {
  const {
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    isValidFileType,
    isValidFileSize,
    getExtensionFromMimeType,
    sanitizeFilename,
    generateUniqueFilename,
    getUserUploadDir,
    validateFile,
    ensureUploadDir,
    saveFile,
    deleteFile,
  } = fileUpload;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Constants", () => {
    it("should define allowed MIME types for PDF and EPUB", () => {
      expect(ALLOWED_MIME_TYPES["application/pdf"]).toBe(".pdf");
      expect(ALLOWED_MIME_TYPES["application/epub+zip"]).toBe(".epub");
    });

    it("should define MAX_FILE_SIZE as 50MB", () => {
      expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    });
  });

  describe("isValidFileType", () => {
    it("should return true for application/pdf", () => {
      expect(isValidFileType("application/pdf")).toBe(true);
    });

    it("should return true for application/epub+zip", () => {
      expect(isValidFileType("application/epub+zip")).toBe(true);
    });

    it("should return false for invalid MIME types", () => {
      expect(isValidFileType("text/plain")).toBe(false);
      expect(isValidFileType("image/jpeg")).toBe(false);
      expect(isValidFileType("application/octet-stream")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidFileType("")).toBe(false);
    });
  });

  describe("isValidFileSize", () => {
    it("should return true for valid file sizes", () => {
      expect(isValidFileSize(1024)).toBe(true);
      expect(isValidFileSize(MAX_FILE_SIZE)).toBe(true);
      expect(isValidFileSize(1)).toBe(true);
    });

    it("should return false for size larger than MAX_FILE_SIZE", () => {
      expect(isValidFileSize(MAX_FILE_SIZE + 1)).toBe(false);
    });

    it("should return false for zero size", () => {
      expect(isValidFileSize(0)).toBe(false);
    });

    it("should return false for negative size", () => {
      expect(isValidFileSize(-1)).toBe(false);
    });
  });

  describe("getExtensionFromMimeType", () => {
    it("should return .pdf for application/pdf", () => {
      expect(getExtensionFromMimeType("application/pdf")).toBe(".pdf");
    });

    it("should return .epub for application/epub+zip", () => {
      expect(getExtensionFromMimeType("application/epub+zip")).toBe(".epub");
    });

    it("should return empty string for unknown MIME types", () => {
      expect(getExtensionFromMimeType("text/plain")).toBe("");
      expect(getExtensionFromMimeType("unknown")).toBe("");
    });
  });

  describe("sanitizeFilename", () => {
    it("should lowercase filename", () => {
      expect(sanitizeFilename("TestFile.PDF")).toBe("testfile.pdf");
    });

    it("should replace special characters with underscores", () => {
      expect(sanitizeFilename("file name!@#.pdf")).toBe("file_name_.pdf");
    });

    it("should replace multiple underscores with single underscore", () => {
      expect(sanitizeFilename("file___name.pdf")).toBe("file_name.pdf");
    });

    it("should preserve allowed characters", () => {
      expect(sanitizeFilename("file-name_123.pdf")).toBe("file-name_123.pdf");
    });

    it("should remove path components", () => {
      expect(sanitizeFilename("/path/to/file.pdf")).toBe("file.pdf");
      expect(sanitizeFilename("subdir\\file.pdf")).toContain("file.pdf");
    });
  });

  describe("generateUniqueFilename", () => {
    it("should add timestamp prefix", () => {
      const before = Date.now();
      const result = generateUniqueFilename("test.pdf");
      const after = Date.now();

      const [timestamp] = result.split("-");
      expect(parseInt(timestamp)).toBeGreaterThanOrEqual(before);
      expect(parseInt(timestamp)).toBeLessThanOrEqual(after);
    });

    it("should include sanitized filename", () => {
      const result = generateUniqueFilename("Test File.PDF");
      expect(result).toMatch(/^\d+-test_file.pdf$/);
    });
  });

  describe("getUserUploadDir", () => {
    it("should return correct upload directory path", () => {
      const result = getUserUploadDir("user123");
      expect(result).toContain(
        path.join("public", "uploads", "books", "user123")
      );
    });

    it("should include process.cwd()", () => {
      const result = getUserUploadDir("user123");
      expect(result).toContain(process.cwd());
    });
  });

  describe("validateFile", () => {
    it("should return valid for correct file", () => {
      const file = { type: "application/pdf", size: 1024 };
      const result = validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error for null file", () => {
      const result = validateFile(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("No file provided");
    });

    it("should return error for invalid file type", () => {
      const file = { type: "text/plain", size: 1024 };
      const result = validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should return error for file too large", () => {
      const file = { type: "application/pdf", size: MAX_FILE_SIZE + 1 };
      const result = validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("File too large");
    });

    it("should validate EPUB files", () => {
      const file = { type: "application/epub+zip", size: 1024 };
      const result = validateFile(file);

      expect(result.valid).toBe(true);
    });
  });

  describe("ensureUploadDir", () => {
    it("should create directory recursively", async () => {
      fs.promises.mkdir.mockResolvedValue(undefined);

      const userId = "test-user";
      const result = await ensureUploadDir(userId);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        { recursive: true }
      );
      expect(result).toContain(userId);
    });

    it("should handle error during directory creation", async () => {
      fs.promises.mkdir.mockRejectedValue(new Error("Permission denied"));

      await expect(ensureUploadDir("test-user")).rejects.toThrow(
        "Failed to create upload directory"
      );
    });
  });

  describe("saveFile", () => {
    it("should save file to disk", async () => {
      fs.promises.mkdir.mockResolvedValue(undefined);
      fs.promises.writeFile.mockResolvedValue(undefined);

      const buffer = Buffer.from("test");
      const userId = "test-user";
      const filename = "test.pdf";

      const result = await saveFile(buffer, userId, filename);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join(userId, filename)),
        buffer
      );
      expect(result).toEqual({
        filePath: `/uploads/books/${userId}/${filename}`,
        fullPath: expect.stringContaining(filename),
      });
    });

    it("should handle error during file save", async () => {
      fs.promises.mkdir.mockResolvedValue(undefined);
      fs.promises.writeFile.mockRejectedValue(new Error("Write failed"));

      const buffer = Buffer.from("test");
      await expect(saveFile(buffer, "user", "file.pdf")).rejects.toThrow(
        "Failed to save file"
      );
    });
  });

  describe("deleteFile", () => {
    it("should delete file from disk", async () => {
      fs.promises.unlink.mockResolvedValue(undefined);

      const result = await deleteFile("/uploads/file.pdf");

      expect(fs.promises.unlink).toHaveBeenCalledWith(
        expect.stringContaining("file.pdf")
      );
      expect(result).toBe(true);
    });

    it("should handle error during file deletion", async () => {
      fs.promises.unlink.mockRejectedValue(new Error("Not found"));

      const result = await deleteFile("/uploads/file.pdf");

      expect(result).toBe(false);
    });
  });
});
