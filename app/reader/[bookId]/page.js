import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import UserBookAccess from "@/models/UserBookAccess";
import PDFReader from "@/components/PDFReader";

export const dynamic = "force-dynamic";

// Helper function for file size formatting
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Fetch book with access check
async function getBookWithAccess(bookId, userId) {
  await connectMongo();

  // Check if user has access to this book
  const access = await UserBookAccess.findOne({
    userId,
    bookId,
  }).lean();

  if (!access) {
    return { error: "forbidden" };
  }

  // Get the book details
  const book = await Book.findById(bookId)
    .select(
      "title author description fileName filePath fileSize mimeType createdAt"
    )
    .lean();

  if (!book) {
    return { error: "not_found" };
  }

  return {
    book: {
      _id: book._id.toString(),
      title: book.title,
      author: book.author,
      description: book.description,
      fileName: book.fileName,
      filePath: book.filePath,
      fileSize: book.fileSize,
      mimeType: book.mimeType,
      createdAt: book.createdAt?.toISOString(),
      fileSizeFormatted: formatFileSize(book.fileSize),
      fileType: book.mimeType === "application/pdf" ? "PDF" : "EPUB",
    },
  };
}

export default async function ReaderPage({ params }) {
  const session = await auth();
  const { bookId } = await params;

  // Get book with access check
  const result = await getBookWithAccess(bookId, session.user.id);

  if (result.error === "forbidden") {
    return (
      <main className="min-h-screen p-8 pb-24">
        <section className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-16 bg-base-200 rounded-xl border border-base-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-warning mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-base-content/70 mb-6 text-center max-w-md">
              You don&apos;t have access to this book. Please contact your
              administrator to request access.
            </p>
            <Link href="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (result.error === "not_found") {
    notFound();
  }

  const { book } = result;

  // Check if book is PDF (only PDF is supported for now)
  if (book.mimeType !== "application/pdf") {
    return (
      <main className="min-h-screen p-8 pb-24">
        <section className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-16 bg-base-200 rounded-xl border border-base-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-info mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h1 className="text-2xl font-bold mb-2">Format Not Supported</h1>
            <p className="text-base-content/70 mb-6 text-center max-w-md">
              EPUB format is not yet supported in the reader. PDF support is
              available.
            </p>
            <Link href="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base-200">
      <section className="w-full h-screen flex flex-col">
        {/* PDF Reader - fills remaining space */}
        <div className="flex-1 min-h-0">
          <PDFReader filePath={book.filePath} title={book.title} />
        </div>
      </section>
    </main>
  );
}
