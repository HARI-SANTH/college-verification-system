const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.studentProfile.findMany({
    include: { user: true }
  });
  console.log(JSON.stringify(students.map(s => ({
    id: s.id,
    name: s.firstName + ' ' + s.lastName,
    email: s.user.email,
    status: s.verificationStatus,
    fieldFlags: s.fieldFlags,
    annualIncome: s.annualIncome,
    courseAdmitted: s.courseAdmitted
  })), null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);
