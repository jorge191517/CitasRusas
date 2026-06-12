const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
  try {
    console.log("Deleting matches...");
    await prisma.match.deleteMany({});
    
    console.log("Deleting likes...");
    await prisma.like.deleteMany({});

    console.log("Deleting conversations...");
    await prisma.conversationParticipant.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});

    console.log("Reset successful!");
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
