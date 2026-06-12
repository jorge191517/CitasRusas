const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log("All users length:", users.length);
  if (users.length > 0) {
      console.log(users.map(u => u.email));
  }
  await prisma.$disconnect();
}

check();
