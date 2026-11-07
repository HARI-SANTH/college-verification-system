"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Only SUPER_ADMIN (Principal) can access these endpoints
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)(types_1.Role.SUPER_ADMIN));
// 1. Executive Statistical Dashboard & Analytics
router.get('/stats', async (req, res) => {
    try {
        const totalStudents = await prisma_1.prisma.studentProfile.count();
        const [draftCount, submittedCount, correctionCount, verifiedCount] = await Promise.all([
            prisma_1.prisma.studentProfile.count({ where: { verificationStatus: 'DRAFT' } }),
            prisma_1.prisma.studentProfile.count({ where: { verificationStatus: 'SUBMITTED' } }),
            prisma_1.prisma.studentProfile.count({ where: { verificationStatus: 'CORRECTION_REQUIRED' } }),
            prisma_1.prisma.studentProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
        ]);
        const ewsStudentsCount = await prisma_1.prisma.studentProfile.count({
            where: { isEws: true },
        });
        // Group by course
        const courseStats = await prisma_1.prisma.studentProfile.groupBy({
            by: ['courseAdmitted'],
            _count: { id: true },
        });
        // Group by quota
        const quotaStats = await prisma_1.prisma.studentProfile.groupBy({
            by: ['quota'],
            _count: { id: true },
        });
        // Group by gender
        const genderStats = await prisma_1.prisma.studentProfile.groupBy({
            by: ['gender'],
            _count: { id: true },
        });
        // Group by religion
        const religionStats = await prisma_1.prisma.studentProfile.groupBy({
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
    }
    catch (err) {
        console.error('[Principal Stats Error]', err);
        return res.status(500).json({ error: 'Failed to compute institutional stats' });
    }
});
// 2. Manage Office Staff (List Admins)
router.get('/admins', async (req, res) => {
    try {
        const admins = await prisma_1.prisma.user.findMany({
            where: { role: { in: [types_1.Role.ADMIN, types_1.Role.SUPER_ADMIN] } },
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
    }
    catch (err) {
        console.error('[Principal List Admins Error]', err);
        return res.status(500).json({ error: 'Failed to retrieve office staff' });
    }
});
// 3. Create new Office Staff (Admin)
const createAdminSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    phoneNumber: zod_1.z.string().min(10).max(15),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum([types_1.Role.ADMIN, types_1.Role.SUPER_ADMIN]).default(types_1.Role.ADMIN),
});
router.post('/admins', async (req, res) => {
    try {
        const { email, phoneNumber, password, role } = createAdminSchema.parse(req.body);
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [{ email: email.toLowerCase() }, { phoneNumber }],
            },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'A user with this email or phone already exists.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const newAdmin = await prisma_1.prisma.user.create({
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
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: err.errors });
        }
        console.error('[Principal Create Admin Error]', err);
        return res.status(500).json({ error: 'Failed to create staff account' });
    }
});
// 4. Toggle Active Status for Staff
router.patch('/admins/:id/toggle', async (req, res) => {
    try {
        const targetUser = await prisma_1.prisma.user.findUnique({
            where: { id: req.params.id },
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (targetUser.id === req.user.userId) {
            return res.status(400).json({ error: 'You cannot deactivate your own account.' });
        }
        const updated = await prisma_1.prisma.user.update({
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
    }
    catch (err) {
        console.error('[Principal Toggle Admin Error]', err);
        return res.status(500).json({ error: 'Failed to update user status' });
    }
});
// 5. System Audit Log Inspection
router.get('/audit-logs', async (req, res) => {
    try {
        const logs = await prisma_1.prisma.auditLog.findMany({
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
            }
            catch { }
            return {
                ...log,
                details: parsed,
            };
        });
        return res.json(parsedLogs);
    }
    catch (err) {
        console.error('[Principal Audit Logs Error]', err);
        return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
exports.default = router;
