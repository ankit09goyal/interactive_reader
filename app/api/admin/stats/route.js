import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import { handleApiError } from "@/libs/apiHelpers";

// GET /api/admin/stats - Get application statistics (admin only)
export async function GET() {
  try {
    const session = await auth();
    
    // Verify admin access
    const authError = verifyAdminForApi(session);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    await connectMongo();

    // Get various statistics
    const [
      totalUsers,
      adminUsers,
      usersWithAccess,
      recentUsers,
      usersByMonth,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ hasAccess: true }),
      User.find({})
        .select("name email image role hasAccess createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      // User registrations by month (last 6 months)
      User.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
            },
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
      ]),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        adminUsers,
        regularUsers: totalUsers - adminUsers,
        usersWithAccess,
        freeUsers: totalUsers - usersWithAccess,
      },
      recentUsers,
      usersByMonth,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch stats", "fetching stats");
  }
}

