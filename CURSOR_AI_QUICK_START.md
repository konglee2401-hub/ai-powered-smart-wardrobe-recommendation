# 🤖 CURSOR AI QUICK START GUIDE

**For:** Cursor AI (Free or Pro)  
**Purpose:** Complete implementation guide with copy-paste instructions  
**Project:** Smart Wardrobe AI  
**Date:** February 2026

---

## ⚠️ IMPORTANT

This guide is designed for **Cursor AI** with limited context windows. Each section is **self-contained** and can be copy-pasted directly.

**DO NOT skip steps. DO NOT modify code unless instructed.**

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Backend Setup](#2-backend-setup)
3. [Frontend Setup](#3-frontend-setup)
4. [Environment Configuration](#4-environment-configuration)
5. [Testing](#5-testing)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. PROJECT OVERVIEW

### What is Smart Wardrobe AI?

A complete AI-powered platform for creating fashion videos from images:

```
Upload Images → AI Analysis → Generate Prompt → Generate Images → Create Videos
```

### Architecture

```
Frontend (React + Vite + TailwindCSS)
    ↓
Backend (Node.js + Express)
    ↓
20+ AI Models (Anthropic, OpenAI, Google, etc.)
    ↓
Image Gen (FLUX, SDXL, SeeDream)
    ↓
Video Gen (Runway, Luma)
```

### Project Structure

```
smart-wardrobe/
├── backend/
│   ├── controllers/
│   │   ├── aiController.js          # Main AI logic with fallback
│   │   ├── modelTestController.js  # Model testing
│   │   └── pipelineController.js  # Pipeline logic
│   ├── services/
│   │   ├── googleGeminiService.js # Gemini models
│   │   ├── byteplusService.js     # BytePlus SeeDream
│   │   ├── fireworksVisionService.js # Fireworks models
│   │   ├── grokChatService.js     # xAI Grok
│   │   ├── zaiChatService.js      # Z.AI Chat
│   │   ├── imageGenService.js     # Image generation
│   │   └── videoGenService.js     # Video generation
│   ├── routes/
│   │   ├── aiRoutes.js
│   │   ├── imageGenRoutes.js
│   │   ├── videoRoutes.js
│   │   └── modelTestRoutes.js
│   ├── server.js
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── UnifiedVideoGeneration.jsx
│   │   │   ├── PromptBuilder.jsx
│   │   │   └── ModelTester.jsx
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── package.json
```

---

## 2. BACKEND SETUP

### Step 2.1: Create Directory Structure

```bash
# Create main project
mkdir smart-wardrobe
cd smart-wardrobe

# Create backend
mkdir backend
cd backend
npm init -y

# Create directories
mkdir -p controllers
mkdir -p services
mkdir -p routes
mkdir -p models
mkdir -p middleware
mkdir -p config
mkdir -p utils
mkdir -p uploads/characters
mkdir -p uploads/products
mkdir -p uploads/generated
mkdir -p uploads/videos
mkdir -p test-images
```

### Step 2.2: Install Backend Dependencies

```bash
cd backend

# Core dependencies
npm install express cors dotenv mongoose multer axios

# AI SDKs
npm install @anthropic-ai/sdk openai @google/generative-ai

# Utilities
npm install form-data

# Dev dependencies
npm install --save-dev nodemon
```

### Step 2.3: Update package.json

```json
{
  "name": "smart-wardrobe-backend",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "node test-analysis-models.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "mongoose": "^8.0.0",
    "multer": "^1.4.5-lts.1",
    "axios": "^1.6.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.20.0",
    "@google/generative-ai": "^0.1.0",
    "form-data": "^4.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### Step 2.4: Create server.js

**File:** `backend/server.js`

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
import aiRoutes from './routes/aiRoutes.js';
import imageGenRoutes from './routes/imageGenRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import modelTestRoutes from './routes/modelTestRoutes.js';

app.use('/api/ai', aiRoutes);
app.use('/api/image-gen', imageGenRoutes);
app.use('/api/video-gen', videoRoutes);
app.use('/api/model-test', modelTestRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 SMART WARDROBE AI - BACKEND');
  console.log('='.repeat(80));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(80) + '\n');
});

export default app;
```

### Step 2.5: Create .env.example

**File:** `backend/.env.example`

```env
# ==================== SERVER ====================
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# ==================== ANTHROPIC (CLAUDE) ====================
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=

# ==================== OPENAI (GPT) ====================
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=

# ==================== GOOGLE (GEMINI) ====================
# Get from: https://aistudio.google.com/app/apikey (FREE)
GOOGLE_API_KEY=

# ==================== BYTEPLUS ====================
# Get from: https://console.byteplus.com/
BYTEPLUS_API_KEY=

# ==================== FIREWORKS AI ====================
# Get from: https://fireworks.ai/account/api-keys
FIREWORKS_API_KEY=

# ==================== Z.AI CHAT ====================
# Get from: https://chat.z.ai/ (Browser cookies)
ZAI_SESSION=

# ==================== GROK ====================
# Get from: https://grok.com/
GROK_SSO=
GROK_SSO_RW=
GROK_USER_ID=

# ==================== IMAGE GENERATION ====================
# Get from: https://replicate.com/account/api-tokens
REPLICATE_API_TOKEN=

# Get from: https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=

# ==================== VIDEO GENERATION ====================
# Get from: https://runwayml.com/
RUNWAY_API_KEY=

# Get from: https://lumalabs.ai/
LUMA_API_KEY=
```

### Step 2.6: Create Routes

**File:** `backend/routes/aiRoutes.js`

```javascript
import express from 'express';
import multer from 'multer';
import * as aiController from '../controllers/aiController.js';

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Routes
router.post('/analyze-character', upload.single('image'), aiController.analyzeCharacterImage);
router.post('/analyze-product', upload.single('image'), aiController.analyzeProductImage);
router.get('/models', aiController.getAvailableModels);

export default router;
```

**File:** `backend/routes/imageGenRoutes.js`

```javascript
import express from 'express';
import multer from 'multer';
import * as imageGenService from '../services/imageGenService.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp' });

router.post('/generate', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { prompt, negativePrompt, count, selectedModel } = req.body;
    const characterImage = req.files?.characterImage?.[0]?.path;
    const productImage = req.files?.productImage?.[0]?.path;

    const result = await imageGenService.generateImages(
      prompt,
      negativePrompt,
      parseInt(count) || 4,
      characterImage,
      productImage,
      selectedModel
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/models', async (req, res) => {
  try {
    const models = await imageGenService.getAvailableModels();
    res.json({ success: true, data: { models } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
```

**File:** `backend/routes/videoRoutes.js`

```javascript
import express from 'express';
import * as videoGenService from '../services/videoGenService.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { imageUrls } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide at least one image URL' 
      });
    }

    const result = await videoGenService.generateVideos(imageUrls);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
```

**File:** `backend/routes/modelTestRoutes.js`

```javascript
import express from 'express';
import multer from 'multer';
import * as modelTestController from '../controllers/modelTestController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp' });

router.post('/test-single', upload.single('image'), modelTestController.testSingleModel);
router.post('/test-all', upload.single('image'), modelTestController.testAllModels);
router.get('/results', modelTestController.getTestResults);

export default router;
```

### Step 2.7: Create AI Controller

**File:** `backend/controllers/aiController.js`

This is the **MOST IMPORTANT** file. It contains:

1. **ANALYSIS_MODELS** array (20+ models)
2. **analyzeWithFallback()** function (automatic fallback)
3. **analyzeCharacterImage()** endpoint
4. **analyzeProductImage()** endpoint
5. **getAvailableModels()** endpoint

**COPY THIS COMPLETE FILE:**

```javascript
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// Import services
import * as googleGeminiService from '../services/googleGeminiService.js';
import * as byteplusService from '../services/byteplusService.js';
import * as fireworksVisionService from '../services/fireworksVisionService.js';
import * as grokChatService from '../services/grokChatService.js';
import * as zaiChatService from '../services/zaiChatService.js';

// ==================== ANALYSIS MODELS ====================

export const ANALYSIS_MODELS = [
  // Tier 1: Premium Models
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    priority: 1,
    recommended: true,
    free: false,
    analyze: async (imagePath, prompt) => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      const imageBuffer = fs.readFileSync(imagePath);
      const base64 = imageBuffer.toString('base64');
      
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: prompt }
          ]
        }]
      });
      
      return response.content[0].text;
    },
    isAvailable: () => !!process.env.ANTHROPIC_API_KEY
  },
  
  // Tier 2: Google Gemini (FREE)
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    priority: 3,
    recommended: true,
    free: true,
    analyze: async (imagePath, prompt) => {
      return await googleGeminiService.analyzeWithGemini(imagePath, prompt, 'gemini-2.0-flash-exp');
    },
    isAvailable: () => !!process.env.GOOGLE_API_KEY
  },
  
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    priority: 4,
    recommended: true,
    free: true,
    analyze: async (imagePath, prompt) => {
      return await googleGeminiService.analyzeWithGemini(imagePath, prompt, 'gemini-2.0-pro-exp');
    },
    isAvailable: () => !!process.env.GOOGLE_API_KEY
  },
  
  // Tier 3: BytePlus
  {
    id: 'byteplus-doubao-vision-pro',
    name: 'Doubao Vision Pro',
    provider: 'byteplus',
    priority: 9,
    recommended: true,
    free: false,
    analyze: async (imagePath, prompt) => {
      return await byteplusService.analyzeWithDoubao(imagePath, prompt, 'doubao-vision-pro');
    },
    isAvailable: () => !!process.env.BYTEPLUS_API_KEY
  },
  
  // Tier 4: Fireworks
  {
    id: 'fireworks-qwen2-vl-7b',
    name: 'Qwen2-VL 7B',
    provider: 'fireworks',
    priority: 8,
    recommended: false,
    free: false,
    analyze: async (imagePath, prompt) => {
      return await fireworksVisionService.analyzeWithQwen2VL(imagePath, prompt);
    },
    isAvailable: () => !!process.env.FIREWORKS_API_KEY
  },
  
  // Tier 5: Chat-based
  {
    id: 'zai-chat',
    name: 'Z.AI Chat',
    provider: 'zai',
    priority: 11,
    recommended: false,
    free: true,
    analyze: async (imagePath, prompt) => {
      return await zaiChatService.analyzeImage(imagePath, prompt);
    },
    isAvailable: () => !!process.env.ZAI_SESSION
  },
  
  {
    id: 'grok-chat',
    name: 'Grok Chat',
    provider: 'grok',
    priority: 12,
    recommended: false,
    free: false,
    analyze: async (imagePath, prompt) => {
      return await grokChatService.analyzeImage(imagePath, prompt);
    },
    isAvailable: () => !!(process.env.GROK_SSO || process.env.GROK_USER_ID)
  }
];

// ==================== ANALYZE WITH FALLBACK ====================

async function analyzeWithFallback(imagePath, prompt, preferredModelId = null) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 STARTING IMAGE ANALYSIS WITH FALLBACK');
  console.log('='.repeat(80));
  console.log(`📸 Image: ${imagePath}`);
  console.log(`🎯 Preferred model: ${preferredModelId || 'auto (priority-based)'}`);
  console.log(`📝 Prompt length: ${prompt.length} chars`);
  console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);
  
  // Sort models by priority
  let models = [...ANALYSIS_MODELS].sort((a, b) => a.priority - b.priority);
  
  // If preferred model specified, try it first
  if (preferredModelId) {
    const preferredModel = models.find(m => m.id === preferredModelId);
    if (preferredModel) {
      models = [preferredModel, ...models.filter(m => m.id !== preferredModelId)];
      console.log(`   ⭐ Prioritizing preferred model: ${preferredModel.name}`);
    }
  }
  
  console.log(`\n📊 Total models available: ${models.length}`);
  console.log(`🎯 Will try models in this order:`);
  models.slice(0, 5).forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.name} (${m.provider}) - Priority ${m.priority}`);
  });
  
  let lastError = null;
  let attemptCount = 0;
  
  for (const model of models) {
    attemptCount++;
    
    try {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`🔄 ATTEMPT ${attemptCount}/${models.length}: ${model.name}`);
      console.log(`   Provider: ${model.provider}`);
      console.log(`   Priority: ${model.priority}`);
      
      // Check availability
      const isAvailable = model.isAvailable();
      if (!isAvailable) {
        console.log(`   ⚠️  ${model.name} not available (missing credentials)`);
        continue;
      }
      
      console.log(`   ✅ Model is available`);
      console.log(`   🚀 Starting analysis...`);
      
      const startTime = Date.now();
      const result = await model.analyze(imagePath, prompt);
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`\n   ✅ ${model.name} SUCCEEDED!`);
      console.log(`   ⏱️  Duration: ${duration.toFixed(2)}s`);
      console.log(`   📊 Response length: ${result.length} chars`);
      
      if (attemptCount > 1) {
        console.log(`   ⚠️  Used fallback (${attemptCount - 1} models failed)`);
      }
      
      console.log('\n' + '='.repeat(80));
      console.log(`✅ ANALYSIS COMPLETE`);
      console.log(`🏆 Winner: ${model.name} (${model.provider})`);
      console.log(`⏱️  Total time: ${duration.toFixed(2)}s`);
      console.log(`🔄 Total attempts: ${attemptCount}`);
      console.log('='.repeat(80) + '\n');
      
      return {
        analysis: result,
        modelUsed: model.id,
        modelName: model.name,
        provider: model.provider,
        duration: duration,
        attemptCount: attemptCount
      };
      
    } catch (error) {
      console.error(`\n   ❌ ${model.name} FAILED`);
      console.error(`   📛 Error: ${error.message}`);
      
      if (error.response?.status) {
        console.error(`   🔢 Status code: ${error.response.status}`);
      }
      
      lastError = error;
      console.log(`   🔄 Moving to next model...`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`❌ ALL ${attemptCount} MODELS FAILED`);
  console.log('='.repeat(80) + '\n');
  
  throw lastError || new Error('All analysis models failed');
}

// ==================== CONTROLLER FUNCTIONS ====================

export const analyzeCharacterImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    const preferredModel = req.body.preferredModel;
    
    const prompt = `Analyze this fashion image in detail. Describe:
1. Character: age, ethnicity, gender, hair style, body type, facial features
2. Pose and expression
3. Clothing/accessories visible
4. Overall style and aesthetic

Provide a detailed description suitable for fashion e-commerce use.`;

    console.log('\n📤 Analyzing character image...');
    
    const result = await analyzeWithFallback(imagePath, prompt, preferredModel);

    res.json({
      success: true,
      data: {
        analysis: { character: result.analysis },
        ...result
      }
    });

  } catch (error) {
    console.error('Character analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const analyzeProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    const preferredModel = req.body.preferredModel;
    
    const prompt = `Analyze this fashion product image in detail. Describe:
1. Product type (dress, shirt, pants, etc.)
2. Colors and patterns
3. Material and texture
4. Style (casual, formal, sporty, etc.)
5. Fit and sizing
6. Key features and details

Provide a detailed description suitable for e-commerce product listings.`;

    console.log('\n📤 Analyzing product image...');
    
    const result = await analyzeWithFallback(imagePath, prompt, preferredModel);

    res.json({
      success: true,
      data: {
        analysis: { outfit: result.analysis },
        ...result
      }
    });

  } catch (error) {
    console.error('Product analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAvailableModels = async (req, res) => {
  try {
    const models = ANALYSIS_MODELS.map(model => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      priority: model.priority,
      recommended: model.recommended || false,
      free: model.free || false,
      available: model.isAvailable()
    }));

    const availableCount = models.filter(m => m.available).length;

    // Group by provider
    const byProvider = models.reduce((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = 0;
      acc[model.provider]++;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        models,
        total: models.length,
        availableCount,
        byProvider
      }
    });

  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Step 2.8: Create Service Files

Create the following service files in `backend/services/`:

1. **googleGeminiService.js**
2. **byteplusService.js**
3. **fireworksVisionService.js**
4. **grokChatService.js**
5. **zaiChatService.js**
6. **imageGenService.js**
7. **videoGenService.js**

Each service should export:
- `analyzeWithX()` function
- `isXAvailable()` function

**Example: googleGeminiService.js**

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function analyzeWithGemini(imagePath, prompt, modelName = 'gemini-1.5-pro') {
  const model = genAI.getGenerativeModel({ model: modelName });
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  
  const imagePart = {
    inlineData: {
      data: base64,
      mimeType: 'image/jpeg'
    }
  };
  
  const result = await model.generateContent([imagePart, prompt]);
  const response = await result.response;
  return response.text();
}

export function isGeminiAvailable() {
  return !!process.env.GOOGLE_API_KEY;
}
```

---

## 3. FRONTEND SETUP

### Step 3.1: Create Frontend

```bash
# Go back to project root
cd ..

# Create frontend with Vite
npm create vite@latest frontend -- --template react

# Install dependencies
cd frontend
npm install

# Install additional packages
npm install react-router-dom axios lucide-react
```

### Step 3.2: Install TailwindCSS

```bash
# Install TailwindCSS
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p
```

### Step 3.3: Configure Tailwind

**File:** `frontend/tailwind.config.js`

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**File:** `frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### Step 3.4: Update vite.config.js

**File:** `frontend/vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
```

### Step 3.5: Create App.jsx

**File:** `frontend/src/App.jsx`

```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Wand2, TestTube, Video } from 'lucide-react';
import UnifiedVideoGeneration from './pages/UnifiedVideoGeneration';
import PromptBuilder from './pages/PromptBuilder';
import ModelTester from './pages/ModelTester';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link to="/" className="flex items-center space-x-2 text-purple-600 font-bold text-xl">
                  <Video className="w-6 h-6" />
                  <span>Smart Wardrobe AI</span>
                </Link>
                
                <div className="flex space-x-4">
                  <Link
                    to="/"
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    <span>All-in-One</span>
                  </Link>
                  
                  <Link
                    to="/prompt-builder"
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Prompt Builder</span>
                  </Link>
                  
                  <Link
                    to="/model-tester"
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <TestTube className="w-4 h-4" />
                    <span>Model Tester</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<UnifiedVideoGeneration />} />
          <Route path="/prompt-builder" element={<PromptBuilder />} />
          <Route path="/model-tester" element={<ModelTester />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

### Step 3.6: Create Main Pages

**Key Pages to Create:**

1. **UnifiedVideoGeneration.jsx** - Main workflow
2. **PromptBuilder.jsx** - Prompt helper
3. **ModelTester.jsx** - Model testing

Each page should include:
- State management
- API calls
- UI components
- Logging display

---

## 4. ENVIRONMENT CONFIGURATION

### Step 4.1: Minimum Setup (FREE)

**File:** `backend/.env`

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Google Gemini (FREE)
GOOGLE_API_KEY=your_google_api_key_here
```

### Step 4.2: Get API Keys

**Google Gemini (FREE):**
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy key (starts with `AIzaSy`)

**Anthropic Claude:**
1. Go to: https://console.anthropic.com/
2. Sign up → API Keys → Create Key
3. Copy key (starts with `sk-ant-`)

**OpenAI GPT:**
1. Go to: https://platform.openai.com/api-keys
2. Create API Key
3. Copy key (starts with `sk-proj-`)

---

## 5. TESTING

### Step 5.1: Start Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
================================================================================
🚀 SMART WARDROBE AI - BACKEND
================================================================================
✅ Server running on port 5000
🌐 API: http://localhost:5000
💚 Health: http://localhost:5000/health
================================================================================
```

### Step 5.2: Test Backend Health

```bash
curl http://localhost:5000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-13T...",
  "version": "2.0.0"
}
```

### Step 5.3: Start Frontend

```bash
# New terminal
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 5.4: Test Complete Workflow

1. Open browser: http://localhost:5173
2. Should see "Smart Wardrobe AI" with navbar
3. Check navbar has 3 links:
   - All-in-One
   - Prompt Builder
   - Model Tester

4. **Upload Images:**
   - Click "Upload character image"
   - Click "Upload product image"

5. **Analyze:**
   - Select model (or leave as Auto)
   - Click "Analyze Images"
   - Check logs panel
   - Should see detailed logs

6. **Generate Prompt:**
   - Click "Generate Prompt"
   - Review generated prompt

7. **Generate Images:**
   - Set count (1-8)
   - Click "Generate Images"
   - Wait 30-60 seconds

8. **Generate Videos:**
   - Select images
   - Click "Generate Videos"
   - Wait 2-3 minutes
   - Download videos

---

## 6. TROUBLESHOOTING

### Issue: "Cannot find module"

**Solution:**
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### Issue: "Port already in use"

**Solution:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or change port in .env
PORT=5001
```

### Issue: "No analysis models available"

**Solution:**
```bash
# Check .env file exists
ls backend/.env

# Add at least Google API key
echo "GOOGLE_API_KEY=your_key" >> backend/.env

# Restart backend
```

### Issue: "CORS error"

**Solution:**
```bash
# Check CORS_ORIGIN in .env
CORS_ORIGIN=http://localhost:5173

# Restart backend
```

### Issue: "Logs not showing"

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser console (F12)
3. Verify backend logs in terminal

### Issue: "Double navbar"

**Solution:**
- Ensure Navbar is only in App.jsx
- Pages should NOT include Navbar

---

## 🎯 VERIFICATION CHECKLIST

Before reporting issues, verify:

- [ ] Node.js >= 18.0.0 installed
- [ ] All dependencies installed (backend + frontend)
- [ ] .env file created with at least GOOGLE_API_KEY
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Can access http://localhost:5173
- [ ] Can see 3 pages in navbar
- [ ] Logs panel visible
- [ ] Can upload images
- [ ] Backend logs show in terminal

---

## 📞 GETTING HELP

If stuck:

1. **Check logs:**
   - Backend terminal
   - Browser console (F12)

2. **Verify setup:**
   - Run verification checklist above
   - Check all files exist
   - Check .env configuration

3. **Common fixes:**
   - Restart backend: Ctrl+C, then `npm run dev`
   - Restart frontend: Ctrl+C, then `npm run dev`
   - Clear browser cache: Ctrl+Shift+Delete

---

**END OF CURSOR AI QUICK START GUIDE**

*This guide is designed for copy-paste into Cursor AI*
*Each section is self-contained and can be used independently*
