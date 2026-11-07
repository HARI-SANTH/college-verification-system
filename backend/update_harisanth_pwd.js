const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('Password@123', 10);
  const user = await prisma.user.updateMany({
    where: { email: 'harisanths56@gmail.com' },
    data: { passwordHash: hash }
  });
  const profile = await prisma.studentProfile.updateMany({
    where: { user: { email: 'harisanths56@gmail.com' } },
    data: { verificationStatus: 'DRAFT', fieldFlags: '{}' }
  });
  console.log('Updated Harisanth:', { user, profile });
  await prisma.$disconnect();
}
main().catch(console.error);
