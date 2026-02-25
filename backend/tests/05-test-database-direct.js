#!/usr/bin/env node
/**
 * Direct Database Query & Verification Test
 * Tests actual database content without model registration issues
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}═══ ${msg} ═══${colors.reset}`),
};

async function testDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
    console.log(`Connecting to: ${mongoURI.replace(/\/\/.*:.*@/, '//***:***@')}`);
    
    const conn = await mongoose.connect(mongoURI);
    log.success('Connected to MongoDB');
    
    log.section('DATABASE VERIFICATION');
    
    // Get all collections
    const collections = await conn.connection.db.listCollections().toArray();
    log.info(`Collections found: ${collections.length}`);
    collections.forEach(c => log.info(`  • ${c.name}`));
    
    // Query promptOptions collection directly
    const db = conn.connection.db;
    const promptOptions = db.collection('promptoptions');
    
    log.section('PROMPTOPTIONS COLLECTION ANALYSIS');
    
    const totalDocs = await promptOptions.countDocuments();
    log.info(`Total documents: ${totalDocs}`);
    
    // Get all categories
    const categories = await promptOptions.distinct('category');
    log.success(`Categories found: ${categories.length}`);
    categories.sort().forEach(cat => {
      log.info(`  • ${cat}`);
    });
    
    log.section('OPTIONS BY CATEGORY');
    
    let grandTotal = 0;
    let qualityStore = {};
    
    for (const cat of categories.sort()) {
      const docs = await promptOptions.find({ category: cat }).toArray();
      const count = docs.length;
      grandTotal += count;
      
      // Validate each document
      const validDocs = docs.filter(doc => {
        return doc.value && typeof doc.value === 'string' && doc.value.trim() !== '' &&
               doc.label && typeof doc.label === 'string' &&
               doc.description && typeof doc.description === 'string';
      });
      
      const quality = (validDocs.length / count * 100).toFixed(1);
      qualityStore[cat] = { total: count, valid: validDocs.length, quality };
      
      const statusIcon = validDocs.length === count ? '✅' : '⚠️';
      log.info(`${statusIcon} ${cat.padEnd(15)} | ${count.toString().padEnd(3)} options | Quality: ${quality}%`);
      
      // Show samples for main categories
      if (['scene', 'lighting', 'mood', 'hairstyle', 'makeup'].includes(cat) && count > 0) {
        const samples = validDocs.slice(0, 2).map(d => `"${d.value}"`).join(', ');
        log.info(`   Samples: ${samples}${count > 2 ? '...' : ''}`);
      }
    }
    
    log.section('SUMMARY');
    log.info(`Total Options: ${grandTotal}`);
    log.info(`Total Categories: ${categories.length}`);
    
    // Overall quality
    const totalValid = Object.values(qualityStore).reduce((sum, cat) => sum + cat.valid, 0);
    const overallQuality = (totalValid / grandTotal * 100).toFixed(1);
    
    if (overallQuality >= 95) {
      log.success(`Overall Data Quality: ${overallQuality}% ✅ EXCELLENT`);
    } else if (overallQuality >= 80) {
      log.warning(`Overall Data Quality: ${overallQuality}% ⚠️ ACCEPTABLE`);
    } else {
      log.error(`Overall Data Quality: ${overallQuality}% ❌ POOR`);
    }
    
    // Verify critical categories
    log.section('CRITICAL CATEGORIES CHECK');
    
    const criticalCategories = ['scene', 'lighting', 'mood', 'hairstyle', 'makeup'];
    let allCriticalGood = true;
    
    for (const cat of criticalCategories) {
      const stats = qualityStore[cat];
      if (stats) {
        if (stats.total >= 2 && stats.quality >= 100) {
          log.success(`${cat}: ${stats.total} options ✅`);
        } else if (stats.total >= 1) {
          log.warning(`${cat}: ${stats.total} option(s) ⚠️`);
          allCriticalGood = false;
        } else {
          log.error(`${cat}: MISSING ❌`);
          allCriticalGood = false;
        }
      } else {
        log.error(`${cat}: NOT FOUND ❌`);
        allCriticalGood = false;
      }
    }
    
    log.section('FINAL STATUS');
    
    if (totalDocs > 20 && allCriticalGood && overallQuality >= 90) {
      log.success('✅ DATABASE READY FOR PRODUCTION');
      log.info('✓ Sufficient options available');
      log.info('✓ All critical categories present');
      log.info('✓ Data quality excellent');
    } else {
      log.warning('⚠️ DATABASE HAS ISSUES - Review above');
    }
    
    await mongoose.connection.close();
    log.info('\nDatabase connection closed');
    
  } catch (error) {
    log.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

testDatabase();
