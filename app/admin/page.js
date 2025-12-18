import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import AdminBooksClient from "./AdminBooksClient";

export const dynamic = "force-dynamic";

async function getBooks(userId) {
  await connectMongo();

  const books = await Book.find({ uploadedBy: userId })
    .select(
      "title author description fileName filePath fileSize mimeType createdAt"
    )
    .sort({ createdAt: -1 })
    .lean();

  // Transform books for client
  return books.map((book) => ({
    ...book,
    _id: book._id.toString(),
    uploadedBy: book.uploadedBy?.toString(),
    createdAt: book.createdAt?.toISOString(),
    fileSizeFormatted: formatFileSize(book.fileSize),
    fileType: book.mimeType === "application/pdf" ? "PDF" : "EPUB",
  }));
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default async function AdminDashboard() {
  const session = await auth();
  const books = await getBooks(session.user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-base-content/70 mt-1">
          Manage your books - upload, view, and organize your library.
        </p>
      </div>

      <AdminBooksClient initialBooks={books} />
    </div>
  );
}
