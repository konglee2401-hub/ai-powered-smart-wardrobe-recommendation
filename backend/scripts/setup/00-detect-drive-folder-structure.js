/**
 * Detect and Cache Existing Google Drive Folder Structure
 * Reads the existing "Affiliate AI" folder and its subfolders
 * Saves folder IDs to config/drive-folder-structure.json
 * 
 * Run: node scripts/detectDriveFolderStructure.js
 */

import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder
dotenv.config({ path: path.join(__dirname, '../.env') });

const CONFIG_FILE = path.join(__dirname, '../config/drive-folder-structure.json');

/**
 * Authenticate with Google Drive using environment credentials
 */
async function authenticate() {
  try {
    const clientId = process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;
    const tokenPath = path.join(__dirname, '../config/drive-token.json');

    if (!clientId || !clientSecret) {
      throw new Error('Missing OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET in .env');
    }

    // Read stored token
    let token;
    if (fs.existsSync(tokenPath)) {
      const tokenData = fs.readFileSync(tokenPath, 'utf-8');
      token = JSON.parse(tokenData);
    } else {
      throw new Error(`Token file not found: ${tokenPath}. Run setup-drive-auth.js first.`);
    }

    const auth = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:5000/api/drive/auth-callback'
    );

    auth.setCredentials(token);

    // Check if token needs refresh
    if (token.expiry_date && new Date() >= new Date(token.expiry_date)) {
      console.log('🔄 Token expired, refreshing...');
      const refreshed = await auth.refreshAccessToken();
      token = refreshed.credentials;
      fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));
      auth.setCredentials(token);
    }

    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}

/**
 * Find folder by name in parent directory
 */
async function findFolder(drive, name, parentId = 'root') {
  try {
    const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const parentQuery = parentId === 'root' 
      ? ` and '${parentId}' in parents`
      : ` and parents='${parentId}'`;

    const response = await drive.files.list({
      q: query + parentQuery,
      spaces: 'drive',
      fields: 'files(id, name, parents)',
      pageSize: 10,
    });

    return response.data.files?.[0] || null;
  } catch (error) {
    console.error(`❌ Error finding folder "${name}":`, error.message);
    return null;
  }
}

/**
 * Recursively scan folder structure
 */
async function scanFolderStructure(drive, folderName, parentId = 'root', depth = 0) {
  const indent = '  '.repeat(depth);

  const folder = await findFolder(drive, folderName, parentId);
  
  if (!folder) {
    console.log(`${indent}❌ Folder not found: ${folderName}`);
    return null;
  }

  console.log(`${indent}✅ Found: ${folderName} (${folder.id})`);

  const structure = {
    name: folderName,
    id: folder.id,
    children: [],
  };

  // List subfolders
  try {
    const query = `mimeType='application/vnd.google-apps.folder' and parents='${folder.id}' and trashed=false`;
    const response = await drive.files.list({
      q: query,
      spaces: 'drive',
      fields: 'files(id, name, parents, createdTime)',
      pageSize: 50,
    });

    const subfolders = response.data.files || [];
    console.log(`${indent}   📁 Found ${subfolders.length} subfolders`);

    for (const subfolder of subfolders) {
      const childStructure = await scanFolderStructure(
        drive,
        subfolder.name,
        folder.id,
        depth + 1
      );
      
      if (childStructure) {
        structure.children.push(childStructure);
      }
    }
  } catch (error) {
    console.error(`${indent}❌ Error listing subfolders:`, error.message);
  }

  return structure;
}

/**
 * Convert nested structure to flat map with paths
 */
function flattenStructure(node, parentPath = '', result = {}) {
  const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  
  result[currentPath] = node.id;

  for (const child of node.children || []) {
    flattenStructure(child, currentPath, result);
  }

  return result;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔍 Detecting Google Drive Folder Structure...\n');
  console.log('==================================\n');

  const drive = await authenticate();

  // Find the root "Affiliate AI" folder
  const rootFolderName = 'Affiliate AI';
  console.log(`🔎 Looking for root folder: "${rootFolderName}"\n`);

  const structure = await scanFolderStructure(drive, rootFolderName);

  if (!structure) {
    console.error(`\n❌ Could not find "${rootFolderName}" folder in Google Drive`);
    console.error('Please create it first or provide the correct folder name.\n');
    process.exit(1);
  }

  // Convert to flat structure with paths
  const flatStructure = flattenStructure(structure);

  // Prepare config
  const config = {
    timestamp: new Date().toISOString(),
    rootFolder: rootFolderName,
    rootFolderId: structure.id,
    description: 'Folder structure for Smart Wardrobe app',
    folders: flatStructure,
    tree: structure,
  };

  // Save to config file
  const configDirPath = path.join(__dirname, '../config');
  if (!fs.existsSync(configDirPath)) {
    fs.mkdirSync(configDirPath, { recursive: true });
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log(`\n==================================`);
  console.log(`\n✅ Folder structure saved to:`, CONFIG_FILE);
  console.log(`\n📊 Summary:`);
  console.log(`   Root: ${rootFolderName} (${structure.id})`);
  console.log(`   Total folders: ${Object.keys(flatStructure).length}`);
  
  console.log(`\n📁 Folder Map:`);
  Object.entries(flatStructure)
    .sort()
    .forEach(([path, id]) => {
      const level = (path.match(/\//g) || []).length;
      const indent = '  '.repeat(level);
      const name = path.split('/').pop();
      console.log(`${indent}📂 ${name} (${id})`);
    });

  console.log(`\n✅ Configuration complete! You can now use these folders without auto-creation.\n`);
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
