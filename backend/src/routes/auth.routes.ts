import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken } from '../middleware/auth';
import { Role } from '../types';

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
});

const loginSchema = z.object({
  identifier: z.string().min(1), // Email or phone number
  password: z.string().min(1),
});

// Student Sign-Up / Register
router.post('/register', async (req: Request, res: Response) => {
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
        studentProfile: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'Registration successful',
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
    console.error('[Register Error]', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login (Student, Admin, Super Admin)
router.post('/login', async (req: Request, res: Response) => {
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

export default router;
