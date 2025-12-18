import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Book from "@/models/Book";
import UserBookAccess from "@/models/UserBookAccess";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

async function getAnalytics(adminId) {
  await connectMongo();

  const adminObjectId = new mongoose.Types.ObjectId(adminId);

  // Get users added by this admin (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const usersByMonth = await User.aggregate([
    {
      $match: {
        addedBy: adminObjectId,
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  // Get total users added by this admin
  const totalUsers = await User.countDocuments({ addedBy: adminObjectId });

  // Get admin's book IDs
  const adminBooks = await Book.find({ uploadedBy: adminObjectId })
    .select("_id title")
    .lean();
  const adminBookIds = adminBooks.map((b) => b._id);

  // Get users with book access (admin's books only)
  const usersWithBookAccess = await UserBookAccess.distinct("userId", {
    bookId: { $in: adminBookIds },
  });

  // Get users added by admin who have no book access
  const usersWithNoAccess = await User.countDocuments({
    addedBy: adminObjectId,
    _id: { $nin: usersWithBookAccess },
  });

  // Get book access stats per book
  const bookAccessStats = await UserBookAccess.aggregate([
    {
      $match: {
        bookId: { $in: adminBookIds },
      },
    },
    {
      $group: {
        _id: "$bookId",
        accessCount: { $sum: 1 },
      },
    },
  ]);

  // Map book access counts to book details
  const bookAccessMap = bookAccessStats.reduce((acc, item) => {
    acc[item._id.toString()] = item.accessCount;
    return acc;
  }, {});

  const booksWithAccessCount = adminBooks.map((book) => ({
    _id: book._id.toString(),
    title: book.title,
    accessCount: bookAccessMap[book._id.toString()] || 0,
  }));

  return {
    usersByMonth,
    totalUsers,
    usersWithAccess: usersWithBookAccess.length,
    usersWithNoAccess,
    totalBooks: adminBooks.length,
    booksWithAccessCount,
  };
}

export default async function AdminAnalyticsPage() {
  const session = await auth();
  const adminId = session.user.id;
  const analytics = await getAnalytics(adminId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-base-content/70 mt-1">
          View your users and book access statistics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <div className="text-3xl font-bold text-primary">
            {analytics.totalUsers}
          </div>
          <div className="text-sm text-base-content/70 mt-1">Total Users</div>
        </div>
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <div className="text-3xl font-bold text-success">
            {analytics.usersWithAccess}
          </div>
          <div className="text-sm text-base-content/70 mt-1">
            Users with Book Access
          </div>
        </div>
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <div className="text-3xl font-bold text-warning">
            {analytics.usersWithNoAccess}
          </div>
          <div className="text-sm text-base-content/70 mt-1">
            Users without Access
          </div>
        </div>
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <div className="text-3xl font-bold text-info">
            {analytics.totalBooks}
          </div>
          <div className="text-sm text-base-content/70 mt-1">Your Books</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Book Access Distribution */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">User Book Access</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">With Book Access</span>
              <span className="font-semibold">{analytics.usersWithAccess}</span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-3">
              <div
                className="bg-success h-3 rounded-full"
                style={{
                  width: `${
                    analytics.totalUsers > 0
                      ? (analytics.usersWithAccess / analytics.totalUsers) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">Without Book Access</span>
              <span className="font-semibold">
                {analytics.usersWithNoAccess}
              </span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-3">
              <div
                className="bg-warning h-3 rounded-full"
                style={{
                  width: `${
                    analytics.totalUsers > 0
                      ? (analytics.usersWithNoAccess / analytics.totalUsers) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Book Access Per Book */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">Access Per Book</h2>
          {analytics.booksWithAccessCount.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {analytics.booksWithAccessCount
                .sort((a, b) => b.accessCount - a.accessCount)
                .map((book) => {
                  const maxCount = Math.max(
                    ...analytics.booksWithAccessCount.map((b) => b.accessCount),
                    1
                  );
                  return (
                    <div key={book._id} className="flex items-center gap-3">
                      <span
                        className="w-32 text-sm text-base-content/70 truncate"
                        title={book.title}
                      >
                        {book.title}
                      </span>
                      <div className="flex-1 bg-base-300 rounded-full h-4">
                        <div
                          className="bg-info h-4 rounded-full flex items-center justify-end pr-2"
                          style={{
                            width: `${
                              maxCount > 0
                                ? (book.accessCount / maxCount) * 100
                                : 0
                            }%`,
                            minWidth: book.accessCount > 0 ? "30px" : "0",
                          }}
                        >
                          {book.accessCount > 0 && (
                            <span className="text-xs font-semibold text-info-content">
                              {book.accessCount}
                            </span>
                          )}
                        </div>
                      </div>
                      {book.accessCount === 0 && (
                        <span className="text-xs text-base-content/50">0</span>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-base-content/70">No books uploaded yet</p>
          )}
        </div>
      </div>

      {/* User Registrations Over Time */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">
          Users Added (Last 6 Months)
        </h2>
        {analytics.usersByMonth.length > 0 ? (
          <div className="space-y-3">
            {analytics.usersByMonth.map((item) => {
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              const monthName = monthNames[item._id.month - 1];
              const maxCount = Math.max(
                ...analytics.usersByMonth.map((m) => m.count)
              );

              return (
                <div
                  key={`${item._id.year}-${item._id.month}`}
                  className="flex items-center gap-4"
                >
                  <span className="w-20 text-sm text-base-content/70">
                    {monthName} {item._id.year}
                  </span>
                  <div className="flex-1 bg-base-300 rounded-full h-6">
                    <div
                      className="bg-primary h-6 rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${(item.count / maxCount) * 100}%`,
                        minWidth: "40px",
                      }}
                    >
                      <span className="text-xs font-semibold text-primary-content">
                        {item.count}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-base-content/70">
            No users added in the last 6 months
          </p>
        )}
      </div>
    </div>
  );
}
