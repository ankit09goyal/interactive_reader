import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/libs/resend", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "test-email-id" }),
}));

vi.mock("@/config", () => ({
  default: {
    domainName: "example.com",
    appName: "TestApp",
    auth: {
      loginUrl: "/api/auth/signin",
    },
  },
}));

// Import after mocks
import {
  getDefaultEmailTemplate,
  replaceTemplateVariables,
  formatBookList,
  sendBookAccessNotification,
} from "@/libs/emailNotifications";
import { sendEmail } from "@/libs/resend";

describe("Email Notifications Library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDefaultEmailTemplate", () => {
    it("should return template with subject", () => {
      const template = getDefaultEmailTemplate();
      expect(template.subject).toBeDefined();
      expect(typeof template.subject).toBe("string");
    });

    it("should return template with htmlBody", () => {
      const template = getDefaultEmailTemplate();
      expect(template.htmlBody).toBeDefined();
      expect(template.htmlBody).toContain("{{userName}}");
      expect(template.htmlBody).toContain("{{adminName}}");
      expect(template.htmlBody).toContain("{{bookList}}");
      expect(template.htmlBody).toContain("{{loginUrl}}");
    });

    it("should return template with textBody", () => {
      const template = getDefaultEmailTemplate();
      expect(template.textBody).toBeDefined();
      expect(template.textBody).toContain("{{userName}}");
    });

    it("should contain congratulations message in subject", () => {
      const template = getDefaultEmailTemplate();
      expect(template.subject.toLowerCase()).toContain("congratulations");
    });
  });

  describe("replaceTemplateVariables", () => {
    it("should replace single variable", () => {
      const template = "Hello {{name}}!";
      const result = replaceTemplateVariables(template, { name: "John" });
      expect(result).toBe("Hello John!");
    });

    it("should replace multiple variables", () => {
      const template = "Hello {{firstName}} {{lastName}}!";
      const result = replaceTemplateVariables(template, {
        firstName: "John",
        lastName: "Doe",
      });
      expect(result).toBe("Hello John Doe!");
    });

    it("should replace repeated variables", () => {
      const template = "{{name}} likes {{name}}";
      const result = replaceTemplateVariables(template, { name: "John" });
      expect(result).toBe("John likes John");
    });

    it("should handle empty variables with empty string", () => {
      const template = "Hello {{name}}!";
      const result = replaceTemplateVariables(template, { name: "" });
      expect(result).toBe("Hello !");
    });

    it("should handle undefined variables (keeps placeholder)", () => {
      const template = "Hello {{name}}!";
      const result = replaceTemplateVariables(template, {});
      // When variable is not in the object, it keeps the placeholder
      expect(result).toBe("Hello {{name}}!");
    });

    it("should return empty string for null template", () => {
      const result = replaceTemplateVariables(null, { name: "John" });
      expect(result).toBe("");
    });

    it("should return empty string for undefined template", () => {
      const result = replaceTemplateVariables(undefined, { name: "John" });
      expect(result).toBe("");
    });
  });

  describe("formatBookList", () => {
    const books = [
      { title: "Book One", author: "Author A" },
      { title: "Book Two", author: "Author B" },
    ];

    it("should format books as HTML list items", () => {
      const result = formatBookList(books, "html");
      expect(result).toContain("<li>");
      expect(result).toContain("<strong>Book One</strong>");
      expect(result).toContain("by Author A");
      expect(result).toContain("<strong>Book Two</strong>");
    });

    it("should format books as text list", () => {
      const result = formatBookList(books, "text");
      expect(result).toContain("- Book One by Author A");
      expect(result).toContain("- Book Two by Author B");
    });

    it("should default to HTML format", () => {
      const result = formatBookList(books);
      expect(result).toContain("<li>");
    });

    it("should handle empty books array for HTML", () => {
      const result = formatBookList([], "html");
      expect(result).toContain("No books assigned");
    });

    it("should handle empty books array for text", () => {
      const result = formatBookList([], "text");
      expect(result).toBe("- No books assigned");
    });

    it("should handle null books array", () => {
      const result = formatBookList(null, "html");
      expect(result).toContain("No books assigned");
    });

    it("should handle single book", () => {
      const singleBook = [{ title: "Solo Book", author: "Solo Author" }];
      const result = formatBookList(singleBook, "text");
      expect(result).toBe("- Solo Book by Solo Author");
    });
  });

  describe("sendBookAccessNotification", () => {
    const mockParams = {
      user: { name: "Test User", email: "test@example.com" },
      books: [{ title: "Test Book", author: "Test Author" }],
      adminName: "Admin Name",
      template: null,
    };

    it("should send email with correct parameters", async () => {
      await sendBookAccessNotification(mockParams);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: expect.any(String),
          html: expect.any(String),
          text: expect.any(String),
        })
      );
    });

    it("should use default template when none provided", async () => {
      await sendBookAccessNotification(mockParams);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("Congratulations"),
        })
      );
    });

    it("should use custom template when provided", async () => {
      const customTemplate = {
        subject: "Custom Subject for {{userName}}",
        htmlBody: "<p>Custom body for {{userName}}</p>",
        textBody: "Custom text for {{userName}}",
      };

      await sendBookAccessNotification({
        ...mockParams,
        template: customTemplate,
      });

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Custom Subject for Test User",
        })
      );
    });

    it("should return email result on success", async () => {
      const result = await sendBookAccessNotification(mockParams);
      expect(result).toEqual({ id: "test-email-id" });
    });

    it("should return null on email failure", async () => {
      sendEmail.mockRejectedValueOnce(new Error("Email failed"));

      const result = await sendBookAccessNotification(mockParams);
      expect(result).toBeNull();
    });

    it("should use email prefix as name when name not provided", async () => {
      await sendBookAccessNotification({
        ...mockParams,
        user: { email: "john@example.com" },
      });

      expect(sendEmail).toHaveBeenCalled();
    });

    it("should use User as fallback name", async () => {
      await sendBookAccessNotification({
        ...mockParams,
        user: {},
      });

      expect(sendEmail).toHaveBeenCalled();
    });

    it("should include book list in email", async () => {
      await sendBookAccessNotification(mockParams);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("Test Book"),
        })
      );
    });

    it("should include login URL in email", async () => {
      await sendBookAccessNotification(mockParams);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("example.com"),
        })
      );
    });
  });
});
