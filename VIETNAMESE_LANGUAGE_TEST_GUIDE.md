# Vietnamese Language Support - Complete Test Guide

## ✅ Implementation Status

### Frontend (OneClickCreatorPage.jsx)
- ✅ Language parameter accepted in `handleAffiliateVideoTikTokFlow()` function signature
- ✅ Language value from `i18n.language` passed to backend payload
- ✅ Language parameter added to `/api/ai/affiliate-video-tiktok` request
- ✅ Navbar language switcher (toggleLanguage) updates `i18n.language` state

### Backend (affiliateVideoTikTokService.js)
- ✅ Language parameter extracted from request body (default 'en')
- ✅ STEP 1: Character analysis uses Vietnamese prompts when language='vi'
- ✅ STEP 3: Deep analysis uses Vietnamese prompts when language='vi'
- ✅ STEP 4 (Multi-segment): Video generation uses Vietnamese prompts when language='vi'
- ✅ STEP 4 (Single-segment): Video generation uses Vietnamese prompts when language='vi'

### Supporting Services
- ✅ vietnamesePromptTemplates.js: 600+ lines, 26+ templates
  - 1 Character analysis template
  - 5 Deep analysis variants (full-outfit, top, bottom, accessories, shoes)
  - 20 Video generation templates (4 segments × 5 product focuses)
- ✅ vietnamesePromptBuilder.js: Utility class with 4 main methods
  - buildCharacterAnalysisPrompt()
  - buildDeepAnalysisPrompt(productFocus, config)
  - buildVideoGenerationPrompt(segment, productFocus, garmentInfo)
  - utility getters: getAvailableFocuses(), getAvailableSegments()

### Google Flow Automation (googleFlowAutomationService.js)
- ✅ Strict prompt verification (max 1% char difference + exact tail match)
- ✅ Proper configureSettings() for Image/Video, Aspect Ratio, Count selection
- ✅ 12+ new methods for video generation flow support

---

## 🧪 Testing Checklist

### Test 1: Language Selection in Navbar
**Objective:** Verify language switcher works and updates i18n.language

```
1. Open application in browser
2. Look for language selector in navbar
   - Should show current language (EN/VI icon or text)
3. Click language switcher
   - Watch navbar text change to Vietnamese
   - Watch all UI labels switch to Vietnamese
4. Click language switcher again
   - Watch navbar text change back to English
5. Confirm i18n.language is updated
   - Can check browser console: console.log(i18n.language)

Expected: Language toggles between 'en' ↔ 'vi' without page reload
✅ PASS: UI changes language smoothly
❌ FAIL: UI doesn't update or language doesn't toggle
```

### Test 2: Language Parameter in API Request
**Objective:** Verify language is sent to backend

```
1. Switch navbar language to Vietnamese (VI)
2. Prepare character and product images
3. Select options (voice, duration, etc.)
4. Click "Start Affiliate Video TikTok Generation"
5. Monitor network tab in browser DevTools
   - Find POST request to /api/ai/affiliate-video-tiktok
   - View Request body JSON
   - Look for "language" field

Expected JSON in request body:
{
  "characterImage": "data:image/png;base64,...",
  "productImage": "data:image/png;base64,...",
  "videoDuration": 30,
  "voiceGender": "male",
  "voicePace": "moderate",
  "productFocus": "full-outfit",
  "language": "vi",  ← ✅ Should be present
  ...
}

✅ PASS: language field is present in payload with value 'vi' or 'en'
❌ FAIL: language field missing from payload
❌ FAIL: language field has wrong value
```

### Test 3: Backend Receives Language Parameter
**Objective:** Verify backend logs show language parameter received

```
1. Open backend logs (docker logs or terminal output)
2. Repeat Test 2 (send request with language='vi')
3. Look for STEP 1 log output:
   - Should log: "Language detected: vi"
   - OR: "Using Vietnamese prompts for character analysis"
4. Check for ChatGPT prompt being sent
   - Should be in Vietnamese (not English)
   - Example: "Phân tích nhân vật thời trang..."

✅ PASS: Backend logs confirm language='vi' received and Vietnamese prompts used
❌ FAIL: Backend logs show language='en' (wrong language used)
❌ FAIL: Backend logs show English prompts despite setting language='vi'
```

### Test 4: STEP 1 Character Analysis (Vietnamese)
**Objective:** Verify Vietnamese character analysis prompt is used

```
1. Set language to Vietnamese in navbar
2. Submit form with character image
3. Monitor STEP 1 execution (ChatGPT character analysis)
4. Check backend logs for prompt content
   - Should contain Vietnamese text
   - Should start with something like: "Bạn là một chuyên gia phân tích thời trang..."
5. Check ChatGPT response
   - Should be in Vietnamese
   - Should analyze character in Vietnamese

✅ PASS: ChatGPT returns Vietnamese character analysis
❌ FAIL: ChatGPT returns English analysis (wrong language used)
❌ FAIL: Character analysis fails or is incomplete
```

### Test 5: STEP 3 Deep Analysis (Vietnamese)
**Objective:** Verify Vietnamese deep analysis prompt is used

```
1. Continue from Test 4 (after character analysis complete)
2. Monitor STEP 3 execution (ChatGPT deep outfit analysis)
3. Check backend logs for prompt content
   - Should contain Vietnamese text
   - Should reference product focus (full-outfit, top, etc.)
   - Should ask for deep analysis in Vietnamese
4. Check ChatGPT response
   - Should be in Vietnamese
   - Should provide detailed outfit analysis

✅ PASS: ChatGPT returns Vietnamese outfit analysis
❌ FAIL: ChatGPT returns English analysis
❌ FAIL: Analysis fails or generates less detail than English version
```

### Test 6: STEP 4 Video Generation (Vietnamese - Single Segment)
**Objective:** Verify Vietnamese video generation prompt is used

```
1. Continue from Test 5 (after deep analysis complete)
2. Monitor STEP 4 execution (ChatGPT video script generation)
3. Check backend logs for prompt content
   - Should contain Vietnamese text
   - Should ask for video script in Vietnamese
   - Should reference video segment (e.g., "Hook" translated)
4. Check ChatGPT response
   - Should be in Vietnamese
   - Should provide video script with Vietnamese text

✅ PASS: ChatGPT returns Vietnamese video script
❌ FAIL: ChatGPT returns English script
❌ FAIL: Video generation fails
```

### Test 7: STEP 4 Video Generation (Vietnamese - Multi-Segment)
**Objective:** Verify Vietnamese video generation for all segments (Hook, Intro, Features, CTA)

```
1. Use flow settings that trigger multi-segment generation
   - Check if flow auto-detects multi-segment or requires specific config
2. Monitor all 4 segments (Hook, Introduction, Features, CTA)
3. Verify each segment:
   - Backend logs show Vietnamese prompt for each segment
   - ChatGPT provides Vietnamese script for each segment
   - No English segments mixed with Vietnamese
4. Verify final video is assembled correctly

✅ PASS: All 4 segments generated in Vietnamese, video assembled correctly
❌ FAIL: Some segments in English, some in Vietnamese (inconsistent)
❌ FAIL: Any segment generation fails
```

### Test 8: Google Flow Configuration (Vietnamese Settings)
**Objective:** Verify GoogleFlowAutomationService correctly configures settings for Vietnamese flow

```
1. Monitor STEP 4.5 (Google Flow configuration)
2. Check browser automation logs:
   - Image/Video tab selection: Should click Video tab
   - Aspect Ratio selection: Should select "PORTRAIT" (9:16 for TikTok)
   - Count selection: Should select "x1" or configured value
   - Model selection: Should select "Nano Banana Pro" or similar
3. Verify all clicks are successful
   - No timeout errors
   - No element not found errors

✅ PASS: All settings configured correctly
❌ FAIL: Settings configuration fails (timeout, element not found)
❌ FAIL: Wrong aspect ratio or model selected
```

### Test 9: Full Flow with English (Regression Test)
**Objective:** Verify English language still works after changes

```
1. Switch navbar language to English (EN)
2. Prepare character and product images
3. Select options and submit form
4. Monitor flow execution
5. Verify:
   - All steps use English prompts
   - ChatGPT responses in English
   - Backend logs show language='en'
   - No errors introduced by language changes

✅ PASS: English flow works as before
❌ FAIL: English flow broken or degraded
❌ FAIL: English prompts replaced with Vietnamese
```

### Test 10: Language Persistence Across Sessions
**Objective:** Verify language selection persists across different sessions

```
1. Set language to Vietnamese (VI)
2. Generate first video completely
   - Verify Vietnamese throughout
3. Start second video generation without changing language
4. Verify second video also uses Vietnamese
5. Switch to English
6. Start third video generation
7. Verify third video uses English

✅ PASS: Language setting persists until manually changed
❌ FAIL: Language resets between sessions
❌ FAIL: Language mixes between sessions
```

---

## 📊 Expected Behavior Summary

### English Flow (language='en')
```
Navbar: English text
Backend: Uses English prompts
STEP 1: English character analysis
STEP 3: English outfit analysis
STEP 4: English video scripts
Google Flow: Configuration in English UI
```

### Vietnamese Flow (language='vi')
```
Navbar: Vietnamese text (Tiếng Việt / EN/VI toggle)
Backend: Uses Vietnamese prompts
STEP 1: Vietnamese character analysis (Phân tích nhân vật...)
STEP 3: Vietnamese outfit analysis (Phân tích trang phục...)
STEP 4: Vietnamese video scripts (Kịch bản video...)
Google Flow: Configuration in Vietnamese UI (https://labs.google/fx/vi/tools/flow/...)
```

---

## 🔍 Debugging if Tests Fail

### If language='en' sent instead of 'vi':
1. Check navbar button - is it actually toggling language?
2. Verify i18n.language updates when clicking toggle
3. Check OneClickCreatorPage.jsx line 1055 - is i18n.language || 'en' present?
4. Check payload construction at line 765 - is language field included?

### If Vietnamese prompts not used in backend:
1. Check affiliateVideoTikTokService.js line 76 - is language parameter extracted?
2. Check STEP 1 (line 145) - does it have language check?
3. Check STEP 3 (line 1595) - does it have language check?
4. Check STEP 4 (lines 1145, 1231) - do they have language checks?
5. Verify vietnamesePromptBuilder.js is properly imported

### If ChatGPT receives English despite setting language='vi':
1. Check if prompt is properly built by VietnamesePromptBuilder
2. Check if builder returns actual Vietnamese text (not fallback to English)
3. Verify vietnamesePromptTemplates.js has Vietnamese content
4. Check if builder substitution works (e.g., {videoDuration} replaced correctly)

### If Google Flow configuration fails:
1. Check googleFlowAutomationService.js configureSettings() (line 814)
2. Verify selectors match actual HTML in Google Flow UI
3. Check if Vietnamese UI has different element structure than English
4. Monitor browser automation logs for specific click failures

---

## 📈 Success Criteria

✅ **ALL tests pass:**
- Language selector works
- language parameter reaches backend
- Vietnamese prompts used throughout flow
- ChatGPT responses in Vietnamese for all steps
- English flow still works (no regression)
- No errors or timeouts

🎉 **Result:** Vietnamese language support fully functional and production-ready

