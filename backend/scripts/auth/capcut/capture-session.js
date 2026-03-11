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

  let saved = false;

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

    const authed = await service.ensureAuthenticated(60);
    if (!authed) {
      console.log('Login not confirmed yet. Will attempt to save session anyway.');
    }

    for (let attempt = 1; attempt <= 3 && !saved; attempt += 1) {
      await service.waitForPageReady(60000);
      try {
        await service.page.waitForLoadState('networkidle', { timeout: 15000 });
      } catch {
        // best effort
      }
      await service.page.waitForTimeout(1500);

      saved = await service.saveSession({ reason: 'manual-login', attempt });
      if (saved) {
        console.log('Session saved.');
        break;
      }
      console.log(`Session save failed (attempt ${attempt}/3).`);
      await service.page.waitForTimeout(2000);
    }

    while (!saved) {
      const action = await new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('Chua luu duoc session. Doi trang load xong, nhan Enter de thu lai (hoac go q de thoat): ', (answer) => {
          rl.close();
          if ((answer || '').trim().toLowerCase() === 'q') {
            resolve('quit');
          } else {
            resolve('retry');
          }
        });
      });

      if (action === 'quit') {
        break;
      }

      await service.waitForPageReady(60000);
      try {
        await service.page.waitForLoadState('networkidle', { timeout: 15000 });
      } catch {
        // best effort
      }
      await service.page.waitForTimeout(1500);
      saved = await service.saveSession({ reason: 'manual-login', attempt: 'manual-retry' });
      if (saved) {
        console.log('Session saved.');
      }
    }
  } catch (error) {
    console.error(`Session capture failed: ${error.message}`);
  } finally {
    if (saved) {
      await service.close();
    } else {
      console.log('Session not saved yet. Browser will stay open for manual retry.');
    }
  }
}

run();
