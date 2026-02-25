import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import AIProvider from './models/AIProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function debugProvider() {
  try {
    await connectDB();
    
    const google = await AIProvider.findOne({ providerId: 'google' });
    console.log('\n🔍 Google Provider:');
    console.log(JSON.stringify(google, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugProvider();
