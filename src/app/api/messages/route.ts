import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient } from "../../../lib/supabase/server";
import { messageSchema } from "../../../lib/validation";

// GET: Fetch messages for a conversation
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid" }, { status: 401 });
    }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: user.id }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "Unauthorized conversation access" }, { status: 403 });
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Send a chat message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let senderId = body.senderId;
    let authUser = null;

    // Enforce authentication unless it's a mock profile sender
    if (!senderId || !senderId.startsWith("mock-")) {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }
      authUser = user;
      senderId = user.id;
    }

    // Validate using Zod (Zod expects body with conversationId, text/photoUrl/audioUrl)
    const messageValidation = messageSchema.safeParse({
      conversationId: body.conversationId,
      text: body.text,
      photoUrl: body.photoUrl,
      audioUrl: body.audioUrl
    });

    if (!messageValidation.success) {
      return NextResponse.json({ error: messageValidation.error.format() }, { status: 400 });
    }

    const { conversationId, text, photoUrl, audioUrl } = messageValidation.data;

    // Enforce multimedia restrictions for non-VIP real users
    if (senderId && !senderId.startsWith("mock-")) {
      const hasMultimedia = photoUrl || audioUrl;
      if (hasMultimedia) {
        const userSub = await prisma.subscription.findUnique({
          where: { userId: senderId }
        });
        const isVip = userSub?.tier === "PREMIUM" && userSub?.isActive;
        if (!isVip) {
          return NextResponse.json({ error: "Las fotos, vídeos y audios están reservados para usuarios VIP." }, { status: 403 });
        }
      }
    }

    // Verify sender is participant of the conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId }
      }
    });

    if (!participant) {
      // If it's a mock profile and they are not a participant yet, add them
      if (senderId.startsWith("mock-")) {
        await prisma.conversationParticipant.create({
          data: { conversationId, userId: senderId }
        }).catch(() => {});
      } else {
        return NextResponse.json({ error: "Unauthorized conversation access" }, { status: 403 });
      }
    }

    // Save message in DB
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        text,
        photoUrl,
        audioUrl
      }
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error("[POST MESSAGE] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a conversation completely
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid" }, { status: 401 });
    }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: user.id }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "Unauthorized conversation access" }, { status: 403 });
    }

    // Delete matches referencing this conversation first
    await prisma.match.updateMany({
      where: { conversationId },
      data: { conversationId: null }
    });

    // Delete conversation (cascade deletes participants and messages)
    await prisma.conversation.delete({
      where: { id: conversationId }
    });

    return NextResponse.json({ success: true, message: "Conversación eliminada con éxito" });
  } catch (err: any) {
    console.error("[DELETE CONVERSATION] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
