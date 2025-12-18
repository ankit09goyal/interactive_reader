import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Book from "@/models/Book";
import UserBookAccess from "@/models/UserBookAccess";

// GET /api/admin/users - List all users added by the current admin
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

    await connectMongo();

    const adminId = session.user.id;

    // Get query params for pagination and filtering
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    // Build query - only get users added by the current admin
    const query = { addedBy: adminId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
      // When searching, still filter by addedBy
      query.$and = [{ addedBy: adminId }];
      delete query.addedBy;
    }
    if (role) {
      query.role = role;
    }

    // Get admin's book IDs for calculating book access
    const adminBookIds = await Book.find({ uploadedBy: adminId }).distinct(
      "_id"
    );

    // Get total count and users
    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select("name email image role hasAccess createdAt addedBy")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

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
    const usersWithAccess = users.map((user) => {
      const userIdStr = user._id.toString();
      return {
        ...user,
        _id: userIdStr,
        hasBookAccess: accessMap[userIdStr]?.length > 0,
        bookAccessCount: accessMap[userIdStr]?.length || 0,
      };
    });

    return NextResponse.json({
      users: usersWithAccess,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create or add user to admin's list
export async function POST(req) {
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

    const body = await req.json();
    const { name, email, role = "user" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectMongo();

    const adminId = session.user.id;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // User exists - add current admin to addedBy array if not already present
      const isAlreadyAdded = existingUser.addedBy?.some(
        (id) => id.toString() === adminId
      );

      if (isAlreadyAdded) {
        // Admin already added this user
        return NextResponse.json(
          {
            user: existingUser,
            message: "User already in your list",
            isExisting: true,
          },
          { status: 200 }
        );
      }

      // Add admin to addedBy array
      const updatedUser = await User.findByIdAndUpdate(
        existingUser._id,
        { $addToSet: { addedBy: adminId } },
        { new: true }
      );

      return NextResponse.json(
        {
          user: updatedUser,
          message: "User added to your list",
          isExisting: true,
        },
        { status: 200 }
      );
    }

    // Create new user with addedBy array containing current admin
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      role,
      addedBy: [adminId],
    });

    return NextResponse.json(
      { user, message: "User created successfully", isExisting: false },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
