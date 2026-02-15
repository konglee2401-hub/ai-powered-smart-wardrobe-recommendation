import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '../temp');
const MAX_AGE = 60 * 60 * 1000; // 1 hour

function cleanupOldFiles() {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      return;
    }

    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    let cleanedCount = 0;

    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > MAX_AGE) {
        fs.unlinkSync(filePath);
        cleanedCount++;
        console.log(`🗑️  Cleaned up old temp file: ${file}`);
      }
    });

    if (cleanedCount > 0) {
      console.log(`✅ Cleanup complete: ${cleanedCount} file(s) removed`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldFiles, 30 * 60 * 1000);

// Run cleanup on startup
cleanupOldFiles();

export { cleanupOldFiles };