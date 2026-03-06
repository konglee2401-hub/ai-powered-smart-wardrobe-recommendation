import mongoose from 'mongoose';

// 💫 FIX: Define all schemas explicitly as nested mongoose.Schema objects
const referenceImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  path: { type: String, default: '' },
  angle: { type: String, default: '' },
  type: { type: String, default: '' },
  prompt: { type: String, default: '' },
  seed: { type: mongoose.Schema.Types.Number, default: null },
  filename: { type: String, default: '' }
}, { _id: false, strict: false });

const identitySchema = new mongoose.Schema({
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
}, { _id: false });

const faceSchema = new mongoose.Schema({
  faceShape: String,
  eyeShape: String,
  eyeColor: String,
  eyebrowStyle: String,
  noseType: String,
  lipShape: String,
  jawline: String,
  smileStyle: String
}, { _id: false });

const hairSchema = new mongoose.Schema({
  color: String,
  length: String,
  texture: String,
  style: String,
  parting: String,
  fringe: String
}, { _id: false });

const stylingSchema = new mongoose.Schema({
  makeupStyle: String,
  accessories: String,
  jewelry: String,
  nails: String,
  footwearPreference: String,
  outfitVibe: String
}, { _id: false });

const capturePlanSchema = new mongoose.Schema({
  imageCount: { type: Number, default: 4 },
  aspectRatio: { type: String, default: '9:16' },
  backgroundStyle: String,
  lightingStyle: String,
  cameraLens: String,
  expressionRange: String,
  poseDirection: String
}, { _id: false });

const characterOptionSchema = new mongoose.Schema({
  identity: identitySchema,
  face: faceSchema,
  hair: hairSchema,
  styling: stylingSchema,
  capturePlan: capturePlanSchema,
  extraPromptNotes: String
}, { _id: false });

const characterProfileSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  alias: { type: String, required: true, trim: true, unique: true, index: true },
  portraitUrl: { type: String, required: true },
  portraitPath: { type: String, default: '' },
  referenceImages: { type: [referenceImageSchema], default: [] },
  options: { type: characterOptionSchema, default: {} },
  analysisProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: { type: String, enum: ['draft', 'active'], default: 'active', index: true },
  createdBy: { type: String, default: 'system' }
}, { timestamps: true });

export default mongoose.model('CharacterProfile', characterProfileSchema);
