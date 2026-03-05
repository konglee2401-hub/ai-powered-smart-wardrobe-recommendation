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
      try {
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > MAX_AGE) {
          // Handle both files and directories
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
          cleanedCount++;
          console.log(`🗑️  Cleaned up old temp file: ${file}`);
        }
      } catch (error) {
        // Skip files/folders that can't be deleted (in use, permission denied, etc.)
        console.debug(`⚠️  Could not delete ${file}: ${error.message}`);
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