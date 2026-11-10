"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadsRoot = exports.deleteFileFromCloud = exports.getPublicFileUrl = exports.uploadFileToCloud = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const supabase_js_1 = require("@supabase/supabase-js");
const uploadsRoot = path_1.default.resolve(process.env.STORAGE_DIR || './uploads');
// Ensure root and subfolders exist
const subDirs = ['photos', 'certificates', 'documents'];
if (!fs_1.default.existsSync(uploadsRoot)) {
    fs_1.default.mkdirSync(uploadsRoot, { recursive: true });
}
subDirs.forEach((dir) => {
    const fullPath = path_1.default.join(uploadsRoot, dir);
    if (!fs_1.default.existsSync(fullPath)) {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
    }
});
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'documents';
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const isImage = file.mimetype.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) || req.body?.type === 'PROFILE_PHOTO';
        const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';
        if (isImage) {
            folder = 'photos';
        }
        else if (isPdf) {
            folder = 'certificates';
        }
        cb(null, path_1.default.join(uploadsRoot, folder));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB maximum
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF and JPEG/PNG/WebP images are supported.'));
        }
    },
});
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'student-documents';
let supabaseClient = null;
if (supabaseUrl && supabaseKey) {
    supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
}
const uploadFileToCloud = async (filePath, originalName, mimeType) => {
    const ext = (path_1.default.extname(originalName) || path_1.default.extname(filePath)).toLowerCase();
    let resolvedMime = mimeType;
    if (!resolvedMime || resolvedMime === 'application/octet-stream') {
        if (ext === '.pdf')
            resolvedMime = 'application/pdf';
        else if (['.jpg', '.jpeg'].includes(ext))
            resolvedMime = 'image/jpeg';
        else if (ext === '.png')
            resolvedMime = 'image/png';
        else if (ext === '.webp')
            resolvedMime = 'image/webp';
    }
    if (supabaseClient) {
        try {
            const fileBuffer = fs_1.default.readFileSync(filePath);
            const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            const folder = resolvedMime.startsWith('image/') ? 'photos' : 'certificates';
            const storagePath = `${folder}/${uniqueFileName}`;
            const { data, error } = await supabaseClient.storage
                .from(bucketName)
                .upload(storagePath, fileBuffer, {
                contentType: resolvedMime,
                upsert: true,
            });
            if (!error && data) {
                const { data: publicData } = supabaseClient.storage
                    .from(bucketName)
                    .getPublicUrl(storagePath);
                return publicData.publicUrl;
            }
            else if (error) {
                console.warn('[Supabase Storage Upload Warning]', error.message);
            }
        }
        catch (err) {
            console.warn('[Supabase Storage Upload Error]', err.message);
        }
    }
    // Fallback to URL
    const relativePath = path_1.default.relative(uploadsRoot, filePath).replace(/\\/g, '/');
    const baseUrl = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || 'https://college-verification-system.onrender.com';
    return `${baseUrl}/uploads/${relativePath}`;
};
exports.uploadFileToCloud = uploadFileToCloud;
const getPublicFileUrl = (filePath) => {
    const relativePath = path_1.default.relative(uploadsRoot, filePath).replace(/\\/g, '/');
    const baseUrl = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || 'https://college-verification-system.onrender.com';
    return `${baseUrl}/uploads/${relativePath}`;
};
exports.getPublicFileUrl = getPublicFileUrl;
const deleteFileFromCloud = async (fileUrlOrPath) => {
    if (!fileUrlOrPath)
        return;
    // 1. If it's a Supabase storage public URL
    if (supabaseClient && fileUrlOrPath.includes('/storage/v1/object/public/')) {
        try {
            const parts = fileUrlOrPath.split(`/storage/v1/object/public/${bucketName}/`);
            if (parts.length > 1) {
                const storagePath = parts[1];
                await supabaseClient.storage.from(bucketName).remove([storagePath]);
            }
        }
        catch (err) {
            console.warn('[Supabase Storage Delete Warning]', err.message);
        }
    }
    // 2. If it's a local file path or relative upload
    try {
        let localPath = fileUrlOrPath;
        if (fileUrlOrPath.includes('/uploads/')) {
            const rel = fileUrlOrPath.split('/uploads/')[1];
            localPath = path_1.default.join(uploadsRoot, rel);
        }
        if (fs_1.default.existsSync(localPath)) {
            fs_1.default.unlinkSync(localPath);
        }
    }
    catch (err) {
        // Ignore local file delete errors
    }
};
exports.deleteFileFromCloud = deleteFileFromCloud;
const getUploadsRoot = () => uploadsRoot;
exports.getUploadsRoot = getUploadsRoot;
