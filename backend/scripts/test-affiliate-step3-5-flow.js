#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const affiliateDir = path.join(backendRoot, 'test-affiliate');

function listStep3Reports() {
  if (!fs.existsSync(affiliateDir)) return [];
  return fs.readdirSync(affiliateDir)
    .filter((name) => /^step3-real-test-.*\.json$/i.test(name))
    .map((name) => ({
      name,
      fullPath: path.join(affiliateDir, name),
      mtimeMs: fs.statSync(path.join(affiliateDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function getLatestStep3Report(previousLatestMtime = 0) {
  return listStep3Reports().find((file) => file.mtimeMs >= previousLatestMtime) || null;
}

async function runNodeScript(scriptPath, env = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: backendRoot,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptPath)} exited with code ${code}`));
    });
  });
}

async function main() {
  const beforeReports = listStep3Reports();
  const previousLatestMtime = beforeReports[0]?.mtimeMs || 0;

  console.log('Affiliate TikTok Step 3 -> 5 Flow');
  console.log(`Backend root: ${backendRoot}`);

  const step3Script = path.join(backendRoot, 'test-step3-real.js');
  const step4Script = path.join(backendRoot, 'test-step4-video-generation.js');
  const step5Script = path.join(backendRoot, 'test-step5-voice-generation.js');

  console.log('\n[1/3] Running Step 3 real deep analysis...');
  await runNodeScript(step3Script);

  const latestReport = getLatestStep3Report(previousLatestMtime);
  if (!latestReport) {
    throw new Error('No Step 3 result file found after running step3 test');
  }

  console.log(`\nUsing Step 3 result: ${latestReport.fullPath}`);

  console.log('\n[2/3] Running Step 4 video generation...');
  await runNodeScript(step4Script, { STEP3_RESULTS_FILE: latestReport.fullPath });

  console.log('\n[3/3] Running Step 5 voice generation...');
  await runNodeScript(step5Script, { STEP3_RESULTS_FILE: latestReport.fullPath });

  console.log('\nAffiliate TikTok Step 3 -> 5 flow completed successfully.');
}

main().catch((error) => {
  console.error('\nFlow failed:', error.message);
  process.exit(1);
});
