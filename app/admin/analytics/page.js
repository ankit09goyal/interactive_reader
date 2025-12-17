import connectMongo from "@/libs/mongoose";
import User from "@/models/User";

export const dynamic = "force-dynamic";

async function getAnalytics() {
  await connectMongo();

  // Get user registration stats by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const usersByMonth = await User.aggregate([
    {
      $match: {
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

  // Get role distribution
  const roleDistribution = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  // Get subscription stats
  const subscriptionStats = await User.aggregate([
    {
      $group: {
        _id: "$hasAccess",
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    usersByMonth,
    roleDistribution,
    subscriptionStats,
  };
}

export default async function AdminAnalyticsPage() {
  const analytics = await getAnalytics();

  const roleData = analytics.roleDistribution.reduce((acc, item) => {
    acc[item._id || "user"] = item.count;
    return acc;
  }, {});

  const subscriptionData = analytics.subscriptionStats.reduce((acc, item) => {
    acc[item._id ? "paid" : "free"] = item.count;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-base-content/70 mt-1">
          View application usage statistics and trends
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Distribution */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">User Roles</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">Admins</span>
              <span className="font-semibold">{roleData.admin || 0}</span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-3">
              <div
                className="bg-purple-500 h-3 rounded-full"
                style={{
                  width: `${
                    ((roleData.admin || 0) /
                      ((roleData.admin || 0) + (roleData.user || 0))) *
                      100 || 0
                  }%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">Regular Users</span>
              <span className="font-semibold">{roleData.user || 0}</span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full"
                style={{
                  width: `${
                    ((roleData.user || 0) /
                      ((roleData.admin || 0) + (roleData.user || 0))) *
                      100 || 0
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="text-lg font-semibold mb-4">Subscription Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">Paid Users</span>
              <span className="font-semibold">{subscriptionData.paid || 0}</span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{
                  width: `${
                    ((subscriptionData.paid || 0) /
                      ((subscriptionData.paid || 0) + (subscriptionData.free || 0))) *
                      100 || 0
                  }%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">Free Users</span>
              <span className="font-semibold">{subscriptionData.free || 0}</span>
            </div>
            <div className="w-full bg-base-300 rounded-full h-3">
              <div
                className="bg-amber-500 h-3 rounded-full"
                style={{
                  width: `${
                    ((subscriptionData.free || 0) /
                      ((subscriptionData.paid || 0) + (subscriptionData.free || 0))) *
                      100 || 0
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* User Registrations Over Time */}
      <div className="bg-base-200 rounded-xl p-6 border border-base-300">
        <h2 className="text-lg font-semibold mb-4">User Registrations (Last 6 Months)</h2>
        {analytics.usersByMonth.length > 0 ? (
          <div className="space-y-3">
            {analytics.usersByMonth.map((item) => {
              const monthNames = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
              ];
              const monthName = monthNames[item._id.month - 1];
              const maxCount = Math.max(...analytics.usersByMonth.map((m) => m.count));
              
              return (
                <div key={`${item._id.year}-${item._id.month}`} className="flex items-center gap-4">
                  <span className="w-20 text-sm text-base-content/70">
                    {monthName} {item._id.year}
                  </span>
                  <div className="flex-1 bg-base-300 rounded-full h-6">
                    <div
                      className="bg-primary h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: "40px" }}
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
          <p className="text-base-content/70">No registration data available</p>
        )}
      </div>
    </div>
  );
}

