# 🧪 Test Suite Index & Quick Reference

**Last Updated**: February 22, 2026

---

## 📍 Quick Navigation

| Purpose | File | Command |
|---------|------|---------|
| **Check Setup** | verify-providers-availability.js | `node tests/6-setup-verification/verify-providers-availability.js` |
| **All Providers** | 11-all-providers-test.js | `node tests/1-analysis-providers/11-all-providers-test.js` |
| **Full Flow** | 01-full-flow-basic-test.js | `node tests/4-workflows/01-full-flow-basic-test.js` |
| **One-Click Creator** | 03-oneclick-creator-fullflow-test.js | `node tests/4-workflows/03-oneclick-creator-fullflow-test.js` |
| **Browser Test** | 01-google-flow-integration-test.js | `node tests/5-browser-automation/01-google-flow-integration-test.js` |

---

## 📂 Category Quick Links

### 1️⃣ Analysis Providers (12 tests)
Test and verify AI models for image analysis and recommendations.

```bash
# Quick test
node tests/1-analysis-providers/01-gemini-api-test.js

# Test all providers
node tests/1-analysis-providers/11-all-providers-test.js

# Compare providers
node tests/1-analysis-providers/12-analysis-models-comparison-test.js
```

**Available Providers:**
- Google Gemini Vision
- OpenAI ChatGPT
- Fireworks AI
- OpenRouter
- ZAI Service
- HuggingFace
- Free/Open Source Models

---

### 2️⃣ Image Generation (5 tests)
Test image generation and manipulation services.

```bash
# Basic test
node tests/2-image-generation/01-basic-image-generation-test.js

# Real-world test
node tests/2-image-generation/02-realworld-image-generation-test.js

# Upload test
node tests/2-image-generation/05-image-upload-test.js
```

---

### 3️⃣ Video Generation (3 tests)
Test video synthesis and generation APIs.

```bash
# Basic video test
node tests/3-video-generation/01-video-gen-api-test.js

# Advanced features
node tests/3-video-generation/02-video-gen-api-v2-comprehensive-test.js

# Google Flows integration
node tests/3-video-generation/03-google-flow-video-gen-test.js
```

---

### 4️⃣ Workflows (6 tests)
End-to-end workflow testing combining multiple services.

```bash
# Basic workflow
node tests/4-workflows/01-full-flow-basic-test.js

# ⭐ PRIMARY TEST - Full 1-Click Creator
node tests/4-workflows/03-oneclick-creator-fullflow-test.js

# Multi-flow orchestration
node tests/4-workflows/04-multiflow-orchestrator-test.js

# Upload + Analysis
node tests/4-workflows/06-upload-analysis-integration-test.js
```

---

### 5️⃣ Browser Automation (9 tests)
Test browser automation and web integration.

```bash
# Google Flows integration
node tests/5-browser-automation/01-google-flow-integration-test.js

# Session management
node tests/5-browser-automation/03-session-management-test.js

# Chrome profile auto-auth
node tests/5-browser-automation/05-chrome-profile-autoauth-test.js

# Bot detection evasion
node tests/5-browser-automation/06-bot-detection-stealth-test.js
```

---

### 6️⃣ Setup & Verification (8 files)
Configuration and service verification.

```bash
# Verify all providers are available
node tests/6-setup-verification/verify-providers-availability.js

# Verify ChatGPT setup
node tests/6-setup-verification/verify-chatgpt-integration.js

# Verify Grok session
node tests/6-setup-verification/verify-grok-session.js

# Setup BytePlus
node tests/6-setup-verification/setup-byteplus.js

# Setup Google Auth
node tests/6-setup-verification/setup-google-auth.js

# Setup ZAI
node tests/6-setup-verification/setup-zai.js
```

---

## 🎯 Recommended Test Sequences

### 🚀 **Quick Start** (5 min)
```bash
# 1. Check setup
node tests/6-setup-verification/verify-providers-availability.js

# 2. Test primary workflow
node tests/4-workflows/03-oneclick-creator-fullflow-test.js
```

### 🔍 **Provider Testing** (15 min)
```bash
# 1. Verify providers
node tests/6-setup-verification/verify-providers-availability.js

# 2. Test Gemini
node tests/1-analysis-providers/01-gemini-api-test.js

# 3. Test ChatGPT
node tests/1-analysis-providers/04-chatgpt-analysis-test.js

# 4. Compare all
node tests/1-analysis-providers/11-all-providers-test.js
```

### 🎬 **Full Feature Test** (30 min)
```bash
# Analysis
node tests/1-analysis-providers/11-all-providers-test.js

# Image Generation
node tests/2-image-generation/02-realworld-image-generation-test.js

# Video Generation
node tests/3-video-generation/02-video-gen-api-v2-comprehensive-test.js

# Complete Workflow
node tests/4-workflows/03-oneclick-creator-fullflow-test.js

# Browser Automation
node tests/5-browser-automation/01-google-flow-integration-test.js
```

### 🔬 **Comprehensive Suite** (1 hour)
```bash
# Setup verification (8 tests)
for f in tests/6-setup-verification/*.js; do node "$f"; done

# Analysis providers (12 tests)  
for f in tests/1-analysis-providers/*.js; do node "$f"; done

# Image generation (5 tests)
for f in tests/2-image-generation/*.js; do node "$f"; done

# Video generation (3 tests)
for f in tests/3-video-generation/*.js; do node "$f"; done

# Workflows (6 tests)
for f in tests/4-workflows/*.js; do node "$f"; done

# Browser automation (9 tests)
for f in tests/5-browser-automation/*.js; do node "$f"; done
```

---

## 📊 Test File Directory

### Analysis Providers
- `01-gemini-api-test.js` - Google Gemini API
- `02-gemini-unified-analysis-test.js` - Unified Gemini
- `03-fireworks-vision-test.js` - Fireworks Vision
- `04-chatgpt-analysis-test.js` - ChatGPT Basic
- `05-chatgpt-quality-analysis-test.js` - ChatGPT Quality
- `06-openrouter-provider-test.js` - OpenRouter
- `07-openrouter-quick-test.js` - OpenRouter Quick
- `08-zai-service-test.js` - ZAI Service
- `09-huggingface-provider-test.js` - HuggingFace
- `10-free-providers-test.js` - Free Providers
- `11-all-providers-test.js` - All Providers
- `12-analysis-models-comparison-test.js` - Model Comparison

### Image Generation
- `01-basic-image-generation-test.js` - Basic Setup
- `02-realworld-image-generation-test.js` - Real World
- `03-image-setup-verification-test.js` - Verification
- `04-image-providers-config-test.js` - Config
- `05-image-upload-test.js` - Upload

### Video Generation
- `01-video-gen-api-test.js` - Basic API
- `02-video-gen-api-v2-comprehensive-test.js` - Advanced
- `03-google-flow-video-gen-test.js` - Google Flows

### Workflows
- `01-full-flow-basic-test.js` - Basic End-to-End
- `02-full-flow-v2-advanced-test.js` - Advanced E2E
- `03-oneclick-creator-fullflow-test.js` - 1-Click Creator
- `04-multiflow-orchestrator-test.js` - Multi Flow
- `05-multi-image-simple-test.js` - Multi Image
- `06-upload-analysis-integration-test.js` - Upload+Analyze

### Browser Automation
- `01-google-flow-integration-test.js` - Google Flows
- `02-browser-services-comparison-test.js` - Service Compare
- `03-session-management-test.js` - Sessions
- `04-persistent-browser-session-test.js` - Persistent
- `05-chrome-profile-autoauth-test.js` - Chrome Profile
- `06-bot-detection-stealth-test.js` - Stealth
- `07-remote-debug-chrome-test.js` - Chrome Debug
- `08-remote-chrome-debugging-test.js` - Debug Protocol
- `09-step-by-step-flow-test.js` - Step-by-Step

### Setup & Verification
- `setup-byteplus.js` - BytePlus Setup
- `setup-google-auth.js` - Google Auth
- `setup-zai.js` - ZAI Setup
- `verify-browser-automation-suite.js` - Browser Suite
- `verify-chatgpt-integration.js` - ChatGPT
- `verify-grok-session.js` - Grok Session
- `verify-providers-availability.js` - All Providers
- `util-create-test-image.js` - Test Image Utility

---

## 🛠️ Troubleshooting

### Tests Not Finding Files
```bash
# Make sure you're in backend directory
cd backend

# Or use absolute paths
node /path/to/backend/tests/...js
```

### Missing Dependencies
```bash
npm install
```

### API Key Issues
```bash
# Check .env file
cat .env

# Verify specific provider
node tests/6-setup-verification/verify-chatgpt-integration.js
```

### Browser Automation Issues
```bash
# Check Chrome installation
which google-chrome  # or chromium

# Test browser services
node tests/5-browser-automation/02-browser-services-comparison-test.js
```

---

## 📚 Related Documentation

- [tests/README.md](./README.md) - Full test documentation
- [TESTS_MIGRATION_COMPLETE.md](./TESTS_MIGRATION_COMPLETE.md) - Migration details
- [../API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - API reference
- [../IMPLEMENTATION_GUIDE_COMPLETE.md](../IMPLEMENTATION_GUIDE_COMPLETE.md) - Implementation
- [../DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment guide

---

## ⚡ Performance Tips

### Run Tests Faster
- Skip slow tests initially
- Use `--timeout` flag for Jest if configured
- Run in parallel with `parallel` command (be careful with API limits)

### Monitor Resource Usage
```bash
# Run test with resource monitoring
time node tests/4-workflows/03-oneclick-creator-fullflow-test.js

# Or use top command
top -p $(node -e "console.log(process.pid)")
```

---

## 📝 Notes

- All paths relative to `backend/` directory
- Tests assume `.env` is configured
- Some tests require running backend server (`npm run dev`)
- Browser tests need Chrome/Chromium installed
- API rate limits may affect some tests

---

**Test Suite Status**: ✅ Fully Organized and Ready  
**Last Verified**: February 22, 2026  
**Total Tests**: 43 organized test files

