import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = file.mimetype.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) || req.body?.type === 'PROFILE_PHOTO';
    const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';
    if (isImage) {
      folder = 'photos';
    } else if (isPdf) {
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
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and JPEG/PNG/WebP images are supported.'));
    }
  },
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'student-documents';

let supabaseClient: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey);
}

export const uploadFileToCloud = async (filePath: string, originalName: string, mimeType: string): Promise<string> => {
  if (supabaseClient) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(originalName) || path.extname(filePath);
      const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const folder = mimeType.startsWith('image/') ? 'photos' : 'certificates';
      const storagePath = `${folder}/${uniqueFileName}`;

      const { data, error } = await supabaseClient.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data) {
        const { data: publicData } = supabaseClient.storage
          .from(bucketName)
          .getPublicUrl(storagePath);
        return publicData.publicUrl;
      } else if (error) {
        console.warn('[Supabase Storage Upload Warning]', error.message);
      }
    } catch (err: any) {
      console.warn('[Supabase Storage Upload Error]', err.message);
    }
  }

  // Fallback to URL
  const relativePath = path.relative(uploadsRoot, filePath).replace(/\\/g, '/');
  const baseUrl = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || 'https://college-verification-system.onrender.com';
  return `${baseUrl}/uploads/${relativePath}`;
};

export const getPublicFileUrl = (filePath: string): string => {
  const relativePath = path.relative(uploadsRoot, filePath).replace(/\\/g, '/');
  const baseUrl = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || 'https://college-verification-system.onrender.com';
  return `${baseUrl}/uploads/${relativePath}`;
};

export const getUploadsRoot = () => uploadsRoot;
