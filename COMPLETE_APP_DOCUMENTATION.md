# 🎬 SMART WARDROBE AI - COMPLETE APP DOCUMENTATION

**Version:** 2.0  
**Last Updated:** February 2026  
**Project:** Fashion AI Video Generator  
**Stack:** React + Node.js + Express + Multiple AI Providers

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Features](#3-features)
4. [Installation & Setup](#4-installation--setup)
5. [Configuration](#5-configuration)
6. [API Reference](#6-api-reference)
7. [Frontend Pages](#7-frontend-pages)
8. [Backend Services](#8-backend-services)
9. [AI Models](#9-ai-models)
10. [Troubleshooting](#10-troubleshooting)
11. [Development](#11-development)

---

## 1. PROJECT OVERVIEW

Smart Wardrobe AI is a comprehensive AI-powered platform for creating professional fashion videos from product and character images. The application provides a complete workflow from image upload to video generation with multiple AI model options.

### Core Capabilities

- **Image Analysis**: 20+ AI vision models for analyzing character and product images
- **Prompt Generation**: Intelligent prompt generation based on analysis
- **Image Generation**: Multiple providers (FLUX, Stable Diffusion, SeeDream)
- **Video Generation**: Create videos from generated images
- **Model Testing**: Test and compare all available AI models
- **Detailed Logging**: Real-time logging for debugging and monitoring

### Technology Stack

**Frontend:**
- React 18 with Vite
- TailwindCSS for styling
- Lucide React icons
- Axios for API calls
- React Router for navigation

**Backend:**
- Node.js + Express.js
- Multer for file uploads
- Multiple AI SDK integrations
- MongoDB (optional for persistence)

---

## 2. ARCHITECTURE

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Unified      │  │ Prompt       │  │ Model        │     │
│  │ Video        │  │ Builder/     │  │ Tester       │     │
│  │ Generation   │  │ Helper       │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ AI Routes    │  │ Image Gen   │  │ Video Gen   │     │
│  │ /api/ai      │  │ /api/image  │  │ /api/video  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     AI SERVICES LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              AI Controller (20+ Models)               │  │
│  │  - Google Gemini Service                             │  │
│  │  - BytePlus Service                                 │  │
│  │  - Fireworks Vision Service                         │  │
│  │  - Grok Chat Service                                │  │
│  │  - Z.AI Chat Service                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI PROVIDERS                              │
│  Anthropic │ OpenAI │ Google │ Fireworks │ BytePlus │ ...  │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
smart-wardrobe/
├── backend/
│   ├── controllers/
│   │   ├── aiController.js          # Main AI logic with fallback
│   │   ├── modelTestController.js   # Model testing logic
│   │   ├── pipelineController.js    # Pipeline orchestration
│   │   └── unifiedFlowController.js # Unified flow handling
│   ├── services/
│   │   ├── googleGeminiService.js   # Gemini model integration
│   │   ├── byteplusService.js       # BytePlus SeeDream
│   │   ├── fireworksVisionService.js# Fireworks vision models
│   │   ├── grokChatService.js       # xAI Grok integration
│   │   ├── zaiChatService.js       # Z.AI Chat integration
│   │   ├── imageGenService.js      # Image generation
│   │   └── videoGenService.js      # Video generation
│   ├── routes/
│   │   ├── aiRoutes.js             # /api/ai endpoints
│   │   ├── imageGenRoutes.js       # /api/image-gen endpoints
│   │   ├── videoRoutes.js          # /api/video endpoints
│   │   └── modelTestRoutes.js      # /api/model-test endpoints
│   ├── models/                     # MongoDB schemas
│   ├── middleware/                 # Auth, upload, error handling
│   ├── config/                     # Database config
│   ├── utils/                      # Utilities
│   ├── tests/                      # Test files
│   ├── server.js                   # Entry point
│   ├── .env.example               # Environment template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── UnifiedVideoGeneration.jsx  # Main workflow
│   │   │   ├── PromptBuilder.jsx            # Prompt helper
│   │   │   ├── ModelTester.jsx              # Model comparison
│   │   │   ├── Dashboard.jsx
│   │   │   ├── GenerationHistory.jsx
│   │   │   └── FlowDetail.jsx
│   │   ├── components/
│   │   │   ├── ImageUpload.jsx
│   │   │   ├── AIAnalysis.jsx
│   │   │   ├── GeneratedPrompt.jsx
│   │   │   ├── GeneratedResult.jsx
│   │   │   ├── StyleOptions.jsx
│   │   │   ├── SaveOptionsModal.jsx
│   │   │   └── ui/Navbar.jsx
│   │   ├── services/
│   │   │   └── api.js               # Axios instance
│   │   ├── stores/                 # State management
│   │   ├── utils/
│   │   ├── App.jsx                 # Main app with routing
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 3. FEATURES

### 3.1 Image Analysis (20+ Models)

The application supports 20+ AI vision models organized into tiers:

**Tier 1: Premium Models**
- Claude 3.5 Sonnet (Best quality, recommended)
- GPT-4o (Latest OpenAI model)
- Claude 3 Opus
- GPT-4 Vision
- Claude 3 Haiku (Fast)

**Tier 2: Google Models (FREE)**
- Gemini 2.5 Flash ⭐ (Recommended FREE)
- Gemini 2.5 Pro ⭐ (Recommended FREE)
- Gemini 3.0 Flash (Experimental)
- Gemini 1.5 Pro
- Gemini 1.5 Flash

**Tier 3: BytePlus (Official API)**
- Doubao Vision Pro ⭐
- Doubao Vision Lite
- ByteDance Seed 1.8

**Tier 4: Fireworks Vision**
- Llama 3.2 11B Vision ($0.20/M)
- Qwen2-VL 7B ($0.20/M)
- Phi-3.5 Vision
- Llama 3.2 90B Vision
- Qwen2-VL 72B

**Tier 5: Chat-based**
- Z.AI Chat (FREE)
- Grok Chat (xAI Grok-3)

### 3.2 Automatic Fallback System

The application includes a sophisticated fallback system:

```javascript
// Logic: Try models in priority order
// 1. If preferred model specified, try it first
// 2. Try remaining models by priority (1 = highest)
// 3. If model fails, automatically try next
// 4. Log every attempt with detailed info
// 5. Return first success or throw after all fail
```

**Key Features:**
- Automatic model switching on failure
- Detailed logging at each step
- Error suggestions for troubleshooting
- Performance metrics tracking

### 3.3 Image Generation

**Providers:**
- Replicate (FLUX Schnell)
- Fireworks AI (Playground v2.5)
- BytePlus (SeeDream 5.0)
- Hugging Face (SDXL)

**Features:**
- Image-to-image support (with character reference)
- Batch generation (1-8 images)
- Seed control for reproducibility
- Multiple aspect ratios

### 3.4 Video Generation

**Providers:**
- Runway ML Gen-2
- Luma AI Dream Machine

**Features:**
- Image-to-video conversion
- 4-second clips
- HD quality output
- Automatic fallback between providers

### 3.5 Detailed Logging

**Backend Console Logs:**
- Step-by-step progress indicators
- Model attempts and fallbacks
- Error messages with suggestions
- Performance metrics (duration, attempt count)

**Frontend UI Logs:**
- Real-time log display panel
- Color-coded by type (info, success, error, warning)
- Expandable details
- Clear logs functionality

---

## 4. INSTALLATION & SETUP

### Prerequisites

```bash
Node.js >= 18.0.0
npm >= 9.0.0
MongoDB (optional, for persistence)
```

### Step 1: Clone & Install

```bash
# Navigate to project directory
cd smart-wardrobe

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Environment Configuration

```bash
# Copy example env file
cd backend
cp .env.example .env

# Edit with your API keys
nano .env
```

### Step 3: Start Services

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Step 4: Access Application

```
Frontend: http://localhost:5173
Backend: http://localhost:5000
Health: http://localhost:5000/health
```

---

## 5. CONFIGURATION

### Required API Keys

#### Minimum Setup (FREE)

```env
# Google Gemini (FREE)
# Get from: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_google_api_key_here
```

#### Recommended Setup

```env
# Analysis Models
GOOGLE_API_KEY=your_google_api_key          # FREE
ANTHROPIC_API_KEY=your_anthropic_key         # Premium
OPENAI_API_KEY=your_openai_key               # Premium

# Image Generation
REPLICATE_API_TOKEN=your_replicate_token
FIREWORKS_API_KEY=your_fireworks_key

# Video Generation
RUNWAY_API_KEY=your_runway_key
LUMA_API_KEY=your_luma_key
```

#### Full Setup (All 20+ Models)

```env
# ==================== SERVER ====================
PORT=5000
NODE_ENV=development

# ==================== PREMIUM ANALYSIS ====================
ANTHROPIC_API_KEY=sk-ant-...    # Claude models
OPENAI_API_KEY=sk-proj-...      # GPT models

# ==================== FREE ANALYSIS ====================
GOOGLE_API_KEY=AIzaSy...        # Gemini models (FREE)

# ==================== BYTEPLUS ====================
BYTEPLUS_API_KEY=sk-...         # Doubao, Seed models

# ==================== FIREWORKS ====================
FIREWORKS_API_KEY=fw-...        # Llama, Qwen, Phi models

# ==================== CHAT MODELS ====================
ZAI_SESSION=...                 # Z.AI Chat (FREE)
GROK_SSO=...                    # xAI Grok
GROK_SSO_RW=...
GROK_USER_ID=...

# ==================== IMAGE GENERATION ====================
REPLICATE_API_TOKEN=r8-...     # FLUX
HUGGINGFACE_API_KEY=hf-...     # SDXL

# ==================== VIDEO GENERATION ====================
RUNWAY_API_KEY=...              # Runway ML
LUMA_API_KEY=...                # Luma AI
```

### Getting API Keys

| Provider | URL | Notes |
|----------|-----|-------|
| Google Gemini | https://aistudio.google.com/app/apikey | FREE tier available |
| Anthropic | https://console.anthropic.com/ | Start with $5 credit |
| OpenAI | https://platform.openai.com/api-keys | Pay-per-use |
| Fireworks | https://fireworks.ai/account/api-keys | Competitive pricing |
| BytePlus | https://console.byteplus.com/ | Official API |
| Replicate | https://replicate.com/account/api-tokens | FLUX models |
| Hugging Face | https://huggingface.co/settings/tokens | Free tier available |
| Runway ML | https://runwayml.com/ | Video generation |
| Luma AI | https://lumalabs.ai/ | Video generation |
| Z.AI | https://chat.z.ai/ | Browser cookies required |
| Grok | https://grok.com/ | X account required |

---

## 6. API REFERENCE

### 6.1 AI Analysis Endpoints

#### POST /api/ai/analyze-character

Analyze a character/model image.

**Request:**
```javascript
// Content-Type: multipart/form-data
{
  image: File,                    // Required: Character image
  preferredModel: String          // Optional: Specific model ID
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    analysis: {
      character: {
        age: "25-35",
        ethnicity: "Asian",
        gender: "female",
        hair: "long black straight hair",
        bodyType: "slim",
        features: "oval face, fair skin"
      }
    },
    modelUsed: "claude-3-5-sonnet",
    modelName: "Claude 3.5 Sonnet",
    provider: "anthropic",
    duration: 3.45,
    attemptCount: 1
  }
}
```

#### POST /api/ai/analyze-product

Analyze a product/outfit image.

**Request:**
```javascript
// Content-Type: multipart/form-data
{
  image: File,                    // Required: Product image
  preferredModel: String          // Optional: Specific model ID
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    analysis: {
      outfit: {
        type: "dress",
        colors: "navy blue, white",
        style: "casual",
        material: "cotton blend",
        fit: "regular fit"
      }
    },
    modelUsed: "gemini-2.5-flash",
    modelName: "Gemini 2.5 Flash",
    provider: "google",
    duration: 2.12,
    attemptCount: 1
  }
}
```

#### GET /api/ai/models

Get all available analysis models.

**Response:**
```javascript
{
  success: true,
  data: {
    models: [
      {
        id: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        priority: 1,
        recommended: true,
        available: true,
        free: false
      },
      // ... more models
    ],
    total: 20,
    availableCount: 12,
    byProvider: {
      anthropic: 3,
      openai: 2,
      google: 5,
      byteplus: 3,
      fireworks: 5,
      zai: 1,
      grok: 1
    }
  }
}
```

### 6.2 Image Generation Endpoints

#### POST /api/image-gen/generate

Generate images from a prompt.

**Request:**
```javascript
// Content-Type: multipart/form-data
{
  prompt: String,                  // Required: Main prompt
  negativePrompt: String,        // Required: Negative prompt
  count: Number,                  // Required: Number of images (1-8)
  characterImage: File,          // Optional: Character reference
  productImage: File,             // Optional: Product reference
  selectedModel: String           // Optional: Specific model
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    images: [
      {
        url: "/uploads/generated/image1.jpg",
        seed: 123456,
        format: "jpg",
        provider: "replicate",
        model: "FLUX Schnell"
      }
    ],
    modelUsed: "FLUX Schnell",
    provider: "replicate",
    duration: 45.67,
    successCount: 4,
    totalCount: 4
  }
}
```

#### GET /api/image-gen/models

Get available image generation models.

**Response:**
```javascript
{
  success: true,
  data: {
    models: [
      {
        id: "replicate-flux",
        name: "Replicate FLUX Schnell",
        provider: "replicate",
        available: true,
        supportsImageInput: false
      }
    ],
    total: 4,
    available: 2
  }
}
```

### 6.3 Video Generation Endpoints

#### POST /api/video-gen/generate

Generate videos from images.

**Request:**
```javascript
{
  imageUrls: [
    "/uploads/generated/image1.jpg",
    "/uploads/generated/image2.jpg"
  ]
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    videos: [
      {
        url: "/uploads/videos/video1.mp4",
        provider: "runway",
        duration: 4,
        format: "mp4"
      }
    ],
    totalDuration: 125.34,
    successCount: 2,
    totalCount: 2
  }
}
```

### 6.4 Prompt Generation Endpoints

#### POST /api/prompts/generate

Generate optimized prompts.

**Request:**
```javascript
{
  characterAnalysis: { character: {...} },
  productAnalysis: { outfit: {...} },
  contentUseCase: "ecommerce",    // ecommerce|social|advertising|editorial
  style: "realistic",              // realistic|cinematic|fashion|casual|artistic
  customInstructions: "..."        // Optional custom text
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    prompt: "Professional fashion photography of...",
    negativePrompt: "blurry, low quality...",
    length: 450
  }
}
```

---

## 7. FRONTEND PAGES

### 7.1 UnifiedVideoGeneration.jsx

**Path:** `/` (default route)

**Purpose:** Complete workflow from images to videos

**Features:**
- Step-by-step workflow (4 steps)
- Real-time logs panel
- Image upload for character and product
- Analysis results display
- Prompt editing
- Image generation with selection
- Video generation with download

**Key Components:**
- Progress step indicator
- Image upload zones
- Settings panel (automation level, use case)
- Analysis results viewer (JSON display)
- Generated prompt editor
- Image gallery with selection
- Video player with download

**State Management:**
```javascript
// Main state
const [currentStep, setCurrentStep] = useState(1);
const [characterImage, setCharacterImage] = useState(null);
const [productImage, setProductImage] = useState(null);
const [characterAnalysis, setCharacterAnalysis] = useState(null);
const [productAnalysis, setProductAnalysis] = useState(null);
const [generatedPrompt, setGeneratedPrompt] = useState('');
const [generatedImages, setGeneratedImages] = useState([]);
const [videos, setVideos] = useState([]);
const [logs, setLogs] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

### 7.2 PromptBuilder.jsx

**Path:** `/prompt-builder`

**Purpose:** Generate prompts without full workflow

**Features:**
- Character description input
- Product/outfit description input
- Use case selection
- Style selection
- Generated prompt display and editing
- Copy to clipboard
- Download as text file

### 7.3 ModelTester.jsx

**Path:** `/model-tester`

**Purpose:** Test and compare all AI vision models

**Features:**
- Upload test image
- Test single model or all models
- Performance metrics (duration, success rate)
- Response comparison
- CSV export
- Performance ranking

---

## 8. BACKEND SERVICES

### 8.1 AI Controller (aiController.js)

**Main Functions:**

#### analyzeWithFallback()

The core function that handles automatic fallback:

```javascript
async function analyzeWithFallback(imagePath, prompt, preferredModelId = null) {
  // 1. Sort models by priority
  // 2. If preferred model, put it first
  // 3. Try each model in order
  // 4. Log every attempt
  // 5. Return first success or throw
}
```

**Key Logic:**
- Priority-based model selection
- Detailed logging at each step
- Error capture with suggestions
- Performance tracking

### 8.2 Service Files

| Service | Models | Provider |
|---------|--------|----------|
| googleGeminiService.js | 5 models | Google |
| byteplusService.js | 3 models | BytePlus |
| fireworksVisionService.js | 5 models | Fireworks AI |
| grokChatService.js | 1 model | xAI |
| zaiChatService.js | 1 model | Z.AI |
| imageGenService.js | 4 providers | Multiple |
| videoGenService.js | 2 providers | Multiple |

### 8.3 Image Generation Service

**Flow:**
1. Check available providers
2. Select provider (manual or auto)
3. Generate images in batch
4. Handle failures with fallback
5. Save to uploads directory
6. Return URLs

### 8.4 Video Generation Service

**Flow:**
1. Check available providers (Runway, Luma)
2. Upload images to provider
3. Wait for generation
4. Download generated videos
5. Save to uploads directory
6. Return URLs

---

## 9. AI MODELS

### Model Priority List

| Priority | Model ID | Name | Provider | Free | Recommended |
|----------|----------|------|----------|------|-------------|
| 1 | claude-3-5-sonnet | Claude 3.5 Sonnet | Anthropic | ❌ | ⭐ |
| 2 | gpt-4o | GPT-4o | OpenAI | ❌ | ⭐ |
| 3 | gemini-2.5-flash | Gemini 2.5 Flash | Google | ✅ | ⭐ |
| 4 | gemini-2.5-pro | Gemini 2.5 Pro | Google | ✅ | ⭐ |
| 5 | claude-3-opus | Claude 3 Opus | Anthropic | ❌ | |
| 6 | gpt-4-vision | GPT-4 Vision | OpenAI | ❌ | |
| 7 | fireworks-llama-3.2-11b-vision | Llama 3.2 11B Vision | Fireworks | ❌ | |
| 8 | fireworks-qwen2-vl-7b | Qwen2-VL 7B | Fireworks | ❌ | |
| 9 | byteplus-doubao-vision-pro | Doubao Vision Pro | BytePlus | ❌ | ⭐ |
| 10 | gemini-3.0-flash | Gemini 3.0 Flash | Google | ✅ | 🧪 |
| 11 | zai-chat | Z.AI Chat | Z.AI | ✅ | |
| 12 | grok-chat | Grok Chat | xAI | ❌ | |

### Performance Metrics

| Model | Avg Duration | Success Rate | Cost |
|-------|--------------|--------------|------|
| Gemini 2.5 Flash | 2.1s | 98% | FREE |
| Claude 3.5 Sonnet | 3.4s | 99% | $3/1M tokens |
| GPT-4o | 2.9s | 97% | $2.5/1M tokens |
| Fireworks Llama 3.2 11B | 1.8s | 95% | $0.20/1M tokens |

---

## 10. TROUBLESHOOTING

### Common Issues

#### Issue: "No analysis models available"

**Cause:** No API keys configured

**Solution:**
```bash
# Add at least Google API key to .env
echo "GOOGLE_API_KEY=your_key" >> backend/.env

# Restart backend
```

#### Issue: "All analysis models failed"

**Cause:** All configured models failed

**Solution:**
1. Check API keys are valid
2. Check internet connection
3. Try with a different image
4. Check backend logs for specific errors

#### Issue: "Image generation failed"

**Cause:** No image generation providers available

**Solution:**
```bash
# Add at least one provider
REPLICATE_API_TOKEN=your_token
# OR
FIREWORKS_API_KEY=your_key
```

#### Issue: "Video generation failed"

**Cause:** No video providers or quota exceeded

**Solution:**
```bash
# Add video provider
RUNWAY_API_KEY=your_key
# OR
LUMA_API_KEY=your_key

# Check quota on provider website
```

#### Issue: "Logs not showing in UI"

**Cause:** Frontend logs state not updating

**Solution:**
1. Check browser console for errors
2. Verify backend is sending logs
3. Check Network tab for log API calls
4. Hard refresh browser (Ctrl+Shift+R)

#### Issue: "Double navbar on Prompt Helper"

**Cause:** Navbar included in both App.jsx and page component

**Solution:**
- Ensure PromptBuilder.jsx does NOT include Navbar
- Navbar should only be in App.jsx

### Debug Mode

**Enable detailed logging:**

```bash
# Backend
cd backend
NODE_ENV=development npm run dev

# Frontend
cd frontend
npm run dev
```

**Check logs:**

```bash
# Backend terminal output
# Contains all detailed logs

# Browser console (F12)
# Contains frontend errors
```

---

## 11. DEVELOPMENT

### Adding New Analysis Model

**1. Create or update service:**

```javascript
// backend/services/newProviderService.js
export async function analyzeWithNewProvider(imagePath, prompt) {
  // Implementation
}

export function isNewProviderAvailable() {
  return !!process.env.NEW_PROVIDER_API_KEY;
}
```

**2. Add to aiController.js:**

```javascript
import * as newProviderService from '../services/newProviderService.js';

// Add to ANALYSIS_MODELS array
{
  id: 'new-provider-model',
  name: 'New Provider Model',
  provider: 'newprovider',
  priority: 25,
  analyze: async (imagePath, prompt) => {
    return await newProviderService.analyzeWithNewProvider(imagePath, prompt);
  }
}
```

**3. Update frontend dropdown:**

```jsx
// In UnifiedVideoGeneration.jsx
<option value="new-provider-model">New Provider Model</option>
```

### Adding New Image Generation Provider

**1. Add to imageGenService.js:**

```javascript
// Check availability
if (NEW_PROVIDER_API_KEY) {
  providers.push({
    name: 'New Provider',
    supportsImageInput: false,
    generate: async (prompt, seed) => {
      // Implementation
    }
  });
}
```

### Testing

```bash
# Test backend
cd backend
npm test

# Test specific model
node test-analysis-models.js

# Test image generation
node test-image-generation.js

# Test BytePlus
node test-byteplus-api.js
```

### Build for Production

```bash
# Build frontend
cd frontend
npm run build

# Backend runs on Node
cd backend
npm start
```

---

## 📞 SUPPORT

### Getting Help

1. **Check documentation:** This file contains most answers
2. **Check logs:** Backend and browser console
3. **Check .env:** Verify API keys are correct
4. **Test components:** Use Model Tester page

### Reporting Issues

Include:
1. Error message
2. Steps to reproduce
3. Backend logs
4. Frontend console logs
5. API keys (redacted)
6. Environment (OS, Node version)

---

## 📜 LICENSE

MIT License

---

**END OF DOCUMENTATION**

*Last updated: February 13, 2026*
*Version: 2.0*
*Project: Smart Wardrobe AI*
