const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const students = await prisma.studentProfile.findMany({
    include: { documents: true }
  });
  console.log('Total students in DB:', students.length);
  for (const s of students) {
    console.log(`\n=== Student: ${s.firstName} ${s.lastName} (${s.admissionNumber}) ID: ${s.id} ===`);
    console.log('Total docs:', s.documents.length);
    for (const d of s.documents) {
      console.log(`  Type: ${d.type.padEnd(22)} | Updated: ${d.updatedAt.toISOString()} | URL: ${d.fileUrl}`);
    }
  }
  await prisma.$disconnect();
}

check().catch(console.error);
