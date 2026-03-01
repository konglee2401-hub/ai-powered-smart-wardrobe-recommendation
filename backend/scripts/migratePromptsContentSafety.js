#!/usr/bin/env node

/**
 * Update Prompts in Database - Safe Content Version
 * Applies sensitive word replacements to all existing PromptOption documents
 * Preserves original data by storing in archive field
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import PromptOption from '../models/PromptOption.js';

// Define safe replacements for sensitive terms
const SENSITIVE_REPLACEMENTS = {
  high_risk: {
    'sexy': 'stylish',
    'sexy outfits': 'stylish outfits',
    'lingerie': 'elegant undergarments',
    'intimate': 'personal wear',
    'erotic': 'romantic',
    'provocative': 'striking',
    'revealing': 'contemporary-cut',
    'explicit': 'detailed'
  },
  medium_risk: {
    'sleepwear': 'nightwear',
    'sensual': 'elegant',
    'exposed': 'displayed',
    'mature': 'sophisticated',
    'hot': 'trendy',
    'nude': 'neutral-tone',
    'alluring': 'elegant'
  }
};

// All replacements combined
const ALL_REPLACEMENTS = {
  ...SENSITIVE_REPLACEMENTS.high_risk,
  ...SENSITIVE_REPLACEMENTS.medium_risk
};

function applySafeReplacements(text) {
  if (!text) return text;
  
  let result = text;
  
  // Apply replacements (case-insensitive but preserve original case when possible)
  Object.entries(ALL_REPLACEMENTS).forEach(([original, replacement]) => {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      // Preserve case: if original was uppercase, make replacement uppercase
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  });
  
  return result;
}

async function main() {
  console.log('\n🔄 DATABASE MIGRATION - SAFE CONTENT REPLACEMENT\n');
  console.log('═'.repeat(80));
  
  try {
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');
    
    // Get all PromptOptions
    console.log('📋 Fetching all PromptOptions from database...');
    const allOptions = await PromptOption.find({});
    console.log(`✅ Found ${allOptions.length} prompt options\n`);
    
    let updateCount = 0;
    let noChangeCount = 0;
    let skipCount = 0;
    const updateLog = [];
    
    // Process each option
    console.log('🔄 Processing updates...\n');
    
    for (const option of allOptions) {
      // Skip if already migrated (idempotency check)
      if (option.contentSafetyVersion && option.contentSafetyVersion >= 2) {
        skipCount++;
        continue;
      }
      
      const original = {
        promptSuggestion: option.promptSuggestion,
        promptSuggestionVi: option.promptSuggestionVi,
        sceneLockedPrompt: option.sceneLockedPrompt,
        sceneLockedPromptVi: option.sceneLockedPromptVi,
        description: option.description,
        descriptionVi: option.descriptionVi
      };
      
      const hasChanges = 
        JSON.stringify(original) !== 
        JSON.stringify({
          promptSuggestion: applySafeReplacements(option.promptSuggestion),
          promptSuggestionVi: applySafeReplacements(option.promptSuggestionVi),
          sceneLockedPrompt: applySafeReplacements(option.sceneLockedPrompt),
          sceneLockedPromptVi: applySafeReplacements(option.sceneLockedPromptVi),
          description: applySafeReplacements(option.description),
          descriptionVi: applySafeReplacements(option.descriptionVi)
        });
      
      if (hasChanges) {
        // Archive original before updating
        if (!option.archive) {
          option.archive = {
            originalVersion: 1,
            createdAt: new Date(),
            data: original
          };
        }
        
        // Apply safe replacements
        option.promptSuggestion = applySafeReplacements(option.promptSuggestion);
        option.promptSuggestionVi = applySafeReplacements(option.promptSuggestionVi);
        option.sceneLockedPrompt = applySafeReplacements(option.sceneLockedPrompt);
        option.sceneLockedPromptVi = applySafeReplacements(option.sceneLockedPromptVi);
        option.description = applySafeReplacements(option.description);
        option.descriptionVi = applySafeReplacements(option.descriptionVi);
        
        // Mark as updated
        option.contentSafetyUpdatedAt = new Date();
        option.contentSafetyVersion = 2;
        
        await option.save();
        updateCount++;
        
        const changeInfo = {
          id: option._id,
          category: option.category,
          value: option.value,
          label: option.label,
          updateTime: new Date(),
          archivedOriginal: true
        };
        
        updateLog.push(changeInfo);
        
        console.log(`  ✓ Updated: ${option.category}/${option.value}`);
      } else {
        noChangeCount++;
      }
    }
    
    console.log(`\n${'═'.repeat(80)}`);
    console.log('\n📊 MIGRATION SUMMARY:');
    console.log(`  ✅ Updated: ${updateCount} documents`);
    console.log(`  ⏭️  No changes needed: ${noChangeCount} documents`);
    console.log(`  ⏩ Already migrated (skipped): ${skipCount} documents`);
    console.log(`  📦 Total processed: ${allOptions.length} documents\n`);
    
    // Save migration log
    const logPath = path.join(__dirname, '../docs/CONTENT_SAFETY_MIGRATION_LOG.json');
    const logData = {
      timestamp: new Date().toISOString(),
      summary: {
        updated: updateCount,
        unchanged: noChangeCount,
        skipped: skipCount,
        total: allOptions.length,
        status: 'success'
      },
      replacements: ALL_REPLACEMENTS,
      updates: updateLog
    };
    
    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    console.log(`📄 Migration log saved to: ${logPath}\n`);
    
    // Display replacement mapping used
    console.log('📝 Replacements Applied:');
    console.log('─'.repeat(80));
    console.log('\nHigh Risk Replacements:');
    Object.entries(SENSITIVE_REPLACEMENTS.high_risk).forEach(([orig, repl]) => {
      console.log(`  "${orig}" → "${repl}"`);
    });
    
    console.log('\nMedium Risk Replacements:');
    Object.entries(SENSITIVE_REPLACEMENTS.medium_risk).forEach(([orig, repl]) => {
      console.log(`  "${orig}" → "${repl}"`);
    });
    
    console.log(`\n${'═'.repeat(80)}`);
    console.log('\n✅ MIGRATION COMPLETE\n');
    console.log('Result:');
    console.log(`  • ${updateCount} PromptOptions have been updated with safe content`);
    console.log(`  • Original prompts archived in "archive" field`);
    console.log(`  • Marked with contentSafetyVersion: 2`);
    console.log(`  • Can be reverted if needed by checking archive field\n`);
    
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
