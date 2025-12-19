import { auth } from "@/libs/auth";
import { redirect } from "next/navigation";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import EmailTemplate from "@/models/EmailTemplate";
import { getDefaultEmailTemplate } from "@/libs/emailNotifications";
import AddUserForm from "./AddUserForm";

export const dynamic = "force-dynamic";

async function getAdminBooks(adminId) {
  await connectMongo();
  const books = await Book.find({ uploadedBy: adminId })
    .select("_id title author mimeType")
    .sort({ createdAt: -1 })
    .lean();

  return books.map((book) => ({
    _id: book._id.toString(),
    title: book.title,
    author: book.author,
    fileType: book.mimeType === "application/pdf" ? "PDF" : "EPUB",
  }));
}

async function getEmailTemplate(adminId) {
  await connectMongo();
  const savedTemplate = await EmailTemplate.findOne({ adminId }).lean();

  if (savedTemplate) {
    return {
      template: {
        subject: savedTemplate.subject,
        htmlBody: savedTemplate.htmlBody,
        textBody: savedTemplate.textBody,
      },
      isDefault: false,
    };
  }

  return {
    template: getDefaultEmailTemplate(),
    isDefault: true,
  };
}

export default async function AddUserPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const adminId = session.user.id;
  const [books, emailTemplateData] = await Promise.all([
    getAdminBooks(adminId),
    getEmailTemplate(adminId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <a href="/admin/users" className="btn btn-ghost btn-sm">
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
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back
        </a>
        <div>
          <h1 className="text-3xl font-bold">Add New User</h1>
          <p className="text-base-content/70 mt-1">
            Create a new user and optionally grant book access
          </p>
        </div>
      </div>

      <AddUserForm
        books={books}
        initialTemplate={emailTemplateData.template}
        isDefaultTemplate={emailTemplateData.isDefault}
      />
    </div>
  );
}
