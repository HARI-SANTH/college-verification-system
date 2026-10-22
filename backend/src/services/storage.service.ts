import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsRoot = path.resolve(process.env.STORAGE_DIR || './uploads');

// Ensure root and subfolders exist
const subDirs = ['photos', 'certificates', 'documents'];
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}
subDirs.forEach((dir) => {
  const fullPath = path.join(uploadsRoot, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'documents';
    if (file.mimetype.startsWith('image/')) {
      folder = 'photos';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'certificates';
    }
    cb(null, path.join(uploadsRoot, folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and JPEG/PNG/WebP images are supported.'));
    }
  },
});

export const getPublicFileUrl = (filePath: string): string => {
  const relativePath = path.relative(uploadsRoot, filePath).replace(/\\/g, '/');
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/uploads/${relativePath}`;
};

export const getUploadsRoot = () => uploadsRoot;
