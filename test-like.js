const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const authUserId = "11111111-1111-1111-1111-111111111111";
    const receiverId = "22222222-2222-2222-2222-222222222222";
    
    // Simulate what POST /api/matches does
    await prisma.user.upsert({
      where: { id: authUserId },
      update: {},
      create: { id: authUserId, email: "test1@test.com", role: "USER" }
    });

    await prisma.user.upsert({
      where: { id: receiverId },
      update: {},
      create: { id: receiverId, email: "test2@test.com", role: "USER" }
    });

    const u1 = authUserId < receiverId ? authUserId : receiverId;
    const u2 = authUserId < receiverId ? receiverId : authUserId;

    await prisma.like.upsert({
      where: { senderId_receiverId: { senderId: authUserId, receiverId } },
      update: { type: "LIKE" },
      create: { senderId: authUserId, receiverId, type: "LIKE" }
    });

    console.log("Success");
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
