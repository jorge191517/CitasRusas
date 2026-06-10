import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

// POST: Create Stripe Checkout Session (Premium Subscriptions)
export async function POST(req: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    let userId = null;

    if (!isDevelopment) {
      // Enforce real Supabase Auth in production
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }
      userId = user.id;
    }

    const body = await req.json();
    const activeUserId = userId || body.userId;
    const plan = body.plan;

    if (!activeUserId || !plan) {
      return NextResponse.json({ error: "Missing userId or plan name" }, { status: 400 });
    }

    console.log(`Stripe subscription requested for user ${activeUserId} and plan ${plan}`);

    // Return mock Stripe session redirection URL
    return NextResponse.json({
      success: true,
      todo: "Stripe checkout session initialized",
      url: `http://localhost:3000/es/dashboard?stripe_success=true`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
