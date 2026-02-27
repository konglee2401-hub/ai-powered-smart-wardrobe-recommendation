import mongoose from 'mongoose';
import 'dotenv/config';
import PromptOption from '../../models/PromptOption.js';
import {
  generateSceneLockPromptWithChatGPT,
  generateSceneLockImagesWithGoogleFlow
} from '../../services/sceneLockService.js';

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const idx = args.findIndex((a) => a === `--${name}`);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
};

const sceneValue = getArg('scene', 'studio');
const mode = getArg('mode', 'create');
const imageCount = Number(getArg('count', '2'));
const aspectRatio = getArg('ratio', '1:1');
const styleDirection = getArg('styleDirection', '');
const improvementNotes = getArg('improvementNotes', '');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ai';
  await mongoose.connect(uri);
  console.log('✅ Connected MongoDB');

  const scene = await PromptOption.findOne({ category: 'scene', value: sceneValue });
  if (!scene) {
    throw new Error(`Scene not found: ${sceneValue}`);
  }

  console.log(`\n🧠 Generating lock prompt for scene: ${sceneValue}`);
  const promptResult = await generateSceneLockPromptWithChatGPT(scene, {
    mode,
    styleDirection,
    improvementNotes
  });

  scene.sceneLockedPrompt = promptResult.parsed.sceneLockedPrompt;
  scene.promptSuggestion = promptResult.parsed.promptSuggestion || scene.promptSuggestion;
  scene.technicalDetails = {
    ...(scene.technicalDetails || {}),
    ...(promptResult.parsed.technicalDetails || {})
  };

  console.log(`✅ sceneLockedPrompt updated (${scene.sceneLockedPrompt.length} chars)`);

  console.log(`\n🎨 Generating ${imageCount} scene preview images via Google Flow...`);
  const generated = await generateSceneLockImagesWithGoogleFlow({
    prompt: scene.sceneLockedPrompt,
    imageCount: Math.max(1, Math.min(4, imageCount)),
    aspectRatio,
    sceneValue
  });

  scene.sceneLockSamples = generated.map((item) => ({
    url: item.path || item.url,
    prompt: scene.sceneLockedPrompt,
    provider: 'google-flow',
    createdAt: new Date(),
    isDefault: false
  }));

  if (!scene.sceneLockedImageUrl && scene.sceneLockSamples[0]) {
    scene.sceneLockSamples[0].isDefault = true;
    scene.sceneLockedImageUrl = scene.sceneLockSamples[0].url;
  }

  await scene.save();

  console.log('\n✅ Workflow complete.');
  console.log(`Scene: ${scene.value}`);
  console.log(`Locked prompt: ${scene.sceneLockedPrompt}`);
  console.log('Generated samples:');
  scene.sceneLockSamples.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.url}`);
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('❌ Scene lock workflow failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
