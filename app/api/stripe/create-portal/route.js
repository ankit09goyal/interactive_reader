import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import { createCustomerPortal } from "@/libs/stripe";
import User from "@/models/User";
import { handleApiError } from "@/libs/apiHelpers";

export async function POST(req) {
  const session = await auth();

  if (session) {
    try {
      await connectMongo();

      const body = await req.json();

      const { id } = session.user;

      const user = await User.findById(id);

      if (!user?.customerId) {
        return NextResponse.json(
          {
            error:
              "You don't have a billing account yet. Make a purchase first.",
          },
          { status: 400 }
        );
      } else if (!body.returnUrl) {
        return NextResponse.json(
          { error: "Return URL is required" },
          { status: 400 }
        );
      }

      const stripePortalUrl = await createCustomerPortal({
        customerId: user.customerId,
        returnUrl: body.returnUrl,
      });

      return NextResponse.json({
        url: stripePortalUrl,
      });
    } catch (error) {
      return handleApiError(error, "Failed to create customer portal", "creating customer portal");
    }
  } else {
    // Not Signed in
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
