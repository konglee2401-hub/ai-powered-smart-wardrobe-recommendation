import mongoose from 'mongoose';
import PromptOption from '../../models/PromptOption.js';

const APPEND_RULE_EN = 'Bright commercial lighting, medium-close camera framing, clear center standing zone for subject movement, practical prop orientation toward camera, light wall/prop palette (white/cream/light gray/warm wood), avoid dark moody look.';
const APPEND_RULE_VI = 'Ánh sáng thương mại sáng rõ, góc máy trung-cận, có vùng trống trung tâm cho nhân vật di chuyển, đạo cụ đặt đúng hướng camera, tường/vật phẩm tông sáng (trắng/kem/xám nhạt/gỗ sáng), tránh không khí tối u ám.';

function appendIfMissing(text = '', appendText = '') {
  if (!text) return appendText;
  if (text.toLowerCase().includes('clear center standing zone')) return text;
  return `${text.trim()} ${appendText}`.trim();
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ai';
  await mongoose.connect(uri);
  console.log('✅ Connected MongoDB');

  const scenes = await PromptOption.find({ category: 'scene' });
  let updated = 0;

  for (const scene of scenes) {
    const nextPrompt = appendIfMissing(scene.sceneLockedPrompt || '', APPEND_RULE_EN);
    const nextPromptVi = appendIfMissing(scene.sceneLockedPromptVi || '', APPEND_RULE_VI);

    const technicalDetails = {
      ...(scene.technicalDetails || {}),
      lighting: 'bright commercial, no dark moody shadows',
      camera: 'medium-close framing, subject-dominant, eye-level to slight high angle',
      layout: 'clear center standing zone + practical interaction props',
      constraints: 'keep subject area clear; avoid clutter blocking movement path'
    };

    if (nextPrompt !== scene.sceneLockedPrompt || nextPromptVi !== scene.sceneLockedPromptVi) {
      scene.sceneLockedPrompt = nextPrompt;
      scene.sceneLockedPromptVi = nextPromptVi;
      scene.technicalDetails = technicalDetails;
      await scene.save();
      updated += 1;
      console.log(`✅ Updated scene: ${scene.value}`);
    }
  }

  console.log(`🎉 Done. Updated ${updated}/${scenes.length} scene prompts.`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('❌ Failed:', e.message);
  await mongoose.disconnect();
  process.exit(1);
});
