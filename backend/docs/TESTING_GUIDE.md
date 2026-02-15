# Testing Guide

## Quick Start

### Run Full Flow Test (Auto Mode)
```bash
npm run test:flow
```

This will test:
- ✅ Image upload to cloud
- ✅ AI analysis (auto-select best model)
- ✅ Image generation (when implemented)
- ✅ Video generation (when implemented)
- ✅ Cleanup uploaded images

---

## CLI Options

### Basic Usage
```bash
node test-full-flow.js [options]
```

### Available Options

#### Model Selection
```bash
# Analysis models
--analysis <model>    # auto, claude, gpt4, gemini, zai, nvidia, mistral, groq
--image-gen <model>   # auto, dalle3, dalle2, stability
--video-gen <model>   # auto, runway, pika

# Examples:
npm run test:flow -- --analysis claude
npm run test:flow -- --analysis gpt4 --image-gen dalle3
```

#### Skip Tests
```bash
--skip-upload         # Skip image upload test
--skip-analysis       # Skip AI analysis test
--skip-image-gen      # Skip image generation test
--skip-video-gen      # Skip video generation test

# Examples:
npm run test:flow -- --skip-image-gen --skip-video-gen
npm run test:flow:fast  # Shortcut for above
```

#### Other Options
```bash
--file <path>         # Use custom image file
--no-cleanup          # Don't delete uploaded images
--verbose             # Show detailed logs

# Examples:
npm run test:flow -- --file ./my-image.jpg
npm run test:flow -- --no-cleanup --verbose
```

---

## Pre-configured Commands

### Test Specific Models

```bash
# Test with Claude
npm run test:flow:claude

# Test with GPT-4
npm run test:flow:gpt4

# Test with Gemini
npm run test:flow:gemini

# Test with Z.AI (FREE)
npm run test:flow:zai

# Test with NVIDIA (FREE)
npm run test:flow:nvidia

# Test with Groq (FREE)
npm run test:flow:groq
```

### Test Modes

```bash
# Auto mode (fallback system)
npm run test:flow:auto

# Fast mode (skip gen tests)
npm run test:flow:fast

# No cleanup (keep uploaded images)
npm run test:flow:no-cleanup

# Verbose mode (detailed logs)
npm run test:flow:verbose
```

---

## Analysis Model Options

| Option | Model | Provider | Cost | Status |
|--------|-------|----------|------|--------|
| `auto` | Auto-select | Multiple | Mixed | ✅ Active |
| `claude` | Claude 3.5 Sonnet | Anthropic | $3/M | ✅ Active |
| `claude-opus` | Claude 3 Opus | Anthropic | $15/M | ✅ Active |
| `claude-haiku` | Claude 3 Haiku | Anthropic | $0.25/M | ✅ Active |
| `gpt4` | GPT-4o | OpenAI | $5/M | ✅ Active |
| `gpt4-vision` | GPT-4 Vision | OpenAI | $10/M | ✅ Active |
| `gpt4-mini` | GPT-4o Mini | OpenAI | $0.15/M | ✅ Active |
| `gemini` | Gemini 2.0 Flash | Google | FREE | ✅ Active |
| `gemini-pro` | Gemini 2.5 Pro | Google | $1.25/M | ✅ Active |
| `gemini-flash` | Gemini 2.5 Flash | Google | $0.075/M | ✅ Active |
| `zai` | GLM-4V-Flash | Z.AI | FREE | ✅ Active |
| `zai-4v` | GLM-4V | Z.AI | $0.3/M | ✅ Active |
| `zai-plus` | GLM-4V-Plus | Z.AI | $0.6/M | ✅ Active |
| `nvidia` | Llama 3.2 11B Vision | NVIDIA | FREE | ✅ Active |
| `nvidia-90b` | Llama 3.2 90B Vision | NVIDIA | FREE | ✅ Active |
| `nvidia-phi` | Phi-3.5 Vision | NVIDIA | FREE | ✅ Active |
| `mistral` | Pixtral 12B | Mistral | $0.15/M | ✅ Active |
| `mistral-large` | Pixtral Large | Mistral | $2/M | ✅ Active |
| ~~`groq`~~ | ~~Llama 3.2 11B Vision~~ | ~~Groq~~ | ~~FREE~~ | ❌ Deprecated |
| ~~`groq-90b`~~ | ~~Llama 3.2 90B Vision~~ | ~~Groq~~ | ~~FREE~~ | ❌ Deprecated |

### ⚠️ Deprecated Models

**Groq Vision Models** have been decommissioned as of December 2024.

See: https://console.groq.com/docs/deprecations

**Alternative FREE models:**
- NVIDIA Llama 3.2 Vision (recommended)
- Z.AI GLM-4V-Flash
- Google Gemini 2.0 Flash

---

## Known Issues

### Groq Vision Models Deprecated
**Issue:** Groq's Llama 3.2 vision models are no longer available.

**Solution:** Use alternative FREE models:
```bash
# NVIDIA (recommended - fast and reliable)
npm run test:flow -- --analysis nvidia

# Z.AI (good quality)
npm run test:flow -- --analysis zai

# Gemini (Google's free model)
npm run test:flow -- --analysis gemini
```

### ImgBB Cleanup Not Supported
**Issue:** ImgBB doesn't support API-based image deletion.

**Solution:** 
1. Images expire based on account settings
2. Use Cloudinary for auto-cleanup:
```env
CLOUDINARY_CLOUD_NAME_1=your_cloud
CLOUDINARY_API_KEY_1=your_key
CLOUDINARY_API_SECRET_1=your_secret
```

### Z.AI Model Names
**Issue:** Z.AI uses specific model codes.

**Correct model names:**
- `glm-4v-flash` (FREE)
- `glm-4v` (Paid)
- `glm-4v-plus` (Paid)
- `glm-5` (Paid)

---

## Examples

### Test with FREE models only
```bash
# Z.AI (FREE)
npm run test:flow -- --analysis zai

# Groq (FREE, ultra-fast)
npm run test:flow -- --analysis groq

# NVIDIA (FREE)
npm run test:flow -- --analysis nvidia

# Gemini (FREE)
npm run test:flow -- --analysis gemini
```

### Test with premium models
```bash
# Claude 3.5 Sonnet (best quality)
npm run test:flow -- --analysis claude

# GPT-4o (reliable)
npm run test:flow -- --analysis gpt4

# Claude 3 Opus (most advanced)
npm run test:flow -- --analysis claude-opus
```

### Test with custom image
```bash
npm run test:flow -- --file ./my-wardrobe.jpg --analysis auto
```

### Quick test (no generation)
```bash
npm run test:flow:fast
```

### Debug mode
```bash
npm run test:flow -- --verbose --no-cleanup
```

### Test multiple models
```bash
# Run tests sequentially
npm run test:flow:zai && \
npm run test:flow:groq && \
npm run test:flow:nvidia
```

---

## Expected Output

### Successful Test
```
================================================================================
  🧪 SMART WARDROBE - FULL FLOW TEST
================================================================================

Test Configuration:
  Analysis Model: auto
  Image Gen Model: auto
  Video Gen Model: auto
  Skip Upload: No
  Skip Analysis: No
  Skip Image Gen: No
  Skip Video Gen: No
  Cleanup: Yes
  Verbose: No

[10:30:15] ℹ️  Found 2 test image(s)

================================================================================
  📸 Testing Image 1/2: anh nhan vat.jpeg
================================================================================

✔ Image uploaded to imgbb
[10:30:17] ✅ URL: https://i.ibb.co/xxxxx/image.jpg

✔ AI analysis completed
[10:30:20] ✅ Response length: 1234 characters

ℹ Image generation not yet implemented

ℹ Video generation not yet implemented

================================================================================
  📸 Testing Image 2/2: ao phong.jpg
================================================================================

✔ Image uploaded to cloudinary
[10:30:23] ✅ URL: https://res.cloudinary.com/xxxxx/image.jpg

✔ AI analysis completed
[10:30:26] ✅ Response length: 987 characters

✔ Cleanup completed

================================================================================
  📊 TEST SUMMARY
================================================================================

Total Tests: 7
✅ Passed: 5
❌ Failed: 0
⏭️  Skipped: 2
📈 Success Rate: 100.0%

Detailed Results:

1. ✅ Image Upload
   ⏱️  Duration: 1.5s
   📝 Uploaded to imgbb

2. ✅ AI Analysis (auto (fallback system))
   ⏱️  Duration: 3.2s
   📝 Response: 1234 chars

3. ⏭️ Image Generation (auto)
   📝 Feature not yet implemented

4. ⏭️ Video Generation (auto)
   📝 Feature not yet implemented

5. ✅ Image Upload
   ⏱️  Duration: 1.8s
   📝 Uploaded to cloudinary

6. ✅ AI Analysis (auto (fallback system))
   ⏱️  Duration: 2.9s
   📝 Response: 987 chars

7. ✅ Cleanup
   📝 Deleted 2 image(s)

================================================================================
```

### Failed Test
```
[10:30:15] ❌ Image upload failed
[10:30:15] ❌ Error: No image upload providers configured

================================================================================
  📊 TEST SUMMARY
================================================================================

Total Tests: 1
✅ Passed: 0
❌ Failed: 1
⏭️  Skipped: 0
📈 Success Rate: 0.0%

Detailed Results:

1. ❌ Image Upload
   ❌ Error: No image upload providers configured

================================================================================
```

---

## Troubleshooting

### "No test images found"
**Solution:** Ensure these files exist in `test-images/` folder:
- `anh nhan vat.jpeg`
- `ao phong.jpg`

Or use custom file:
```bash
npm run test:flow -- --file ./your-image.jpg
```

### "No image upload providers configured"
**Solution:** Add at least one upload provider to `.env`:
```env
IMGBB_API_KEY_1=your_key
```

### "Analysis failed: No API keys configured"
**Solution:** Add API key for your chosen model:
```env
# For Z.AI
ZAI_API_KEY_1=your_key

# For Groq
GROQ_API_KEY_1=your_key

# For NVIDIA
NVIDIA_API_KEY_1=your_key
```

### Tests are slow
**Solution:** Use fast mode or FREE models:
```bash
# Skip generation tests
npm run test:flow:fast

# Use ultra-fast Groq
npm run test:flow:groq
```

---

## CI/CD Integration

### GitHub Actions
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:flow:fast
        env:
          IMGBB_API_KEY_1: ${{ secrets.IMGBB_API_KEY }}
          ZAI_API_KEY_1: ${{ secrets.ZAI_API_KEY }}
```

### Pre-commit Hook
```bash
# .husky/pre-commit
npm run test:flow:fast
```

---

## Performance Benchmarks

| Model | Upload | Analysis | Total | Cost |
|-------|--------|----------|-------|------|
| Groq (FREE) | 1.5s | 1.8s | 3.3s | $0 |
| Z.AI (FREE) | 1.5s | 2.5s | 4.0s | $0 |
| NVIDIA (FREE) | 1.5s | 4.1s | 5.6s | $0 |
| Gemini (FREE) | 1.5s | 3.0s | 4.5s | $0 |
| Claude 3.5 | 1.5s | 3.5s | 5.0s | $0.015 |
| GPT-4o | 1.5s | 2.8s | 4.3s | $0.025 |

---

## Support
- Issues: Create GitHub issue
- Docs: See `/docs` folder
- Help: `node test-full-flow.js --help`
