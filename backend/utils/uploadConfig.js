import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get upload directory from env or use default
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// Create directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`✅ Created upload directory: ${UPLOAD_DIR}`);
}

// Create subdirectories
const subdirs = ['characters', 'products', 'generated-images', 'videos'];
subdirs.forEach(subdir => {
  const dirPath = path.join(UPLOAD_DIR, subdir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subdir = 'characters';
    
    if (file.fieldname === 'product_image') {
      subdir = 'products';
    } else if (file.fieldname === 'character_image') {
      subdir = 'characters';
    }
    
    cb(null, path.join(UPLOAD_DIR, subdir));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Multer upload instance
export const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 50 * 1024 * 1024,      // 50MB - for large form fields (base64 images)
    fieldNameSize: 200,                // 200 bytes - for field names
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB - for actual files
  },
  fileFilter: fileFilter
});

// Helper to get public URL for file
export function getFileUrl(filePath) {
  if (!filePath) return null;
  
  // If already a URL, return as is
  if (filePath.startsWith('http')) return filePath;
  
  // Convert absolute path to relative URL
  const relativePath = filePath.replace(UPLOAD_DIR, '').replace(/\\/g, '/');
  return `/uploads${relativePath}`;
}

/**
 * Save generated image with proper buffer handling
 * FIX: Prevents file corruption by using binary mode
 */
export async function saveGeneratedImage(imageBuffer, filename) {
  try {
    // Validate buffer
    if (!Buffer.isBuffer(imageBuffer)) {
      throw new Error('Invalid image buffer: not a Buffer instance');
    }
    
    if (imageBuffer.length === 0) {
      throw new Error('Invalid image buffer: empty buffer');
    }
    
    const filepath = path.join(UPLOAD_DIR, 'generated-images', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Write with binary encoding (null = binary mode)
    await fs.promises.writeFile(filepath, imageBuffer, { 
      encoding: null, // ← CRITICAL FIX: null = binary mode
      flag: 'w'
    });
    
    // Verify file was written correctly
    const stats = await fs.promises.stat(filepath);
    if (stats.size === 0) {
      throw new Error('File written but size is 0 bytes');
    }
    
    if (stats.size !== imageBuffer.length) {
      console.warn(`⚠️ Warning: File size (${stats.size}) differs from buffer size (${imageBuffer.length})`);
    }
    
    console.log(`✅ Image saved successfully: ${filename} (${stats.size} bytes)`);
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Save generated image error:', error);
    throw new Error(`Failed to save generated image: ${error.message}`);
  }
}

/**
 * Save video with proper buffer handling
 */
export async function saveVideo(videoBuffer, filename) {
  try {
    // Validate buffer
    if (!Buffer.isBuffer(videoBuffer)) {
      throw new Error('Invalid video buffer: not a Buffer instance');
    }
    
    if (videoBuffer.length === 0) {
      throw new Error('Invalid video buffer: empty buffer');
    }
    
    const filepath = path.join(UPLOAD_DIR, 'videos', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Write with binary encoding
    await fs.promises.writeFile(filepath, videoBuffer, { 
      encoding: null,
      flag: 'w'
    });
    
    // Verify file
    const stats = await fs.promises.stat(filepath);
    
    if (stats.size === 0) {
      throw new Error('File written but size is 0 bytes');
    }
    
    console.log(`✅ Video saved successfully: ${filename} (${stats.size} bytes)`);
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Save video error:', error);
    throw new Error(`Failed to save video: ${error.message}`);
  }
}

export { UPLOAD_DIR };
