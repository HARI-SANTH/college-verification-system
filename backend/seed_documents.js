const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.studentProfile.findMany();
  console.log('Found students in database:', students.length);

  const docDir = path.join(__dirname, 'uploads', 'documents');
  const photoDir = path.join(__dirname, 'uploads', 'photos');
  if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });
  if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });

  const ananya = students.find((s) => s.firstName === 'Ananya');
  const rahul = students.find((s) => s.firstName === 'Rahul');

  const availableSamplePhoto = path.join(photoDir, 'file-1793989132478-337353684.jpg');

  // Let's create a minimal valid PDF generator or image file
  const makeSamplePdf = (title) => {
    return `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 110>>stream
BT
/F1 18 Tf
50 720 Td
(${title}) Tj
/F1 12 Tf
0 -30 Td
(Official Verification Copy - St. Xavier College of Commerce & Technology) Tj
ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000223 00000 n
0000000385 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
455
%%EOF`;
  };

  const seedForStudent = async (student, docList) => {
    for (const d of docList) {
      const filePath = path.join(docDir, d.fileName);
      if (d.copyFrom && fs.existsSync(d.copyFrom)) {
        fs.copyFileSync(d.copyFrom, filePath);
      } else {
        fs.writeFileSync(filePath, makeSamplePdf(`${student.firstName} ${student.lastName} - ${d.title}`));
      }
      const stat = fs.statSync(filePath);

      await prisma.studentDocument.upsert({
        where: {
          studentProfileId_type: {
            studentProfileId: student.id,
            type: d.type,
          },
        },
        update: {
          fileName: d.fileName,
          filePath: filePath,
          fileUrl: `http://localhost:5000/uploads/documents/${d.fileName}`,
          fileMimeType: d.copyFrom ? 'image/jpeg' : 'application/pdf',
          fileSize: stat.size,
          status: d.status || 'VALID',
          flagReason: d.flagReason || null,
        },
        create: {
          studentProfileId: student.id,
          type: d.type,
          fileName: d.fileName,
          filePath: filePath,
          fileUrl: `http://localhost:5000/uploads/documents/${d.fileName}`,
          fileMimeType: d.copyFrom ? 'image/jpeg' : 'application/pdf',
          fileSize: stat.size,
          status: d.status || 'VALID',
          flagReason: d.flagReason || null,
        },
      });
      console.log(`Seeded document: ${d.type} for ${student.firstName}`);
    }
  };

  if (ananya) {
    await seedForStudent(ananya, [
      { type: 'PLUS_TWO_CERTIFICATE', fileName: 'Ananya_Joseph_PlusTwo_Marksheet.pdf', title: 'Plus Two HSE Marksheet 92.5%' },
      { type: 'SSLC_CERTIFICATE', fileName: 'Ananya_Joseph_SSLC_10th.pdf', title: 'SSLC 10th Certificate (DOB Proof)' },
      { type: 'ALLOTMENT_MEMO', fileName: 'Ananya_Joseph_Allotment_Memo.pdf', title: 'University Allotment Memo - BCA' },
      { type: 'INCOME_CERTIFICATE', fileName: 'Ananya_Joseph_Income_EWS.pdf', title: 'Revenue Village Income Certificate (EWS)' },
      { type: 'BANK_PASSBOOK', fileName: 'Ananya_Joseph_Passbook.jpg', title: 'SBI Bank Passbook Front Page', copyFrom: availableSamplePhoto },
      { type: 'APAAR_DOCUMENT', fileName: 'Ananya_Joseph_APAAR_Card.pdf', title: 'APAAR 12-Digit Student Identity Card' },
    ]);
  }

  if (rahul) {
    await seedForStudent(rahul, [
      {
        type: 'PLUS_TWO_CERTIFICATE',
        fileName: 'Rahul_Nair_PlusTwo_Marksheet.pdf',
        title: 'Plus Two Marksheet (Reported 81.2%)',
        status: 'FLAGGED_ERROR',
        flagReason: 'Plus Two certificate indicates 81.2% while 85% was entered initially. Please verify.',
      },
      { type: 'SSLC_CERTIFICATE', fileName: 'Rahul_Nair_SSLC_10th.pdf', title: 'SSLC 10th Certificate' },
      { type: 'BANK_PASSBOOK', fileName: 'Rahul_Nair_Federal_Bank.pdf', title: 'Federal Bank Passbook' },
      { type: 'APAAR_DOCUMENT', fileName: 'Rahul_Nair_APAAR_Card.pdf', title: 'APAAR Identity Card' },
    ]);
  }

  console.log('Document seeding complete!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
