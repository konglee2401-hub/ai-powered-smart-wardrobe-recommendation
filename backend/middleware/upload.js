import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ==================== DISK STORAGE FOR FILE PATHS ====================

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 50 * 1024 * 1024,      // 50MB - for large form fields (base64 images)
    fieldNameSize: 200,                // 200 bytes - for field names
    fileSize: 50 * 1024 * 1024,        // 50MB limit - increased from 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Export both as default and named export
export default upload;
export { upload };
