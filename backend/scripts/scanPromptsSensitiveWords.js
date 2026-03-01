#!/usr/bin/env node

/**
 * Scan Prompts for Sensitive Words
 * Detects potentially problematic terms in prompt options that might trigger Google Flow rejection
 * Creates a report and cleaned version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google AI sensitive words classifications
const SENSITIVE_WORDS_DB = {
  // Words that are commonly rejected or flagged
  flagged: {
    'sexy': {
      reason: 'Suggestive/adult-oriented term',
      risk: 'high',
      alternatives: ['elegant', 'chic', 'stylish', 'alluring', 'flattering', 'fashion-forward']
    },
    'sleepwear': {
      reason: 'Could be associated with intimate apparel',
      risk: 'medium',
      alternatives: ['nightwear', 'loungewear', 'comfort wear', 'casual sleepwear']
    },
    'intimate': {
      reason: 'Suggestive term for apparel',
      risk: 'high',
      alternatives: ['personal care', 'comfort wear', 'private wear']
    },
    'nude': {
      reason: 'Can be misinterpreted in context',
      risk: 'medium',
      alternatives: ['neutral-tone', 'skin-tone', 'beige', 'natural tone']
    },
    'lingerie': {
      reason: 'Often flagged as adult content context',
      risk: 'high',
      alternatives: ['inner wear', 'comfort underpinnings', 'lightweight basics']
    },
    'sensual': {
      reason: 'Suggestive connotation',
      risk: 'medium',
      alternatives: ['elegant', 'refined', 'sophisticated', 'luxurious']
    },
    'provocative': {
      reason: 'Could trigger safety filters',
      risk: 'high',
      alternatives: ['bold', 'striking', 'dramatic', 'fashion-forward']
    },
    'exposed': {
      reason: 'Ambiguous could mean revealing',
      risk: 'medium',
      alternatives: ['open', 'visible', 'displayed']
    },
    'revealing': {
      reason: 'Suggests too much skin exposure',
      risk: 'high',
      alternatives: ['contemporary', 'modern cut', 'fashion-cut', 'stylish']
    },
    'hot': {
      reason: 'Slang for attractive - can be flagged',
      risk: 'medium',
      alternatives: ['trendy', 'fashionable', 'popular', 'stylish']
    },
    'erotic': {
      reason: 'Adult content indicator',
      risk: 'high',
      alternatives: ['romantic', 'elegant', 'sophisticated']
    },
    'mature': {
      reason: 'Can mean adult-oriented',
      risk: 'medium',
      alternatives: ['sophisticated', 'refined', 'elegant', 'contemporary']
    },
    'model': {
      reason: 'Might suggest human models (but used in context is OK)',
      risk: 'low',
      alternatives: ['showcase', 'display']
    }
  }
};

function scanText(text) {
  if (!text) return [];
  
  const findings = [];
  const lowerText = text.toLowerCase();
  
  for (const [word, info] of Object.entries(SENSITIVE_WORDS_DB.flagged)) {
    // Use word boundaries to avoid false positives
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    
    if (matches && matches.length > 0) {
      findings.push({
        word: word,
        occurrences: matches.length,
        reason: info.reason,
        risk: info.risk,
        alternatives: info.alternatives,
        originalMatches: matches
      });
    }
  }
  
  return findings;
}

function cleanText(text, replacements = {}) {
  if (!text) return text;
  
  let cleaned = text;
  
  // Apply replacements
  for (const [word, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, replacement);
  }
  
  return cleaned;
}

async function main() {
  console.log('\n📋 SENSITIVE WORDS SCAN - Prompt Options\n');
  console.log('═'.repeat(80));
  
  // Read seed file
  const seedPath = path.join(__dirname, 'seedPromptOptions.js');
  
  try {
    const seedContent = fs.readFileSync(seedPath, 'utf-8');
    
    // Extract prompt options (simple JSON-like extraction)
    const lines = seedContent.split('\n');
    
    // Parse the data
    let currentObj = null;
    let inArray = false;
    const allTexts = [];
    
    lines.forEach((line, idx) => {
      // Track scannables fields
      if (line.includes('promptSuggestion:') || 
          line.includes('promptSuggestionVi:') ||
          line.includes('sceneLockedPrompt:') ||
          line.includes('sceneLockedPromptVi:') ||
          line.includes('description:') ||
          line.includes('descriptionVi:')) {
        
        const match = line.match(/:\s*['"`]([^'"`]+)/);
        if (match) {
          allTexts.push({
            lineNum: idx + 1,
            field: line.split(':')[0].trim(),
            text: match[1]
          });
        }
      }
    });
    
    console.log(`\n✅ Scanned ${allTexts.length} text fields from seed options\n`);
    
    // Scan all texts
    const scanResults = new Map();
    let totalIssues = 0;
    
    for (const item of allTexts) {
      const findings = scanText(item.text);
      
      if (findings.length > 0) {
        if (!scanResults.has(item.field)) {
          scanResults.set(item.field, []);
        }
        
        scanResults.get(item.field).push({
          lineNum: item.lineNum,
          text: item.text.substring(0, 80) + (item.text.length > 80 ? '...' : ''),
          findings: findings
        });
        
        totalIssues += findings.length;
      }
    }
    
    // Report findings
    if (totalIssues === 0) {
      console.log('✅ NO SENSITIVE WORDS DETECTED\n');
    } else {
      console.log(`⚠️  FOUND ${totalIssues} SENSITIVE TERM(S)\n`);
      
      scanResults.forEach((entries, field) => {
        console.log(`\n📌 FIELD: ${field}`);
        console.log('─'.repeat(80));
        
        entries.forEach((entry, idx) => {
          console.log(`   Entry #${idx + 1} (Line ${entry.lineNum}):`);
          console.log(`   Preview: "${entry.text}"`);
          console.log(`   Issues:`);
          
          entry.findings.forEach(f => {
            console.log(`     ❌ "${f.word.toUpperCase()}" (Risk: ${f.risk})`);
            console.log(`        Reason: ${f.reason}`);
            console.log(`        Occurrences: ${f.occurrences}`);
            console.log(`        Alternatives: ${f.alternatives.join(', ')}`);
          });
          console.log('');
        });
      });
    }
    
    // Generate recommendations
    console.log('\n📝 RECOMMENDATIONS:\n');
    console.log('High Risk Terms (SHOULD BE REPLACED):');
    Object.entries(SENSITIVE_WORDS_DB.flagged)
      .filter(([_, info]) => info.risk === 'high')
      .forEach(([word, info]) => {
        console.log(`  • "${word}" → ${info.alternatives.join(' / ')}`);
      });
    
    console.log('\nMedium Risk Terms (REVIEW CONTEXT):');
    Object.entries(SENSITIVE_WORDS_DB.flagged)
      .filter(([_, info]) => info.risk === 'medium')
      .forEach(([word, info]) => {
        console.log(`  • "${word}" → ${info.alternatives.join(' / ')}`);
      });
    
    // Create cleaned version mapping
    const replacementMap = {
      'sexy outfits': 'stylish outfits',
      'sexy': 'stylish',
      'sleepwear': 'nightwear',
      'intimate': 'personal wear',
      'lingerie': 'undergarments',
      'sensual': 'elegant',
      'provocative': 'bold',
      'exposed': 'visible',
      'revealing': 'contemporary-cut',
      'hot': 'trendy',
      'erotic': 'romantic',
      'mature': 'sophisticated'
    };
    
    console.log('\n\n✨ REPLACEMENT MAPPING FOR CLEANED VERSION:\n');
    Object.entries(replacementMap).forEach(([original, replacement]) => {
      console.log(`  "${original}" → "${replacement}"`);
    });
    
    // Save report
    const reportPath = path.join(__dirname, '../docs/SENSITIVE_WORDS_SCAN_REPORT.json');
    const report = {
      timestamp: new Date().toISOString(),
      totalscan: {
        fieldsScanned: allTexts.length,
        issuesFound: totalIssues,
        riskSummary: {
          high: Object.entries(SENSITIVE_WORDS_DB.flagged).filter(([_, i]) => i.risk === 'high').length,
          medium: Object.entries(SENSITIVE_WORDS_DB.flagged).filter(([_, i]) => i.risk === 'medium').length,
          low: Object.entries(SENSITIVE_WORDS_DB.flagged).filter(([_, i]) => i.risk === 'low').length
        }
      },
      findings: Object.fromEntries(scanResults),
      replacementMap: replacementMap,
      recommendations: {
        highRiskReplacements: Object.fromEntries(
          Object.entries(SENSITIVE_WORDS_DB.flagged)
            .filter(([_, info]) => info.risk === 'high')
            .map(([word, info]) => [word, info.alternatives[0]])
        ),
        mediumRiskReplacements: Object.fromEntries(
          Object.entries(SENSITIVE_WORDS_DB.flagged)
            .filter(([_, info]) => info.risk === 'medium')
            .map(([word, info]) => [word, info.alternatives[0]])
        )
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}\n`);
    
    console.log('═'.repeat(80));
    console.log('\n✅ SCAN COMPLETE\n');
    console.log('Next steps:');
    console.log('  1. Review SENSITIVE_WORDS_SCAN_REPORT.json');
    console.log('  2. Run: node scripts/updatePromptsClean.js (to create cleaned version)');
    console.log('  3. Run: node scripts/migratePromptsToDB.js (to apply changes to DB)\n');
    
  } catch (err) {
    console.error('❌ Error scanning prompts:', err.message);
    process.exit(1);
  }
}

main();
