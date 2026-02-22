# Test Scripts Organization Index

**Created**: February 22, 2026  
**Purpose**: Central documentation of all test scripts, their purposes, and usage

---

## Folder Structure

```
backend/tests/
├── 1-analysis-providers/          # AI Analysis & Vision Tests
├── 2-image-generation/           # Image Generation Tests  
├── 3-video-generation/           # Video Generation Tests
├── 4-workflows/                  # End-to-End Workflow Tests
├── 5-browser-automation/         # Browser Automation Tests
├── 6-setup-verification/         # Setup & Verification Scripts
└── README.md                      # This file
```

---

## 1. Analysis Providers Tests
**Location**: `tests/1-analysis-providers/`

Tests for different AI providers that analyze images and extract insights.

| Filename | Purpose | Provider | Command |
|----------|---------|----------|---------|
| 01-gemini-api-test.js | Test Google Gemini Vision API | Google Gemini | `node tests/1-analysis-providers/01-gemini-api-test.js` |
| 02-gemini-unified-analysis-test.js | Test unified analysis with Gemini | Google Gemini | `node tests/1-analysis-providers/02-gemini-unified-analysis-test.js` |
| 03-fireworks-vision-test.js | Test Fireworks Vision Service | Fireworks | `node tests/1-analysis-providers/03-fireworks-vision-test.js` |
| 04-chatgpt-analysis-test.js | Test ChatGPT browser automation | ChatGPT | `node tests/1-analysis-providers/04-chatgpt-analysis-test.js` |
| 05-chatgpt-quality-analysis-test.js | Verify ChatGPT analysis quality | ChatGPT | `node tests/1-analysis-providers/05-chatgpt-quality-analysis-test.js` |
| 06-openrouter-provider-test.js | Test OpenRouter provider | OpenRouter | `node tests/1-analysis-providers/06-openrouter-provider-test.js` |
| 07-openrouter-quick-test.js | Quick OpenRouter API test | OpenRouter | `node tests/1-analysis-providers/07-openrouter-quick-test.js` |
| 08-zai-service-test.js | Test ZAI Chat Service | ZAI | `node tests/1-analysis-providers/08-zai-service-test.js` |
| 09-huggingface-provider-test.js | Test HuggingFace provider | HuggingFace | `node tests/1-analysis-providers/09-huggingface-provider-test.js` |
| 10-free-providers-test.js | Test FREE AI providers only | Multiple | `node tests/1-analysis-providers/10-free-providers-test.js` |
| 11-all-providers-test.js | Test all available providers | Multiple | `node tests/1-analysis-providers/11-all-providers-test.js` |
| 12-analysis-models-comparison-test.js | Compare different analysis models | Multiple | `node tests/1-analysis-providers/12-analysis-models-comparison-test.js` |

---

## 2. Image Generation Tests
**Location**: `tests/2-image-generation/`

Tests for image generation services and integrations.

| Filename | Purpose | Provider | Command |
|----------|---------|----------|---------|
| 01-basic-image-generation-test.js | Basic image generation with mock data | Various | `node tests/2-image-generation/01-basic-image-generation-test.js` |
| 02-realworld-image-generation-test.js | Real-world image generation test | Various | `node tests/2-image-generation/02-realworld-image-generation-test.js` |
| 03-image-setup-verification-test.js | Verify image generation setup | Various | `node tests/2-image-generation/03-image-setup-verification-test.js` |
| 04-image-providers-config-test.js | Test image provider configuration | Various | `node tests/2-image-generation/04-image-providers-config-test.js` |
| 05-image-upload-test.js | Test image upload functionality | Various | `node tests/2-image-generation/05-image-upload-test.js` |

---

## 3. Video Generation Tests
**Location**: `tests/3-video-generation/`

Tests for video generation APIs and services.

| Filename | Purpose | Provider | Command |
|----------|---------|----------|---------|
| 01-video-gen-api-test.js | Basic video generation API test | Various | `node tests/3-video-generation/01-video-gen-api-test.js` |
| 02-video-gen-api-v2-comprehensive-test.js | Comprehensive v2 video generation test | Google Flow | `node tests/3-video-generation/02-video-gen-api-v2-comprehensive-test.js` |
| 03-google-flow-video-gen-test.js | Test Google Flow video generation | Google Flow | `node tests/3-video-generation/03-google-flow-video-gen-test.js` |

---

## 4. End-to-End Workflows
**Location**: `tests/4-workflows/`

Full workflow tests that combine multiple steps (analysis → recommendations → image → video).

| Filename | Purpose | Duration | Command |
|----------|---------|----------|---------|
| 01-full-flow-basic-test.js | Basic complete flow test | ~2-5 min | `node tests/4-workflows/01-full-flow-basic-test.js` |
| 02-full-flow-v2-advanced-test.js | Advanced flow v2 with smart button counting | ~3-5 min | `node tests/4-workflows/02-full-flow-v2-advanced-test.js` |
| 03-oneclick-creator-fullflow-test.js | **✅ PRIMARY TEST** - 1-Click Creator with ChatGPT | ~35s | `node tests/4-workflows/03-oneclick-creator-fullflow-test.js` |
| 04-multiflow-orchestrator-test.js | Test MultiFlow orchestrator | ~2-3 min | `node tests/4-workflows/04-multiflow-orchestrator-test.js` |
| 05-multi-image-simple-test.js | Simple multi-image test | ~1 min | `node tests/4-workflows/05-multi-image-simple-test.js` |

**🌟 RECOMMENDED**: Start with `03-oneclick-creator-fullflow-test.js`

---

## 5. Browser Automation Tests  
**Location**: `tests/5-browser-automation/`

Tests for browser automation services (Puppeteer + specific websites).

| Filename | Purpose | Service | Command |
|----------|---------|---------|---------|
| 01-google-flow-integration-test.js | Google Lab Flow integration | Google Flow | `node tests/5-browser-automation/01-google-flow-integration-test.js` |
| 02-browser-services-comparison-test.js | Compare ChatGPT, Grok, ZAI services | Multiple | `node tests/5-browser-automation/02-browser-services-comparison-test.js` |
| 03-session-management-test.js | Test session handling | Grok/ZAI | `node tests/5-browser-automation/03-session-management-test.js` |
| 04-persistent-browser-session-test.js | Test persistent browser sessions | Google Flow | `node tests/5-browser-automation/04-persistent-browser-session-test.js` |
| 05-chrome-profile-autoauth-test.js | Test Chrome profile auto-login | Google Flow | `node tests/5-browser-automation/05-chrome-profile-autoauth-test.js` |
| 06-bot-detection-stealth-test.js | Test stealth against bot detection | Google Flow | `node tests/5-browser-automation/06-bot-detection-stealth-test.js` |
| 07-remote-debug-chrome-test.js | Manual remote debugging setup | Chrome DevTools | `node tests/5-browser-automation/07-remote-debug-chrome-test.js` |
| 08-remote-chrome-debugging-test.js | Remote Chrome debugging | Chrome DevTools | `node tests/5-browser-automation/08-remote-chrome-debugging-test.js` |
| 09-step-by-step-flow-test.js | Step-by-step flow with detailed logging | Google Flow | `node tests/5-browser-automation/09-step-by-step-flow-test.js` |

---

## 6. Setup & Verification Scripts
**Location**: `tests/6-setup-verification/`

Configuration, setup, and verification scripts for dependencies and services.

| Filename | Purpose | Setup For | Command |
|----------|---------|-----------|---------|
| setup-byteplus.js | Setup BytePlus/Tiktok models | BytePlus Video | `node tests/6-setup-verification/setup-byteplus.js` |
| setup-google-auth.js | Setup Google authentication | Google Gemini/Flow | `node tests/6-setup-verification/setup-google-auth.js` |
| setup-zai.js | Setup ZAI Chat service | ZAI | `node tests/6-setup-verification/setup-zai.js` |
| verify-chatgpt-integration.js | Verify ChatGPT integration | ChatGPT | `node tests/6-setup-verification/verify-chatgpt-integration.js` |
| verify-grok-session.js | Verify Grok session setup | Grok | `node tests/6-setup-verification/verify-grok-session.js` |
| verify-providers-availability.js | Check all provider availability | All | `node tests/6-setup-verification/verify-providers-availability.js` |
| verify-browser-automation-suite.js | Test browser automation suite | Browser Automation | `node tests/6-setup-verification/verify-browser-automation-suite.js` |
| util-create-test-image.js | Utility: Create test images | N/A | `node tests/6-setup-verification/util-create-test-image.js` |

---

## Quick Start Guide

### 1. First Run - Verify Setup
```bash
cd backend

# Check provider availability
node tests/6-setup-verification/verify-providers-availability.js

# Verify ChatGPT integration  
node tests/6-setup-verification/verify-chatgpt-integration.js
```

### 2. Test Individual Providers
```bash
# Test ChatGPT analysis
node tests/1-analysis-providers/05-chatgpt-quality-analysis-test.js

# Test Google Gemini
node tests/1-analysis-providers/02-gemini-unified-analysis-test.js

# Test Fireworks
node tests/1-analysis-providers/03-fireworks-vision-test.js
```

### 3. Test Workflows
```bash
# ✅ PRIMARY TEST - Full 1-Click Creator workflow with ChatGPT
node tests/4-workflows/03-oneclick-creator-fullflow-test.js

# Test video generation
node tests/3-video-generation/02-video-gen-api-v2-comprehensive-test.js

# Test full flow advanced
node tests/4-workflows/02-full-flow-v2-advanced-test.js
```

### 4. Browser Automation
```bash
# Test Google Flow integration
node tests/5-browser-automation/01-google-flow-integration-test.js

# Compare browser services
node tests/5-browser-automation/02-browser-services-comparison-test.js
```

---

## Provider Status

| Provider | Analysis | Image Gen | Video Gen | Status |
|----------|----------|-----------|-----------|--------|
| ChatGPT | ✅ | - | - | Ready |
| Google Gemini | ✅ | ✅ | - | Ready |
| Grok | ✅ | - | ✅ | Ready |
| Google Flow | - | ✅ | ✅ | Ready |
| ZAI | ✅ | - | - | Ready |
| Fireworks | ✅ | - | - | Ready |
| OpenRouter | ✅ | - | - | Ready |
| HuggingFace | ✅ | - | - | Ready |

---

## Environment Setup

Required `.env` variables:

```env
# For Analysis Providers
GOOGLE_API_KEY=your_key
FIREWORKS_API_KEY=your_key
OPENROUTER_API_KEY=your_key

# For Browser Automation
GROK_SESSION_FILE=path/to/session.json
CHATGPT_SESSION_FILE=path/to/session.json

# For Video Generation
BYTEPLUS_CREDENTIALS=credentials
```

---

## Notes

- All tests should be run from `backend/` directory
- Server must be running for workflow tests: `npm run dev` (on port 5001)
- Test images are in `backend/test-images/` directory
- Check `.env` file for required API keys
- Browser automation tests require Chrome/Chromium installed
- Some tests require authenticated sessions (see 6-setup-verification/)

---

## Test Execution Status

✅ **All tests organized and documented**  
✅ **Ready for migration to new folder structure**  
✅ **Clear naming convention implemented**  

Next step: Run migration script to move and rename all files
