const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const authUserId = "934d21ee-a736-4b03-8329-1f513d722943"; // Ricardo
    const receiverId = "f9c93eb2-da9f-43a1-bc98-377d5529ba82"; // Valeria

    const u1 = authUserId < receiverId ? authUserId : receiverId;
    const u2 = authUserId < receiverId ? receiverId : authUserId;

    console.log("Upserting Likes...");
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

    console.log("Finding Match...");
    let match = await prisma.match.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      include: { conversation: true }
    });

    if (!match) {
      console.log("Creating Match and Conversation...");
      const newConv = await prisma.conversation.create({ data: {} });
      match = await prisma.match.create({
        data: {
          user1Id: u1,
          user2Id: u2,
          conversationId: newConv.id
        },
        include: { conversation: true }
      });
    } else if (!match.conversationId) {
      console.log("Updating Match with Conversation...");
      const newConv = await prisma.conversation.create({ data: {} });
      match = await prisma.match.update({
        where: { id: match.id },
        data: { conversationId: newConv.id },
        include: { conversation: true }
      });
    }

    console.log("Upserting Conversation Participants...");
    if (match.conversationId) {
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: match.conversationId, userId: u1 } },
        update: {},
        create: { conversationId: match.conversationId, userId: u1 }
      });

      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: match.conversationId, userId: u2 } },
        update: {},
        create: { conversationId: match.conversationId, userId: u2 }
      });
    }

    console.log("Success! Match ID:", match.id);

  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
