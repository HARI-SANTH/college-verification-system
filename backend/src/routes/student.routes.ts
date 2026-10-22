import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role, VerificationStatus, FieldFlagDetail } from '../types';
import { uploadMiddleware, getPublicFileUrl } from '../services/storage.service';
import fs from 'fs';

const router = Router();

// Ensure all student routes require STUDENT role
router.use(authenticateToken, requireRole(Role.STUDENT));

// 1. Get full student profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.userId },
      include: {
        documents: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    let parsedFlags: Record<string, FieldFlagDetail> = {};
    try {
      parsedFlags = JSON.parse(profile.fieldFlags || '{}');
    } catch {
      parsedFlags = {};
    }

    return res.json({
      ...profile,
      fieldFlags: parsedFlags,
    });
  } catch (err) {
    console.error('[Get Profile Error]', err);
    return res.status(500).json({ error: 'Failed to fetch student profile' });
  }
});

// 2. Submit or Update Extra Form Details
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    let parsedFlags: Record<string, FieldFlagDetail> = {};
    try {
      parsedFlags = JSON.parse(profile.fieldFlags || '{}');
    } catch {
      parsedFlags = {};
    }

    const currentStatus = profile.verificationStatus;

    // Check if fully verified
    if (currentStatus === VerificationStatus.VERIFIED) {
      return res.status(403).json({
        error: 'Profile has already been verified and approved by the college office. Editing is locked.',
      });
    }

    // Check if under review without flags
    if (currentStatus === VerificationStatus.SUBMITTED) {
      return res.status(403).json({
        error: 'Your profile has already been submitted and is currently locked under office verification.',
      });
    }

    const payload = req.body;
    const allowedKeys = [
      'firstName',
      'lastName',
      'address',
      'bloodGroup',
      'timePeriodOfStudy',
      'firstNameMalayalam',
      'lastNameMalayalam',
      'permanentAddress',
      'courseAdmitted',
      'quota',
      'gender',
      'dob',
      'nationality',
      'religion',
      'caste',
      'annualIncome',
      'parentName',
      'parentOccupation',
      'guardianName',
      'guardianOccupation',
      'bankAccountName',
      'bankName',
      'bankBranch',
      'bankAccountNumber',
      'bankIfscCode',
      'prevInstitutionName',
      'prevCourse',
      'prevRegisterNumber',
      'prevBoardUniversity',
      'prevPeriodOfStudy',
      'prevPercentage',
      'apaarId',
    ];

    const dataToUpdate: Record<string, any> = {};

    if (currentStatus === VerificationStatus.CORRECTION_REQUIRED) {
      // ONLY allow updating fields that were explicitly flagged by the office!
      for (const key of Object.keys(payload)) {
        if (!allowedKeys.includes(key)) continue;

        if (parsedFlags[key]?.status === 'FLAGGED_ERROR') {
          dataToUpdate[key] = payload[key];
          // Clear this field's flag once edited
          delete parsedFlags[key];
        } else if (payload[key] !== (profile as any)[key] && payload[key] !== undefined) {
          return res.status(403).json({
            error: `Field '${key}' is verified/locked and cannot be edited. You may only edit flagged fields.`,
          });
        }
      }
    } else {
      // Status is DRAFT: allow updating any valid field
      for (const key of allowedKeys) {
        if (payload[key] !== undefined) {
          dataToUpdate[key] = payload[key];
        }
      }
    }

    // Automatic EWS calculation rule:
    // If income is provided and < 100,000 (1 Lakh), ews is true, otherwise false
    if (dataToUpdate.annualIncome !== undefined) {
      const incomeNum = Number(dataToUpdate.annualIncome);
      dataToUpdate.annualIncome = isNaN(incomeNum) ? null : incomeNum;
      dataToUpdate.isEws = !isNaN(incomeNum) && incomeNum > 0 && incomeNum < 100000;
    }

    // If student was in CORRECTION_REQUIRED and all text flags are cleared (or submitted), transition back to SUBMITTED
    let nextStatus = currentStatus;
    if (req.body.isFinalSubmission) {
      nextStatus = VerificationStatus.SUBMITTED;
    }

    const updatedProfile = await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        ...dataToUpdate,
        verificationStatus: nextStatus,
        fieldFlags: JSON.stringify(parsedFlags),
      },
      include: {
        documents: true,
      },
    });

    return res.json({
      message: 'Profile updated successfully',
      profile: {
        ...updatedProfile,
        fieldFlags: parsedFlags,
      },
    });
  } catch (err) {
    console.error('[Update Profile Error]', err);
    return res.status(500).json({ error: 'Failed to update student profile' });
  }
});

// 3. Document Upload (PDF / Image)
router.post('/documents', uploadMiddleware.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const docType = req.body.type;
    if (!docType) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Document type is required' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!profile) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Student profile not found' });
    }

    let parsedFlags: Record<string, FieldFlagDetail> = {};
    try {
      parsedFlags = JSON.parse(profile.fieldFlags || '{}');
    } catch {
      parsedFlags = {};
    }

    // Check status lock
    if (profile.verificationStatus === VerificationStatus.VERIFIED) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Profile is fully verified. Document upload is locked.' });
    }

    if (profile.verificationStatus === VerificationStatus.SUBMITTED) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Profile is currently under review. Document upload is locked.' });
    }

    if (profile.verificationStatus === VerificationStatus.CORRECTION_REQUIRED) {
      // Only allow if this specific document was flagged
      if (parsedFlags[docType]?.status !== 'FLAGGED_ERROR') {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({
          error: `Document '${docType}' was not flagged for correction and cannot be re-uploaded.`,
        });
      }
      // Remove flag on re-upload
      delete parsedFlags[docType];
    }

    const fileUrl = getPublicFileUrl(req.file.path);

    // Upsert the document
    const document = await prisma.studentDocument.upsert({
      where: {
        studentProfileId_type: {
          studentProfileId: profile.id,
          type: docType,
        },
      },
      update: {
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileUrl,
        fileMimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: 'VALID',
        flagReason: null,
      },
      create: {
        studentProfileId: profile.id,
        type: docType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileUrl,
        fileMimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: 'VALID',
      },
    });

    // Update profile flags
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        fieldFlags: JSON.stringify(parsedFlags),
      },
    });

    return res.status(201).json({
      message: 'Document uploaded successfully',
      document,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('[Document Upload Error]', err);
    return res.status(500).json({ error: 'Failed to upload document' });
  }
});

export default router;
