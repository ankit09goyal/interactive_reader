import { describe, it, expect } from "vitest";
import { formatFileSize, getFileType, transformBook } from "@/libs/bookUtils";

describe("bookUtils", () => {
  describe("formatFileSize", () => {
    it("should format 0 bytes", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
    });

    it("should format bytes", () => {
      expect(formatFileSize(500)).toBe("500 Bytes");
    });

    it("should format KB", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1500)).toBe("1.46 KB");
    });

    it("should format MB", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
    });
  });

  describe("getFileType", () => {
    it("should return PDF for pdf mime type", () => {
      expect(getFileType("application/pdf")).toBe("PDF");
    });

    it("should return EPUB for anything else (defaulting logic in code)", () => {
      expect(getFileType("application/epub+zip")).toBe("EPUB");
      expect(getFileType("other")).toBe("EPUB");
    });
  });

  describe("transformBook", () => {
    it("should return null if no book", () => {
      expect(transformBook(null)).toBeNull();
    });

    it("should transform book object", () => {
      const date = new Date();
      const book = {
        _id: "book-1",
        title: "Title",
        fileSize: 1024,
        mimeType: "application/pdf",
        createdAt: date,
        other: "ignored",
      };

      const transformed = transformBook(book);
      expect(transformed).toEqual({
        _id: "book-1",
        title: "Title",
        author: undefined,
        description: undefined,
        fileName: undefined,
        filePath: undefined,
        fileSize: 1024,
        mimeType: "application/pdf",
        createdAt: date.toISOString(),
        fileSizeFormatted: "1 KB",
        fileType: "PDF",
      });
    });

    it("should handle string IDs and dates", () => {
      const book = {
        _id: { toString: () => "book-1" },
        title: "Title",
        fileSize: 0,
        mimeType: "application/epub+zip",
      };
      const transformed = transformBook(book);
      expect(transformed._id).toBe("book-1");
      expect(transformed.fileType).toBe("EPUB");
    });
  });
});
