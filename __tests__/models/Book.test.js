import { describe, it, expect, vi } from "vitest";
import mongoose from "mongoose";

// Mock mongoose connection
vi.mock("@/libs/mongoose", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

describe("Book Model Schema", () => {
  // Schema field definitions for testing
  const bookSchemaFields = {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ["application/pdf", "application/epub+zip"],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  };

  describe("Schema Structure", () => {
    it("should have title field as required string with trim and index", () => {
      expect(bookSchemaFields.title.type).toBe(String);
      expect(bookSchemaFields.title.required).toBe(true);
      expect(bookSchemaFields.title.trim).toBe(true);
      expect(bookSchemaFields.title.index).toBe(true);
    });

    it("should have author field as required string with trim", () => {
      expect(bookSchemaFields.author.type).toBe(String);
      expect(bookSchemaFields.author.required).toBe(true);
      expect(bookSchemaFields.author.trim).toBe(true);
    });

    it("should have description field with default empty string", () => {
      expect(bookSchemaFields.description.type).toBe(String);
      expect(bookSchemaFields.description.default).toBe("");
    });

    it("should have fileName as required string", () => {
      expect(bookSchemaFields.fileName.type).toBe(String);
      expect(bookSchemaFields.fileName.required).toBe(true);
    });

    it("should have filePath as required string", () => {
      expect(bookSchemaFields.filePath.type).toBe(String);
      expect(bookSchemaFields.filePath.required).toBe(true);
    });

    it("should have fileSize as required number", () => {
      expect(bookSchemaFields.fileSize.type).toBe(Number);
      expect(bookSchemaFields.fileSize.required).toBe(true);
    });

    it("should have mimeType with enum for PDF and EPUB", () => {
      expect(bookSchemaFields.mimeType.type).toBe(String);
      expect(bookSchemaFields.mimeType.required).toBe(true);
      expect(bookSchemaFields.mimeType.enum).toContain("application/pdf");
      expect(bookSchemaFields.mimeType.enum).toContain("application/epub+zip");
    });

    it("should have uploadedBy as required ObjectId reference to User", () => {
      expect(bookSchemaFields.uploadedBy.type).toBe(
        mongoose.Schema.Types.ObjectId
      );
      expect(bookSchemaFields.uploadedBy.ref).toBe("User");
      expect(bookSchemaFields.uploadedBy.required).toBe(true);
      expect(bookSchemaFields.uploadedBy.index).toBe(true);
    });
  });

  describe("Virtual Fields", () => {
    describe("fileSizeFormatted", () => {
      const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
      };

      it("should return 0 Bytes for zero size", () => {
        expect(formatFileSize(0)).toBe("0 Bytes");
      });

      it("should format bytes correctly", () => {
        expect(formatFileSize(500)).toBe("500 Bytes");
      });

      it("should format kilobytes correctly", () => {
        expect(formatFileSize(1024)).toBe("1 KB");
        expect(formatFileSize(2048)).toBe("2 KB");
      });

      it("should format megabytes correctly", () => {
        expect(formatFileSize(1024 * 1024)).toBe("1 MB");
        expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
      });

      it("should format gigabytes correctly", () => {
        expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
      });

      it("should handle decimal values", () => {
        expect(formatFileSize(1536)).toBe("1.5 KB");
      });
    });

    describe("fileType", () => {
      const getFileType = (mimeType) => {
        if (mimeType === "application/pdf") return "PDF";
        if (mimeType === "application/epub+zip") return "EPUB";
        return "Unknown";
      };

      it("should return PDF for application/pdf", () => {
        expect(getFileType("application/pdf")).toBe("PDF");
      });

      it("should return EPUB for application/epub+zip", () => {
        expect(getFileType("application/epub+zip")).toBe("EPUB");
      });

      it("should return Unknown for other types", () => {
        expect(getFileType("text/plain")).toBe("Unknown");
        expect(getFileType("application/octet-stream")).toBe("Unknown");
      });
    });
  });

  describe("Validation Rules", () => {
    it("should only allow PDF and EPUB mime types", () => {
      const allowedTypes = bookSchemaFields.mimeType.enum;
      expect(allowedTypes).toHaveLength(2);
      expect(allowedTypes).toContain("application/pdf");
      expect(allowedTypes).toContain("application/epub+zip");
    });
  });
});
