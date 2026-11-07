const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function esc(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildCertificatePdf(opts) {
  const {
    headerBg = [0.06, 0.2, 0.45],
    authority = 'GOVERNMENT OF KERALA',
    title = 'CERTIFICATE',
    subtitle = 'Official Verification Document',
    certNo = 'KL-2024-001',
    date = '01-06-2024',
    rows = [],
    tableHeaders = null,
    tableRows = null,
    footerNote = 'Official digital copy for College Verification',
  } = opts;

  const stream = [];

  // Page background & outer double border
  stream.push('0.98 0.98 0.99 rg 20 20 572 752 re f');
  stream.push('0.1 0.2 0.4 RG 2 w 25 25 562 742 re s');
  stream.push('0.7 0.75 0.85 RG 0.75 w 29 29 554 734 re s');

  // Header Banner
  const hr = headerBg[0];
  const hg = headerBg[1];
  const hb = headerBg[2];
  stream.push(hr + ' ' + hg + ' ' + hb + ' rg 35 695 542 60 re f');
  stream.push('1 1 1 rg');
  stream.push('BT /F2 10 Tf 45 738 Td (' + esc(authority) + ') Tj ET');
  stream.push('BT /F2 15 Tf 45 718 Td (' + esc(title) + ') Tj ET');
  stream.push('BT /F1 9 Tf 45 702 Td (' + esc(subtitle) + ') Tj ET');

  // Cert Number & Date ribbon
  stream.push('0.92 0.94 0.98 rg 35 668 542 20 re f');
  stream.push('0.78 0.82 0.9 RG 0.5 w 35 668 542 20 re s');
  stream.push('0.2 0.25 0.35 rg');
  stream.push('BT /F2 8.5 Tf 45 674 Td (CERTIFICATE NO: ' + esc(certNo) + ') Tj ET');
  stream.push('BT /F2 8.5 Tf 420 674 Td (DATE OF ISSUE: ' + esc(date) + ') Tj ET');

  let curY = 640;

  // Metadata Grid
  if (rows && rows.length > 0) {
    for (let i = 0; i < rows.length; i += 2) {
      const left = rows[i];
      const right = rows[i + 1];

      // Row background
      stream.push('0.97 0.97 0.98 rg');
      stream.push('35 ' + (curY - 4) + ' 542 22 re f');
      stream.push('0.88 0.9 0.94 RG 0.5 w');
      stream.push('35 ' + (curY - 4) + ' 542 22 re s');

      // Left column
      if (left) {
        stream.push('0.3 0.35 0.45 rg');
        stream.push('BT /F2 8.5 Tf 45 ' + (curY + 2) + ' Td (' + esc(left.label) + ':) Tj ET');
        stream.push('0.1 0.1 0.1 rg');
        stream.push('BT /F1 9 Tf 155 ' + (curY + 2) + ' Td (' + esc(left.value) + ') Tj ET');
      }

      // Right column
      if (right) {
        stream.push('0.3 0.35 0.45 rg');
        stream.push('BT /F2 8.5 Tf 315 ' + (curY + 2) + ' Td (' + esc(right.label) + ':) Tj ET');
        stream.push('0.1 0.1 0.1 rg');
        stream.push('BT /F1 9 Tf 415 ' + (curY + 2) + ' Td (' + esc(right.value) + ') Tj ET');
      }

      curY -= 26;
    }
  }

  // Optional Table (for marksheets / subjects)
  if (tableHeaders && tableRows) {
    curY -= 6;
    // Table Header
    stream.push(hr + ' ' + hg + ' ' + hb + ' rg 35 ' + (curY - 4) + ' 542 20 re f');
    stream.push('1 1 1 rg');
    let xOff = 45;
    for (const th of tableHeaders) {
      stream.push('BT /F2 8.5 Tf ' + xOff + ' ' + (curY + 2) + ' Td (' + esc(th.title) + ') Tj ET');
      xOff += th.width;
    }
    curY -= 22;

    for (const tr of tableRows) {
      stream.push('0.96 0.97 0.99 rg');
      stream.push('35 ' + (curY - 4) + ' 542 18 re f');
      stream.push('0.88 0.9 0.94 RG 0.5 w');
      stream.push('35 ' + (curY - 4) + ' 542 18 re s');

      stream.push('0.1 0.1 0.1 rg');
      xOff = 45;
      for (let c = 0; c < tableHeaders.length; c++) {
        const val = tr[c] || '';
        const isBold = c === 0 || c === tableHeaders.length - 1;
        const font = isBold ? '/F2' : '/F1';
        stream.push('BT ' + font + ' 8.5 Tf ' + xOff + ' ' + (curY + 1) + ' Td (' + esc(val) + ') Tj ET');
        xOff += tableHeaders[c].width;
      }
      curY -= 20;
    }
  }

  // Stamp / Verification Seal box
  curY = Math.min(curY - 15, 170);
  stream.push('0.93 0.96 0.99 rg');
  stream.push('45 ' + (curY - 35) + ' 240 50 re f');
  stream.push('0.2 0.45 0.7 RG 1 w');
  stream.push('45 ' + (curY - 35) + ' 240 50 re s');
  stream.push('0.1 0.3 0.6 rg');
  stream.push('BT /F2 8.5 Tf 55 ' + curY + ' Td (VERIFIED & AUTHENTICATED) Tj ET');
  stream.push('0.3 0.35 0.45 rg');
  stream.push('BT /F1 7.5 Tf 55 ' + (curY - 14) + ' Td (Digital Signatory: Controller of Examinations) Tj ET');
  stream.push('BT /F1 7.5 Tf 55 ' + (curY - 26) + ' Td (Status: Official Verification Copy - Valid) Tj ET');

  // Signature box on the right
  stream.push('380 ' + (curY - 35) + ' 190 50 re s');
  stream.push('0.1 0.15 0.3 rg');
  stream.push('BT /F2 8.5 Tf 395 ' + curY + ' Td (OFFICE OF ADMISSIONS) Tj ET');
  stream.push('0.4 0.4 0.4 rg');
  stream.push('BT /F1 7.5 Tf 395 ' + (curY - 16) + ' Td (Authorized Academic Registrar) Tj ET');
  stream.push('BT /F1 7.5 Tf 395 ' + (curY - 28) + ' Td (St. Xavier College of Commerce & Tech) Tj ET');

  // Footer text
  stream.push('0.45 0.5 0.6 rg');
  stream.push('BT /F1 8 Tf 45 42 Td (' + esc(footerNote) + ') Tj ET');
  stream.push('BT /F1 7.5 Tf 450 42 Td (Page 1 of 1) Tj ET');

  const streamData = stream.join('\n');
  const streamBuf = Buffer.from(streamData, 'utf-8');

  const objs = [];
  objs.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objs.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objs.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n');
  objs.push('4 0 obj\n<< /Length ' + streamBuf.length + ' >>\nstream\n' + streamData + '\nendstream\nendobj\n');
  objs.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objs.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  let body = '%PDF-1.4\n';
  const offsets = [0];
  let offset = Buffer.byteLength(body, 'utf-8');

  for (let i = 0; i < objs.length; i++) {
    offsets.push(offset);
    body += objs[i];
    offset += Buffer.byteLength(objs[i], 'utf-8');
  }

  const xrefOffset = offset;
  let xref = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i <= objs.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
  return Buffer.from(body + xref + trailer, 'utf-8');
}

async function main() {
  console.log('Searching for student profile: Harisanth...');
  const bcrypt = require('bcryptjs');
  let student = await prisma.studentProfile.findFirst({
    where: { firstName: 'Harisanth' },
    include: { user: true, documents: true },
  });

  if (!student) {
    console.log('Harisanth not found, creating user and student profile...');
    const passwordHash = await bcrypt.hash('Password@123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'harisanths56@gmail.com' },
      update: {},
      create: {
        email: 'harisanths56@gmail.com',
        phoneNumber: '8281363016',
        passwordHash,
        role: 'STUDENT',
        studentProfile: {
          create: {
            firstName: 'Harisanth',
            lastName: 'S',
            admissionNumber: '24BCA033',
            address: 'Suresh Bhavan, KP Vallon Road, Kadavanthra, Kochi - 682020',
            bloodGroup: 'O+',
            timePeriodOfStudy: '2024-2028',
            courseAdmitted: 'BCA',
            quota: 'Merit',
            gender: 'Male',
            dob: '2006-05-14',
            nationality: 'Indian',
            religion: 'Hindu',
            caste: 'OBC - Ezhava',
            annualIncome: 80000,
            isEws: true,
          },
        },
      },
      include: { studentProfile: true },
    });
    student = user.studentProfile;
  }

  console.log(`Found Harisanth: ID=${student.id}, AdmissionNumber=${student.admissionNumber}`);

  const uploadsDir = path.resolve(__dirname, 'uploads');
  const docDir = path.join(uploadsDir, 'documents');
  if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });

  const dummyDocs = [
    {
      type: 'PLUS_TWO_CERTIFICATE',
      fileName: 'Harisanth_S_PlusTwo_Marksheet.pdf',
      pdf: buildCertificatePdf({
        headerBg: [0.06, 0.22, 0.46],
        authority: 'BOARD OF HIGHER SECONDARY EXAMINATIONS, KERALA',
        title: 'HIGHER SECONDARY EXAMINATION CERTIFICATE',
        subtitle: 'Official Marksheet & Passing Record - March 2024',
        certNo: 'HSE-2024-91823',
        date: '28 May 2024',
        rows: [
          { label: 'Student Name', value: 'Harisanth S' },
          { label: 'Register Number', value: 'PLUS2-2024-9182' },
          { label: 'School Name', value: 'Govt Model Higher Secondary School' },
          { label: 'Date of Birth', value: '14-05-2006' },
          { label: 'Stream', value: 'Science / Computer Science' },
          { label: 'Result Status', value: 'PASSED - FIRST CLASS DISTINCTION' },
        ],
        tableHeaders: [
          { title: 'Subject', width: 220 },
          { title: 'Max Marks', width: 80 },
          { title: 'Marks Obtained', width: 110 },
          { title: 'Grade', width: 80 },
        ],
        tableRows: [
          ['English', '200', '182', 'A+'],
          ['Malayalam', '200', '178', 'A+'],
          ['Physics', '200', '168', 'A'],
          ['Chemistry', '200', '170', 'A+'],
          ['Mathematics', '200', '174', 'A+'],
          ['Computer Science', '200', '190', 'A+'],
          ['Grand Total', '1200', '1062', '88.5% (A+)'],
        ],
        footerNote: 'Valid Higher Secondary HSE certificate for college UG admissions 2024-2025',
      }),
    },
    {
      type: 'SSLC_CERTIFICATE',
      fileName: 'Harisanth_S_SSLC_10th.pdf',
      pdf: buildCertificatePdf({
        headerBg: [0.1, 0.35, 0.25], // deep emerald green
        authority: 'GOVERNMENT OF KERALA - GENERAL EDUCATION DEPARTMENT',
        title: 'SECONDARY SCHOOL LEAVING CERTIFICATE (SSLC)',
        subtitle: 'Official Date of Birth (DOB) and Secondary Passing Record',
        certNo: 'SSLC-2022-817291',
        date: '15 June 2022',
        rows: [
          { label: 'Candidate Name', value: 'Harisanth S' },
          { label: 'Register Number', value: 'SSLC-2022-77123' },
          { label: 'Date of Birth', value: '14-05-2006 (Fourteenth May 2006)' },
          { label: 'Gender', value: 'Male' },
          { label: 'Mother Name', value: 'Lakshmi Devi' },
          { label: 'Father Name', value: 'Suresh Kumar' },
          { label: 'School', value: 'Govt Model High School Kochi' },
          { label: 'Result Status', value: 'ELIGIBLE FOR HIGHER STUDIES (FULL A+)' },
        ],
        footerNote: 'Official Statutory Proof for Date of Birth & Legal Identification',
      }),
    },
    {
      type: 'ALLOTMENT_MEMO',
      fileName: 'Harisanth_S_Allotment_Memo.pdf',
      pdf: buildCertificatePdf({
        headerBg: [0.4, 0.15, 0.45], // royal purple
        authority: 'CENTRALIZED ALLOTMENT PROCESS (CAP 2024) - UNIVERSITY ADMISSIONS',
        title: 'PROVISIONAL ALLOTMENT MEMO - ROUND 1',
        subtitle: 'Official College Allotment Verification Slip',
        certNo: 'CAP24-BCA-88319',
        date: '10 July 2024',
        rows: [
          { label: 'Candidate Name', value: 'Harisanth S' },
          { label: 'Admission Roll No', value: '24BCA033' },
          { label: 'Allotted Institution', value: 'St. Xavier College of Commerce & Technology' },
          { label: 'Program Admitted', value: 'BCA (Bachelor of Computer Applications)' },
          { label: 'Allotted Quota', value: 'Merit (General / Open Merit)' },
          { label: 'State Merit Rank', value: 'Index Score: 1182 (Rank: 142)' },
          { label: 'Fee Payment Status', value: 'Confirmed (Mandatory University Fee Paid)' },
          { label: 'Reporting Status', value: 'Reported to College for Document Verification' },
        ],
        footerNote: 'Valid University Allotment Memo - Present original at College Office',
      }),
    },
    {
      type: 'INCOME_CERTIFICATE',
      fileName: 'Harisanth_S_Income_EWS.pdf',
      pdf: buildCertificatePdf({
        headerBg: [0.15, 0.35, 0.4], // teal
        authority: 'REVENUE DEPARTMENT - GOVERNMENT OF KERALA',
        title: 'FAMILY INCOME CERTIFICATE (EWS ELIGIBLE)',
        subtitle: 'Issued by the Village Officer - Ernakulam District',
        certNo: 'KL-REV-INC-2024-91024',
        date: '02 June 2024',
        rows: [
          { label: 'Applicant Name', value: 'Harisanth S' },
          { label: 'Father / Guardian', value: 'Suresh Kumar' },
          { label: 'Residential Address', value: 'Suresh Bhavan, KP Vallon Road, Kadavanthra' },
          { label: 'Village / Taluk', value: 'Elamkulam Village, Kanayannur Taluk' },
          { label: 'Annual Family Income', value: 'Rs. 80,000/- (Eighty Thousand Only)' },
          { label: 'EWS Category Status', value: 'Eligible (Income below Rs. 1,00,000 threshold)' },
          { label: 'Purpose of Certificate', value: 'College Admission, Fee Concession & Scholarships' },
          { label: 'Validity Period', value: 'Valid for Academic Year 2024-2025' },
        ],
        footerNote: 'Digitally verified revenue village income certificate for educational benefits',
      }),
    },
    {
      type: 'COMMUNITY_CERTIFICATE',
      fileName: 'Harisanth_S_Community_Certificate.pdf',
      pdf: buildCertificatePdf({
        headerBg: [0.55, 0.25, 0.1], // warm bronze
        authority: 'COMMUNITY WELFARE & PARISH COUNCIL / REVENUE AUTHORITY',
        title: 'COMMUNITY CERTIFICATE',
        subtitle: 'Social Welfare & Community Quota Verification',
        certNo: 'COMM-2024-KCH-4910',
        date: '12 May 2024',
        rows: [
          { label: 'Full Name', value: 'Harisanth S' },
          { label: 'Father Name', value: 'Suresh Kumar' },
          { label: 'Permanent Address', value: 'Suresh Bhavan, KP Vallon Road, Kochi - 682020' },
          { label: 'Religion', value: 'Hindu' },
          { label: 'Community / Caste', value: 'OBC (Other Backward Classes)' },
          { label: 'Sub-Community', value: 'Ezhava Community' },
          { label: 'Authorized Officer', value: 'General Secretary / Competent Authority' },
          { label: 'Verification Stamp', value: 'Official Welfare Registry Verified' },
        ],
        footerNote: 'Issued for college admission reservation and quota verification',
      }),
    },
    {
      type: 'CASTE_CERTIFICATE',
      fileName: 'Harisanth_S_Caste_Certificate.pdf',
      pdf: buildCertificatePdf({
        headerBg: [0.2, 0.25, 0.55], // indigo
        authority: 'OFFICE OF THE TAHSILDAR - REVENUE DEPARTMENT, KERALA',
        title: 'NON-CREAMY LAYER / CASTE CERTIFICATE',
        subtitle: 'Issued under State Backward Classes Reservation Norms',
        certNo: 'KL-CST-2024-77218',
        date: '20 May 2024',
        rows: [
          { label: 'Candidate Name', value: 'Harisanth S' },
          { label: 'Parent Name', value: 'Suresh Kumar' },
          { label: 'Permanent Address', value: 'Suresh Bhavan, Kadavanthra, Ernakulam - 682020' },
          { label: 'Recognized Category', value: 'OBC (Other Backward Classes)' },
          { label: 'Specific Caste', value: 'Hindu Ezhava' },
          { label: 'Creamy Layer Status', value: 'Does NOT belong to Creamy Layer' },
          { label: 'Issuing Authority', value: 'Tahsildar, Kanayannur Taluk' },
          { label: 'Digital Sign ID', value: 'DS-REV-KL-2024-998231' },
        ],
        footerNote: 'Official Caste & Non-Creamy Layer Certificate for Higher Education',
      }),
    },
    {
      type: 'BANK_PASSBOOK',
      fileName: 'Harisanth_S_Bank_Passbook.pdf',
      pdf: buildCertificatePdf({
        headerBg: [0.08, 0.38, 0.65], // Canara Bank blue
        authority: 'CANARA BANK - A GOVERNMENT OF INDIA UNDERTAKING',
        title: 'SAVINGS BANK ACCOUNT PASSBOOK - FRONT PAGE',
        subtitle: 'Account Verification Proof for Scholarships & Direct Benefit Transfer (DBT)',
        certNo: 'CNRB-PB-2024-1082',
        date: '05 April 2024',
        rows: [
          { label: 'Account Holder Name', value: 'Harisanth S' },
          { label: 'Account Number', value: '108291002345' },
          { label: 'Customer ID / CIF', value: '90281273' },
          { label: 'Account Type', value: 'Student Savings Bank (Zero Balance)' },
          { label: 'Bank & Branch', value: 'Canara Bank, Ernakulam North Branch' },
          { label: 'IFSC Code', value: 'CNRB0001082' },
          { label: 'MICR Code', value: '682015011' },
          { label: 'Linked Mobile No', value: '8281363016 (Aadhaar & DBT Seeded)' },
        ],
        footerNote: 'Authorized Bank Passbook copy for institutional verification and DBT credits',
      }),
    },
    {
      type: 'APAAR_DOCUMENT',
      fileName: 'Harisanth_S_APAAR_Card.pdf',
      pdf: buildCertificatePdf({
        headerBg: [0.12, 0.28, 0.48], // National Navy
        authority: 'MINISTRY OF EDUCATION - GOVERNMENT OF INDIA (DIGILOCKER VERIFIED)',
        title: 'AUTOMATED PERMANENT ACADEMIC ACCOUNT REGISTRY (APAAR)',
        subtitle: 'One Nation, One Student ID Card - Academic Bank of Credits (ABC)',
        certNo: 'APAAR-5542-9912-3041',
        date: '18 May 2024',
        rows: [
          { label: 'Student Full Name', value: 'Harisanth S' },
          { label: '12-Digit APAAR ID', value: '5542-9912-3041' },
          { label: 'ABC Account ID', value: 'ABC-2024-8849102' },
          { label: 'Date of Birth', value: '14/05/2006' },
          { label: 'Gender', value: 'Male' },
          { label: 'Current Institution', value: 'St. Xavier College of Commerce & Technology' },
          { label: 'DigiLocker Verification', value: 'Verified via Aadhaar e-KYC (Status: ACTIVE)' },
          { label: 'Academic Year', value: '2024-2028' },
        ],
        footerNote: 'National Educational Digital Identity issued by National e-Governance Division (NeGD)',
      }),
    },
  ];

  for (const doc of dummyDocs) {
    const filePath = path.join(docDir, doc.fileName);
    fs.writeFileSync(filePath, doc.pdf);
    const stat = fs.statSync(filePath);

    await prisma.studentDocument.upsert({
      where: {
        studentProfileId_type: {
          studentProfileId: student.id,
          type: doc.type,
        },
      },
      update: {
        fileName: doc.fileName,
        filePath: filePath,
        fileUrl: `http://localhost:5000/uploads/documents/${doc.fileName}`,
        fileMimeType: 'application/pdf',
        fileSize: stat.size,
        status: 'VALID',
        flagReason: null,
      },
      create: {
        studentProfileId: student.id,
        type: doc.type,
        fileName: doc.fileName,
        filePath: filePath,
        fileUrl: `http://localhost:5000/uploads/documents/${doc.fileName}`,
        fileMimeType: 'application/pdf',
        fileSize: stat.size,
        status: 'VALID',
        flagReason: null,
      },
    });

    console.log(`Uploaded document: ${doc.type} (${doc.fileName}, ${stat.size} bytes)`);
  }

  // Update Harisanth's profile fields to match the certificates and set status to SUBMITTED
  const updated = await prisma.studentProfile.update({
    where: { id: student.id },
    data: {
      address: 'Suresh Bhavan, KP Vallon Road, Kadavanthra, Kochi - 682020',
      permanentAddress: 'Suresh Bhavan, KP Vallon Road, Kadavanthra, Kochi - 682020',
      fatherName: 'Suresh Kumar',
      fatherOccupation: 'Govt Employee',
      motherName: 'Lakshmi Devi',
      motherOccupation: 'Teacher',
      parentName: 'Suresh Kumar',
      parentOccupation: 'Govt Employee',
      guardianName: 'Suresh Kumar',
      guardianOccupation: 'Govt Employee',
      annualIncome: 80000,
      isEws: true,
      bankAccountName: 'Harisanth S',
      bankName: 'Canara Bank',
      bankBranch: 'Ernakulam North Branch',
      bankAccountNumber: '108291002345',
      bankIfscCode: 'CNRB0001082',
      prevInstitutionName: 'Govt Model Higher Secondary School',
      prevCourse: 'Computer Science',
      prevRegisterNumber: 'PLUS2-2024-9182',
      prevBoardUniversity: 'Kerala State Board (DHSE)',
      prevPeriodOfStudy: '2022-2024',
      prevPercentage: 88.5,
      apaarId: '5542-9912-3041',
      verificationStatus: 'SUBMITTED', // Ready for admin review & verification
      fieldFlags: '{}',
    },
    include: {
      documents: true,
      user: true,
    },
  });

  console.log('\n--- SUCCESS ---');
  console.log(`Student ${updated.firstName} ${updated.lastName} (${updated.admissionNumber}) is now SUBMITTED.`);
  console.log(`Total documents attached: ${updated.documents.length}`);
  updated.documents.forEach((d, idx) => {
    console.log(` [${idx + 1}] ${d.type} -> ${d.fileName} (${d.fileSize} bytes)`);
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error seeding Harisanth documents:', err);
  process.exit(1);
});
