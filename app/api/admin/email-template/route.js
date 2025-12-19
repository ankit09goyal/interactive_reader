import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { verifyAdminForApi } from "@/libs/roles";
import connectMongo from "@/libs/mongoose";
import EmailTemplate from "@/models/EmailTemplate";
import { getDefaultEmailTemplate } from "@/libs/emailNotifications";

// GET /api/admin/email-template - Get admin's email template (or default)
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

    // Try to find admin's custom template
    const customTemplate = await EmailTemplate.findOne({ adminId }).lean();

    if (customTemplate) {
      return NextResponse.json({
        template: {
          subject: customTemplate.subject,
          htmlBody: customTemplate.htmlBody,
          textBody: customTemplate.textBody,
        },
        isDefault: false,
      });
    }

    // Return default template if no custom template exists
    const defaultTemplate = getDefaultEmailTemplate();
    return NextResponse.json({
      template: defaultTemplate,
      isDefault: true,
    });
  } catch (error) {
    console.error("Error fetching email template:", error);
    return NextResponse.json(
      { error: "Failed to fetch email template" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/email-template - Save/update admin's email template
export async function PUT(req) {
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
    const { subject, htmlBody, textBody } = body;

    // Validate required fields
    if (!subject || !htmlBody) {
      return NextResponse.json(
        { error: "Subject and HTML body are required" },
        { status: 400 }
      );
    }

    await connectMongo();

    const adminId = session.user.id;

    // Upsert the template
    const template = await EmailTemplate.findOneAndUpdate(
      { adminId },
      {
        adminId,
        subject,
        htmlBody,
        textBody: textBody || "",
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({
      template: {
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
      },
      message: "Template saved successfully",
    });
  } catch (error) {
    console.error("Error saving email template:", error);
    return NextResponse.json(
      { error: "Failed to save email template" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/email-template - Reset to default (delete custom template)
export async function DELETE(req) {
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

    // Delete custom template
    await EmailTemplate.deleteOne({ adminId });

    // Return default template
    const defaultTemplate = getDefaultEmailTemplate();
    return NextResponse.json({
      template: defaultTemplate,
      isDefault: true,
      message: "Template reset to default",
    });
  } catch (error) {
    console.error("Error resetting email template:", error);
    return NextResponse.json(
      { error: "Failed to reset email template" },
      { status: 500 }
    );
  }
}
