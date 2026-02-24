# Google Flow Image Detection & Download Fix

## Problems Identified & Fixed

### 1. **Incorrect Image Detection Logic** ❌ → ✅
**Problem:**
- Code counted total items in virtuoso scroller (always 5: indices 0-4)
- Index 0 = date header (not an image)
- Cannot detect when NEW image is ready using item count

**Solution:**
- Now queries `data-testid="virtuoso-item-list"` for item list
- Targets **specific `data-index="1"`** which contains the newest image
- Properly distinguishes between OLD and NEW images

**Code Change:**
```javascript
// OLD - Counts total items (always 5)
const downloadBtns = await page.evaluate(() => {
  const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
  const items = scroller.querySelectorAll('[data-index]');
  return items.length;  // Always returns 5
});

// NEW - Gets newest image at index 1
const newestImageInfo = await page.evaluate(() => {
  const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
  const itemList = scroller.querySelector('[data-testid="virtuoso-item-list"]');
  
  // Skip index 0 (date), get index 1 (newest image)
  const newestItem = itemList.querySelector('[data-index="1"]');
  if (!newestItem) return { error: 'No image item found at index 1' };
  // ... rest of logic
});
```

---

### 2. **No Policy Violation Detection** ❌ → ✅
**Problem:**
- No check for "vi phạm chính sách" (policy violation) messages
- If image violates policy, download would fail silently
- No retry mechanism

**Solution:**
- Scans itemList for policy violation text
- If violation detected, automatically retries generation
- Max 3 retry attempts with exponential waiting

**Code Pattern:**
```javascript
// CHECK FOR POLICY VIOLATION
const violationText = itemList.textContent.toLowerCase();
if (violationText.includes('vi phạm chính sách') || 
    violationText.includes('policy violation') || 
    violationText.includes('violates')) {
  return { 
    policyViolation: true, 
    hasError: false
  };
}
```

---

### 3. **No Automatic Regeneration on Policy Violation** ❌ → ✅
**Problem:**
- If policy violation detected, process just fails
- User has to manually click "Sử dụng lại câu lệnh" (Regenerate) button

**Solution:**
- Automatically finds and clicks regenerate button
- Waits for new generation to complete
- Retries up to 3 times before giving up
- Reports clear status after each retry

**Key Features:**
```javascript
// Automatic regeneration loop
for (let regenerateCount = 0; regenerateCount < 3; regenerateCount++) {
  const regenerateClicked = await page.evaluate(() => {
    // Find button with wrap_text icon and "Sử dụng lại câu lệnh" text
    // Click it automatically
  });
  
  // Wait for generation (up to 3 minutes)
  for (let i = 0; i < 180; i++) {
    const stillViolated = await page.evaluate(() => {
      const text = itemList.textContent.toLowerCase();
      return text.includes('vi phạm') || text.includes('policy violation');
    });
    
    if (!stillViolated) {
      console.log(`✓ Policy violation resolved!`);
      break;
    }
  }
}
```

---

### 4. **Poor Download Error Handling** ❌ → ✅
**Problem:**
- Download failures reported as simple warnings
- No distinction between network failure vs policy violation
- File size validation missing (may save corrupted downloads)

**Solution:**
- Validates downloaded files are > 10KB
- Specific error messages for different failure types:
  - "No scroller found" - DOM issue
  - "Item not found at index 1" - New image not rendered
  - "Download button not found" - Image generation failed
  - "File too small" - Corrupted download
- Clearly reports skipped downloads vs successful ones

**Error Reporting:**
```javascript
if (!downloadResult.success) {
  console.log(`❌ Cannot download image: ${downloadResult.error}`);
  console.log(`   (Old image download may have failed - skipping)\n`);
  continue;
}

// File validation
if (stats.size > 10240) {  // > 10KB
  generatedImages.push({...});
  console.log(`✓ File saved: ${newFile} (${Math.round(stats.size / 1024)}KB)\n`);
} else {
  downloadError = `File too small (${Math.round(stats.size / 1024)}KB) - may be corrupted`;
  // Retry download
}
```

---

### 5. **Improved Logging & User Feedback** ❌ → ✅
**Before:**
```
⏱️  720ms... buttons=2
⏱️  1420ms... buttons=2
⏱️  2120ms... buttons=2  // No action?
```

**After:**
```
⚠️  POLICY VIOLATION DETECTED!
Policy violation message found in results

🔄 Regenerate attempt 1/3...
  ✓ Regenerate button clicked, waiting for new generation...
  ⏱️  30s...
  ✓ Generation complete (after 45s)
  ✓ Policy violation resolved!

📍 Downloading newest image at index 1...
  ✓ Download button clicked
  ✓ Selected 2K download (Nano Banana Pro)
  ✓ File saved: image_2025-02-23_150845.png (2450KB)
```

---

## Index Structure Explanation

### HTML Structure:
```html
<div data-testid="virtuoso-scroller">
  <div data-testid="virtuoso-item-list">
    <!-- Index 0: Date header -->
    <div data-index="0">
      <div>23 thg 2, 2026</div>  <!-- DATE ONLY -->
    </div>
    
    <!-- Index 1: NEWEST IMAGE -->
    <div data-index="1">
      <img src="...newest-image.png" />
      <button><!-- download --></button>
      <button><!-- regenerate --></button>
    </div>
    
    <!-- Index 2-4: Older images -->
    <div data-index="2">...</div>
    <div data-index="3">...</div>
    <div data-index="4">...</div>
  </div>
</div>
```

**Key Points:**
- ✅ Index 0 = Date/header (NOT an image)
- ✅ Index 1 = Newest generated image
- ✅ Indices 2-4 = Older images
- ✅ Total count always = 5 items (constant)
- ✅ Must query specific index, not count total

---

## Implementation Details

### When Policy Violation Detected:
1. **Detect** - Search for policy violation text in itemList
2. **Alert** - Log clear warning to user
3. **Find Button** - Query for button with:
   - Icon: `wrap_text` or `repeat`
   - Text: Includes "Sử dụng lại câu lệnh"
4. **Click** - Automatically trigger regeneration
5. **Wait** - Up to 3 minutes for new generation
6. **Verify** - Check if violation resolved
7. **Retry** - Repeat up to 3 times total
8. **Report** - Clear success/failure message

### When Download Fails:
1. **Check error** - Determine why download failed
2. **Report** - Show specific error type
3. **Skip** - Don't block flow, continue gracefully
4. **Log** - Record which image failed and why

### File Validation:
- Minimum size: 10KB
- Not a `.crdownload` (incomplete) file
- Successfully accessible via `fs.statSync()`
- Store successfully validated files only

---

## Test Output Example

### Success Case:
```
📍 Step 11: Download generated images

📍 Found newest image at index 1...

  ✓ Download button clicked
  ✓ Selected 2K download (Nano Banana Pro)
  ✓ Image upgrading detected (after 2500ms)...
  ✓ File saved: image_2025-02-23_150845.png (2450KB)

✓ Download complete! 1 images downloaded.

📊 Downloaded Images:
  1. image_2025-02-23_150845.png (2450KB)

✅ FULL FLOW SUCCESSFUL!
```

### Policy Violation Case:
```
📍 Step 11: Download generated images

⚠️  POLICY VIOLATION DETECTED!
Policy violation message found in results

🔄 Regenerate attempt 1/3...
  ✓ Regenerate button clicked, waiting for new generation...
  ✓ Generation complete (after 55s)
  ✓ Policy violation resolved!

📍 Downloading newest image at index 1...

  ✓ Download button clicked
  ✓ Auto-download triggered (Banana)
  ✓ File saved: image_2025-02-23_151000.png (1850KB)

✓ Download complete! 1 images downloaded.
```

### Failure Case:
```
📍 Step 11: Download generated images

❌ Cannot download image: Image item not found at index 1
   (Old image download may have failed - skipping)

⚠️  No images were successfully downloaded

⏱️  GENERATION INCOMPLETE
```

---

## Changes Made

**File:** `backend/tests/4-workflows/02-google-flow-vto-workflow-test.js`

**Changes:**
1. ✅ Replaced item counting with specific `data-index="1"` query
2. ✅ Added policy violation detection logic
3. ✅ Added automatic regeneration (max 3 retries)
4. ✅ Added file size validation (min 10KB)
5. ✅ Improved error messages with specific failure reasons
6. ✅ Enhanced logging for better user feedback
7. ✅ Fixed "generated" flag handling for final status report

---

## Next Steps

To use the updated script:

1. **Run test:** `node backend/tests/4-workflows/02-google-flow-vto-workflow-test.js`
2. **Watch output** - Clear messages indicate progress and any issues
3. **Check results**:
   - ✅ Success: "FULL FLOW SUCCESSFUL!"
   - ⏳ Partial: "GENERATION INCOMPLETE" with completed steps listed
   - ❌ Failure: Specific error message explaining what went wrong

---

## Troubleshooting

### Still seeing "waiting for items" timeout?
- ✅ Fixed! Now checks at `data-index="1"` instead of counting

### Image has policy violation?
- ✅ Fixed! Now auto-regenerates up to 3 times

### Download fails with cryptic error?
- ✅ Fixed! Now shows specific error type (policy violation, network, DOM, etc.)

### File sizes seem wrong?
- ✅ Fixed! Now validates files are > 10KB before saving

