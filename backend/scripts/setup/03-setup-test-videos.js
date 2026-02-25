/**
 * Setup Test Videos for Queue Scanner Testing
 * Copies sample videos to the appropriate media folders
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_VIDEOS_DIR = path.join(__dirname, 'test-videos');
const MEDIA_DIR = path.join(__dirname, 'media');

const directories = [
  'main-videos',
  'sub-videos',
  'queue',
  'completed',
  'mashups'
];

async function setupTestVideos() {
  console.log('🎦 Setting up test videos...\n');

  // Create directories
  console.log('📁 Creating directories...');
  for (const dir of directories) {
    const dirPath = path.join(MEDIA_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✓ Created: ${dir}/`);
    } else {
      console.log(`   ✓ Already exists: ${dir}/`);
    }
  }

  // Copy test videos
  console.log('\n📹 Copying test videos...');

  try {
    // Copy main video
    const mainVideoPath = path.join(TEST_VIDEOS_DIR, 'main-video.mp4');
    const mainVideoDest = path.join(MEDIA_DIR, 'main-videos', 'sample-main.mp4');
    
    if (fs.existsSync(mainVideoPath)) {
      fs.copyFileSync(mainVideoPath, mainVideoDest);
      const stats = fs.statSync(mainVideoDest);
      console.log(`   ✓ Copied main-video.mp4 (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log(`   ✗ main-video.mp4 not found in test-videos/`);
    }

    // Copy sub video
    const subVideoPath = path.join(TEST_VIDEOS_DIR, 'sub-video.mp4');
    const subVideoDest = path.join(MEDIA_DIR, 'sub-videos', 'sample-sub.mp4');
    
    if (fs.existsSync(subVideoPath)) {
      fs.copyFileSync(subVideoPath, subVideoDest);
      const stats = fs.statSync(subVideoDest);
      console.log(`   ✓ Copied sub-video.mp4 (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log(`   ✗ sub-video.mp4 not found in test-videos/`);
    }

    // Copy to queue for first test
    const queueMainPath = path.join(MEDIA_DIR, 'queue', 'test-queue-video.mp4');
    if (fs.existsSync(mainVideoPath)) {
      fs.copyFileSync(mainVideoPath, queueMainPath);
      console.log(`   ✓ Copied to queue/ for testing`);
    }

  } catch (error) {
    console.error('✗ Error copying videos:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Setup complete!\n');
  console.log('📋 Directory structure:');
  console.log('   /backend/media/');
  console.log('   ├── main-videos/     (source videos for mashup)');
  console.log('   ├── sub-videos/      (overlay videos for mashup)');
  console.log('   ├── queue/           (queue for scanner to process)');
  console.log('   ├── completed/       (finished mashups)');
  console.log('   └── mashups/         (processing cache)\n');

  console.log('✨ Ready to test!\n');
  console.log('Next steps:');
  console.log('1. Start the backend server: npm run dev');
  console.log('2. Open VideoProduction page in frontend');
  console.log('3. Go to "Queue Scanner" tab');
  console.log('4. Click "Trigger Scan Now" to process queue');
  console.log('5. Monitor progress in "Processing" tab\n');
}

setupTestVideos().catch(console.error);
