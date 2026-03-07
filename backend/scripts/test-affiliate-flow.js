#!/usr/bin/env node

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const defaultConfig = {
  apiBase: process.env.AFFILIATE_TIKTOK_API_BASE || 'http://localhost:5000',
  sessions: 1,
  videoDuration: 20,
  scene: 'linhphap-bedroom-lifestyle',
  aspectRatio: '9:16',
  characterName: 'Linh Phap',
  characterAlias: 'LinhPhap',
  language: 'vi',
  productFocus: 'full-outfit',
  useShortPrompt: false,
  voiceGender: 'female',
  voicePace: 'fast',
  characterImagePath: path.join(backendRoot, 'test-images', 'anh-nhan-vat.png'),
  productImagePath: path.join(backendRoot, 'test-images', 'anh-san-pham.jpeg')
};

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function createFlowId(sessionIndex) {
  return `affiliate-tiktok-flow-${Date.now()}-${sessionIndex}-${Math.random().toString(36).slice(2, 8)}`;
}

function printStepHeader(sessionIndex, stepNumber, title) {
  console.log(`\n[Session ${sessionIndex}] Step ${stepNumber}: ${title}`);
}

function stepUrl(config, stepPath) {
  return `${config.apiBase.replace(/\/$/, '')}/api/ai/affiliate-video-tiktok/${stepPath}`;
}

async function postJson(url, payload) {
  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 10 * 60 * 1000,
    validateStatus: () => true
  });

  if (response.status >= 400 || response.data?.success === false) {
    const message = response.data?.error || response.data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.data;
}

async function postMultipart(url, form) {
  const response = await axios.post(url, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 10 * 60 * 1000,
    validateStatus: () => true
  });

  if (response.status >= 400 || response.data?.success === false) {
    const message = response.data?.error || response.data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.data;
}

async function runSingleSession(config, sessionIndex) {
  const flowId = createFlowId(sessionIndex);
  const startedAt = new Date().toISOString();
  const stepResults = {};

  try {
    printStepHeader(sessionIndex, 1, 'Analyze Images');
    const form = new FormData();
    form.append('flowId', flowId);
    form.append('characterImage', fs.createReadStream(config.characterImagePath));
    form.append('productImage', fs.createReadStream(config.productImagePath));

    const step1 = await postMultipart(stepUrl(config, 'step-1-analyze'), form);
    stepResults.step1 = {
      duration: step1.step_duration,
      analysisKeys: Object.keys(step1.analysis || {})
    };
    console.log(`  OK ${step1.step_duration}s`);

    printStepHeader(sessionIndex, 2, 'Generate Images');
    const step2 = await postJson(stepUrl(config, 'step-2-generate-images'), {
      flowId,
      videoDuration: config.videoDuration,
      aspectRatio: config.aspectRatio,
      scene: config.scene,
      language: config.language,
      characterName: config.characterName,
      characterAlias: config.characterAlias,
      useShortPrompt: config.useShortPrompt
    });
    stepResults.step2 = {
      duration: step2.step_duration,
      wearingImage: step2.wearingImage,
      holdingImage: step2.holdingImage
    };
    console.log(`  OK ${step2.step_duration}s`);

    printStepHeader(sessionIndex, 3, 'Deep Analysis');
    const step3 = await postJson(stepUrl(config, 'step-3-deep-analysis'), {
      flowId,
      videoDuration: config.videoDuration,
      productFocus: config.productFocus,
      language: config.language
    });
    stepResults.step3 = {
      duration: step3.step_duration,
      scriptsCount: Array.isArray(step3.videoScripts) ? step3.videoScripts.length : 0,
      hashtagsCount: Array.isArray(step3.hashtags) ? step3.hashtags.length : 0
    };
    console.log(`  OK ${step3.step_duration}s`);

    printStepHeader(sessionIndex, 4, 'Generate Video');
    const step4 = await postJson(stepUrl(config, 'step-4-generate-video'), {
      flowId,
      videoDuration: config.videoDuration,
      aspectRatio: config.aspectRatio
    });
    stepResults.step4 = {
      duration: step4.step_duration,
      videoPath: step4.videoPath
    };
    console.log(`  OK ${step4.step_duration}s`);

    printStepHeader(sessionIndex, 5, 'Generate Voiceover');
    const step5 = await postJson(stepUrl(config, 'step-5-generate-voiceover'), {
      flowId,
      voiceGender: config.voiceGender,
      voicePace: config.voicePace,
      language: config.language
    });
    stepResults.step5 = {
      duration: step5.step_duration,
      audioPath: step5.audioPath
    };
    console.log(`  OK ${step5.step_duration}s`);

    printStepHeader(sessionIndex, 6, 'Finalize');
    const step6 = await postJson(stepUrl(config, 'step-6-finalize'), { flowId });
    stepResults.step6 = {
      totalDuration: step6.total_duration,
      finalVideoPath: step6.finalPackage?.video?.path || null,
      finalAudioPath: step6.finalPackage?.audio?.path || null
    };
    console.log(`  OK total ${step6.total_duration}s`);

    return {
      success: true,
      session: sessionIndex,
      flowId,
      startedAt,
      completedAt: new Date().toISOString(),
      steps: stepResults,
      finalPackage: step6.finalPackage || null
    };
  } catch (error) {
    return {
      success: false,
      session: sessionIndex,
      flowId,
      startedAt,
      completedAt: new Date().toISOString(),
      steps: stepResults,
      error: error.message
    };
  }
}

async function main() {
  ensureFile(defaultConfig.characterImagePath, 'Character image');
  ensureFile(defaultConfig.productImagePath, 'Product image');

  console.log('Affiliate TikTok Flow E2E');
  console.log(JSON.stringify(defaultConfig, null, 2));

  const results = [];
  for (let i = 1; i <= defaultConfig.sessions; i += 1) {
    const result = await runSingleSession(defaultConfig, i);
    results.push(result);
    if (!result.success) {
      console.error(`\nSession ${i} failed: ${result.error}`);
    }
  }

  const report = {
    createdAt: new Date().toISOString(),
    config: defaultConfig,
    results
  };

  const reportDir = path.join(backendRoot, 'test-results');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `affiliate-tiktok-flow-e2e-${Date.now()}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\nReport: ${reportPath}`);

  const hasFailure = results.some(result => !result.success);
  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
