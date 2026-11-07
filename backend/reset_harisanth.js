const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const updated = await prisma.studentProfile.updateMany({
    where: {
      user: { email: 'harisanths56@gmail.com' }
    },
    data: {
      verificationStatus: 'DRAFT',
      fieldFlags: '{}'
    }
  });
  console.log('Reset Harisanth to DRAFT:', updated);
  await prisma.$disconnect();
}
main().catch(console.error);
