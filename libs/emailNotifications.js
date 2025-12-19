import { sendEmail } from "./resend";
import config from "@/config";

/**
 * Returns the default email template for book access notifications
 * @returns {Object} Default template with subject, htmlBody, and textBody
 */
export const getDefaultEmailTemplate = () => {
  return {
    subject: "Congratulations! You've been granted access to books",
    htmlBody: `<p>Hello {{userName}},</p>
<p>You have been granted access to the following books by {{adminName}}:</p>
<ul>
  {{bookList}}
</ul>
<p>You can access the books by logging in.<br>
<a href="{{loginUrl}}">Access Book</a></p>

<p>Enter the email you used to make the purchase and click submit. You'll get a magic link in your inbox to login.</p>
<p>Best regards,<br />{{adminName}}</p>`,
    textBody: `Hello {{userName}},

You have been granted access to the following books by {{adminName}}:

{{bookList}}

You can access the books by logging in at: {{loginUrl}}

Enter the email you used to make the purchase and click submit. You'll get a magic link in your inbox to login.

Best regards,
{{adminName}}`,
  };
};

/**
 * Replaces template variables with actual values
 * @param {string} template - The template string with {{variables}}
 * @param {Object} variables - Object containing variable values
 * @returns {string} Template with replaced variables
 */
export const replaceTemplateVariables = (template, variables) => {
  if (!template) return "";

  let result = template;

  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, variables[key] || "");
  });

  return result;
};

/**
 * Formats a list of books for email display
 * @param {Array} books - Array of book objects with title and author
 * @param {string} format - 'html' or 'text'
 * @returns {string} Formatted book list
 */
export const formatBookList = (books, format = "html") => {
  if (!books || books.length === 0) {
    return format === "html"
      ? "<li>No books assigned</li>"
      : "- No books assigned";
  }

  if (format === "html") {
    return books
      .map(
        (book) => `<li><strong>${book.title}</strong> by ${book.author}</li>`
      )
      .join("\n  ");
  } else {
    return books.map((book) => `- ${book.title} by ${book.author}`).join("\n");
  }
};

/**
 * Sends a book access notification email to a user
 * @param {Object} params - The parameters for sending the notification
 * @param {Object} params.user - User object with name and email
 * @param {Array} params.books - Array of book objects with title and author
 * @param {string} params.adminName - Name of the admin granting access
 * @param {Object} params.template - Email template object with subject, htmlBody, textBody
 * @returns {Promise<Object|null>} Email send result or null if failed
 */
export const sendBookAccessNotification = async ({
  user,
  books,
  adminName,
  template,
}) => {
  try {
    // Use provided template or default
    const emailTemplate = template || getDefaultEmailTemplate();

    // Build login URL
    const loginUrl = `https://${config.domainName}${config.auth.loginUrl}`;

    // Prepare template variables
    const variables = {
      userName: user.name || user.email?.split("@")[0] || "User",
      userEmail: user.email,
      adminName: adminName || "Admin",
      bookList: formatBookList(books, "html"),
      loginUrl: loginUrl,
      appName: config.appName,
    };

    // Prepare text version variables
    const textVariables = {
      ...variables,
      bookList: formatBookList(books, "text"),
    };

    // Replace variables in template
    const subject = replaceTemplateVariables(emailTemplate.subject, variables);
    const htmlBody = replaceTemplateVariables(
      emailTemplate.htmlBody,
      variables
    );
    const textBody = replaceTemplateVariables(
      emailTemplate.textBody || emailTemplate.htmlBody?.replace(/<[^>]*>/g, ""),
      textVariables
    );

    // Send the email
    const result = await sendEmail({
      to: user.email,
      subject,
      html: htmlBody,
      text: textBody,
    });

    console.log(`Book access notification sent to ${user.email}`);
    return result;
  } catch (error) {
    // Log error but don't throw - email failures shouldn't prevent user creation
    console.error("Failed to send book access notification:", error.message);
    return null;
  }
};
