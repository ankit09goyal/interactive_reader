import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import UserTable from "@/components/UserTable";

export const dynamic = "force-dynamic";

async function getUsers() {
  await connectMongo();
  
  const users = await User.find({})
    .select("name email image role hasAccess createdAt")
    .sort({ createdAt: -1 })
    .lean();

  // Convert _id to string for serialization
  return users.map((user) => ({
    ...user,
    _id: user._id.toString(),
    createdAt: user.createdAt?.toISOString(),
  }));
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-base-content/70 mt-1">
            View and manage all registered users
          </p>
        </div>
        <div className="text-sm text-base-content/70">
          Total: <span className="font-semibold">{users.length}</span> users
        </div>
      </div>

      <UserTable users={users} />
    </div>
  );
}

