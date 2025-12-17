import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";

// GET /api/admin/users/[userId] - Get single user (admin only)
export async function GET(req, { params }) {
  try {
    const session = await auth();
    
    // Verify admin access
    const authError = verifyAdminForApi(session);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { userId } = await params;

    await connectMongo();

    const user = await User.findById(userId)
      .select("name email image role hasAccess customerId priceId createdAt updatedAt")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PUT /api/admin/users/[userId] - Update user (admin only)
export async function PUT(req, { params }) {
  try {
    const session = await auth();
    
    // Verify admin access
    const authError = verifyAdminForApi(session);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { userId } = await params;
    const body = await req.json();
    const { name, role, hasAccess } = body;

    // Prevent admin from modifying their own role
    if (session.user.id === userId && role !== undefined) {
      return NextResponse.json(
        { error: "Cannot modify your own role" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Build update object
    const update = {};
    if (name !== undefined) update.name = name;
    if (role !== undefined) {
      // Validate role
      if (!["user", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      update.role = role;
    }
    if (hasAccess !== undefined) update.hasAccess = hasAccess;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select("name email image role hasAccess createdAt updatedAt");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[userId] - Delete user (admin only)
export async function DELETE(req, { params }) {
  try {
    const session = await auth();
    
    // Verify admin access
    const authError = verifyAdminForApi(session);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }

    const { userId } = await params;

    // Prevent admin from deleting themselves
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await connectMongo();

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

