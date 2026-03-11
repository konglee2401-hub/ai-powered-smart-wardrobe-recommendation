#!/usr/bin/env node

/**
 * CapCut AI Captions - Session Capture
 *
 * Opens CapCut AI Captions tool in browser and waits for manual login.
 * Saves cookies + localStorage + sessionStorage for reuse in automation.
 */

import CapCutAICaptionService from '../../../services/browser/capcutAICaptionService.js';
import readline from 'readline';

async function run() {
  const service = new CapCutAICaptionService({
    headless: false,
    flowId: 'capcut-session',
    baseUrl: 'https://www.capcut.com',
  });

  try {
    console.log('Starting CapCut session capture...');
    await service.initialize();

    await service.waitForPageReady();
    const modal = await service.detectLoginModal();
    if (modal.found) {
      console.log(`Login modal detected: ${modal.title || 'CapCut login'}`);
    }

    await new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('Login xong nhan Enter de tiep tuc luu session... ', () => {
        rl.close();
        resolve();
      });
    });

    await service.waitForPageReady(60000);
    try {
      await service.page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 });
    } catch {
      // best effort
    }
    await service.page.waitForTimeout(1500);

    const authed = await service.ensureAuthenticated(60);
    if (!authed) {
      console.log('Login not confirmed yet. Saving session anyway (check if valid).');
    }

    const saved = await service.saveSession({ reason: 'manual-login' });
    if (saved) console.log('Session saved.');
    else console.log('Session save failed (see logs).');
  } catch (error) {
    console.error(`Session capture failed: ${error.message}`);
  } finally {
    await service.close();
  }
}

run();
