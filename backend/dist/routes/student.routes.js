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
    AADHAAR_CARD: ['AADHAAR_DOCUMENT', 'aadhaar'],
    AADHAAR_DOCUMENT: ['AADHAAR_CARD', 'aadhaar'],
    PROFILE_PHOTO: ['photoUrl', 'photo'],
    photoUrl: ['PROFILE_PHOTO'],
    photo: ['PROFILE_PHOTO'],
    fullName: ['firstName', 'lastName'],
    firstName: ['fullName'],
    lastName: ['fullName'],
    nameMalayalam: ['firstNameMalayalam', 'lastNameMalayalam'],
    firstNameMalayalam: ['nameMalayalam'],
    lastNameMalayalam: ['nameMalayalam'],
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
    AADHAAR_CARD: 'AADHAAR_CARD',
    AADHAAR_DOCUMENT: 'AADHAAR_CARD',
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
            'aadhaarNumber',
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
                    // Mark this field's flags and all aliases as RESOLVED once edited by student
                    parsedFlags[key] = {
                        status: 'RESOLVED',
                        reason: parsedFlags[key]?.reason,
                        flaggedAt: parsedFlags[key]?.flaggedAt,
                        resolvedAt: new Date().toISOString(),
                    };
                    for (const a of aliases) {
                        if (parsedFlags[a]) {
                            parsedFlags[a] = {
                                status: 'RESOLVED',
                                reason: parsedFlags[a]?.reason,
                                flaggedAt: parsedFlags[a]?.flaggedAt,
                                resolvedAt: new Date().toISOString(),
                            };
                        }
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
            // 1. Exhaustive field-level validation for final submission
            const merged = { ...profile, ...dataToUpdate };
            const missingFields = [];
            const requiredKeys = [
                { key: 'firstName', label: 'English First Name' },
                { key: 'lastName', label: 'English Last Name' },
                { key: 'firstNameMalayalam', label: 'Malayalam First Name' },
                { key: 'lastNameMalayalam', label: 'Malayalam Last Name' },
                { key: 'dob', label: 'Date of Birth' },
                { key: 'gender', label: 'Gender' },
                { key: 'permanentAddress', label: 'Permanent Address' },
                { key: 'fatherName', label: "Father's Name" },
                { key: 'motherName', label: "Mother's Name" },
                { key: 'prevInstitutionName', label: 'School Last Attended' },
                { key: 'prevCourse', label: 'Stream' },
                { key: 'prevRegisterNumber', label: 'HSE Register Number' },
                { key: 'prevBoardUniversity', label: 'Examination Board' },
                { key: 'prevPeriodOfStudy', label: 'Period of Study' },
                { key: 'prevPercentage', label: 'Percentage' },
                { key: 'courseAdmitted', label: 'Course Admitted' },
                { key: 'quota', label: 'Admission Quota' },
                { key: 'annualIncome', label: 'Annual Income' },
                { key: 'bankAccountName', label: 'Bank Account Holder Name' },
                { key: 'bankName', label: 'Bank Name' },
                { key: 'bankBranch', label: 'Bank Branch' },
                { key: 'bankAccountNumber', label: 'Bank Account Number' },
                { key: 'bankIfscCode', label: 'Bank IFSC Code' },
                { key: 'aadhaarNumber', label: 'Aadhaar Card UID' },
                { key: 'apaarId', label: 'APAAR / ABC ID' },
            ];
            for (const reqItem of requiredKeys) {
                const val = merged[reqItem.key];
                if (val === undefined || val === null || String(val).trim() === '') {
                    missingFields.push(reqItem.label);
                }
            }
            // 2. Exhaustive document validation
            const docs = await prisma_1.prisma.studentDocument.findMany({
                where: { studentProfileId: profile.id },
            });
            const docTypes = new Set(docs.map((d) => d.type));
            const hasDoc = (types) => types.some((t) => docTypes.has(t));
            const missingDocs = [];
            if (!hasDoc(['PROFILE_PHOTO', 'photo']))
                missingDocs.push('Passport Size Photograph');
            if (!hasDoc(['SSLC_CERTIFICATE', 'SSLC_CERT']))
                missingDocs.push('SSLC 10th Book');
            if (!hasDoc(['PLUS_TWO_CERTIFICATE', 'PLUS_TWO_CERT']))
                missingDocs.push('+2 HSE Marksheet');
            if (!hasDoc(['ALLOTMENT_MEMO', 'ALLOTMENT']))
                missingDocs.push('Allotment Memo Slip');
            if (!hasDoc(['AADHAAR_CARD', 'AADHAAR_DOCUMENT', 'aadhaar']))
                missingDocs.push('Aadhaar Card Copy');
            if (!hasDoc(['BANK_PASSBOOK', 'BANK_PASSBOOK_COPY']))
                missingDocs.push('Bank Passbook Copy');
            if (!hasDoc(['APAAR_DOCUMENT', 'APAAR_CARD']))
                missingDocs.push('APAAR / ABC ID Card');
            const quota = String(merged.quota || '').toLowerCase();
            if (quota.includes('community') && !hasDoc(['COMMUNITY_CERTIFICATE', 'COMMUNITY_CERT'])) {
                missingDocs.push('Community Certificate');
            }
            if (merged.isEws && !hasDoc(['INCOME_CERTIFICATE', 'INCOME_CERT'])) {
                missingDocs.push('Income Certificate (for EWS Reservation)');
            }
            if (missingFields.length > 0 || missingDocs.length > 0) {
                return res.status(400).json({
                    error: 'Application submission failed. A student cannot submit the form without filling all fields and uploading all required documents.',
                    missingFields,
                    missingDocuments: missingDocs,
                });
            }
            nextStatus = types_1.VerificationStatus.SUBMITTED;
            if (currentStatus === types_1.VerificationStatus.CORRECTION_REQUIRED || profile.isResubmission) {
                dataToUpdate.isResubmission = true;
            }
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
            // Mark all matching flag aliases as RESOLVED on re-upload
            for (const k of allKeys) {
                if (parsedFlags[k]) {
                    parsedFlags[k] = {
                        status: 'RESOLVED',
                        reason: parsedFlags[k]?.reason,
                        flaggedAt: parsedFlags[k]?.flaggedAt,
                        resolvedAt: new Date().toISOString(),
                    };
                }
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
                ...(profile.verificationStatus === types_1.VerificationStatus.CORRECTION_REQUIRED ? { isResubmission: true } : {}),
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
// 4. Delete / Reset Student Account (Self-Service for Duplicate Entries before Final Verification)
router.delete('/account', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { reason = 'Self-requested account deletion / duplicate entry' } = req.body || {};
        const profile = await prisma_1.prisma.studentProfile.findUnique({
            where: { userId },
            include: { documents: true },
        });
        if (profile && profile.verificationStatus === types_1.VerificationStatus.VERIFIED) {
            return res.status(403).json({
                error: 'Your profile has already been verified and locked by the College Administration. Please contact the admissions office to request changes or withdrawal.',
            });
        }
        // Clean up uploaded files from storage
        if (profile) {
            for (const doc of profile.documents) {
                if (doc.fileUrl)
                    await (0, storage_service_1.deleteFileFromCloud)(doc.fileUrl);
                if (doc.filePath && doc.filePath !== doc.fileUrl)
                    await (0, storage_service_1.deleteFileFromCloud)(doc.filePath);
            }
        }
        // Delete user (cascades to profile & documents)
        await prisma_1.prisma.user.delete({
            where: { id: userId },
        });
        return res.json({
            message: 'Your account and all uploaded data have been deleted successfully. You can now re-register with correct information.',
        });
    }
    catch (err) {
        console.error('[Student Delete Account Error]', err);
        return res.status(500).json({ error: err.message || 'Failed to delete account' });
    }
});
exports.default = router;
