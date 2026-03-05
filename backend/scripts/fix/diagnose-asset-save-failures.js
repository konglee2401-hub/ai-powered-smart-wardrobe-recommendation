/**
 * Diagnose Asset Save Failures
 * Analyzes why assets fail to save and reports detailed diagnostics
 *
 * Run: node scripts/fix/diagnose-asset-save-failures.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import Asset from '../../models/Asset.js';

const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

async function connectDB() {
  try {
    await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test Asset schema validation to understand save failures
 */
async function testAssetValidation() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('1️⃣  TESTING ASSET SCHEMA VALIDATION');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Create a minimal asset
    const testAsset = new Asset({
      assetId: `test-${Date.now()}`,
      userId: 'test-user',
      assetType: 'image',
      assetCategory: 'generated-image',
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
      storage: {
        location: 'google-drive',
        googleDriveId: 'test-id-123'
      }
    });

    // Try to validate
    const validationError = testAsset.validateSync();
    if (validationError) {
      console.log('❌ VALIDATION ERROR:');
      console.log(validationError.message);
      console.log('\nDetailed errors:');
      Object.keys(validationError.errors).forEach(field => {
        console.log(`  - ${field}: ${validationError.errors[field].message}`);
      });
    } else {
      console.log('✅ Minimal asset passes validation');
    }

    // Try to save
    try {
      await testAsset.save();
      console.log('✅ Minimal asset saves successfully');
      await Asset.deleteOne({ assetId: testAsset.assetId });
    } catch (saveError) {
      console.log('❌ SAVE ERROR:', saveError.message);
      console.log('\nFull error:');
      console.log(saveError);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Analyze disabled/inactive assets to understand why they failed
 */
async function analyzeDisabledAssets() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('2️⃣  ANALYZING DISABLED ASSETS');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const disabledAssets = await Asset.find({ status: 'inactive' }).limit(10);
    console.log(`Found ${disabledAssets.length} disabled assets (showing first 10)\n`);

    disabledAssets.forEach((asset, idx) => {
      console.log(`\n${idx + 1}. ${asset.filename}`);
      console.log(`   ID: ${asset.assetId}`);
      console.log(`   Category: ${asset.assetCategory}`);
      console.log(`   Disable Reason: ${asset.disableReason || 'Unknown'}`);
      
      // Check storage fields
      console.log('   Storage Status:');
      if (asset.storage) {
        console.log(`     - storage.localPath: ${asset.storage.localPath ? '✅ Have' : '❌ Missing'}`);
        console.log(`     - storage.googleDriveId: ${asset.storage.googleDriveId ? '✅ Have: ' + asset.storage.googleDriveId : '❌ Missing'}`);
        console.log(`     - storage.url: ${asset.storage.url ? '✅ Have' : '❌ Missing'}`);
      }
      
      if (asset.cloudStorage) {
        console.log('     - cloudStorage.googleDriveId: ' + (asset.cloudStorage.googleDriveId ? '✅ Have' : '❌ Missing'));
        console.log('     - cloudStorage.status: ' + (asset.cloudStorage.status || '❌ Missing'));
      }

      if (asset.localStorage) {
        console.log('     - localStorage.path: ' + (asset.localStorage.path ? '✅ Have' : '❌ Missing'));
        console.log('     - localStorage.verified: ' + (asset.localStorage.verified ? '✅ Verified' : '❌ Not verified'));
      }
    });

    // Summary statistics
    const storageStats = await Asset.aggregate([
      { $match: { status: 'inactive' } },
      {
        $group: {
          _id: null,
          totalDisabled: { $sum: 1 },
          missingStorage: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$storage.googleDriveId', null] },
                    { $eq: ['$storage.localPath', null] },
                    { $eq: ['$storage.url', null] },
                    { $eq: ['$cloudStorage.googleDriveId', null] },
                    { $eq: ['$localStorage.path', null] }
                  ]
                },
                1,
                0
              ]
            }
          },
          hasCloudStorage: {
            $sum: { $cond: ['$cloudStorage.googleDriveId', 1, 0] }
          },
          hasLocalStorage: {
            $sum: { $cond: ['$localStorage.path', 1, 0] }
          }
        }
      }
    ]);

    if (storageStats.length > 0) {
      console.log('\n\n📊 DISABLED ASSETS SUMMARY:');
      console.log(`════════════════════════════════`);
      const stats = storageStats[0];
      console.log(`Total disabled: ${stats.totalDisabled}`);
      console.log(`Missing ALL storage: ${stats.missingStorage}`);
      console.log(`Have cloud storage: ${stats.hasCloudStorage}`);
      console.log(`Have local storage: ${stats.hasLocalStorage}`);
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

/**
 * Check Asset model schema requirements
 */
async function checkSchemaRequirements() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('3️⃣  ASSET SCHEMA REQUIREMENTS');
  console.log('═══════════════════════════════════════════════════\n');

  const schema = Asset.schema;
  const requiredFields = [];

  schema.eachPath((path) => {
    const schemaType = schema.path(path);
    if (schemaType.isRequired) {
      requiredFields.push({
        field: path,
        type: schemaType.instance,
        required: true
      });
    }
  });

  console.log(`Found ${requiredFields.length} required fields:\n`);
  requiredFields.forEach(field => {
    console.log(`  ✓ ${field.field} (${field.type})`);
  });
}

/**
 * Test storage field validation
 */
async function testStorageFieldValidation() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('4️⃣  TESTING STORAGE FIELD REQUIREMENTS');
  console.log('═══════════════════════════════════════════════════\n');

  const testCases = [
    {
      name: 'Empty storage object',
      storage: {}
    },
    {
      name: 'Storage with location only',
      storage: { location: 'google-drive' }
    },
    {
      name: 'Storage with googleDriveId',
      storage: { location: 'google-drive', googleDriveId: 'file-123' }
    },
    {
      name: 'Storage with localPath',
      storage: { location: 'local', localPath: '/path/to/file.jpg' }
    },
    {
      name: 'Storage with URL',
      storage: { location: 'cloud', url: 'https://example.com/file.jpg' }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\nTesting: "${testCase.name}"`);
    try {
      const asset = new Asset({
        assetId: `test-${Date.now()}-${Math.random()}`,
        userId: 'test-user',
        assetType: 'image',
        assetCategory: 'generated-image',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        storage: testCase.storage
      });

      const validationError = asset.validateSync();
      if (validationError) {
        console.log(`  ❌ Fails validation: ${validationError.message}`);
      } else {
        console.log(`  ✅ Passes validation`);
        try {
          await asset.save();
          console.log(`  ✅ Saves to database`);
          await Asset.deleteOne({ assetId: asset.assetId });
        } catch (saveError) {
          console.log(`  ❌ Save fails: ${saveError.message}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('ASSET SAVE FAILURE DIAGNOSIS');
  console.log('='.repeat(60));

  try {
    await connectDB();

    // Run diagnostics
    await testAssetValidation();
    await checkSchemaRequirements();
    await testStorageFieldValidation();
    await analyzeDisabledAssets();

    console.log('\n\n✅ Diagnosis complete');
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('─────────────────────────────────────────────────');
    console.log('1. Check MongoDB logs for detailed error messages');
    console.log('2. Verify storage field has at least one location');
    console.log('3. Ensure required fields are not null/undefined');
    console.log('4. Check for concurrent save race conditions');
    console.log('5. Review assetManager.js for duplicate detection logic\n');

  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB\n');
  }
}

main();
