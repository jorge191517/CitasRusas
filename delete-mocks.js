const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteMockUsers() {
  try {
    console.log("Deleting mock users...");
    const result = await prisma.user.deleteMany({
      where: {
        id: {
          startsWith: "mock-"
        }
      }
    });
    console.log(`Deleted ${result.count} mock users.`);
  } catch (e) {
    console.error("Error deleting mock users:", e);
  } finally {
    await prisma.$disconnect();
  }
}

deleteMockUsers();
