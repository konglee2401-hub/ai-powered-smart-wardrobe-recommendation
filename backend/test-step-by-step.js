#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

const SESSION_FILE = path.join(__dirname, '.sessions/google-flow-session.json');
const PROJECT_URL = 'https://labs.google/fx/vi/tools/flow/project/3ba9e02e-0a33-4cf2-9d55-4c396941d7b7';
const TEST_IMAGE = path.join(__dirname, 'test-image.png');

async function testStepByStep() {
  let browser;
  try {
    console.log('��� Step-by-step popup testing\n');

    if (!fs.existsSync(SESSION_FILE)) {
      console.error('❌ Session file not found');
      return;
    }

    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));

    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    for (const cookie of sessionData.cookies) {
      try { await page.setCookie(cookie); } catch (e) {}
    }

    console.log('Step 1: Loading page...');
    await page.goto(PROJECT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '01-page-loaded.png' });
    console.log('✓ Screenshot: 01-page-loaded.png\n');

    console.log('Step 2: Looking for add button...');
    const addButtonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const icon = btn.querySelector('i');
        if (icon && icon.textContent.includes('add')) {
          return {
            found: true,
            visible: btn.offsetParent !== null
          };
        }
      }
      return { found: false };
    });

    if (!addButtonInfo.found) {
      console.log('❌ Add button not found!');
      return;
    }

    console.log('✓ Add button found\n');

    console.log('Step 3: Clicking add button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const icon = btn.querySelector('i');
        if (icon && icon.textContent.includes('add')) {
          btn.click();
          return;
        }
      }
    });

    console.log('Waiting for popup...');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '02-after-click.png' });
    console.log('✓ Screenshot: 02-after-click.png\n');

    const fileInputCount = await page.evaluate(() => {
      return document.querySelectorAll('input[type="file"]').length;
    });

    console.log(`File inputs found: ${fileInputCount}\n`);

    if (fileInputCount > 0) {
      console.log('✅ Attempting file upload...\n');
      const fileChooserPromise = page.waitForFileChooser({ timeout: 3000 });
      await page.evaluate(() => {
        document.querySelector('input[type="file"]').click();
      });
      const fileChooser = await fileChooserPromise;
      await fileChooser.accept([TEST_IMAGE]);
      console.log('✓ File uploaded\n');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '03-after-upload.png' });
      console.log('✓ Screenshot: 03-after-upload.png\n');
    } else {
      console.log('❌ No file input found\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Done');
    }
  }
}

testStepByStep();
