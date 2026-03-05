import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const tokenPath = path.join(__dirname, '../config/drive-token.json');

async function findYoutubeFolderID() {
  try {
    // Load token
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

    // Create auth
    const auth = new google.auth.OAuth2(
      process.env.OAUTH_CLIENT_ID,
      process.env.OAUTH_CLIENT_SECRET
    );
    auth.setCredentials(token);

    const drive = google.drive({ version: 'v3', auth });

    // Find Videos folder first
    const videosResult = await drive.files.list({
      q: "name='Videos' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      spaces: 'drive',
      fields: 'files(id, name, parents)',
      pageSize: 10
    });

    if (videosResult.data.files.length === 0) {
      console.log('❌ Videos folder not found');
      return;
    }

    const videosFolder = videosResult.data.files[0];
    console.log(`✅ Found Videos folder: ${videosFolder.id}`);

    // Find Downloaded folder under Videos
    const downloadedResult = await drive.files.list({
      q: `name='Downloaded' and mimeType='application/vnd.google-apps.folder' and '${videosFolder.id}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, parents)',
      pageSize: 10
    });

    if (downloadedResult.data.files.length === 0) {
      console.log('❌ Downloaded folder not found under Videos');
      return;
    }

    const downloadedFolder = downloadedResult.data.files[0];
    console.log(`✅ Found Downloaded folder under Videos: ${downloadedFolder.id}`);

    // Find Youtube folder under Downloaded
    const youtubeResult = await drive.files.list({
      q: `name='Youtube' and mimeType='application/vnd.google-apps.folder' and '${downloadedFolder.id}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, parents)',
      pageSize: 10
    });

    if (youtubeResult.data.files.length === 0) {
      console.log('⚠️  Youtube folder not found under Downloaded');
      console.log('Available subfolders under Downloaded:');
      
      const subfolders = await drive.files.list({
        q: `'${downloadedFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name)',
        pageSize: 20
      });
      
      subfolders.data.files.forEach(folder => {
        console.log(`  - ${folder.name} (${folder.id})`);
      });
      return;
    }

    const youtubeFolder = youtubeResult.data.files[0];
    console.log(`\n✅ Found Youtube folder!`);
    console.log(`   Path: Affiliate AI/Videos/Downloaded/Youtube`);
    console.log(`   ID: ${youtubeFolder.id}`);
    console.log(`\n📝 Add this to drive-folder-structure.json:`);
    console.log(`   "Affiliate AI/Videos/Downloaded/Youtube": "${youtubeFolder.id}"`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findYoutubeFolderID();
