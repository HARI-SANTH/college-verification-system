"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const storage_service_1 = require("../services/storage.service");
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const ALIAS_MAP = {
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
    PROFILE_PHOTO: ['photoUrl', 'photo'],
    photoUrl: ['PROFILE_PHOTO'],
    photo: ['PROFILE_PHOTO'],
};
const CANONICAL_DOC_MAP = {
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
    PROFILE_PHOTO: 'PROFILE_PHOTO',
    photoUrl: 'PROFILE_PHOTO',
    photo: 'PROFILE_PHOTO',
};
// Ensure all student routes require STUDENT role
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)(types_1.Role.STUDENT));
// 1. Get full student profile
router.get('/profile', async (req, res) => {
    try {
        const profile = await prisma_1.prisma.studentProfile.findUnique({
            where: { userId: req.user.userId },
            include: {
                documents: true,
            },
        });
        if (!profile) {
            return res.status(404).json({ error: 'Student profile not found' });
        }
        let parsedFlags = {};
        try {
            parsedFlags = JSON.parse(profile.fieldFlags || '{}');
        }
        catch {
            parsedFlags = {};
        }
        const photoDoc = profile.documents.find((d) => d.type === 'PROFILE_PHOTO' || d.type === 'photo');
        return res.json({
            ...profile,
            photoUrl: photoDoc ? photoDoc.fileUrl : null,
            fieldFlags: parsedFlags,
        });
    }
    catch (err) {
        console.error('[Get Profile Error]', err);
        return res.status(500).json({ error: 'Failed to fetch student profile' });
    }
});
// 2. Submit or Update Extra Form Details
router.put('/profile', async (req, res) => {
    try {
        const profile = await prisma_1.prisma.studentProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!profile) {
            return res.status(404).json({ error: 'Student profile not found' });
        }
        let parsedFlags = {};
        try {
            parsedFlags = JSON.parse(profile.fieldFlags || '{}');
        }
        catch {
            parsedFlags = {};
        }
        const currentStatus = profile.verificationStatus;
        // Check if fully verified
        if (currentStatus === types_1.VerificationStatus.VERIFIED) {
            return res.status(403).json({
                error: 'Profile has already been verified and approved by the college office. Editing is locked.',
            });
        }
        // Check if under review without flags
        if (currentStatus === types_1.VerificationStatus.SUBMITTED) {
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
        ];
        const dataToUpdate = {};
        if (currentStatus === types_1.VerificationStatus.CORRECTION_REQUIRED) {
            // ONLY allow updating fields that were explicitly flagged by the office (including aliases)
            for (const key of allowedKeys) {
                if (payload[key] === undefined)
                    continue;
                const aliases = ALIAS_MAP[key] || [];
                const isFlagged = [key, ...aliases].some((k) => parsedFlags[k]?.status === 'FLAGGED_ERROR');
                if (isFlagged) {
                    dataToUpdate[key] = payload[key];
                    // Clear this field's flags and all aliases once edited
                    delete parsedFlags[key];
                    for (const a of aliases) {
                        delete parsedFlags[a];
                    }
                }
            }
        }
        else {
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
            nextStatus = types_1.VerificationStatus.SUBMITTED;
        }
        const updatedProfile = await prisma_1.prisma.studentProfile.update({
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
        const photoDoc = updatedProfile.documents.find((d) => d.type === 'PROFILE_PHOTO' || d.type === 'photo');
        return res.json({
            message: 'Profile updated successfully',
            profile: {
                ...updatedProfile,
                photoUrl: photoDoc ? photoDoc.fileUrl : null,
                fieldFlags: parsedFlags,
            },
        });
    }
    catch (err) {
        console.error('[Update Profile Error]', err);
        return res.status(500).json({ error: 'Failed to update student profile' });
    }
});
// 3. Document Upload (PDF / Image)
router.post('/documents', storage_service_1.uploadMiddleware.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const docType = req.body.type;
        if (!docType) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Document type is required' });
        }
        const profile = await prisma_1.prisma.studentProfile.findUnique({
            where: { userId: req.user.userId },
        });
        if (!profile) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Student profile not found' });
        }
        let parsedFlags = {};
        try {
            parsedFlags = JSON.parse(profile.fieldFlags || '{}');
        }
        catch {
            parsedFlags = {};
        }
        // Check status lock
        if (profile.verificationStatus === types_1.VerificationStatus.VERIFIED) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Profile is fully verified. Document upload is locked.' });
        }
        if (profile.verificationStatus === types_1.VerificationStatus.SUBMITTED) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Profile is currently under review. Document upload is locked.' });
        }
        const canonicalType = CANONICAL_DOC_MAP[docType] || docType;
        if (profile.verificationStatus === types_1.VerificationStatus.CORRECTION_REQUIRED) {
            // Check if this document or any of its aliases was flagged
            const aliases = ALIAS_MAP[docType] || ALIAS_MAP[canonicalType] || [];
            const allKeys = [docType, canonicalType, ...aliases];
            const isFlagged = allKeys.some((k) => parsedFlags[k]?.status === 'FLAGGED_ERROR');
            if (!isFlagged) {
                fs_1.default.unlinkSync(req.file.path);
                return res.status(403).json({
                    error: `Document '${docType}' was not flagged for correction and cannot be re-uploaded.`,
                });
            }
            // Remove all matching flag aliases on re-upload
            for (const k of allKeys) {
                delete parsedFlags[k];
            }
        }
        const fileUrl = await (0, storage_service_1.uploadFileToCloud)(req.file.path, req.file.originalname, req.file.mimetype);
        // Upsert the document with canonical type
        const document = await prisma_1.prisma.studentDocument.upsert({
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
        await prisma_1.prisma.studentProfile.update({
            where: { id: profile.id },
            data: {
                fieldFlags: JSON.stringify(parsedFlags),
            },
        });
        return res.status(201).json({
            message: 'Document uploaded successfully',
            document,
        });
    }
    catch (err) {
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        console.error('[Document Upload Error]', err);
        return res.status(500).json({ error: 'Failed to upload document' });
    }
});
exports.default = router;
