import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role, VerificationStatus, FieldFlagDetail } from '../types';
import { uploadMiddleware, getPublicFileUrl, uploadFileToCloud } from '../services/storage.service';
import fs from 'fs';

const router = Router();

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
  PROFILE_PHOTO: ['photoUrl', 'photo'],
  photoUrl: ['PROFILE_PHOTO'],
  photo: ['PROFILE_PHOTO'],
};

const CANONICAL_DOC_MAP: Record<string, string> = {
  PLUS_TWO_CERT: 'PLUS_TWO_CERTIFICATE',
  PLUS_TWO_CERTIFICATE: 'PLUS_TWO_CERTIFICATE',
  SSLC_CERT: 'SSLC_CERTIFICATE',
  SSLC_CERTIFICATE: 'SSLC_CERTIFICATE',
  ALLOTMENT_MEMO: 'ALLOTMENT_MEMO',
  INCOME_CERT: 'INCOME_CERTIFICATE',
  INCOME_CERTIFICATE: 'INCOME_CERTIFICATE',
  COMMUNITY_CERT: 'COMMUNITY_CERTIFICATE',
  COMMUNITY_CERTIFICATE: 'COMMUNITY_CERTIFICATE',
  CASTE_CERT: 'CASTE_CERTIFICATE',
  CASTE_CERTIFICATE: 'CASTE_CERTIFICATE',
  BANK_PASSBOOK: 'BANK_PASSBOOK',
  APAAR_CARD: 'APAAR_DOCUMENT',
  APAAR_DOCUMENT: 'APAAR_DOCUMENT',
  AADHAAR_CARD: 'AADHAAR_CARD',
  AADHAAR_DOCUMENT: 'AADHAAR_CARD',
  PROFILE_PHOTO: 'PROFILE_PHOTO',
  photoUrl: 'PROFILE_PHOTO',
  photo: 'PROFILE_PHOTO',
};

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

    const photoDoc = profile.documents.find(
      (d) => d.type === 'PROFILE_PHOTO' || d.type === 'photo'
    );

    return res.json({
      ...profile,
      photoUrl: photoDoc ? photoDoc.fileUrl : null,
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
      'fatherName',
      'fatherOccupation',
      'motherName',
      'motherOccupation',
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
      'aadhaarNumber',
    ];

    const dataToUpdate: Record<string, any> = {};

    if (currentStatus === VerificationStatus.CORRECTION_REQUIRED) {
      // ONLY allow updating fields that were explicitly flagged by the office (including aliases)
      for (const key of allowedKeys) {
        if (payload[key] === undefined) continue;

        const aliases = ALIAS_MAP[key] || [];
        const isFlagged = [key, ...aliases].some(
          (k) => parsedFlags[k]?.status === 'FLAGGED_ERROR'
        );

        if (isFlagged) {
          dataToUpdate[key] = payload[key];
          // Clear this field's flags and all aliases once edited
          delete parsedFlags[key];
          for (const a of aliases) {
            delete parsedFlags[a];
          }
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

    const photoDoc = updatedProfile.documents.find(
      (d) => d.type === 'PROFILE_PHOTO' || d.type === 'photo'
    );

    return res.json({
      message: 'Profile updated successfully',
      profile: {
        ...updatedProfile,
        photoUrl: photoDoc ? photoDoc.fileUrl : null,
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

    const canonicalType = CANONICAL_DOC_MAP[docType] || docType;

    if (profile.verificationStatus === VerificationStatus.CORRECTION_REQUIRED) {
      // Check if this document or any of its aliases was flagged
      const aliases = ALIAS_MAP[docType] || ALIAS_MAP[canonicalType] || [];
      const allKeys = [docType, canonicalType, ...aliases];
      const isFlagged = allKeys.some(
        (k) => parsedFlags[k]?.status === 'FLAGGED_ERROR'
      );

      if (!isFlagged) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({
          error: `Document '${docType}' was not flagged for correction and cannot be re-uploaded.`,
        });
      }

      // Remove all matching flag aliases on re-upload
      for (const k of allKeys) {
        delete parsedFlags[k];
      }
    }

    const fileUrl = await uploadFileToCloud(req.file.path, req.file.originalname, req.file.mimetype);

    // Upsert the document with canonical type
    const document = await prisma.studentDocument.upsert({
      where: {
        studentProfileId_type: {
          studentProfileId: profile.id,
          type: canonicalType,
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
        type: canonicalType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileUrl,
        fileMimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: 'VALID',
        flagReason: null,
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
