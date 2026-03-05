import mongoose from 'mongoose';

const characterOptionSchema = new mongoose.Schema({
  identity: {
    gender: String,
    ageRange: String,
    ethnicity: String,
    height: String,
    bust: String,
    waist: String,
    bodyType: String,
    bodyProportions: String,
    skinTone: String,
    distinctiveMarks: String,
    tattoos: String
  },
  face: {
    faceShape: String,
    eyeShape: String,
    eyeColor: String,
    eyebrowStyle: String,
    noseType: String,
    lipShape: String,
    jawline: String,
    smileStyle: String
  },
  hair: {
    color: String,
    length: String,
    texture: String,
    style: String,
    parting: String,
    fringe: String
  },
  styling: {
    makeupStyle: String,
    accessories: String,
    jewelry: String,
    nails: String,
    footwearPreference: String,
    outfitVibe: String
  },
  capturePlan: {
    imageCount: { type: Number, default: 4 },
    aspectRatio: { type: String, default: '9:16' },
    backgroundStyle: String,
    lightingStyle: String,
    cameraLens: String,
    expressionRange: String,
    poseDirection: String
  },
  extraPromptNotes: String
}, { _id: false });

// 💫 Explicit subdocument schema for reference images
const referenceImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  path: { type: String, default: '' },
  angle: { type: String, default: '' },
  type: { type: String, default: 'portrait' },
  prompt: { type: String, default: '' },
  seed: { type: Number, default: null }
}, { _id: false });

const characterProfileSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  alias: { type: String, required: true, trim: true, unique: true, index: true },
  portraitUrl: { type: String, required: true },
  portraitPath: { type: String, default: '' },
  referenceImages: [referenceImageSchema],
  options: { type: characterOptionSchema, default: {} },
  analysisProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: { type: String, enum: ['draft', 'active'], default: 'active', index: true },
  createdBy: { type: String, default: 'system' }
}, { timestamps: true });

export default mongoose.model('CharacterProfile', characterProfileSchema);
