# ��� Test Suite Organization - v2

## ���️ Folder Structure

```
backend/tests/
├── 1-analysis-providers/           (13 files) - Vision/Analysis AI model tests
│   ├── 01-ai-providers-unit.test.js
│   ├── 01-gemini-api-test.js
│   ├── 02-gemini-unified-analysis-test.js
│   ├── 03-fireworks-vision-test.js
│   ├── 04-chatgpt-analysis-test.js
│   ├── 05-chatgpt-quality-analysis-test.js
│   ├── 06-openrouter-provider-test.js
│   ├── 07-openrouter-quick-test.js
│   ├── 08-zai-service-test.js
│   ├── 09-huggingface-provider-test.js
│   ├── 10-free-providers-test.js
│   ├── 11-all-providers-test.js
│   └── 12-analysis-models-comparison-test.js
│
├── 2-image-generation/             (5 files)
├── 3-video-generation/             (4 files)
├── 4-workflows/                    (10 files) ✅ REORGANIZED - Sequential numbering
├── 5-browser-automation/           (7 files)
├── 6-setup-verification/           (10 files)
└── 07-integration-features/        (9 files) ✅ NEW FOLDER
```

## ��� Changes Summary

### ✅ 4-workflows/ (Fixed)
**Issue:** Duplicate file numbers (03, 04, 06 repeated)  
**Solution:** Sequential numbering 01-10

```
01-full-flow-basic-test.js
02-google-flow-vto-workflow-test.js
03-oneclick-creator-fullflow-test.js
04-oneclick-creator-unified-test.js
05-multiflow-orchestrator-test.js
06-multi-video-comprehensive-test.js
07-multi-video-real-images-test.js
08-multi-video-mock-test.js
09-upload-analysis-integration-test.js
10-flow-controller-unit.test.js
```

### ✅ 07-integration-features/ (New)
**Purpose:** Consolidate high-level feature and integration tests  
**Files:** 9 tests including affiliate, pipeline, validation

### ✅ Root Tests Reorganized
- Moved root-level tests to appropriate folders
- Created sequential numbering where needed
- examples:
  - `ai-providers.test.js` → `1-analysis-providers/01-ai-providers-unit.test.js`
  - `flowTest.js` → `4-workflows/10-flow-controller-unit.test.js`
  - Integration tests → `07-integration-features/`

## ��� Statistics

| Folder | Files | Type |
|--------|-------|------|
| 1-analysis-providers | 13 | Unit tests |
| 2-image-generation | 5 | Provider tests |
| 3-video-generation | 4 | Provider tests |
| 4-workflows | 10 | E2E tests ✅ |
| 5-browser-automation | 7 | Service tests |
| 6-setup-verification | 10 | Utilities |
| 07-integration-features | 9 | Features ✅ |
| **TOTAL** | **58** | |

---
*Organization v2 - Feb 22, 2026*
