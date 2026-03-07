#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import CharacterProfile from '../models/CharacterProfile.js';
import PromptOption from '../models/PromptOption.js';
import ChatGPTService from '../services/browser/chatgptService.js';
import { buildDetailedPrompt } from '../services/smartPromptBuilder.js';
import { buildAnalysisPrompt, normalizeOptionLibrary, parseRecommendations } from '../controllers/browserAutomationController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const TEST_CONFIG = {
  productFocus: 'full-outfit',
  aspectRatio: '9:16',
  language: 'vi',
  useCase: 'affiliate-video-tiktok',
  useShortPrompt: false,
  fallbackScene: 'linhphap-bedroom-lifestyle',
  characterImagePath: path.join(backendRoot, 'test-images', 'anh-nhan-vat.png'),
  productImagePath: path.join(backendRoot, 'test-images', 'anh-san-pham.webp')
};

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function buildAffiliateAnalysisShape(parsedRecommendations, productFocus = 'full-outfit') {
  const characterProfile = parsedRecommendations?.characterProfile || {};
  const productDetails = parsedRecommendations?.productDetails || {};

  return {
    ...parsedRecommendations,
    characterProfile,
    productDetails,
    character: { ...characterProfile },
    product: { ...productDetails, focus: productFocus },
    recommendations: Object.fromEntries(
      Object.entries(parsedRecommendations || {}).filter(([key, value]) => !['characterProfile', 'productDetails', 'analysis', 'newOptions', 'character', 'product', 'recommendations'].includes(key) && value)
    )
  };
}

function normalizeAppliedOptionValue(category, value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((item) => !['not-applicable', 'not-needed', 'keep-current'].includes(item.toLowerCase()));
  }

  const normalized = String(value || '').trim();
  if (!normalized || ['not-applicable', 'not-needed', 'keep-current'].includes(normalized.toLowerCase())) {
    return null;
  }

  if (category === 'accessories' && normalized.includes(',')) {
    return normalized.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return normalized;
}

function buildAppliedOptions(analysis, sceneOption, character) {
  const recommendations = analysis?.recommendations || {};

  return {
    scene: normalizeAppliedOptionValue('scene', recommendations.scene?.choice) || sceneOption.value,
    lighting: normalizeAppliedOptionValue('lighting', recommendations.lighting?.choice) || 'soft-diffused',
    mood: normalizeAppliedOptionValue('mood', recommendations.mood?.choice) || 'confident',
    style: normalizeAppliedOptionValue('style', recommendations.style?.choice) || 'minimalist',
    colorPalette: normalizeAppliedOptionValue('colorPalette', recommendations.colorPalette?.choice) || 'neutral',
    cameraAngle: normalizeAppliedOptionValue('cameraAngle', recommendations.cameraAngle?.choice) || 'eye-level',
    hairstyle: normalizeAppliedOptionValue('hairstyle', recommendations.hairstyle?.choice) || '',
    makeup: normalizeAppliedOptionValue('makeup', recommendations.makeup?.choice) || '',
    bottoms: normalizeAppliedOptionValue('bottoms', recommendations.bottoms?.choice) || '',
    shoes: normalizeAppliedOptionValue('shoes', recommendations.shoes?.choice) || '',
    accessories: normalizeAppliedOptionValue('accessories', recommendations.accessories?.choiceArray || recommendations.accessories?.choice) || [],
    outerwear: normalizeAppliedOptionValue('outerwear', recommendations.outerwear?.choice) || '',
    aspectRatio: TEST_CONFIG.aspectRatio,
    language: TEST_CONFIG.language,
    characterName: character.name,
    characterAlias: character.alias,
    characterDisplayName: character.name,
    detailLevel: 'detailed'
  };
}

async function loadCharacter() {
  const characters = await CharacterProfile.find({ status: 'active' }).sort({ updatedAt: -1 }).lean();
  const character = characters.find((item) => {
    const haystack = `${item.name || ''} ${item.alias || ''}`.toLowerCase();
    return haystack.includes('linh') && (haystack.includes('phap') || haystack.includes('ph�p'));
  }) || characters[0];

  if (!character) {
    throw new Error('No active character found in DB');
  }

  return character;
}

async function loadSceneOption() {
  const exact = await PromptOption.findOne({ category: 'scene', value: TEST_CONFIG.fallbackScene, isActive: true }).lean();
  if (exact) return exact;

  const scenes = await PromptOption.find({ category: 'scene', isActive: true }).sort({ sortOrder: 1, usageCount: -1 }).lean();
  const fallback = scenes.find((scene) => {
    const haystack = [scene.value, scene.label, scene.labelVi, scene.description, scene.descriptionVi].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes('bedroom') || haystack.includes('phong ngu');
  });

  if (!fallback) {
    throw new Error('Scene bedroom Linh Phap not found in DB');
  }

  return fallback;
}

async function loadOptionsLibrary() {
  const options = await PromptOption.find({ isActive: true }).sort({ category: 1, sortOrder: 1, usageCount: -1, label: 1 }).lean();
  const grouped = options.reduce((acc, option) => {
    if (!acc[option.category]) acc[option.category] = [];
    acc[option.category].push({ value: option.value, label: option.label });
    return acc;
  }, {});

  return normalizeOptionLibrary(grouped);
}

function extractAnalysisText(result) {
  if (!result) return '';
  if (typeof result === 'string') return result;
  if (result.success && typeof result.data === 'string') return result.data;
  if (result.success && result.data && typeof result.data === 'object') return JSON.stringify(result.data);
  if (typeof result.data === 'string') return result.data;
  return typeof result === 'object' ? JSON.stringify(result) : String(result || '');
}

async function buildPromptVariants(analysis, appliedOptions) {
  const languages = ['vi', 'en'];
  const variants = {};

  for (const language of languages) {
    const optionsForLanguage = { ...appliedOptions, language };
    variants[language] = {
      wearing: await buildDetailedPrompt(
        analysis,
        optionsForLanguage,
        'change-clothes',
        TEST_CONFIG.productFocus,
        language,
        { useShortPrompt: TEST_CONFIG.useShortPrompt }
      ),
      holding: await buildDetailedPrompt(
        analysis,
        optionsForLanguage,
        'character-holding-product',
        TEST_CONFIG.productFocus,
        language,
        { useShortPrompt: TEST_CONFIG.useShortPrompt }
      )
    };
  }

  return variants;
}

async function main() {
  ensureFile(TEST_CONFIG.characterImagePath, 'Character image');
  ensureFile(TEST_CONFIG.productImagePath, 'Product image');

  await connectDB();

  const character = await loadCharacter();
  const sceneOption = await loadSceneOption();
  const optionsLibrary = await loadOptionsLibrary();

  console.log('Using character:', character.name, `(${character.alias})`);
  console.log('Using scene:', sceneOption.value, '-', sceneOption.label || sceneOption.labelVi || sceneOption.value);
  console.log('Character image:', TEST_CONFIG.characterImagePath);
  console.log('Product image:', TEST_CONFIG.productImagePath);

  const analysisPrompt = buildAnalysisPrompt({
    scene: sceneOption.value,
    lighting: 'soft-diffused',
    mood: 'confident',
    style: 'minimalist',
    colorPalette: 'neutral',
    cameraAngle: 'eye-level',
    aspectRatio: TEST_CONFIG.aspectRatio,
    useCase: TEST_CONFIG.useCase,
    productFocus: TEST_CONFIG.productFocus,
    selectedCharacter: character,
    optionsLibrary
  });

  const chatGPTService = new ChatGPTService({ debug: false });
  let rawResult;

  try {
    await chatGPTService.initialize();
    rawResult = await chatGPTService.analyzeMultipleImages(
      [TEST_CONFIG.characterImagePath, TEST_CONFIG.productImagePath],
      analysisPrompt
    );
  } finally {
    await chatGPTService.close().catch(() => {});
  }

  const analysisText = extractAnalysisText(rawResult);
  if (!analysisText) {
    throw new Error('Empty analysis text returned from ChatGPT');
  }

  const parsedRecommendations = parseRecommendations(analysisText, optionsLibrary);
  const analysis = buildAffiliateAnalysisShape(parsedRecommendations, TEST_CONFIG.productFocus);
  const appliedOptions = buildAppliedOptions(analysis, sceneOption, character);

  const promptVariants = await buildPromptVariants(analysis, appliedOptions);

  const output = {
    createdAt: new Date().toISOString(),
    config: {
      ...TEST_CONFIG,
      scene: sceneOption.value,
      sceneLabel: sceneOption.label || sceneOption.labelVi || sceneOption.value,
      characterId: String(character._id),
      characterName: character.name,
      characterAlias: character.alias
    },
    analysisSummary: {
      characterProfile: analysis.characterProfile,
      productDetails: analysis.productDetails,
      analysis: analysis.analysis,
      recommendations: analysis.recommendations,
      newOptions: analysis.newOptions || {}
    },
    appliedOptions,
    prompts: promptVariants,
    rawAnalysisText: analysisText
  };

  const outputDir = path.join(backendRoot, 'test-affiliate');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `step1-affiliate-prompts-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log('\n=== Applied Options ===');
  console.log(JSON.stringify(appliedOptions, null, 2));
  console.log('\n=== Wearing Prompt (VI) ===\n');
  console.log(promptVariants.vi.wearing.prompt || promptVariants.vi.wearing);
  console.log('\n=== Holding Prompt (VI) ===\n');
  console.log(promptVariants.vi.holding.prompt || promptVariants.vi.holding);
  console.log('\n=== Wearing Prompt (EN) ===\n');
  console.log(promptVariants.en.wearing.prompt || promptVariants.en.wearing);
  console.log('\n=== Holding Prompt (EN) ===\n');
  console.log(promptVariants.en.holding.prompt || promptVariants.en.holding);
  console.log('\nSaved report:', outputPath);
}

main()
  .catch((error) => {
    console.error('\nStep 1 affiliate prompt test failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
