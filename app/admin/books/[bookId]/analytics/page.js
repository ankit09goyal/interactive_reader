import { auth } from "@/libs/auth";
import { requireAdmin } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Book from "@/models/Book";
import Link from "next/link";
import BookAnalyticsClient from "./BookAnalyticsClient";
import icons from "@/libs/icons";

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

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="btn btn-ghost btn-sm gap-2 mb-4">
          {icons.back}
          Back to Books
        </Link>
        {!book && (
          <div>
            <h1 className="text-3xl font-bold">Book Not Found</h1>
            <p className="text-base-content/70 mt-1">
              The book you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to it.
            </p>
          </div>
        )}
        {book && (
          <>
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold">Book Analytics</h1>
              <p className="text-base-content/70 mt-1">
                {book.title} (
                {book.mimeType === "application/pdf" ? "PDF" : "EPUB"})
              </p>
            </div>
            <BookAnalyticsClient bookId={bookId} />
          </>
        )}
      </div>
    </div>
  );
}
