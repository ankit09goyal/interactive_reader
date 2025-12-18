import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Book from "@/models/Book";
import UserBookAccess from "@/models/UserBookAccess";

// GET /api/admin/users/[userId] - Get single user (admin only)
export async function GET(req, { params }) {
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

    const { userId } = await params;
    const adminId = session.user.id;

    await connectMongo();

    const user = await User.findById(userId)
      .select(
        "name email image role hasAccess customerId priceId createdAt updatedAt addedBy"
      )
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the current admin has this user in their addedBy array
    const isUserAddedByAdmin = user.addedBy?.some(
      (id) => id.toString() === adminId
    );

    if (!isUserAddedByAdmin) {
      return NextResponse.json(
        { error: "You do not have access to this user" },
        { status: 403 }
      );
    }

    // Get admin's book IDs and user's book access count
    const adminBookIds = await Book.find({ uploadedBy: adminId }).distinct(
      "_id"
    );
    const bookAccessCount = await UserBookAccess.countDocuments({
      userId: user._id,
      bookId: { $in: adminBookIds },
    });

    return NextResponse.json({
      user: {
        ...user,
        _id: user._id.toString(),
        hasBookAccess: bookAccessCount > 0,
        bookAccessCount,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[userId] - Update user (admin only)
export async function PUT(req, { params }) {
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

    const { userId } = await params;
    const adminId = session.user.id;
    const body = await req.json();
    const { name, role, hasAccess } = body;

    // Prevent admin from modifying their own role
    if (adminId === userId && role !== undefined) {
      return NextResponse.json(
        { error: "Cannot modify your own role" },
        { status: 400 }
      );
    }

    await connectMongo();

    // First, find the user to verify access
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the current admin has this user in their addedBy array
    const isUserAddedByAdmin = existingUser.addedBy?.some(
      (id) => id.toString() === adminId
    );

    if (!isUserAddedByAdmin) {
      return NextResponse.json(
        { error: "You do not have access to this user" },
        { status: 403 }
      );
    }

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
    ).select("name email image role hasAccess createdAt updatedAt addedBy");

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[userId] - Delete user (admin only)
export async function DELETE(req, { params }) {
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

    const { userId } = await params;
    const adminId = session.user.id;

    // Prevent admin from deleting themselves
    if (adminId === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await connectMongo();

    // First, find the user
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the current admin has this user in their addedBy array
    const isUserAddedByAdmin = user.addedBy?.some(
      (id) => id.toString() === adminId
    );

    if (!isUserAddedByAdmin) {
      return NextResponse.json(
        { error: "You do not have access to this user" },
        { status: 403 }
      );
    }

    // Get admin's book IDs
    const adminBookIds = await Book.find({ uploadedBy: adminId }).distinct(
      "_id"
    );

    // Check if other admins also added this user
    const otherAdmins = user.addedBy?.filter((id) => id.toString() !== adminId);

    if (otherAdmins && otherAdmins.length > 0) {
      // Other admins exist - soft removal
      // 1. Remove current admin from addedBy array
      await User.findByIdAndUpdate(userId, {
        $pull: { addedBy: adminId },
      });

      // 2. Revoke user's access to all books owned by current admin
      await UserBookAccess.deleteMany({
        userId: userId,
        bookId: { $in: adminBookIds },
      });

      return NextResponse.json({
        message: "User removed from your list and book access revoked",
        softDeleted: true,
      });
    }

    // Current admin is the only one or addedBy is empty - delete user completely
    // 1. Delete all book access records for this user
    await UserBookAccess.deleteMany({ userId: userId });

    // 2. Delete the user
    await User.findByIdAndDelete(userId);

    return NextResponse.json({
      message: "User deleted successfully",
      softDeleted: false,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
