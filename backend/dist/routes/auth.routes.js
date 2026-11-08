"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const mail_service_1 = require("../services/mail.service");
const storage_service_1 = require("../services/storage.service");
const router = (0, express_1.Router)();
// Helper to sanitize and parse student profile with parsed fieldFlags object
const formatStudentProfile = (profile) => {
    if (!profile)
        return null;
    let parsedFlags = {};
    try {
        parsedFlags =
            typeof profile.fieldFlags === 'string'
                ? JSON.parse(profile.fieldFlags || '{}')
                : (profile.fieldFlags || {});
    }
    catch {
        parsedFlags = {};
    }
    const photoDoc = profile.documents?.find((d) => d.type === 'PROFILE_PHOTO' || d.type === 'photo');
    return {
        ...profile,
        photoUrl: photoDoc ? photoDoc.fileUrl : profile.photoUrl || null,
        fieldFlags: parsedFlags,
    };
};
const JWT_SECRET = process.env.JWT_SECRET || 'college_super_secret_jwt_key_2026_xyz987';
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    phoneNumber: zod_1.z.string().min(10).max(15),
    password: zod_1.z.string().min(6),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    admissionNumber: zod_1.z.string().min(1), // Roll No / Admission No
    address: zod_1.z.string().min(1),
    bloodGroup: zod_1.z.string().min(1),
    timePeriodOfStudy: zod_1.z.string().min(4), // e.g. "2024-2028"
    photoBase64: zod_1.z.string().optional(),
    photoFileName: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1), // Email or phone number
    password: zod_1.z.string().min(1),
});
// Student Sign-Up / Register
router.post('/register', async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        // Check if email or phone exists
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: validatedData.email.toLowerCase() },
                    { phoneNumber: validatedData.phoneNumber },
                ],
            },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or phone number already exists.' });
        }
        // Check if admission number exists
        const existingProfile = await prisma_1.prisma.studentProfile.findUnique({
            where: { admissionNumber: validatedData.admissionNumber.toUpperCase() },
        });
        if (existingProfile) {
            return res.status(400).json({ error: 'Admission / Roll number is already registered.' });
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(validatedData.password, 10);
        // Transaction to create User and StudentProfile
        const user = await prisma_1.prisma.user.create({
            data: {
                email: validatedData.email.toLowerCase(),
                phoneNumber: validatedData.phoneNumber,
                passwordHash,
                role: types_1.Role.STUDENT,
                studentProfile: {
                    create: {
                        firstName: validatedData.firstName.trim(),
                        lastName: validatedData.lastName.trim(),
                        admissionNumber: validatedData.admissionNumber.toUpperCase().trim(),
                        address: validatedData.address.trim(),
                        bloodGroup: validatedData.bloodGroup.trim(),
                        timePeriodOfStudy: validatedData.timePeriodOfStudy.trim(),
                    },
                },
            },
            include: {
                studentProfile: {
                    include: {
                        documents: true,
                    },
                },
            },
        });
        // Save passport photo if uploaded during registration
        let createdPhotoDoc = null;
        if (validatedData.photoBase64 && user.studentProfile) {
            try {
                const buffer = Buffer.from(validatedData.photoBase64, 'base64');
                const originalName = validatedData.photoFileName || `profile_photo_${user.studentProfile.admissionNumber}.jpg`;
                const ext = path_1.default.extname(originalName) || '.jpg';
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const photosDir = path_1.default.join((0, storage_service_1.getUploadsRoot)(), 'photos');
                if (!fs_1.default.existsSync(photosDir)) {
                    fs_1.default.mkdirSync(photosDir, { recursive: true });
                }
                const tempPath = path_1.default.join(photosDir, `photo-${uniqueSuffix}${ext}`);
                fs_1.default.writeFileSync(tempPath, buffer);
                const fileUrl = await (0, storage_service_1.uploadFileToCloud)(tempPath, originalName, 'image/jpeg');
                createdPhotoDoc = await prisma_1.prisma.studentDocument.create({
                    data: {
                        studentProfileId: user.studentProfile.id,
                        type: 'PROFILE_PHOTO',
                        fileName: originalName,
                        filePath: tempPath,
                        fileUrl,
                        fileMimeType: 'image/jpeg',
                        fileSize: buffer.length,
                        status: 'VALID',
                    },
                });
            }
            catch (photoErr) {
                console.warn('[Register Photo Upload Warning]', photoErr);
            }
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        const studentProfile = user.studentProfile;
        const fullProfile = studentProfile
            ? {
                ...studentProfile,
                documents: createdPhotoDoc
                    ? [...(studentProfile.documents || []), createdPhotoDoc]
                    : (studentProfile.documents || []),
            }
            : null;
        return res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                studentProfile: formatStudentProfile(fullProfile),
            },
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: err.errors });
        }
        console.error('[Register Error]', err);
        return res.status(500).json({ error: 'Internal server error during registration' });
    }
});
// Login (Student, Admin, Super Admin)
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = loginSchema.parse(req.body);
        const trimmedId = identifier.trim();
        // Check by email or phone number
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: trimmedId.toLowerCase() },
                    { phoneNumber: trimmedId },
                ],
            },
            include: {
                studentProfile: {
                    include: {
                        documents: true,
                    },
                },
            },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                studentProfile: formatStudentProfile(user.studentProfile),
            },
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: err.errors });
        }
        console.error('[Login Error]', err);
        return res.status(500).json({ error: 'Internal server error during login' });
    }
});
// Get current user profile
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            include: {
                studentProfile: {
                    include: {
                        documents: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            studentProfile: formatStudentProfile(user.studentProfile),
        });
    }
    catch (err) {
        console.error('[Me Error]', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Forgot / Reset Password Schemas & OTP Store
const forgotPasswordSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1, 'Email, phone, or roll number is required'),
});
const resetPasswordSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1, 'Email, phone, or roll number is required'),
    otp: zod_1.z.string().min(4, 'Valid OTP is required'),
    newPassword: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
// In-memory OTP store: key -> { otp, expiresAt, email }
const resetOtpStore = new Map();
const maskEmail = (email) => {
    const [name, domain] = email.split('@');
    if (!name || !domain)
        return email;
    const visible = name.length > 2 ? name.slice(0, 2) : name[0];
    return `${visible}***@${domain}`;
};
// 4. Request Password Reset OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { identifier } = forgotPasswordSchema.parse(req.body);
        const trimmed = identifier.trim();
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: trimmed.toLowerCase() },
                    { phoneNumber: trimmed },
                    { studentProfile: { admissionNumber: trimmed.toUpperCase() } },
                ],
            },
            include: {
                studentProfile: true,
            },
        });
        if (!user || !user.isActive) {
            return res.status(404).json({
                error: 'No active student account found for this email, phone, or roll number.',
            });
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        const payload = { otp, expiresAt, email: user.email };
        resetOtpStore.set(user.id, payload);
        resetOtpStore.set(user.email.toLowerCase(), payload);
        if (user.phoneNumber) {
            resetOtpStore.set(user.phoneNumber, payload);
        }
        if (user.studentProfile?.admissionNumber) {
            resetOtpStore.set(user.studentProfile.admissionNumber.toUpperCase(), payload);
        }
        const studentName = user.studentProfile?.firstName || 'Student';
        // Dispatch email notification asynchronously so mobile app transitions immediately without timeout
        mail_service_1.mailService
            .sendPasswordResetOtp({
            studentEmail: user.email,
            studentName,
            otp,
        })
            .then((ok) => {
            console.log(`[Forgot Password] OTP email dispatch result for ${user.email}: ${ok}`);
        })
            .catch((err) => {
            console.error(`[Forgot Password] Background OTP Mail Error for ${user.email}:`, err);
        });
        return res.json({
            message: `A 6-digit OTP has been sent to ${maskEmail(user.email)}`,
            email: maskEmail(user.email),
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: err.errors });
        }
        console.error('[Forgot Password Error]', err);
        return res.status(500).json({ error: 'Failed to process password reset request' });
    }
});
// 5. Verify OTP & Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { identifier, otp, newPassword } = resetPasswordSchema.parse(req.body);
        const trimmed = identifier.trim();
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: trimmed.toLowerCase() },
                    { phoneNumber: trimmed },
                    { studentProfile: { admissionNumber: trimmed.toUpperCase() } },
                ],
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'Account not found.' });
        }
        const stored = resetOtpStore.get(user.id) ||
            resetOtpStore.get(trimmed.toLowerCase()) ||
            resetOtpStore.get(trimmed) ||
            resetOtpStore.get(trimmed.toUpperCase());
        if (!stored) {
            return res.status(400).json({ error: 'No OTP requested or OTP has expired. Please request a new code.' });
        }
        if (Date.now() > stored.expiresAt) {
            resetOtpStore.delete(user.id);
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }
        if (stored.otp !== otp.trim()) {
            return res.status(400).json({ error: 'Invalid OTP code. Please check and try again.' });
        }
        // Hash new password and update
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });
        // Invalidate OTP
        resetOtpStore.delete(user.id);
        resetOtpStore.delete(user.email.toLowerCase());
        if (user.phoneNumber)
            resetOtpStore.delete(user.phoneNumber);
        return res.json({
            message: 'Password reset successful! You may now sign in with your new password.',
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: err.errors });
        }
        console.error('[Reset Password Error]', err);
        return res.status(500).json({ error: 'Failed to reset password' });
    }
});
exports.default = router;
