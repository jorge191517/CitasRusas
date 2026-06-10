import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient } from "../../../lib/supabase/server";
import { likeSchema } from "../../../lib/validation";

// POST: Register swipe interaction (Like/Dislike)
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
    const activeSenderId = userId || body.senderId;

    if (!activeSenderId) {
      return NextResponse.json({ error: "Missing sender user identity" }, { status: 400 });
    }

    // Validate using Zod
    const likeValidation = likeSchema.safeParse({
      receiverId: body.receiverId,
      type: body.type
    });

    if (!likeValidation.success) {
      return NextResponse.json({ error: likeValidation.error.format() }, { status: 400 });
    }

    const { receiverId, type } = likeValidation.data;

    try {
      // Create or update Like interaction
      const swipe = await prisma.like.upsert({
        where: {
          senderId_receiverId: { senderId: activeSenderId, receiverId }
        },
        update: { type },
        create: { senderId: activeSenderId, receiverId, type }
      });

      // Check if bidirectional match exists
      if (type === "LIKE" || type === "SUPER_LIKE") {
        const opposingLike = await prisma.like.findFirst({
          where: {
            senderId: receiverId,
            receiverId: activeSenderId,
            type: { in: ["LIKE", "SUPER_LIKE"] }
          }
        });

        if (opposingLike) {
          // Bidirectional Match!
          const match = await prisma.match.upsert({
            where: {
              user1Id_user2Id: {
                user1Id: activeSenderId < receiverId ? activeSenderId : receiverId,
                user2Id: activeSenderId < receiverId ? receiverId : activeSenderId
              }
            },
            update: {},
            create: {
              user1Id: activeSenderId < receiverId ? activeSenderId : receiverId,
              user2Id: activeSenderId < receiverId ? receiverId : activeSenderId,
              // Setup conversation
              conversation: {
                create: {}
              }
            },
            include: { conversation: true }
          });

          return NextResponse.json({ success: true, match, isMatch: true });
        }
      }

      return NextResponse.json({ success: true, swipe, isMatch: false });
    } catch (dbErr: any) {
      console.log("Prisma swipe DB error:", dbErr.message);
      if (isDevelopment) {
        const isMatch = Math.random() < 0.4;
        return NextResponse.json({
          success: true,
          mockMode: true,
          isMatch,
          match: isMatch ? { id: `mock-match-${Date.now()}` } : null
        });
      }
      return NextResponse.json({ error: "Swipe registration failed" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
