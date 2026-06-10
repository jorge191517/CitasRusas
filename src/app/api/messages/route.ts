import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient } from "../../../lib/supabase/server";
import { messageSchema } from "../../../lib/validation";

// POST: Send a chat message
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
    const messageValidation = messageSchema.safeParse(body);
    if (!messageValidation.success) {
      return NextResponse.json({ error: messageValidation.error.format() }, { status: 400 });
    }

    const { conversationId, text, photoUrl, audioUrl } = messageValidation.data;

    try {
      // Verify user is a participant of the conversation
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: { conversationId, userId: activeSenderId }
        }
      });

      if (!participant && !isDevelopment) {
        return NextResponse.json({ error: "Unauthorized conversation access" }, { status: 403 });
      }

      // Save message in DB
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: activeSenderId,
          text,
          photoUrl,
          audioUrl
        }
      });

      return NextResponse.json({ success: true, message });
    } catch (dbErr: any) {
      console.log("Prisma message DB error:", dbErr.message);
      if (isDevelopment) {
        return NextResponse.json({
          success: true,
          mockMode: true,
          message: {
            id: `mock-msg-${Date.now()}`,
            conversationId,
            senderId: activeSenderId,
            text,
            photoUrl,
            audioUrl,
            createdAt: new Date().toISOString()
          }
        });
      }
      return NextResponse.json({ error: "Message delivery failed" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
