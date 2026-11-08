import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role, VerificationStatus, FieldFlagDetail } from '../types';
import { mailService } from '../services/mail.service';
import { aiVerifierService } from '../services/ai-verifier.service';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';

const router = Router();

// Office Staff and Super Admin access
router.use(authenticateToken, requireRole(Role.ADMIN, Role.SUPER_ADMIN));

// Helper to build Prisma filters
const buildStudentFilter = (query: any) => {
  const where: any = {};

  if (query.course) {
    where.courseAdmitted = { equals: String(query.course).trim() };
  }
  if (query.timePeriodOfStudy) {
    where.timePeriodOfStudy = { equals: String(query.timePeriodOfStudy).trim() };
  }
  if (query.religion) {
    where.religion = { equals: String(query.religion).trim() };
  }
  if (query.gender) {
    where.gender = { equals: String(query.gender).trim() };
  }
  if (query.quota) {
    where.quota = { equals: String(query.quota).trim() };
  }
  if (query.isEws !== undefined && query.isEws !== '') {
    where.isEws = query.isEws === 'true';
  }
  if (query.verificationStatus) {
    where.verificationStatus = { equals: String(query.verificationStatus).trim() };
  }

  if (query.search) {
    const s = String(query.search).trim();
    where.OR = [
      { firstName: { contains: s } },
      { lastName: { contains: s } },
      { admissionNumber: { contains: s } },
      { user: { email: { contains: s } } },
      { user: { phoneNumber: { contains: s } } },
      { aadhaarNumber: { contains: s } },
    ];
  }

  return where;
};

// 0. Dashboard Stats & Analytics for Office Admin
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalStudents = await prisma.studentProfile.count();
    const [draftCount, submittedCount, correctionCount, verifiedCount] = await Promise.all([
      prisma.studentProfile.count({ where: { verificationStatus: 'DRAFT' } }),
      prisma.studentProfile.count({ where: { verificationStatus: 'SUBMITTED' } }),
      prisma.studentProfile.count({ where: { verificationStatus: 'CORRECTION_REQUIRED' } }),
      prisma.studentProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
    ]);

    const ewsCount = await prisma.studentProfile.count({
      where: { isEws: true },
    });

    const courseStats = await prisma.studentProfile.groupBy({
      by: ['courseAdmitted'],
      _count: { id: true },
    });

    const quotaStats = await prisma.studentProfile.groupBy({
      by: ['quota'],
      _count: { id: true },
    });

    const recentAuditLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        admin: {
          select: { email: true, role: true },
        },
      },
    });

    return res.json({
      totalStudents,
      statusPipeline: {
        draft: draftCount,
        submitted: submittedCount,
        correctionRequired: correctionCount,
        verified: verifiedCount,
      },
      ewsCount,
      byCourse: courseStats.map((c) => ({
        course: c.courseAdmitted || 'Unassigned',
        count: c._count.id,
      })),
      byQuota: quotaStats.map((q) => ({
        quota: q.quota || 'General',
        count: q._count.id,
      })),
      recentActivity: recentAuditLogs,
    });
  } catch (err) {
    console.error('[Admin Stats Error]', err);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// 1. List students with multi-parameter filtering
router.get('/students', async (req: Request, res: Response) => {
  try {
    const where = buildStudentFilter(req.query);

    const students = await prisma.studentProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            isActive: true,
          },
        },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsedStudents = students.map((s) => {
      let flags = {};
      try {
        flags = JSON.parse(s.fieldFlags || '{}');
      } catch {}
      return {
        ...s,
        fieldFlags: flags,
      };
    });

    return res.json(parsedStudents);
  } catch (err) {
    console.error('[Admin List Students Error]', err);
    return res.status(500).json({ error: 'Failed to fetch students list' });
  }
});

// 2. Get single student details
router.get('/students/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: req.params.id as string },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            isActive: true,
          },
        },
        documents: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let flags = {};
    try {
      flags = JSON.parse(student.fieldFlags || '{}');
    } catch {}

    return res.json({
      ...student,
      fieldFlags: flags,
    });
  } catch (err) {
    console.error('[Admin Get Student Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve student details' });
  }
});

// 3. Flag specific fields / documents with error reasons and send email notification
router.post('/students/:id/flag', async (req: Request, res: Response) => {
  try {
    const { flags } = req.body; // Array<{ key: string, reason: string }>
    if (!Array.isArray(flags) || flags.length === 0) {
      return res.status(400).json({ error: 'At least one field flag with reason is required' });
    }

    const student: any = await prisma.studentProfile.findFirst({
      where: {
        OR: [
          { id: req.params.id as string },
          { admissionNumber: req.params.id as string },
        ],
      },
      include: {
        user: true,
        documents: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let currentFlags: Record<string, FieldFlagDetail> = {};
    try {
      currentFlags = JSON.parse(student.fieldFlags || '{}');
    } catch {}

    const flaggedListForEmail: Array<{ fieldOrDoc: string; reason: string }> = [];

    const ALIAS_MAP: Record<string, string[]> = {
      PLUS_TWO_CERTIFICATE: ['PLUS_TWO_CERT'],
      PLUS_TWO_CERT: ['PLUS_TWO_CERTIFICATE'],
      SSLC_CERTIFICATE: ['SSLC_CERT'],
      SSLC_CERT: ['SSLC_CERTIFICATE'],
      INCOME_CERTIFICATE: ['INCOME_CERT'],
      INCOME_CERT: ['INCOME_CERTIFICATE'],
      COMMUNITY_CERTIFICATE: ['COMMUNITY_CERT'],
      COMMUNITY_CERT: ['COMMUNITY_CERTIFICATE'],
      CASTE_CERTIFICATE: ['CASTE_CERT'],
      CASTE_CERT: ['CASTE_CERTIFICATE'],
      APAAR_DOCUMENT: ['APAAR_CARD'],
      APAAR_CARD: ['APAAR_DOCUMENT'],
      AADHAAR_CARD: ['AADHAAR_DOCUMENT', 'aadhaar'],
      AADHAAR_DOCUMENT: ['AADHAAR_CARD', 'aadhaar'],
      PROFILE_PHOTO: ['photoUrl'],
      photoUrl: ['PROFILE_PHOTO'],
      fatherName: ['parentName'],
      parentName: ['fatherName'],
      fatherOccupation: ['parentOccupation'],
      parentOccupation: ['fatherOccupation'],
    };

    for (const flag of flags) {
      const flagDetail: FieldFlagDetail = {
        status: 'FLAGGED_ERROR',
        reason: flag.reason,
        flaggedAt: new Date().toISOString(),
      };
      currentFlags[flag.key] = flagDetail;
      const aliases = ALIAS_MAP[flag.key] || [];
      for (const a of aliases) {
        currentFlags[a] = flagDetail;
      }

      flaggedListForEmail.push({
        fieldOrDoc: flag.key,
        reason: flag.reason,
      });

      // Also mark in documents table if key matches a document or its aliases
      const allMatchingKeys = [flag.key, ...aliases];
      const matchingDoc = student.documents?.find((d: any) => allMatchingKeys.includes(d.type));
      if (matchingDoc) {
        await prisma.studentDocument.update({
          where: { id: matchingDoc.id },
          data: {
            status: 'FLAGGED_ERROR',
            flagReason: flag.reason,
          },
        });
      }
    }

    // Update status to CORRECTION_REQUIRED
    const updated = await prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        verificationStatus: VerificationStatus.CORRECTION_REQUIRED,
        fieldFlags: JSON.stringify(currentFlags),
      },
      include: {
        documents: true,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        targetId: student.id,
        action: 'FLAGGED_FIELDS',
        details: JSON.stringify({ flaggedItems: flaggedListForEmail }),
      },
    });

    // Send email notification to student via College SMTP Mailer
    await mailService.sendFlagNotification({
      studentEmail: student.user.email,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      flaggedItems: flaggedListForEmail,
    });

    return res.json({
      message: 'Mistakes flagged and notification email dispatched to student',
      student: {
        ...updated,
        fieldFlags: currentFlags,
      },
    });
  } catch (err) {
    console.error('[Admin Flag Error]', err);
    return res.status(500).json({ error: 'Failed to flag mistakes' });
  }
});

// 4. Mark student as VERIFIED
router.post('/students/:id/verify', async (req: Request, res: Response) => {
  try {
    const student = await prisma.studentProfile.findFirst({
      where: {
        OR: [
          { id: req.params.id as string },
          { admissionNumber: req.params.id as string },
        ],
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updated = await prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedByAdminId: req.user!.userId,
        fieldFlags: '{}', // clear any old flags
      },
      include: {
        documents: true,
      },
    });

    // Mark all documents as VALID
    await prisma.studentDocument.updateMany({
      where: { studentProfileId: student.id },
      data: { status: 'VALID', flagReason: null },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        targetId: student.id,
        action: 'VERIFIED_STUDENT',
        details: JSON.stringify({ verifiedAt: new Date().toISOString() }),
      },
    });

    return res.json({
      message: 'Student successfully verified and approved',
      student: updated,
    });
  } catch (err) {
    console.error('[Admin Verify Error]', err);
    return res.status(500).json({ error: 'Failed to verify student' });
  }
});

// 4b. AI Automated Discrepancy Verification Scan
router.post('/students/:id/ai-verify', async (req: Request, res: Response) => {
  try {
    const student: any = await prisma.studentProfile.findFirst({
      where: {
        OR: [
          { id: req.params.id as string },
          { admissionNumber: req.params.id as string },
        ],
      },
      include: {
        user: true,
        documents: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const auditResult = await aiVerifierService.runAudit(student);
    return res.json(auditResult);
  } catch (err) {
    console.error('[Admin AI Verify Error]', err);
    return res.status(500).json({ error: 'Failed to perform AI verification audit' });
  }
});

// 4c. Inline Document Preview Streaming (Prevents forced downloads in browser)
router.get('/documents/:id/preview', async (req: Request, res: Response) => {
  try {
    const docId = String(req.params.id);
    const document = await prisma.studentDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const ext = path.extname(document.fileName || document.fileUrl || '').toLowerCase();
    const isPdf = ext === '.pdf' || document.fileMimeType === 'application/pdf';
    const isPng = ext === '.png' || document.fileMimeType === 'image/png';
    const isJpg = ext === '.jpg' || ext === '.jpeg' || document.fileMimeType === 'image/jpeg';
    const isWebp = ext === '.webp' || document.fileMimeType === 'image/webp';

    const contentType = isPdf
      ? 'application/pdf'
      : isPng
      ? 'image/png'
      : isJpg
      ? 'image/jpeg'
      : isWebp
      ? 'image/webp'
      : 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.fileName || 'document.pdf')}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.removeHeader('X-Frame-Options');

    // 1. Check if local file exists on disk
    let diskPath = document.filePath;
    if (diskPath && fs.existsSync(diskPath)) {
      return fs.createReadStream(diskPath).pipe(res);
    }

    // 1b. Check relative candidates if path was recorded on another OS/machine
    const fileName = document.fileName || (diskPath ? path.basename(diskPath) : '');
    if (fileName) {
      const candidates = [
        path.resolve(process.cwd(), 'uploads/documents', fileName),
        path.resolve(process.cwd(), 'uploads/certificates', fileName),
        path.resolve(process.cwd(), 'uploads/photos', fileName),
        path.resolve(process.cwd(), 'backend/uploads/documents', fileName),
        path.resolve(process.cwd(), 'backend/uploads/certificates', fileName),
        path.resolve(process.cwd(), 'backend/uploads/photos', fileName),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          return fs.createReadStream(cand).pipe(res);
        }
      }
    }

    // 2. Fetch from remote cloud storage (Supabase or external URL)
    if (document.fileUrl && (document.fileUrl.startsWith('http://') || document.fileUrl.startsWith('https://'))) {
      const isLocalhost = document.fileUrl.includes('localhost:') || document.fileUrl.includes('127.0.0.1:');
      if (!isLocalhost) {
        const response = await fetch(document.fileUrl);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          return res.send(buffer);
        }
      } else {
        // If localhost URL was stored, resolve locally
        try {
          const urlObj = new URL(document.fileUrl);
          const rel = urlObj.pathname.replace(/^\/uploads\//, '');
          const localUpload = path.resolve(process.cwd(), 'uploads', rel);
          const backendUpload = path.resolve(process.cwd(), 'backend/uploads', rel);
          if (fs.existsSync(localUpload)) return fs.createReadStream(localUpload).pipe(res);
          if (fs.existsSync(backendUpload)) return fs.createReadStream(backendUpload).pipe(res);
        } catch (_) {}
      }
    }

    return res.status(404).json({ error: 'Document file content unavailable' });
  } catch (err) {
    console.error('[Document Preview Stream Error]', err);
    return res.status(500).json({ error: 'Failed to stream document preview' });
  }
});

// 5. Export to Excel
router.get('/export/excel', async (req: Request, res: Response) => {
  try {
    const where = buildStudentFilter(req.query);

    const students = await prisma.studentProfile.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: { admissionNumber: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    worksheet.columns = [
      { header: 'Admission No', key: 'admissionNumber', width: 16 },
      { header: 'First Name', key: 'firstName', width: 16 },
      { header: 'Last Name', key: 'lastName', width: 16 },
      { header: 'First Name (Malayalam)', key: 'firstNameMalayalam', width: 20 },
      { header: 'Last Name (Malayalam)', key: 'lastNameMalayalam', width: 20 },
      { header: 'Course', key: 'courseAdmitted', width: 14 },
      { header: 'Batch / Period', key: 'timePeriodOfStudy', width: 16 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Religion', key: 'religion', width: 14 },
      { header: 'Caste', key: 'caste', width: 14 },
      { header: 'Quota', key: 'quota', width: 14 },
      { header: 'Annual Income (₹)', key: 'annualIncome', width: 18 },
      { header: 'EWS Category', key: 'isEws', width: 14 },
      { header: 'Blood Group', key: 'bloodGroup', width: 12 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Phone Number', key: 'phoneNumber', width: 16 },
      { header: 'Aadhaar Number', key: 'aadhaarNumber', width: 18 },
      { header: 'APAAR ID', key: 'apaarId', width: 20 },
      { header: 'Bank Name', key: 'bankName', width: 18 },
      { header: 'Bank Account No', key: 'bankAccountNumber', width: 20 },
      { header: 'IFSC Code', key: 'bankIfscCode', width: 14 },
      { header: '12th Percentage', key: 'prevPercentage', width: 16 },
      { header: 'Verification Status', key: 'verificationStatus', width: 18 },
    ];

    // Style Header Row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // College Blue
    };

    students.forEach((s) => {
      worksheet.addRow({
        admissionNumber: s.admissionNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        firstNameMalayalam: s.firstNameMalayalam || '',
        lastNameMalayalam: s.lastNameMalayalam || '',
        courseAdmitted: s.courseAdmitted || 'N/A',
        timePeriodOfStudy: s.timePeriodOfStudy,
        gender: s.gender || 'N/A',
        religion: s.religion || 'N/A',
        caste: s.caste || 'N/A',
        quota: s.quota || 'N/A',
        annualIncome: s.annualIncome ?? '',
        isEws: s.isEws ? 'YES' : 'NO',
        bloodGroup: s.bloodGroup,
        email: s.user.email,
        phoneNumber: s.user.phoneNumber,
        aadhaarNumber: s.aadhaarNumber || '',
        apaarId: s.apaarId || '',
        bankName: s.bankName || '',
        bankAccountNumber: s.bankAccountNumber || '',
        bankIfscCode: s.bankIfscCode || '',
        prevPercentage: s.prevPercentage ? `${s.prevPercentage}%` : '',
        verificationStatus: s.verificationStatus,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Students_Export_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[Export Excel Error]', err);
    return res.status(500).json({ error: 'Failed to export Excel spreadsheet' });
  }
});

// 6. Bulk Document Download (ZIP)
router.get('/export/documents-zip', async (req: Request, res: Response) => {
  try {
    const where = buildStudentFilter(req.query);
    const docTypeFilter = req.query.documentType as string; // Optional: specific document type like APAAR_DOCUMENT

    const docWhere: any = {};
    if (docTypeFilter) {
      docWhere.type = docTypeFilter;
    }

    const students = await prisma.studentProfile.findMany({
      where,
      include: {
        documents: {
          where: docWhere,
        },
      },
    });

    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=College_Documents_${Date.now()}.zip`
    );

    archive.pipe(res);

    let fileCount = 0;

    for (const student of students) {
      const studentFolder = `${student.admissionNumber}_${student.firstName}_${student.lastName}`;

      for (const doc of student.documents) {
        if (fs.existsSync(doc.filePath)) {
          const ext = path.extname(doc.filePath);
          const zipEntryName = `${studentFolder}/${doc.type}${ext}`;
          archive.file(doc.filePath, { name: zipEntryName });
          fileCount++;
        }
      }
    }

    if (fileCount === 0) {
      archive.append('No uploaded documents found for the selected filter criteria.', {
        name: 'README.txt',
      });
    }

    await archive.finalize();
  } catch (err) {
    console.error('[Bulk ZIP Error]', err);
    return res.status(500).json({ error: 'Failed to generate documents ZIP' });
  }
});

export default router;
