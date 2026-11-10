"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const principal_routes_1 = __importDefault(require("./routes/principal.routes"));
const storage_service_1 = require("./services/storage.service");
const rate_limiter_1 = require("./middleware/rate-limiter");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Security hardening: disable x-powered-by to prevent technology fingerprinting
app.disable('x-powered-by');
// Security HTTP Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Allow iframes from SAMEORIGIN for the admin workbench side-by-side previewer
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
// OWASP Hardening: Block path traversal and hidden dotfiles access (.env, .git, ../, etc.)
app.use((req, res, next) => {
    try {
        const decodedPath = decodeURIComponent(req.path);
        if (decodedPath.startsWith('/.') ||
            decodedPath.includes('/.') ||
            decodedPath.includes('..') ||
            decodedPath.toLowerCase().includes('.env') ||
            decodedPath.toLowerCase().includes('.git')) {
            return res.status(403).json({ error: 'Forbidden: Path traversal or hidden file access denied' });
        }
    }
    catch (_) {
        return res.status(400).json({ error: 'Malformed request path' });
    }
    next();
});
// Middleware
app.use((0, cors_1.default)({
    origin: '*', // Allows Web and Mobile clients
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '25mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '25mb' }));
// Apply general API rate limiter to protect backend against floods/DDoS
app.use('/api', rate_limiter_1.generalApiLimiter);
// Serve uploaded documents statically (PDFs & Photos) safely (no directory listing, dotfiles ignored)
const uploadsDirectory = (0, storage_service_1.getUploadsRoot)();
app.use('/uploads', express_1.default.static(uploadsDirectory, { dotfiles: 'ignore', index: false }));
// Root & Health check endpoints
app.get('/api', (req, res) => {
    res.json({
        status: 'online',
        service: 'College Student Verification Backend API',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            student: '/api/student',
            admin: '/api/admin',
        },
        cloud: 'Supabase PostgreSQL + Supabase Cloud Storage',
    });
});
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'College Student Verification Backend API',
    });
});
// Mount Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/student', student_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/principal', principal_routes_1.default);
// Serve frontend static build in cloud / production mode
const candidatePaths = [
    path_1.default.resolve(process.cwd(), 'public'),
    path_1.default.resolve(process.cwd(), 'backend/public'),
    path_1.default.resolve(__dirname, '../public'),
    path_1.default.resolve(__dirname, '../../public'),
    path_1.default.resolve(__dirname, '../../web/dist'),
    path_1.default.resolve(process.cwd(), 'web/dist'),
];
let resolvedStaticPath = null;
for (const p of candidatePaths) {
    if (fs_1.default.existsSync(p) && fs_1.default.existsSync(path_1.default.join(p, 'index.html'))) {
        resolvedStaticPath = p;
        break;
    }
}
if (resolvedStaticPath) {
    console.log(`[Frontend] Serving static admin web app from: ${resolvedStaticPath}`);
    app.use(express_1.default.static(resolvedStaticPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path_1.default.join(resolvedStaticPath, 'index.html'));
    });
}
else {
    console.warn('[Frontend] No static web bundle found in candidate paths.');
}
// Global Error Handler
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large' || err.status === 413) {
        return res.status(413).json({
            error: 'File or photo size exceeds the allowed limit. Please select an image under 10 MB.',
        });
    }
    console.error('[Unhandled Server Error]', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Process Unhandled Rejection]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[Process Uncaught Exception]', err);
});
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` College Verification API Server is running`);
    console.log(` Local URL: http://localhost:${PORT}`);
    console.log(` Static Uploads: ${uploadsDirectory}`);
    console.log(`====================================================`);
});
exports.default = app;
