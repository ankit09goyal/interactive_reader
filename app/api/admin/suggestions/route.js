import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import Suggestion from "@/models/Suggestion";
import Book from "@/models/Book";
import User from "@/models/User";
import { handleApiError } from "@/libs/apiHelpers";

// GET /api/admin/suggestions - List all suggestions for admin's books
export async function GET(req) {
  try {
    const session = await auth();

    // Verify admin access
    const authError = verifyAdminForApi(session);
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const adminId = session.user.id;
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId");
    const status = searchParams.get("status"); // "replied", "unreplied", or null for all
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;

    await connectMongo();

    // Get all books uploaded by this admin
    const adminBooks = await Book.find({ uploadedBy: adminId })
      .select("_id title")
      .lean();
    const adminBookIds = adminBooks.map((b) => b._id);

    // Build query
    const query = {
      bookId: bookId ? bookId : { $in: adminBookIds },
    };

    // Filter by status if specified
    if (status === "replied") {
      query.adminReply = { $ne: null };
    } else if (status === "unreplied") {
      query.adminReply = null;
    }

    // Add search filter if specified
    if (search) {
      query.$or = [
        { suggestion: { $regex: search, $options: "i" } },
        { selectedText: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await Suggestion.countDocuments(query);

    // Fetch suggestions with pagination
    const suggestions = await Suggestion.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get unique user IDs to fetch user info
    const userIds = [
      ...new Set(suggestions.map((s) => s.userId).filter(Boolean)),
    ];
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email image")
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Create book map for quick lookup
    const bookMap = new Map(adminBooks.map((b) => [b._id.toString(), b]));

    // Format suggestions with user and book info
    const formattedSuggestions = suggestions.map((s) => {
      const user = s.userId ? userMap.get(s.userId.toString()) : null;
      const book = bookMap.get(s.bookId.toString());

      return {
        ...s,
        _id: s._id.toString(),
        bookId: s.bookId.toString(),
        userId: s.userId?.toString() || null,
        repliedBy: s.repliedBy?.toString() || null,
        user: user
          ? {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              image: user.image,
            }
          : null,
        book: book
          ? {
              id: book._id.toString(),
              title: book.title,
            }
          : null,
        createdAt: s.createdAt?.toISOString() || null,
        updatedAt: s.updatedAt?.toISOString() || null,
        repliedAt: s.repliedAt?.toISOString() || null,
      };
    });

    return NextResponse.json({
      suggestions: formattedSuggestions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      books: adminBooks.map((b) => ({
        id: b._id.toString(),
        title: b.title,
      })),
    });
  } catch (error) {
    return handleApiError(
      error,
      "Failed to fetch suggestions",
      "fetching admin suggestions"
    );
  }
}
