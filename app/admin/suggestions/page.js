import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Suggestion from "@/models/Suggestion";
import Book from "@/models/Book";
import User from "@/models/User";
import AdminSuggestionsClient from "./AdminSuggestionsClient";

export const dynamic = "force-dynamic";

const SUGGESTIONS_PER_PAGE = 10;

async function getSuggestions(adminId) {
  await connectMongo();

  // Get all books uploaded by this admin
  const adminBooks = await Book.find({ uploadedBy: adminId })
    .select("_id title")
    .lean();
  const adminBookIds = adminBooks.map((b) => b._id);

  // Get total count for stats
  const totalCount = await Suggestion.countDocuments({
    bookId: { $in: adminBookIds },
  });
  const unrepliedCount = await Suggestion.countDocuments({
    bookId: { $in: adminBookIds },
    adminReply: null,
  });
  const repliedCount = await Suggestion.countDocuments({
    bookId: { $in: adminBookIds },
    adminReply: { $ne: null },
  });

  // Get first page of suggestions
  const suggestions = await Suggestion.find({
    bookId: { $in: adminBookIds },
  })
    .sort({ createdAt: -1 })
    .limit(SUGGESTIONS_PER_PAGE)
    .lean();

  // Get unique user IDs to fetch user info
  const userIds = [...new Set(suggestions.map((s) => s.userId).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email image")
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  // Create book map for quick lookup
  const bookMap = new Map(adminBooks.map((b) => [b._id.toString(), b]));

  // Format suggestions
  const formattedSuggestions = suggestions.map((s) => {
    const user = s.userId ? userMap.get(s.userId.toString()) : null;
    const book = bookMap.get(s.bookId.toString());

    return {
      _id: s._id.toString(),
      suggestion: s.suggestion,
      selectedText: s.selectedText,
      adminReply: s.adminReply,
      epubChapter: s.epubChapter,
      createdAt: s.createdAt?.toISOString(),
      repliedAt: s.repliedAt?.toISOString(),
      user: user
        ? {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          }
        : null,
      book: book
        ? {
            id: book._id.toString(),
            title: book.title,
          }
        : null,
    };
  });

  return {
    suggestions: formattedSuggestions,
    books: adminBooks.map((b) => ({
      id: b._id.toString(),
      title: b.title,
    })),
    stats: {
      totalCount,
      unrepliedCount,
      repliedCount,
    },
    pagination: {
      page: 1,
      limit: SUGGESTIONS_PER_PAGE,
      totalCount,
      totalPages: Math.ceil(totalCount / SUGGESTIONS_PER_PAGE),
    },
  };
}

export default async function AdminSuggestionsPage() {
  const session = await auth();
  const { suggestions, books, stats, pagination } = await getSuggestions(
    session.user.id
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suggest Improvements</h1>
          <p className="text-base-content/70 mt-1">
            Manage improvement suggestions from your readers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-sm text-base-content/70">
            <div>
              Total: <span className="font-semibold">{stats.totalCount}</span>
            </div>
            <div className="text-warning">
              Unreplied:{" "}
              <span className="font-semibold">{stats.unrepliedCount}</span>
            </div>
            <div className="text-success">
              Replied: <span className="font-semibold">{stats.repliedCount}</span>
            </div>
          </div>
        </div>
      </div>

      <AdminSuggestionsClient
        initialSuggestions={suggestions}
        books={books}
        initialPagination={pagination}
      />
    </div>
  );
}
