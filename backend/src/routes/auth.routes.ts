import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';
import { Role } from '../types';
import { mailService } from '../services/mail.service';
import { uploadFileToCloud, getUploadsRoot } from '../services/storage.service';
import { authLimiter, passwordResetLimiter } from '../middleware/rate-limiter';

const router = Router();

// Helper to sanitize and parse student profile with parsed fieldFlags object
const formatStudentProfile = (profile: any) => {
  if (!profile) return null;
  let parsedFlags = {};
  try {
    parsedFlags =
      typeof profile.fieldFlags === 'string'
        ? JSON.parse(profile.fieldFlags || '{}')
        : (profile.fieldFlags || {});
  } catch {
    parsedFlags = {};
  }
  const photoDoc = profile.documents?.find(
    (d: any) => d.type === 'PROFILE_PHOTO' || d.type === 'photo'
  );
  return {
    ...profile,
    photoUrl: photoDoc ? photoDoc.fileUrl : profile.photoUrl || null,
    fieldFlags: parsedFlags,
  };
};
const JWT_SECRET = process.env.JWT_SECRET || 'college_super_secret_jwt_key_2026_xyz987';

const registerSchema = z.object({
  email: z.string().email(),
  phoneNumber: z.string().min(10).max(15),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  admissionNumber: z.string().min(1), // Roll No / Admission No
  address: z.string().min(1),
  bloodGroup: z.string().min(1),
  timePeriodOfStudy: z.string().min(4), // e.g. "2024-2028"
  photoBase64: z.string().optional(),
  photoFileName: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1), // Email or phone number
  password: z.string().min(1),
});

// Student Sign-Up / Register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if email or phone exists
    const existingUser = await prisma.user.findFirst({
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
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { admissionNumber: validatedData.admissionNumber.toUpperCase() },
    });

    if (existingProfile) {
      return res.status(400).json({ error: 'Admission / Roll number is already registered.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Transaction to create User and StudentProfile
    const user = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        phoneNumber: validatedData.phoneNumber,
        passwordHash,
        role: Role.STUDENT,
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
    let createdPhotoDoc: any = null;
    if (validatedData.photoBase64 && user.studentProfile) {
      try {
        const buffer = Buffer.from(validatedData.photoBase64, 'base64');
        const originalName = validatedData.photoFileName || `profile_photo_${user.studentProfile.admissionNumber}.jpg`;
        const ext = path.extname(originalName) || '.jpg';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const photosDir = path.join(getUploadsRoot(), 'photos');
        if (!fs.existsSync(photosDir)) {
          fs.mkdirSync(photosDir, { recursive: true });
        }
        const tempPath = path.join(photosDir, `photo-${uniqueSuffix}${ext}`);
        fs.writeFileSync(tempPath, buffer);
        const fileUrl = await uploadFileToCloud(tempPath, originalName, 'image/jpeg');

        createdPhotoDoc = await prisma.studentDocument.create({
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
      } catch (photoErr) {
        console.warn('[Register Photo Upload Warning]', photoErr);
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const studentProfile = user.studentProfile as any;
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('[Register Error]', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login (Student, Admin, Super Admin)
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);
    const trimmedId = identifier.trim();

    // Check by email or phone number
    const user = await prisma.user.findFirst({
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

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('[Login Error]', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
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
  } catch (err) {
    console.error('[Me Error]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot / Reset Password Schemas & OTP Store
const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email, phone, or roll number is required'),
});

const resetPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email, phone, or roll number is required'),
  otp: z.string().min(4, 'Valid OTP is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// In-memory OTP store: key -> { otp, expiresAt, email }
const resetOtpStore = new Map<string, { otp: string; expiresAt: number; email: string }>();

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = name.length > 2 ? name.slice(0, 2) : name[0];
  return `${visible}***@${domain}`;
};

// 4. Request Password Reset OTP
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier } = forgotPasswordSchema.parse(req.body);
    const trimmed = identifier.trim();

    const user = await prisma.user.findFirst({
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
    mailService
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('[Forgot Password Error]', err);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// 5. Verify OTP & Reset Password
router.post('/reset-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier, otp, newPassword } = resetPasswordSchema.parse(req.body);
    const trimmed = identifier.trim();

    const user = await prisma.user.findFirst({
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

    const stored =
      resetOtpStore.get(user.id) ||
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
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate OTP
    resetOtpStore.delete(user.id);
    resetOtpStore.delete(user.email.toLowerCase());
    if (user.phoneNumber) resetOtpStore.delete(user.phoneNumber);

    return res.json({
      message: 'Password reset successful! You may now sign in with your new password.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('[Reset Password Error]', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
