#!/usr/bin/env node

/**
 * 🔍 Auto-Detect Scraper Sources & Create Google Drive Folders
 * 
 * This script:
 * 1. Reads scraper_service/app/automation.py to find all source scrapers
 * 2. Creates Google Drive folders for each source under Videos/Downloaded/
 * 3. Stores folder IDs in drive-folder-structure.json
 * 4. Updates googleDriveOAuth.js with new folder mappings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment
dotenv.config({ path: path.join(__dirname, '../.env') });

const tokenPath = path.join(__dirname, '../config/drive-token.json');
const folderStructurePath = path.join(__dirname, '../config/drive-folder-structure.json');

// Source detection patterns
const SOURCE_PATTERNS = [
  { name: 'playboard', pattern: /discover_playboard/gi, alias: 'playboard' },
  { name: 'youtube', pattern: /discover_youtube/gi, alias: 'youtube' },
  { name: 'dailyhaha', pattern: /discover_dailyhaha/gi, alias: 'dailyhaha' },
  { name: 'douyin', pattern: /discover_douyin/gi, alias: 'douyin' },
];

// ============================================================================
// 1. DISCOVER SOURCES FROM AUTOMATION.PY
// ============================================================================

function discoverSources() {
  console.log('\n🔍 Step 1: Detecting scraper sources...\n');

  const automationPath = path.join(__dirname, '../../scraper_service/app/automation.py');
  
  if (!fs.existsSync(automationPath)) {
    console.log('⚠️  automation.py not found. Using default sources.');
    return SOURCE_PATTERNS.map(s => s.alias);
  }

  const automationCode = fs.readFileSync(automationPath, 'utf8');
  const detectedSources = [];

  SOURCE_PATTERNS.forEach(source => {
    if (source.pattern.test(automationCode)) {
      console.log(`✅ Found source: ${source.name.toUpperCase()}`);
      detectedSources.push(source.alias);
    }
  });

  console.log(`\n📊 Total sources detected: ${detectedSources.length}`);
  return detectedSources;
}

// ============================================================================
// 2. CREATE FOLDERS ON GOOGLE DRIVE
// ============================================================================

async function createSourceFolders(sources) {
  console.log('\n📁 Step 2: Creating/verifying folders on Google Drive...\n');

  try {
    // Load token
    if (!fs.existsSync(tokenPath)) {
      console.error('❌ Token file not found. Please authenticate first.');
      process.exit(1);
    }

    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

    // Create auth
    const auth = new google.auth.OAuth2(
      process.env.OAUTH_CLIENT_ID,
      process.env.OAUTH_CLIENT_SECRET
    );
    auth.setCredentials(token);

    const drive = google.drive({ version: 'v3', auth });

    // Load existing folder structure
    const folderStructure = JSON.parse(fs.readFileSync(folderStructurePath, 'utf8'));
    const downloadedFolderId = folderStructure.folders['Affiliate AI/Videos/Downloaded'];

    if (!downloadedFolderId) {
      console.error('❌ Videos/Downloaded folder not found in config');
      process.exit(1);
    }

    const folderMappings = {};

    // Check/create each source folder
    for (const source of sources) {
      const folderName = source.charAt(0).toUpperCase() + source.slice(1);
      
      // Check if folder already exists
      const existingResult = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${downloadedFolderId}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name)',
        pageSize: 1
      });

      if (existingResult.data.files.length > 0) {
        const folderId = existingResult.data.files[0].id;
        console.log(`✅ ${folderName.padEnd(15)} (existing)  ${folderId}`);
        folderMappings[`Affiliate AI/Videos/Downloaded/${folderName}`] = folderId;
      } else {
        // Create new folder
        const fileMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [downloadedFolderId],
          properties: {
            appName: 'smart-wardrobe',
            sourceType: 'scraper',
            source: source,
            createdAt: new Date().toISOString()
          }
        };

        const file = await drive.files.create({
          resource: fileMetadata,
          fields: 'id, name'
        });

        console.log(`🆕 ${folderName.padEnd(15)} (created)   ${file.data.id}`);
        folderMappings[`Affiliate AI/Videos/Downloaded/${folderName}`] = file.data.id;
      }
    }

    return folderMappings;
  } catch (error) {
    console.error('❌ Error creating folders:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// 3. UPDATE FOLDER STRUCTURE CONFIG
// ============================================================================

function updateFolderStructure(newFolders) {
  console.log('\n💾 Step 3: Updating drive-folder-structure.json...\n');

  const folderStructure = JSON.parse(fs.readFileSync(folderStructurePath, 'utf8'));

  // Update folders object
  Object.assign(folderStructure.folders, newFolders);

  // Update tree structure - add source folders as children of Downloaded
  const videosDownloadedNode = findTreeNode(folderStructure.tree, 'Downloaded');
  
  if (videosDownloadedNode) {
    // Filter out old source folders (in case of re-run)
    videosDownloadedNode.children = videosDownloadedNode.children.filter(child => 
      !['Playboard', 'Youtube', 'Dailyhaha', 'Douyin'].includes(child.name)
    );

    // Add new source folders to tree
    for (const [path, id] of Object.entries(newFolders)) {
      const folderName = path.split('/').pop();
      videosDownloadedNode.children.push({
        name: folderName,
        id: id,
        children: []
      });
    }
  }

  // Update timestamp
  folderStructure.timestamp = new Date().toISOString();

  // Write back to file
  fs.writeFileSync(folderStructurePath, JSON.stringify(folderStructure, null, 2), 'utf8');
  console.log(`✅ Updated ${folderStructurePath}`);
  console.log(`   Total folders now: ${Object.keys(folderStructure.folders).length}`);
}

function findTreeNode(node, name) {
  if (node.name === name) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findTreeNode(child, name);
      if (found) return found;
    }
  }
  return null;
}

// ============================================================================
// 4. UPDATE GOOGLE DRIVE SERVICE
// ============================================================================

function updateGoogleDriveService(sources, folderStructure) {
  console.log('\n⚙️  Step 4: Updating googleDriveOAuth.js...\n');

  const serviceFilePath = path.join(__dirname, '../services/googleDriveOAuth.js');
  let serviceCode = fs.readFileSync(serviceFilePath, 'utf8');

  // Build dynamic folder ID assignments
  let dynamicFolderIds = '';
  sources.forEach(source => {
    const camelSource = source.charAt(0).toUpperCase() + source.slice(1);
    const key = `videos${camelSource}`;
    const pathKey = `Affiliate AI/Videos/Downloaded/${camelSource}`;
    dynamicFolderIds += `      ${key}: this.loadedFolderStructure?.folders?.['${pathKey}'] || null,\n`;
  });

  // Find the folderIds object and update it
  const folderIdsStart = serviceCode.indexOf('this.folderIds = {');
  const folderIdsEnd = serviceCode.indexOf('};', folderIdsStart) + 2;

  if (folderIdsStart > -1 && folderIdsEnd > folderIdsStart) {
    const oldFolderIds = serviceCode.substring(folderIdsStart, folderIdsEnd);
    
    // Keep existing folders, add dynamic ones before the closing brace
    const newFolderIds = oldFolderIds.replace(
      '};',
      `,\n${dynamicFolderIds.trimEnd()}\n    };`
    );

    serviceCode = serviceCode.replace(oldFolderIds, newFolderIds);
    fs.writeFileSync(serviceFilePath, serviceCode, 'utf8');
    console.log(`✅ Added ${sources.length} dynamic folder IDs to googleDriveOAuth.js`);
  } else {
    console.log('⚠️  Could not find folderIds object in googleDriveOAuth.js');
  }

  // Create dynamic upload methods
  let uploadMethods = '';
  sources.forEach(source => {
    const camelSource = source.charAt(0).toUpperCase() + source.slice(1);
    const methodKey = `videos${camelSource}`;
    
    uploadMethods += `
  /**
   * 💫 Upload ${source} scraped video
   * Auto-saves to: Videos/Downloaded/${camelSource}
   */
  async upload${camelSource}ScrapedVideo(buffer, fileName, options = {}) {
    return this.uploadBuffer(buffer, fileName, {
      ...options,
      folderId: this.folderIds.${methodKey} || this.folderIds.videosDownloaded || this.folderIds.videos,
      description: options.description || '${source} video downloaded for repurposing',
      properties: {
        ...(options.properties || {}),
        videoType: 'scraped',
        source: '${source}',
        category: 'scraped-video',
      }
    });
  }
`;
  });

  if (uploadMethods) {
    // Find where to insert the methods (after the last upload method)
    const lastMethodIndex = serviceCode.lastIndexOf('\n  /**');
    if (lastMethodIndex > -1) {
      const endOfLastMethod = serviceCode.indexOf('\n  }', lastMethodIndex) + 4;
      serviceCode = serviceCode.slice(0, endOfLastMethod) + uploadMethods + serviceCode.slice(endOfLastMethod);
      fs.writeFileSync(serviceFilePath, serviceCode, 'utf8');
      console.log(`✅ Added ${sources.length} dynamic upload methods to googleDriveOAuth.js`);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║  🚀 AUTO-DETECT SCRAPER SOURCES & CREATE DRIVE FOLDERS        ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    // 1. Detect sources
    const sources = discoverSources();

    if (sources.length === 0) {
      console.log('\n⚠️  No sources detected. Exiting.');
      process.exit(0);
    }

    // 2. Create folders
    const folderMappings = await createSourceFolders(sources);

    // 3. Update config
    const folderStructure = JSON.parse(fs.readFileSync(folderStructurePath, 'utf8'));
    updateFolderStructure(folderMappings);

    // 4. Update service
    updateGoogleDriveService(sources, folderStructure);

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ CONFIGURATION COMPLETE                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    sources.forEach((source, i) => {
      const id = folderMappings[`Affiliate AI/Videos/Downloaded/${source.charAt(0).toUpperCase() + source.slice(1)}`];
      console.log(`   ${i + 1}. ${source.padEnd(12)} → ${id}`);
    });

    console.log('\n📝 Files Updated:');
    console.log('   ✅ drive-folder-structure.json');
    console.log('   ✅ googleDriveOAuth.js');

    console.log('\n🚀 Ready to use! Scraper videos will auto-upload to their source folders.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
