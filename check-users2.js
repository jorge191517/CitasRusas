const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });

async function check() {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    console.log("All users length:", users.length);
    if (users.length > 0) {
      console.log(users.map(u => u.id + " - " + u.email));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
