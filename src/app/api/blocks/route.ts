import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient } from "../../../lib/supabase/server";

// POST: Block a user
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid" }, { status: 401 });
    }

    const body = await req.json();
    const { blockedId } = body;

    if (!blockedId) {
      return NextResponse.json({ error: "Missing blockedId" }, { status: 400 });
    }

    if (blockedId === user.id) {
      return NextResponse.json({ error: "You cannot block yourself" }, { status: 400 });
    }

    // 1. Create or upsert Block record
    const block = await prisma.block.upsert({
      where: {
        blockerId_blockedId: { blockerId: user.id, blockedId }
      },
      update: {},
      create: { blockerId: user.id, blockedId }
    });

    // 2. Find and delete matches/conversations between these two users
    const matchesToDelete = await prisma.match.findMany({
      where: {
        OR: [
          { user1Id: user.id, user2Id: blockedId },
          { user1Id: blockedId, user2Id: user.id }
        ]
      }
    });

    for (const match of matchesToDelete) {
      // If there is a conversation, delete it (cascade will delete messages and participants)
      if (match.conversationId) {
        await prisma.conversation.delete({
          where: { id: match.conversationId }
        }).catch(() => {});
      }
      
      // Delete the Match record itself
      await prisma.match.delete({
        where: { id: match.id }
      }).catch(() => {});
    }

    // 3. Delete any likes between these two users
    await prisma.like.deleteMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: blockedId },
          { senderId: blockedId, receiverId: user.id }
        ]
      }
    });

    return NextResponse.json({ success: true, block });
  } catch (err: any) {
    console.error("[BLOCK API] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
