#!/usr/bin/env node

/**
 * Session Manager CLI
 * 
 * Manage browser sessions for automated services.
 * 
 * Usage:
 *   npm run session:list
 *   npm run session:delete
 *   npm run session:clear
 *   node scripts/session-manager.js list
 *   node scripts/session-manager.js delete zai
 *   node scripts/session-manager.js info zai
 */

import SessionManager from '../services/browser/sessionManager.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command and args
const [,, command, service] = process.argv;

function printHeader(title) {
  console.log('\n' + chalk.magenta('='.repeat(80)));
  console.log(chalk.magenta.bold(`  ${title}`));
  console.log(chalk.magenta('='.repeat(80)) + '\n');
}

function printUsage() {
  console.log(`
${chalk.bold('Usage:')} node scripts/session-manager.js <command> [service]

${chalk.bold('Commands:')}
  list              List all saved sessions
  info <service>    Show detailed info for a session
  delete <service>  Delete a specific session
  clear             Delete all sessions
  help              Show this help message

${chalk.bold('Services:')}
  zai               Z.AI Chat session
  grok              Grok (X.AI) session

${chalk.bold('Examples:')}
  npm run session:list
  npm run session:delete -- zai
  node scripts/session-manager.js info zai
  node scripts/session-manager.js clear
`);
}

function getAllSessions() {
  const sessionsDir = path.join(__dirname, '..', '.sessions');
  const sessions = [];
  
  if (!fs.existsSync(sessionsDir)) {
    return sessions;
  }
  
  const files = fs.readdirSync(sessionsDir);
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const serviceName = file.replace('-session.json', '');
      const filePath = path.join(sessionsDir, file);
      const stats = fs.statSync(filePath);
      
      sessions.push({
        service: serviceName,
        file: filePath,
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size
      });
    }
  }
  
  return sessions;
}

function listSessions() {
  printHeader('📋 SAVED SESSIONS');
  
  const sessions = getAllSessions();
  
  if (sessions.length === 0) {
    console.log(chalk.yellow('No saved sessions found.'));
    console.log(chalk.gray('\nTo create a session:'));
    console.log(chalk.gray('  npm run login:zai'));
    return;
  }
  
  console.log(chalk.bold(`Found ${sessions.length} session(s):\n`));
  
  for (const session of sessions) {
    console.log(chalk.cyan(`📦 ${session.service}`));
    console.log(`   Created: ${session.created.toLocaleString()}`);
    console.log(`   Modified: ${session.modified.toLocaleString()}`);
    console.log(`   Size: ${(session.size / 1024).toFixed(2)} KB`);
    console.log('');
  }
}

function showSessionInfo(serviceName) {
  if (!serviceName) {
    console.log(chalk.red('Error: Service name required'));
    console.log('Usage: node scripts/session-manager.js info <service>');
    process.exit(1);
  }
  
  printHeader(`📋 SESSION INFO: ${serviceName}`);
  
  const manager = new SessionManager(serviceName);
  const info = manager.getSessionInfo();
  
  if (!info.exists) {
    console.log(chalk.yellow(`No session found for "${serviceName}"`));
    return;
  }
  
  console.log(chalk.bold('Session Details:\n'));
  console.log(`  Service: ${chalk.cyan(info.service)}`);
  console.log(`  File: ${chalk.gray(info.path)}`);
  console.log(`  Created: ${info.created}`);
  console.log(`  Size: ${info.size}`);
  console.log('');
  
  // Try to read and show cookies count
  try {
    const sessionData = manager.loadSession();
    if (sessionData && sessionData.cookies) {
      console.log(`  Cookies: ${sessionData.cookies.length}`);
    }
    if (sessionData && sessionData.origins) {
      console.log(`  LocalStorage Origins: ${sessionData.origins.length}`);
    }
  } catch (error) {
    console.log(chalk.yellow('  Could not read session data'));
  }
  
  console.log('');
}

function deleteSession(serviceName) {
  if (!serviceName) {
    console.log(chalk.red('Error: Service name required'));
    console.log('Usage: node scripts/session-manager.js delete <service>');
    process.exit(1);
  }
  
  printHeader(`🗑️  DELETE SESSION: ${serviceName}`);
  
  const manager = new SessionManager(serviceName);
  const info = manager.getSessionInfo();
  
  if (!info.exists) {
    console.log(chalk.yellow(`No session found for "${serviceName}"`));
    return;
  }
  
  console.log(`Deleting session for "${serviceName}"...`);
  console.log(`  File: ${info.path}`);
  console.log(`  Created: ${info.created}`);
  console.log('');
  
  const deleted = manager.deleteSession();
  
  if (deleted) {
    console.log(chalk.green('✅ Session deleted successfully'));
  } else {
    console.log(chalk.red('❌ Failed to delete session'));
  }
}

function clearAllSessions() {
  printHeader('🗑️  CLEAR ALL SESSIONS');
  
  const sessions = getAllSessions();
  
  if (sessions.length === 0) {
    console.log(chalk.yellow('No sessions to clear.'));
    return;
  }
  
  console.log(chalk.bold(`Deleting ${sessions.length} session(s):\n`));
  
  let deleted = 0;
  let failed = 0;
  
  for (const session of sessions) {
    try {
      fs.unlinkSync(session.file);
      console.log(chalk.green(`  ✅ ${session.service}`));
      deleted++;
    } catch (error) {
      console.log(chalk.red(`  ❌ ${session.service}: ${error.message}`));
      failed++;
    }
  }
  
  console.log('');
  console.log(chalk.bold('Summary:'));
  console.log(chalk.green(`  Deleted: ${deleted}`));
  if (failed > 0) {
    console.log(chalk.red(`  Failed: ${failed}`));
  }
}

// Main
switch (command) {
  case 'list':
    listSessions();
    break;
    
  case 'info':
    showSessionInfo(service);
    break;
    
  case 'delete':
    deleteSession(service);
    break;
    
  case 'clear':
    clearAllSessions();
    break;
    
  case 'help':
  case '--help':
  case '-h':
    printUsage();
    break;
    
  default:
    if (command) {
      console.log(chalk.red(`Unknown command: ${command}`));
    }
    printUsage();
    process.exit(command ? 1 : 0);
}
