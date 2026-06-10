import { NextRequest, NextResponse } from "next/server";

// POST: Stripe Webhooks Listener
export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const sig = req.headers.get("stripe-signature");

    console.log("Stripe webhook event received. Signature:", sig);
    
    // Stripe webhook verification - TODO: Verify signature and update Subscription model in DB
    // const event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    // switch (event.type) {
    //   case 'checkout.session.completed': ...
    // }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
export const dynamic = "force-dynamic";
