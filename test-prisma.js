const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const authUserId = "test-user-id";
  const receiverId = "mock-es-01";
  
  try {
      await prisma.user.upsert({
        where: { id: authUserId },
        update: {},
        create: {
          id: authUserId,
          email: `${authUserId}@veloura.user`,
          role: "USER"
        }
      });
      
      const mockProf = {
        firstName: "Alejandra",
        lastName: "Morales",
        age: 27,
        gender: "FEMALE",
        country: "España",
        city: "Sevilla",
        languages: ["es", "en"],
        profession: "Arquitecta de Interiores",
        maritalStatus: "Single",
        bio: "Apasionada por el diseño mediterráneo y los atardeceres frente al mar. Busco a alguien especial con quien reír, conversar de todo y planear viajes espontáneos.",
        interests: ["Diseño", "Yoga", "Fotografía", "Vino", "Viajes"],
        height: 168,
        imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
        verified: true,
        lookingFor: "relationship",
      };

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
              gender: mockProf?.gender || "FEMALE",
              country: mockProf?.country || "España",
              city: mockProf?.city || "Madrid",
              mainPhotoUrl: mockProf?.imageUrl || "",
              languages: mockProf?.languages || ["es"],
              interests: mockProf?.interests || [],
              profileCompleted: true
            }
          }
        }
      });

      console.log("Upserts worked");

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

      console.log("Likes upserted");

      let match = await prisma.match.findUnique({
        where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        include: { conversation: true }
      });

      if (!match) {
        console.log("creating match");
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
        console.log("updating match");
        const newConv = await prisma.conversation.create({ data: {} });
        match = await prisma.match.update({
          where: { id: match.id },
          data: { conversationId: newConv.id },
          include: { conversation: true }
        });
      }

      console.log("Match created", match);

      if (match.conversationId) {
        await prisma.conversationParticipant.upsert({
          where: { conversationId_userId: { conversationId: match.conversationId, userId: u1 } },
          update: {},
          create: { conversationId: match.conversationId, userId: u1 }
        }).catch((e) => { console.log(e); });

        await prisma.conversationParticipant.upsert({
          where: { conversationId_userId: { conversationId: match.conversationId, userId: u2 } },
          update: {},
          create: { conversationId: match.conversationId, userId: u2 }
        }).catch((e) => { console.log(e); });
      }

      console.log("Done");
  } catch (e) {
    console.error(e);
  }
}
test();
