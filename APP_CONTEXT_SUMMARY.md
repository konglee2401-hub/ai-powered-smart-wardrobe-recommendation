# 📋 SMART WARDROBE AI - CONTEXT SUMMARY

**Use this file to start new conversations with AI assistants**

---

## 🎯 WHAT IS THIS APP?

Complete AI-powered platform for creating fashion videos from images.

**Flow:** Upload Images → AI Analysis → Generate Prompt → Generate Images → Create Videos

---

## 🏗️ ARCHITECTURE

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

---

## 📁 PROJECT STRUCTURE

```
smart-wardrobe/
├── backend/
│   ├── controllers/
│   │   ├── aiController.js          # Main AI logic with fallback
│   │   ├── modelTestController.js   # Model testing
│   │   └── pipelineController.js    # Pipeline logic
│   ├── services/
│   │   ├── googleGeminiService.js   # Gemini models (FREE)
│   │   ├── byteplusService.js       # BytePlus SeeDream
│   │   ├── fireworksVisionService.js# Fireworks vision
│   │   ├── grokChatService.js       # xAI Grok
│   │   ├── zaiChatService.js        # Z.AI Chat
│   │   ├── imageGenService.js       # Image generation
│   │   └── videoGenService.js       # Video generation
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
│   │   │   ├── UnifiedVideoGeneration.jsx  # Main workflow
│   │   │   ├── PromptBuilder.jsx             # Prompt helper
│   │   │   └── ModelTester.jsx              # Model testing
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── COMPLETE_APP_DOCUMENTATION.md  # Full docs
├── CURSOR_AI_QUICK_START.md       # Implementation guide
└── APP_CONTEXT_SUMMARY.md         # This file
```

---

## ✨ KEY FEATURES

### 1. Image Analysis (20+ Models)

- **Tier 1:** Claude 3.5 Sonnet, GPT-4o (Premium)
- **Tier 2:** Gemini 2.5 Flash, 2.5 Pro (FREE)
- **Tier 3:** BytePlus Doubao Vision Pro/Lite
- **Tier 4:** Fireworks Llama, Qwen2-VL, Phi-3.5
- **Tier 5:** Z.AI Chat, Grok Chat

### 2. Automatic Fallback

```javascript
// Logic: Try models in priority order
// 1. If preferred model specified, try it first
// 2. Try remaining models by priority
// 3. Log every attempt
// 4. Return first success or throw after all fail
```

### 3. Image Generation

- Replicate FLUX Schnell
- Fireworks Playground v2.5
- BytePlus SeeDream 5.0
- Hugging Face SDXL

### 4. Video Generation

- Runway ML Gen-2
- Luma AI Dream Machine

### 5. Detailed Logging

- Console logs (backend)
- UI logs panel (frontend)
- Step-by-step progress
- Error messages with suggestions

---

## 🔧 CRITICAL COMPONENTS

### 1. aiController.js (Backend)

**Key Function:** `analyzeWithFallback()`

```javascript
async function analyzeWithFallback(imagePath, prompt, preferredModelId = null) {
  // Tries models in priority order
  // Logs every step
  // Returns first success or throws after all fail
}
```

**Models Array:** 20+ models with:
- id, name, provider
- priority (1 = highest)
- analyze function
- isAvailable function

### 2. UnifiedVideoGeneration.jsx (Frontend)

**Key Features:**
- Step-by-step workflow
- Real-time logs panel
- Image upload
- Analysis results display
- Prompt generation
- Image generation
- Video generation

### 3. Services (Backend)

| Service | Models | Provider | Free |
|---------|--------|----------|------|
| googleGeminiService.js | 5 | Google | ✅ |
| byteplusService.js | 3 | BytePlus | ❌ |
| fireworksVisionService.js | 5 | Fireworks | ❌ |
| grokChatService.js | 1 | xAI | ❌ |
| zaiChatService.js | 1 | Z.AI | ✅ |
| imageGenService.js | 4 | Multiple | ❌ |
| videoGenService.js | 2 | Multiple | ❌ |

---

## 🐛 KNOWN ISSUES & FIXES

| Issue | Cause | Fix |
|-------|-------|-----|
| Logs not showing | Frontend state not updating | Check UnifiedVideoGeneration.jsx logs state |
| Double navbar | Navbar in page component | Only App.jsx should have Navbar |
| Model Tester missing | Route not added | Add /model-tester route in App.jsx |
| Prompts too short | Prompt generation logic | Use prompt from routes |
| All models fail | No API keys | Add GOOGLE_API_KEY to .env |

---

## 🚀 QUICK START

**Minimum Setup (FREE):**

```bash
# Backend
cd backend
npm install
echo "GOOGLE_API_KEY=your_key" > .env
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

**Access:** http://localhost:5173

---

## 📊 API ENDPOINTS

```
POST /api/ai/analyze-character     # Analyze character image
POST /api/ai/analyze-product       # Analyze product image
GET  /api/ai/models               # Get all available models

POST /api/image-gen/generate       # Generate images
GET  /api/image-gen/models         # Get image models

POST /api/video-gen/generate       # Generate videos

POST /api/model-test/test-single   # Test single model
POST /api/model-test/test-all      # Test all models
```

---

## 🔑 REQUIRED ENV VARS

**Minimum:**
```env
GOOGLE_API_KEY=...
```

**Recommended:**
```env
GOOGLE_API_KEY=...        # FREE
ANTHROPIC_API_KEY=...     # Premium
OPENAI_API_KEY=...        # Premium
REPLICATE_API_TOKEN=...  # Image Gen
```

**Full (20+ models):**
```env
# See .env.example for complete list
GOOGLE_API_KEY=ANTHROPIC_API_KEY=OPENAI_API_KEY=
BYTEPLUS_API_KEY=FIREWORKS_API_KEY=
ZAI_SESSION=GROK_SSO=GROK_USER_ID=
REPLICATE_API_TOKEN=HUGGINGFACE_API_KEY=
RUNWAY_API_KEY=LUMA_API_KEY=
```

---

## 📝 IMPORTANT NOTES

1. **Logs are critical** - Every function must log:
   - Start/end of operations
   - Model attempts
   - Failures with suggestions
   - Success with metrics

2. **Fallback is automatic** - System tries models by priority until success

3. **UI must show logs** - Right panel displays real-time logs

4. **No double navbar** - Only App.jsx has navbar, pages don't

5. **Model Tester is separate page** - Not integrated in main flow

6. **Prompts must be detailed** - 200-500 chars, include all details

7. **BytePlus uses official API** - Not browser automation

---

## 📞 GETTING FULL CONTEXT

**For complete details, read:**

1. `COMPLETE_APP_DOCUMENTATION.md` - Full documentation
2. `CURSOR_AI_QUICK_START.md` - Implementation guide

**For implementation:**
- Follow CURSOR_AI_QUICK_START.md step by step
- Don't skip any steps
- Don't modify unless instructed

---

## 🎓 FOR AI ASSISTANTS

**When helping with this project:**

1. **Always preserve logs** - Don't remove console.log statements

2. **Keep fallback logic** - Don't simplify the try-catch chains

3. **Maintain model priority** - Order matters for fallback

4. **Include error suggestions** - Every error should have a helpful message

5. **Test before suggesting** - Verify code works with the architecture

6. **Reference docs** - Use COMPLETE_APP_DOCUMENTATION.md for details

7. **Use CURSOR guide** - For implementation, use CURSOR_AI_QUICK_START.md

---

**END OF CONTEXT SUMMARY**

*Use this file to quickly restore context in new conversations*
*For full details, refer to COMPLETE_APP_DOCUMENTATION.md*
