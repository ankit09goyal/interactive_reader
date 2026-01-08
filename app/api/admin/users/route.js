import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Book from "@/models/Book";
import UserBookAccess from "@/models/UserBookAccess";
import EmailTemplate from "@/models/EmailTemplate";
import { handleApiError } from "@/libs/apiHelpers";
import {
  getDefaultEmailTemplate,
  sendBookAccessNotification,
} from "@/libs/emailNotifications";

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

    // Get admin's books with their IDs and titles
    const adminBooks = await Book.find({ uploadedBy: adminId })
      .select("_id title")
      .lean();
    const adminBookIds = adminBooks.map((b) => b._id);

    // Create a map of book ID to book title
    const bookIdToTitle = {};
    adminBooks.forEach((book) => {
      bookIdToTitle[book._id.toString()] = book.title;
    });

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

    // Map access by user ID with book titles
    const accessMap = {};
    userBookAccess.forEach((access) => {
      const userIdStr = access.userId.toString();
      const bookIdStr = access.bookId.toString();
      if (!accessMap[userIdStr]) {
        accessMap[userIdStr] = [];
      }
      // Store book title instead of just book ID
      const bookTitle = bookIdToTitle[bookIdStr];
      if (bookTitle) {
        accessMap[userIdStr].push(bookTitle);
      }
    });

    // Add book access status to each user
    const usersWithAccess = users.map((user) => {
      const userIdStr = user._id.toString();
      const bookTitles = accessMap[userIdStr] || [];
      return {
        ...user,
        _id: userIdStr,
        hasBookAccess: bookTitles.length > 0,
        bookAccessCount: bookTitles.length,
        bookTitles: bookTitles, // Add array of book titles
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
    return handleApiError(error, "Failed to fetch users", "fetching users");
  }
}

// POST /api/admin/users - Create or add user to admin's list with optional book access and notification
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
    const {
      name,
      email,
      role = "user",
      bookIds = [],
      notifyUser = false,
      customEmailTemplate,
    } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectMongo();

    const adminId = session.user.id;
    const admin = await User.findById(adminId).select("name email").lean();
    const adminName = admin?.name || admin?.email?.split("@")[0] || "Admin";

    let user;
    let isExisting = false;
    let message = "";

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      isExisting = true;
      // User exists - add current admin to addedBy array if not already present
      const isAlreadyAdded = existingUser.addedBy?.some(
        (id) => id.toString() === adminId
      );

      if (isAlreadyAdded) {
        user = existingUser;
        message = "User already in your list";
      } else {
        // Add admin to addedBy array
        user = await User.findByIdAndUpdate(
          existingUser._id,
          { $addToSet: { addedBy: adminId } },
          { new: true }
        );
        message = "User added to your list";
      }
    } else {
      // Create new user with addedBy array containing current admin
      user = await User.create({
        name,
        email: email.toLowerCase(),
        role,
        addedBy: [adminId],
      });
      message = "User created successfully";
    }

    // Handle book access if bookIds provided
    let booksGranted = [];
    if (bookIds && bookIds.length > 0) {
      // Verify all books belong to the current admin
      const adminBooks = await Book.find({
        _id: { $in: bookIds },
        uploadedBy: adminId,
      })
        .select("_id title author")
        .lean();

      if (adminBooks.length > 0) {
        // Create book access records (use upsert to avoid duplicates)
        const accessRecords = adminBooks.map((book) => ({
          updateOne: {
            filter: { userId: user._id, bookId: book._id },
            update: {
              $setOnInsert: {
                userId: user._id,
                bookId: book._id,
                grantedBy: adminId,
              },
            },
            upsert: true,
          },
        }));

        await UserBookAccess.bulkWrite(accessRecords);
        booksGranted = adminBooks;
        message += `. Access granted to ${adminBooks.length} book(s)`;
      }
    }

    // Send email notification if requested and books were assigned
    let emailSent = false;
    if (notifyUser && booksGranted.length > 0) {
      // Get email template (custom, saved, or default)
      let template;
      if (customEmailTemplate) {
        template = customEmailTemplate;
      } else {
        const savedTemplate = await EmailTemplate.findOne({ adminId }).lean();
        template = savedTemplate || getDefaultEmailTemplate();
      }

      const emailResult = await sendBookAccessNotification({
        user: { name: user.name, email: user.email },
        books: booksGranted,
        adminName,
        template,
      });

      emailSent = emailResult !== null;
      if (emailSent) {
        message += ". Notification email sent";
      }
    }

    // Calculate book access count for response
    const bookAccessCount = await UserBookAccess.countDocuments({
      userId: user._id,
      bookId: {
        $in: await Book.find({ uploadedBy: adminId }).distinct("_id"),
      },
    });

    return NextResponse.json(
      {
        user: {
          ...user.toJSON(),
          _id: user._id.toString(),
          hasBookAccess: bookAccessCount > 0,
          bookAccessCount,
        },
        message,
        isExisting,
        booksGranted: booksGranted.length,
        emailSent,
      },
      { status: isExisting ? 200 : 201 }
    );
  } catch (error) {
    return handleApiError(error, "Failed to create user", "creating user");
  }
}
