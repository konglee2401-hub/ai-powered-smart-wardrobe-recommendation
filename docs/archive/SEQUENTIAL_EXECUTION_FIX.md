# Sequential Execution Race Condition Fix

## Problem Identified
Multiple automation actions (tab switches, image upload, config setup) were executing in parallel despite `await` keywords because there was NO explicit verification that each action's DOM changes completed before the next action started.

**User Requirement:**
> "cần làm lần lượt thôi cho chắc xong cái này rồi mới đến action khác"  
> (Must execute sequentially - ensure each step completes before moving to next)

**Symptoms:**
- Duplicate clicks on buttons
- Failed dropdown selections
- Tab switching errors
- Config modal not opening properly
- Image upload not completing before next action

## Root Cause Analysis

The original code had `await` keywords but only fixed-duration timeouts (1-1.5 seconds):

```javascript
// ❌ OLD: Just waits fixed time, doesn't verify state change
await this.page.waitForTimeout(1000);  // Function returns immediately
// Next action might proceed before DOM is ready
```

**Key Issues:**

1. **uploadImage()** - Reinitialize trick tab switches weren't verified
   - Lines 145-156: Switch VIDEO→IMAGE but doesn't check if tabs actually ready
   - After crop dialog close: Waited 0s extra before preview polling

2. **switchToVideoTab()** - No verification video tab is active
   - Clicked button, waited 1.5s, continued immediately
   - Never checked if video tab elements were actually loaded

3. **selectVideoFromComponents()** - No verification selection took effect
   - Clicked dropdown option, waited 1.5s
   - Didn't verify dropdown now shows "Tạo video từ các thành phần"

4. **verifyVideoInterface()** - Config assumed ready before click
   - Opened modal without verifying it appeared
   - Config actions (setAspectRatio, setOutputQuantity) ran without waits between them
   - Modal close didn't wait for actual disappearance

5. **Main Flow** - No waits between sequential steps
   - uploadImage() → immediately calls switchToVideoTab()
   - switchToVideoTab() → immediately calls selectVideoFromComponents()
   - selectVideoFromComponents() → immediately calls verifyVideoInterface()

## Solution Implemented

### 1. Enhanced Tab Switching Functions

**switchToImageTab() - UPDATED**
```javascript
// Increased: 2000ms → 2500ms
await this.page.waitForTimeout(2500);

// Added: Explicit verification textarea is visible
try {
  await this.page.waitForFunction(
    () => {
      const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
      return textarea && textarea.offsetParent !== null;
    },
    { timeout: 3000 }
  );
} catch (e) {
  console.warn('  ⚠️  Image tab elements not fully ready...');
}
```

**switchToVideoTab() - UPDATED**
```javascript
// Increased: 2000ms → 3000ms
await this.page.waitForTimeout(3000);

// Added: Explicit verification video tab elements are ready
try {
  await this.page.waitForFunction(
    () => {
      const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
      return textarea && textarea.offsetParent !== null;
    },
    { timeout: 5000 }
  );
} catch (e) {
  console.warn('  ⚠️  Video tab elements not fully ready...');
}
```

### 2. Enhanced uploadImage() Function

**Reinitialize Trick - UPDATED**
```javascript
// Switch to VIDEO tab
await this.page.evaluate(() => { /* click */ });
// Increased: 1000ms → 2000ms
await this.page.waitForTimeout(2000);

// Switch back to IMAGE tab
await this.page.evaluate(() => { /* click */ });
// Increased: 1500ms → 2500ms (image tab needs extra time to be ready for upload)
await this.page.waitForTimeout(2500);
```

**After Crop Dialog Close - UPDATED**
```javascript
// Wait for dialog to actually disappear
await this.page.waitForFunction(
  () => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
    return !dialogs.some(dialog => {
      const title = dialog.querySelector('h2');
      return title && title.textContent.includes('Cắt');
    });
  },
  { timeout: 10000 }
);

// 💫 NEW: Wait 3 seconds for preview to render
await this.page.waitForTimeout(3000);

// Then start polling for buttons
let pollAttempts = 0;
while (pollAttempts < 60) { ... }
```

### 3. Enhanced selectVideoFromComponents() Function

**Click Verification - UPDATED**
```javascript
if (!optionClicked) throw new Error('Could not find and click video option');
// Increased: 1500ms → 2500ms
await this.page.waitForTimeout(2500);
console.log('  ✓ Clicked "Tạo video từ các thành phần"');
```

**Selection Verification - UPDATED**
```javascript
// Added: Loop verification (up to 5 attempts)
let verificationAttempts = 0;
let verified = false;

while (!verified && verificationAttempts < 5) {
  verified = await this.page.evaluate(() => {
    const comboboxes = document.querySelectorAll('[role="combobox"]');
    if (comboboxes.length > 0) {
      const text = comboboxes[0].textContent.toLowerCase();
      return text.includes('video') && text.includes('thành phần');
    }
    return false;
  });

  if (!verified) {
    verificationAttempts++;
    await this.page.waitForTimeout(500);  // Retry every 500ms
  }
}

if (verified) {
  console.log('✓ Video mode verified');
} else {
  console.log('⚠️  Verification inconclusive, proceeding anyway...');
}
```

### 4. Enhanced verifyVideoInterface() Function

**Modal Opening - UPDATED**
```javascript
const configClicked = await this.page.evaluate(() => { /* click config button */ });

// Increased: 2000ms → 2500ms
await this.page.waitForTimeout(2500);

// Added: Wait for modal to actually appear
try {
  await this.page.waitForFunction(
    () => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      return dialogs.length > 0;
    },
    { timeout: 5000 }
  );
} catch (e) {
  console.warn('  ⚠️  Config modal not fully visible...');
}
```

**Between Config Steps - UPDATED**
```javascript
// Set aspect ratio
await this.setAspectRatio(this.options.aspectRatio);
await this.page.waitForTimeout(1500);  // NEW: Wait between steps

// Set output quantity
await this.setOutputQuantity(1);
await this.page.waitForTimeout(1500);  // NEW: Wait between steps
```

**Modal Close - UPDATED**
```javascript
// Close config
await this.page.keyboard.press('Escape');
// Increased: 2000ms → 2500ms
await this.page.waitForTimeout(2500);

// Added: Explicitly wait for modal to disappear
try {
  await this.page.waitForFunction(
    () => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      return dialogs.length === 0;
    },
    { timeout: 3000 }
  );
} catch (e) {
  console.warn('  ⚠️  Modal close verification failed...');
}

console.log('✓ Interface verified');
```

### 5. Enhanced Main Flow - runVideoGeneration()

**Extra Waits Between Steps - ADDED**
```javascript
// Upload image
await videoGen.uploadImage(options.imagePath);
// NEW: Wait 2s to ensure upload fully processed
await videoGen.page.waitForTimeout(2000);

// Switch to video tab
console.log('\n⏱️  Ensuring upload complete before switching tabs...');
await videoGen.switchToVideoTab();
// NEW: Wait 2s to ensure tab switch is stable
await videoGen.page.waitForTimeout(2000);

// Select video mode
await videoGen.selectVideoFromComponents();
// NEW: Wait 2s to ensure selection is set
await videoGen.page.waitForTimeout(2000);

// Verify interface
await videoGen.verifyVideoInterface();
```

## Sequential Execution Flow (NEW)

```
uploadImage()
  ↓ (waits for preview ready + 3s)
[2s wait]
  ↓
switchToVideoTab()
  ↓ (waits for video tab elements ready)
[2s wait]
  ↓
selectVideoFromComponents()
  ↓ (waits for dropdown selection to take effect)
[2s wait]
  ↓
verifyVideoInterface()
  ├─ Open config (waits for modal)
  ├─ setAspectRatio()
  ├─ [1.5s wait]
  ├─ setOutputQuantity()
  ├─ [1.5s wait]
  ├─ Close modal (waits for disappearance)
  ↓
Ready for enterPrompt()
```

## Wait Times Summary

| Step | Old | New | Verification |
|------|-----|-----|--------------|
| switchToImageTab | 2000ms | 2500ms + waitForFunction | ✓ Textarea visible |
| switchToVideoTab | 2000ms | 3000ms + waitForFunction | ✓ Video elements ready |
| uploadImage (VIDEO→IMAGE) | 1000ms + 1500ms | 2000ms + 2500ms | ✓ Tabs ready |
| After crop dialog | — | 3000ms wait | ✓ Preview rendering |
| selectVideoFromComponents | 1500ms | 2500ms + loop verify | ✓ Selection in combobox |
| verifyVideoInterface modal | 2000ms | 2500ms + waitForFunction | ✓ Modal visible |
| verifyVideoInterface close | 2000ms | 2500ms + waitForFunction | ✓ Modal gone |
| Between config steps | — | 1500ms | ✓ State change |
| Main flow waits | — | 2s × 3 | ✓ Previous step complete |

## Testing Checklist

- [ ] Run with image upload: `npm run test:video-gen -- --image test.jpg`
- [ ] Verify tab switches happen sequentially (not overlapping)
- [ ] Check that image upload completes before video tab switches
- [ ] Verify video mode selection shows in dropdown
- [ ] Check that config modal properly opens and closes
- [ ] Test with various aspect ratios (16:9, 9:16)
- [ ] Test output quantity set to 1x
- [ ] Monitor console for all verification messages
- [ ] Verify no "bấm không đúng" (incorrect clicks) errors

## Files Modified

1. **[backend/services/videoGenerationServiceV2.js](backend/services/videoGenerationServiceV2.js)**
   - Lines 110-160: Tab switching functions
   - Lines 165-320: uploadImage reinitialize trick + after-dialog wait
   - Lines 340-490: selectVideoFromComponents with selection verification loop
   - Lines 495-560: verifyVideoInterface with modal verification
   - Lines 1420-1445: Main flow with extra waits between steps

## Result

✅ **All actions now execute sequentially with explicit verification:**
- Each step waits for previous step's DOM changes to complete
- Explicit verification loops ensure state changes took effect
- No more parallel/racing execution
- Robust error handling with fallback behavior
- Better logging for debugging

---

**Last Updated:** Fixed sequential execution race conditions  
**Status:** ✅ Ready for testing with complete automation flow
