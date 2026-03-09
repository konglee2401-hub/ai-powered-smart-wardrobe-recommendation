#!/usr/bin/env node

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

function parseCliArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const nextValue = inlineValue ?? argv[index + 1];

    if (inlineValue == null && nextValue && !nextValue.startsWith('--')) {
      parsed[key] = nextValue;
      index += 1;
    } else if (inlineValue != null) {
      parsed[key] = inlineValue;
    } else {
      parsed[key] = true;
    }
  }

  return parsed;
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const cliArgs = parseCliArgs(process.argv.slice(2));

const defaultConfig = {
  apiBase: cliArgs.apiBase || process.env.AFFILIATE_TIKTOK_API_BASE || 'http://localhost:5000',
  sessions: toInteger(cliArgs.sessions || process.env.AFFILIATE_TIKTOK_SESSIONS, 1),
  videoDuration: toInteger(cliArgs.videoDuration || process.env.AFFILIATE_TIKTOK_VIDEO_DURATION, 20),
  scene: cliArgs.scene || process.env.AFFILIATE_TIKTOK_SCENE || 'linhphap-bedroom-lifestyle',
  aspectRatio: cliArgs.aspectRatio || process.env.AFFILIATE_TIKTOK_ASPECT_RATIO || '9:16',
  characterName: cliArgs.characterName || process.env.AFFILIATE_TIKTOK_CHARACTER_NAME || 'Linh Phap',
  characterAlias: cliArgs.characterAlias || process.env.AFFILIATE_TIKTOK_CHARACTER_ALIAS || 'LinhPhap',
  language: cliArgs.language || process.env.AFFILIATE_TIKTOK_LANGUAGE || 'vi',
  productFocus: cliArgs.productFocus || process.env.AFFILIATE_TIKTOK_PRODUCT_FOCUS || 'full-outfit',
  useShortPrompt: String(cliArgs.useShortPrompt || process.env.AFFILIATE_TIKTOK_USE_SHORT_PROMPT || 'false').toLowerCase() === 'true',
  voiceGender: cliArgs.voiceGender || process.env.AFFILIATE_TIKTOK_VOICE_GENDER || 'female',
  voicePace: cliArgs.voicePace || process.env.AFFILIATE_TIKTOK_VOICE_PACE || 'fast',
  startStep: toInteger(cliArgs.startStep || process.env.AFFILIATE_TIKTOK_START_STEP, 1),
  endStep: toInteger(cliArgs.endStep || process.env.AFFILIATE_TIKTOK_END_STEP, 6),
  flowId: cliArgs.flowId || process.env.AFFILIATE_TIKTOK_FLOW_ID || null,
  characterImagePath: cliArgs.characterImagePath || process.env.AFFILIATE_TIKTOK_CHARACTER_IMAGE || path.join(backendRoot, 'test-images', 'anh-nhan-vat.png'),
  productImagePath: cliArgs.productImagePath || process.env.AFFILIATE_TIKTOK_PRODUCT_IMAGE || path.join(backendRoot, 'test-images', 'anh-san-pham.webp')
};

if (defaultConfig.startStep < 1 || defaultConfig.endStep > 6 || defaultConfig.startStep > defaultConfig.endStep) {
  throw new Error(`Invalid step range: ${defaultConfig.startStep}-${defaultConfig.endStep}`);
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function createFlowId(sessionIndex) {
  return `affiliate-tiktok-flow-${Date.now()}-${sessionIndex}-${Math.random().toString(36).slice(2, 8)}`;
}

function printStepHeader(sessionIndex, stepNumber, title, phase = 'run') {
  const prefix = phase === 'bootstrap' ? 'Bootstrap' : 'Run';
  console.log(`\n[Session ${sessionIndex}] ${prefix} Step ${stepNumber}: ${title}`);
}

function stepUrl(config, stepPath) {
  return `${config.apiBase.replace(/\/$/, '')}/api/ai/affiliate-video-tiktok/${stepPath}`;
}

async function postJson(url, payload) {
  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 30 * 60 * 1000,
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
    timeout: 30 * 60 * 1000,
    validateStatus: () => true
  });

  if (response.status >= 400 || response.data?.success === false) {
    const message = response.data?.error || response.data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.data;
}

async function getFlowStatus(config, flowId) {
  const response = await axios.get(stepUrl(config, `status/${flowId}`), {
    timeout: 30 * 60 * 1000,
    validateStatus: () => true
  });

  if (response.status >= 400 || response.data?.success === false) {
    const message = response.data?.error || response.data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.data;
}

async function waitForStep2Completion(config, flowId) {
  const startedAt = Date.now();
  const timeoutMs = 30 * 60 * 1000;
  let lastMessage = '';

  while (Date.now() - startedAt < timeoutMs) {
    const status = await getFlowStatus(config, flowId);
    const step2 = status?.flowState?.step2 || {};
    const jobStatus = step2.status || 'idle';
    const progress = step2.progress || {};
    const message = `${jobStatus}:${progress.completedFrames || 0}/${progress.totalFrames || 0}:${progress.message || ''}`;

    if (message !== lastMessage) {
      console.log(`  ... Step 2 ${jobStatus} (${progress.completedFrames || 0}/${progress.totalFrames || 0}) ${progress.message || ''}`.trim());
      lastMessage = message;
    }

    if (jobStatus === 'completed') {
      return {
        storyboardBlueprint: step2.storyboardBlueprint || null,
        frameLibrary: step2.frameLibrary || [],
        wearingImage: step2.images?.wearing?.path || null,
        holdingImage: step2.images?.holding?.path || null,
        step_duration: step2.duration || null
      };
    }

    if (jobStatus === 'failed') {
      throw new Error(step2.error || progress.message || 'Step 2 background job failed');
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error('Timed out waiting for Step 2 background job to complete');
}

async function runStep(config, sessionIndex, flowId, stepNumber) {
  const phase = stepNumber < config.startStep ? 'bootstrap' : 'run';

  switch (stepNumber) {
    case 1: {
      printStepHeader(sessionIndex, 1, 'Analyze Images', phase);
      const form = new FormData();
      form.append('flowId', flowId);
      form.append('characterImage', fs.createReadStream(config.characterImagePath));
      form.append('productImage', fs.createReadStream(config.productImagePath));
      const step1 = await postMultipart(stepUrl(config, 'step-1-analyze'), form);
      console.log(`  OK ${step1.step_duration}s`);
      return {
        duration: step1.step_duration,
        analysisKeys: Object.keys(step1.analysis || {})
      };
    }
    case 2: {
      printStepHeader(sessionIndex, 2, 'Generate Images', phase);
      let step2 = await postJson(stepUrl(config, 'step-2-generate-images'), {
        flowId,
        videoDuration: config.videoDuration,
        aspectRatio: config.aspectRatio,
        scene: config.scene,
        language: config.language,
        characterName: config.characterName,
        characterAlias: config.characterAlias,
        useShortPrompt: config.useShortPrompt
      });

      if (step2.queued || step2.status === 'processing' || step2.job?.status === 'processing') {
        step2 = await waitForStep2Completion(config, flowId);
      }

      console.log(`  OK ${step2.step_duration}s`);
      return {
        duration: step2.step_duration,
        storyboardTemplate: step2.storyboardBlueprint?.templateKey || null,
        frameCount: Array.isArray(step2.frameLibrary) ? step2.frameLibrary.length : 0,
        frameKeys: Array.isArray(step2.frameLibrary) ? step2.frameLibrary.map((frame) => frame.frameKey) : [],
        wearingImage: step2.wearingImage,
        holdingImage: step2.holdingImage
      };
    }
    case 3: {
      printStepHeader(sessionIndex, 3, 'Deep Analysis', phase);
      const step3 = await postJson(stepUrl(config, 'step-3-deep-analysis'), {
        flowId,
        videoDuration: config.videoDuration,
        productFocus: config.productFocus,
        language: config.language
      });
      console.log(`  OK ${step3.step_duration}s`);
      return {
        duration: step3.step_duration,
        storyboardTemplate: step3.storyboardBlueprint?.templateKey || step3.metadata?.storyboardTemplate || null,
        scriptsCount: Array.isArray(step3.videoScripts) ? step3.videoScripts.length : 0,
        segmentCount: Array.isArray(step3.segmentPlan) ? step3.segmentPlan.length : 0,
        hashtagsCount: Array.isArray(step3.hashtags) ? step3.hashtags.length : 0,
        voiceoverLength: typeof step3.voiceoverScript === 'string' ? step3.voiceoverScript.length : 0
      };
    }
    case 4: {
      printStepHeader(sessionIndex, 4, 'Generate Video', phase);
      const step4 = await postJson(stepUrl(config, 'step-4-generate-video'), {
        flowId,
        videoDuration: config.videoDuration,
        aspectRatio: config.aspectRatio
      });
      console.log(`  OK ${step4.step_duration}s`);
      return {
        duration: step4.step_duration,
        videoPath: step4.videoPath,
        segmentVideoCount: Array.isArray(step4.segmentVideos) ? step4.segmentVideos.length : 0,
        stitchedVideoPath: step4.stitchedVideoPath || null,
        assemblyStatus: step4.assemblyStatus || null,
        requiresAssembly: Boolean(step4.requiresAssembly)
      };
    }
    case 5: {
      printStepHeader(sessionIndex, 5, 'Generate Voiceover', phase);
      const step5 = await postJson(stepUrl(config, 'step-5-generate-voiceover'), {
        flowId,
        voiceGender: config.voiceGender,
        voicePace: config.voicePace,
        language: config.language
      });
      console.log(`  OK ${step5.step_duration}s`);
      return {
        duration: step5.step_duration,
        audioPath: step5.audioPath
      };
    }
    case 6: {
      printStepHeader(sessionIndex, 6, 'Finalize', phase);
      const step6 = await postJson(stepUrl(config, 'step-6-finalize'), { flowId });
      console.log(`  OK total ${step6.total_duration}s`);
      return {
        totalDuration: step6.total_duration,
        finalVideoPath: step6.finalPackage?.video?.path || null,
        finalAudioPath: step6.finalPackage?.audio?.path || null,
        finalPackage: step6.finalPackage || null
      };
    }
    default:
      throw new Error(`Unsupported step ${stepNumber}`);
  }
}

async function runSingleSession(config, sessionIndex) {
  const flowId = config.flowId || createFlowId(sessionIndex);
  const startedAt = new Date().toISOString();
  const stepResults = {};
  const firstStepToExecute = config.flowId ? config.startStep : 1;

  try {
    for (let stepNumber = firstStepToExecute; stepNumber <= config.endStep; stepNumber += 1) {
      stepResults[`step${stepNumber}`] = await runStep(config, sessionIndex, flowId, stepNumber);
    }

    return {
      success: true,
      session: sessionIndex,
      flowId,
      startedAt,
      completedAt: new Date().toISOString(),
      requestedRange: { startStep: config.startStep, endStep: config.endStep },
      bootstrapped: !config.flowId && config.startStep > 1,
      steps: stepResults,
      finalPackage: stepResults.step6?.finalPackage || null
    };
  } catch (error) {
    return {
      success: false,
      session: sessionIndex,
      flowId,
      startedAt,
      completedAt: new Date().toISOString(),
      requestedRange: { startStep: config.startStep, endStep: config.endStep },
      bootstrapped: !config.flowId && config.startStep > 1,
      steps: stepResults,
      error: error.message
    };
  }
}

async function main() {
  ensureFile(defaultConfig.characterImagePath, 'Character image');
  ensureFile(defaultConfig.productImagePath, 'Product image');

  console.log('Affiliate TikTok Flow Runner');
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
  const reportPath = path.join(
    reportDir,
    `affiliate-tiktok-flow-step-${defaultConfig.startStep}-${defaultConfig.endStep}-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\nReport: ${reportPath}`);

  const hasFailure = results.some((result) => !result.success);
  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

