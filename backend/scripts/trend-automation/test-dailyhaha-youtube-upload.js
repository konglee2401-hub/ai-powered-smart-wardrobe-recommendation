import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  try {
    const { default: trendYoutubeUploadService } = await import('../../services/trendYoutubeUploadService.js');

    const result = await trendYoutubeUploadService.uploadOneDailyhahaVideo({
      titlePrefix: 'DailyHaha Test Upload',
      description: 'Test upload from DailyHaha pipeline',
      privacyStatus: process.env.YOUTUBE_UPLOAD_PRIVACY || 'private'
    });

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Upload test failed:', error.message);

    if (error.code === 'YOUTUBE_TOKEN_MISSING' && error.authUrl) {
      console.error('\nOAuth required. Open this URL, approve, then exchange code:');
      console.error(error.authUrl);
      console.error('\nExchange command example:');
      console.error('node -e "import(\'./services/trendYoutubeUploadService.js\').then(async m => { await m.default.exchangeCodeForToken(\'YOUR_CODE\'); console.log(\'Token saved\'); })"');
    }

    process.exit(1);
  }
}

run();
