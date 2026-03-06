/**
 * Migration script to move character preview images from temp to permanent storage
 * Run once to migrate existing characters
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import CharacterProfile from '../models/CharacterProfile.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
const baseDir = process.cwd().includes('backend') ? process.cwd() : path.join(process.cwd(), 'backend');
const tempDir = path.join(baseDir, 'temp', 'character-previews');
const uploadsDir = path.join(baseDir, 'uploads', 'character-previews');

async function migrateCharacterImages() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const characters = await CharacterProfile.find({});
    console.log(`📋 Found ${characters.length} characters to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const character of characters) {
      if (!character.referenceImages?.length) {
        console.log(`⏭️  Skipped: ${character.name} (no reference images)`);
        skippedCount++;
        continue;
      }

      // Create character-specific directory
      const charDir = path.join(uploadsDir, character.alias);
      if (!fs.existsSync(charDir)) {
        fs.mkdirSync(charDir, { recursive: true });
      }

      let updated = false;
      const newRefs = character.referenceImages.map((ref, idx) => {
        // If URL already points to /uploads, skip
        if (ref.url?.includes('/uploads/character-previews/')) {
          return ref;
        }

        // Try to extract filename from URL or use path
        let filename = null;
        if (ref.url) {
          const urlParts = ref.url.split('/');
          filename = urlParts[urlParts.length - 1];
        } else if (ref.path) {
          filename = path.basename(ref.path);
        }

        if (!filename) {
          console.warn(`   ⚠️  Image ${idx}: No filename found, skipping`);
          return ref;
        }

        // Check if source file exists
        const sourcePath = path.join(tempDir, filename);
        if (!fs.existsSync(sourcePath)) {
          console.warn(`   ⚠️  Image ${idx}: Source file not found at ${sourcePath}`);
          return ref;
        }

        // Copy to permanent location
        const destPath = path.join(charDir, filename);
        try {
          fs.copyFileSync(sourcePath, destPath);
          const newUrl = `http://localhost:5000/uploads/character-previews/${character.alias}/${filename}`;
          
          console.log(`   ✅ Image ${idx}: Migrated ${filename}`);
          updated = true;

          return {
            ...ref,
            url: newUrl,
            path: destPath,
            filename: filename
          };
        } catch (err) {
          console.warn(`   ❌ Image ${idx}: Failed to copy - ${err.message}`);
          return ref;
        }
      });

      if (updated) {
        character.referenceImages = newRefs;
        await character.save();
        console.log(`✅ Updated: ${character.name}\n`);
        migratedCount++;
      } else {
        console.log(`⏭️  No changes for: ${character.name}\n`);
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Migration Complete!`);
    console.log(`   ✅ Migrated: ${migratedCount} characters`);
    console.log(`   ⏭️  Skipped: ${skippedCount} characters`);
    console.log('='.repeat(60) + '\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateCharacterImages();
