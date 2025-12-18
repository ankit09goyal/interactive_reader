import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Book from "@/models/Book";
import UserBookAccess from "@/models/UserBookAccess";
import UserTable from "@/components/UserTable";

export const dynamic = "force-dynamic";

async function getUsers(adminId) {
  await connectMongo();

  // Get all users added by this admin
  const users = await User.find({ addedBy: adminId })
    .select("name email image role hasAccess createdAt addedBy")
    .sort({ createdAt: -1 })
    .lean();

  // Get admin's book IDs for calculating book access
  const adminBookIds = await Book.find({ uploadedBy: adminId }).distinct("_id");

  // Get book access for these users
  const userIds = users.map((u) => u._id);
  const userBookAccess = await UserBookAccess.find({
    userId: { $in: userIds },
    bookId: { $in: adminBookIds },
  }).lean();

  // Map access by user ID
  const accessMap = {};
  userBookAccess.forEach((access) => {
    const userIdStr = access.userId.toString();
    if (!accessMap[userIdStr]) {
      accessMap[userIdStr] = [];
    }
    accessMap[userIdStr].push(access.bookId);
  });

  // Add book access status to each user
  return users.map((user) => {
    const userIdStr = user._id.toString();
    return {
      ...user,
      _id: userIdStr,
      createdAt: user.createdAt?.toISOString(),
      hasBookAccess: accessMap[userIdStr]?.length > 0,
      bookAccessCount: accessMap[userIdStr]?.length || 0,
    };
  });
}

export default async function AdminUsersPage() {
  const session = await auth();
  const adminId = session.user.id;
  const users = await getUsers(adminId);

  // Count users with no book access
  const usersWithNoAccess = users.filter((u) => !u.hasBookAccess).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-base-content/70 mt-1">
            View and manage users you have added
          </p>
        </div>
        <div className="flex gap-4 text-sm text-base-content/70">
          <div>
            Total: <span className="font-semibold">{users.length}</span> users
          </div>
          {usersWithNoAccess > 0 && (
            <div className="text-warning">
              <span className="font-semibold">{usersWithNoAccess}</span> without
              book access
            </div>
          )}
        </div>
      </div>

      <UserTable users={users} />
    </div>
  );
}
