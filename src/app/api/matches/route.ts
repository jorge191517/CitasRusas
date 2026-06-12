import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient } from "../../../lib/supabase/server";
import { likeSchema } from "../../../lib/validation";

// GET: Fetch matches and likes for the logged-in user, excluding blocked users
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid" }, { status: 401 });
    }
    const authUserId = user.id;

    // Fetch blocker/blocked user list to filter interactions
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: authUserId },
          { blockedId: authUserId }
        ]
      }
    });
    const blockedUserIds = blocks.map(b => b.blockerId === authUserId ? b.blockedId : b.blockerId);

    // Fetch likes sent by this user
    const sentLikes = await prisma.like.findMany({
      where: {
        senderId: authUserId,
        receiverId: { notIn: blockedUserIds },
        type: { in: ["LIKE", "SUPER_LIKE"] }
      },
      include: {
        receiver: {
          include: { profile: true }
        }
      }
    });

    // Fetch likes received by this user (where they haven't liked back yet / no match exists)
    const receivedLikes = await prisma.like.findMany({
      where: {
        receiverId: authUserId,
        senderId: { notIn: blockedUserIds },
        type: { in: ["LIKE", "SUPER_LIKE"] },
        // Exclude if a match already exists
        sender: {
          matches: {
            none: {
              OR: [
                { user1Id: authUserId },
                { user2Id: authUserId }
              ]
            }
          },
          matchesAs2: {
            none: {
              OR: [
                { user1Id: authUserId },
                { user2Id: authUserId }
              ]
            }
          }
        }
      },
      include: {
        sender: {
          include: { profile: true }
        }
      }
    });

    // Fetch matches for the user
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { user1Id: authUserId },
          { user2Id: authUserId }
        ],
        user1Id: { notIn: blockedUserIds },
        user2Id: { notIn: blockedUserIds }
      },
      include: {
        user1: { include: { profile: true } },
        user2: { include: { profile: true } }
      }
    });

    return NextResponse.json({
      success: true,
      sentLikes: sentLikes.map(l => ({
        id: l.receiver.id,
        firstName: l.receiver.profile?.firstName || "Usuario",
        age: l.receiver.profile?.birthDate ? new Date().getFullYear() - new Date(l.receiver.profile.birthDate).getFullYear() : 25,
        country: l.receiver.profile?.country || "",
        city: l.receiver.profile?.city || "",
        imageUrl: l.receiver.profile?.mainPhotoUrl || "",
        verified: l.receiver.profile?.verifiedStatus === "VERIFIED",
        lookingFor: l.receiver.profile?.lookingFor || "",
      })),
      receivedLikes: receivedLikes.map(l => ({
        id: l.sender.id,
        firstName: l.sender.profile?.firstName || "Usuario",
        age: l.sender.profile?.birthDate ? new Date().getFullYear() - new Date(l.sender.profile.birthDate).getFullYear() : 25,
        country: l.sender.profile?.country || "",
        city: l.sender.profile?.city || "",
        imageUrl: l.sender.profile?.mainPhotoUrl || "",
        verified: l.sender.profile?.verifiedStatus === "VERIFIED",
        lookingFor: l.sender.profile?.lookingFor || "",
      })),
      matches: matches.map(m => {
        const otherUser = m.user1Id === authUserId ? m.user2 : m.user1;
        return {
          id: otherUser.id,
          firstName: otherUser.profile?.firstName || "Usuario",
          age: otherUser.profile?.birthDate ? new Date().getFullYear() - new Date(otherUser.profile.birthDate).getFullYear() : 25,
          country: otherUser.profile?.country || "",
          city: otherUser.profile?.city || "",
          imageUrl: otherUser.profile?.mainPhotoUrl || "",
          verified: otherUser.profile?.verifiedStatus === "VERIFIED",
          lookingFor: otherUser.profile?.lookingFor || "",
          conversationId: m.conversationId
        };
      })
    });
  } catch (err: any) {
    console.error("[GET MATCHES] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Register swipe interaction (Like/Dislike)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid" }, { status: 401 });
    }
    const authUserId = user.id;

    const body = await req.json();
    
    // Validate using Zod
    const likeValidation = likeSchema.safeParse({
      receiverId: body.receiverId,
      type: body.type
    });

    if (!likeValidation.success) {
      return NextResponse.json({ error: likeValidation.error.format() }, { status: 400 });
    }

    const { receiverId, type } = likeValidation.data;

    if (receiverId === authUserId) {
      return NextResponse.json({ error: "You cannot swipe on yourself" }, { status: 400 });
    }

    // 1. Check if either user has blocked the other
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: authUserId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: authUserId }
        ]
      }
    });

    if (isBlocked) {
      return NextResponse.json({ error: "Interaction blocked" }, { status: 400 });
    }

    // 2. Check 10 likes limit for FREE users
    if (type === "LIKE" || type === "SUPER_LIKE") {
      const userSub = await prisma.subscription.findUnique({
        where: { userId: authUserId }
      });
      const isVip = userSub?.tier === "PREMIUM" && userSub?.isActive;

      if (!isVip) {
        // Count current likes sent by this user
        const likesCount = await prisma.like.count({
          where: {
            senderId: authUserId,
            type: { in: ["LIKE", "SUPER_LIKE"] }
          }
        });

        if (likesCount >= 10) {
          return NextResponse.json({ error: "Límite de 10 likes gratis alcanzado", limitReached: true }, { status: 403 });
        }
      }
    }

    // 3. Register receiver in DB if it is a mock profile
    if (receiverId.startsWith("mock-")) {
      const mockProf = (await import("../../../lib/mockData")).mockProfiles.find(p => p.id === receiverId);
      await prisma.user.upsert({
        where: { id: receiverId },
        update: {},
        create: {
          id: receiverId,
          email: `${receiverId}@veloura.mock`,
          role: "USER",
          profile: {
            create: {
              firstName: mockProf?.firstName || "Mock",
              lastName: mockProf?.lastName || "Profile",
              birthDate: new Date(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000),
              gender: (mockProf?.gender as any) || "FEMALE",
              country: mockProf?.country || "España",
              city: mockProf?.city || "Madrid",
              mainPhotoUrl: mockProf?.imageUrl || "",
              profileCompleted: true
            }
          }
        }
      });
    }

    // Direct Message Shortcut: if forceMatch is true, instantly create match & conversation
    if (body.forceMatch === true) {
      const u1 = authUserId < receiverId ? authUserId : receiverId;
      const u2 = authUserId < receiverId ? receiverId : authUserId;

      await prisma.like.upsert({
        where: { senderId_receiverId: { senderId: authUserId, receiverId } },
        update: { type: "LIKE" },
        create: { senderId: authUserId, receiverId, type: "LIKE" }
      });
      await prisma.like.upsert({
        where: { senderId_receiverId: { senderId: receiverId, receiverId: authUserId } },
        update: { type: "LIKE" },
        create: { senderId: receiverId, receiverId: authUserId, type: "LIKE" }
      });

      const match = await prisma.match.upsert({
        where: {
          user1Id_user2Id: { user1Id: u1, user2Id: u2 }
        },
        update: {},
        create: {
          user1Id: u1,
          user2Id: u2,
          conversation: {
            create: {}
          }
        },
        include: { conversation: true }
      });

      if (match.conversationId) {
        await prisma.conversationParticipant.upsert({
          where: { conversationId_userId: { conversationId: match.conversationId, userId: u1 } },
          update: {},
          create: { conversationId: match.conversationId, userId: u1 }
        }).catch(() => {});

        await prisma.conversationParticipant.upsert({
          where: { conversationId_userId: { conversationId: match.conversationId, userId: u2 } },
          update: {},
          create: { conversationId: match.conversationId, userId: u2 }
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, match, isMatch: true });
    }

    // 4. Create or update Swipe/Like record
    const swipe = await prisma.like.upsert({
      where: {
        senderId_receiverId: { senderId: authUserId, receiverId }
      },
      update: { type },
      create: { senderId: authUserId, receiverId, type }
    });

    // 5. Handle mock liked back logic (35% probability of match)
    if ((type === "LIKE" || type === "SUPER_LIKE") && receiverId.startsWith("mock-")) {
      const mockLikedBack = Math.random() < 0.35;
      if (mockLikedBack) {
        await prisma.like.upsert({
          where: {
            senderId_receiverId: { senderId: receiverId, receiverId: authUserId }
          },
          update: { type: "LIKE" },
          create: { senderId: receiverId, receiverId: authUserId, type: "LIKE" }
        });
      }
    }

    // 6. Check for bidirectional Match
    if (type === "LIKE" || type === "SUPER_LIKE") {
      const opposingLike = await prisma.like.findFirst({
        where: {
          senderId: receiverId,
          receiverId: authUserId,
          type: { in: ["LIKE", "SUPER_LIKE"] }
        }
      });

      if (opposingLike) {
        // Bidirectional Match! Create it and setup a conversation
        const u1 = authUserId < receiverId ? authUserId : receiverId;
        const u2 = authUserId < receiverId ? receiverId : authUserId;

        const match = await prisma.match.upsert({
          where: {
            user1Id_user2Id: { user1Id: u1, user2Id: u2 }
          },
          update: {},
          create: {
            user1Id: u1,
            user2Id: u2,
            conversation: {
              create: {}
            }
          },
          include: { conversation: true }
        });

        // Insert conversation participants
        if (match.conversationId) {
          await prisma.conversationParticipant.upsert({
            where: {
              conversationId_userId: { conversationId: match.conversationId, userId: u1 }
            },
            update: {},
            create: { conversationId: match.conversationId, userId: u1 }
          }).catch(() => {});

          await prisma.conversationParticipant.upsert({
            where: {
              conversationId_userId: { conversationId: match.conversationId, userId: u2 }
            },
            update: {},
            create: { conversationId: match.conversationId, userId: u2 }
          }).catch(() => {});
        }

        return NextResponse.json({ success: true, match, isMatch: true });
      }
    }

    return NextResponse.json({ success: true, swipe, isMatch: false });
  } catch (err: any) {
    console.error("[POST MATCHES] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
