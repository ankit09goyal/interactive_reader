import { auth } from "@/libs/auth";
import { requireAdmin } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import Link from "next/link";
import BookAnalyticsClient from "./BookAnalyticsClient";

export const dynamic = "force-dynamic";

async function getBook(bookId, adminId) {
  await connectMongo();
  
  const book = await Book.findOne({
    _id: bookId,
    uploadedBy: adminId,
  }).lean();
  
  return book;
}

export default async function BookAnalyticsPage({ params }) {
  const session = await auth();
  requireAdmin(session);
  
  const { bookId } = await params;
  const book = await getBook(bookId, session.user.id);
  
  if (!book) {
    return (
      <div className="space-y-8">
        <div>
          <Link href="/admin" className="btn btn-ghost btn-sm gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Books
          </Link>
          <h1 className="text-3xl font-bold">Book Not Found</h1>
          <p className="text-base-content/70 mt-1">
            The book you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="btn btn-ghost btn-sm gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Books
        </Link>
        <h1 className="text-3xl font-bold">Reading Analytics</h1>
        <p className="text-base-content/70 mt-1">
          {book.title} ({book.mimeType === "application/pdf" ? "PDF" : "EPUB"})
        </p>
      </div>
      
      <BookAnalyticsClient bookId={bookId} />
    </div>
  );
}
