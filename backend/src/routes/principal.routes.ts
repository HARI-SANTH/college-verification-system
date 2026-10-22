import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

// Only SUPER_ADMIN (Principal) can access these endpoints
router.use(authenticateToken, requireRole(Role.SUPER_ADMIN));

// 1. Executive Statistical Dashboard & Analytics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalStudents = await prisma.studentProfile.count();

    const [draftCount, submittedCount, correctionCount, verifiedCount] = await Promise.all([
      prisma.studentProfile.count({ where: { verificationStatus: 'DRAFT' } }),
      prisma.studentProfile.count({ where: { verificationStatus: 'SUBMITTED' } }),
      prisma.studentProfile.count({ where: { verificationStatus: 'CORRECTION_REQUIRED' } }),
      prisma.studentProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
    ]);

    const ewsStudentsCount = await prisma.studentProfile.count({
      where: { isEws: true },
    });

    // Group by course
    const courseStats = await prisma.studentProfile.groupBy({
      by: ['courseAdmitted'],
      _count: { id: true },
    });

    // Group by quota
    const quotaStats = await prisma.studentProfile.groupBy({
      by: ['quota'],
      _count: { id: true },
    });

    // Group by gender
    const genderStats = await prisma.studentProfile.groupBy({
      by: ['gender'],
      _count: { id: true },
    });

    // Group by religion
    const religionStats = await prisma.studentProfile.groupBy({
      by: ['religion'],
      _count: { id: true },
    });

    return res.json({
      totalStudents,
      statusPipeline: {
        draft: draftCount,
        submitted: submittedCount,
        correctionRequired: correctionCount,
        verified: verifiedCount,
      },
      ewsBreakdown: {
        ews: ewsStudentsCount,
        nonEws: totalStudents - ewsStudentsCount,
      },
      byCourse: courseStats.map((c) => ({
        course: c.courseAdmitted || 'Unassigned',
        count: c._count.id,
      })),
      byQuota: quotaStats.map((q) => ({
        quota: q.quota || 'Unassigned',
        count: q._count.id,
      })),
      byGender: genderStats.map((g) => ({
        gender: g.gender || 'Unspecified',
        count: g._count.id,
      })),
      byReligion: religionStats.map((r) => ({
        religion: r.religion || 'Unspecified',
        count: r._count.id,
      })),
    });
  } catch (err) {
    console.error('[Principal Stats Error]', err);
    return res.status(500).json({ error: 'Failed to compute institutional stats' });
  }
});

// 2. Manage Office Staff (List Admins)
router.get('/admins', async (req: Request, res: Response) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            auditLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(admins);
  } catch (err) {
    console.error('[Principal List Admins Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve office staff' });
  }
});

// 3. Create new Office Staff (Admin)
const createAdminSchema = z.object({
  email: z.string().email(),
  phoneNumber: z.string().min(10).max(15),
  password: z.string().min(6),
  role: z.enum([Role.ADMIN, Role.SUPER_ADMIN]).default(Role.ADMIN),
});

router.post('/admins', async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber, password, role } = createAdminSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { phoneNumber }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email or phone already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        phoneNumber,
        passwordHash,
        role,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: 'Staff account created successfully',
      admin: newAdmin,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('[Principal Create Admin Error]', err);
    return res.status(500).json({ error: 'Failed to create staff account' });
  }
});

// 4. Toggle Active Status for Staff
router.patch('/admins/:id/toggle', async (req: Request, res: Response) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: { isActive: !targetUser.isActive },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return res.json({
      message: `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      admin: updated,
    });
  } catch (err) {
    console.error('[Principal Toggle Admin Error]', err);
    return res.status(500).json({ error: 'Failed to update user status' });
  }
});

// 5. System Audit Log Inspection
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const parsedLogs = logs.map((log) => {
      let parsed = null;
      try {
        parsed = JSON.parse(log.details || '{}');
      } catch {}
      return {
        ...log,
        details: parsed,
      };
    });

    return res.json(parsedLogs);
  } catch (err) {
    console.error('[Principal Audit Logs Error]', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
