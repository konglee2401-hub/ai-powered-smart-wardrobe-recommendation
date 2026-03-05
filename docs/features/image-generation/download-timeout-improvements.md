## 🔧 Image Download Timeout Improvements

**Issue Reported:**
- 2K image downloads timeout after 60 seconds
- Error: "Cannot download image 2: File download timeout"
- User reports images generate normally but download fails

**Root Causes:**
1. Google's upsampleImage API takes 60+ seconds to process 2K upsampling
2. Current implementation only waits 60 seconds (120 * 500ms)
3. No fallback mechanism if 2K fails
4. No last-resort preview image option

---

## 💡 Solutions Implemented

### 1. **Increased 2K Timeout** ⏱️
**Before:** 60 seconds
**After:** 120 seconds (240 iterations * 500ms)

```javascript
let maxIterations = 240; // 240 * 500ms = 120 seconds
let maxWaitTime = 120000; // 120 seconds for 2K upsampling
```

**Impact:** Gives the Google API more time to process and upload the 2K image

---

### 2. **Automatic 1K Fallback** 📉
When 2K download times out after 120 seconds, automatically attempts 1K:

```javascript
if (!fileDownloaded && attempt2KDownload) {
  console.log(`  ⏳ 2K download timeout (${maxWaitTime / 1000}s), attempting 1K fallback...`);
  
  // Clicks 1K option if available
  // Waits only 30 seconds for 1K (faster processing)
  maxIterations = 60; // 60 * 500ms = 30 seconds
}
```

**Flow:**
```
User clicks 2K Download
↓
System waits 120 seconds for 2K image
↓
If no file after 120s:
  → Automatically click 1K option
  → Wait 30 seconds for 1K (faster)
  → If still no file, move to preview fallback
```

---

### 3. **Preview Image Fallback** 🖼️
If both 2K and 1K downloads fail, retrieves the preview image URL from the UI:

```javascript
const previewSaveResult = await this.page.evaluate((imgIdx) => {
  // Finds the preview image element that's currently displayed
  // Returns: previewUrl, width, height
  const imgElement = targetImageContainer.querySelector('img[src*="storage.googleapis.com"]');
  
  return {
    success: true,
    previewUrl: imgElement.src,
    width: imgElement.naturalWidth || imgElement.width,
    height: imgElement.naturalHeight || imgElement.height
  };
});
```

**Output Example:**
```
✅ Preview URL available: https://storage.googleapis.com/...abc123 (512x512)
💡 You can manually download this preview image if needed
```

**Usage:** User can manually save the preview URL if downloads completely fail

---

### 4. **API Activity Monitoring** 🌐
Every 20 seconds of waiting, system monitors for active Google API calls:

```javascript
if ((i + 1) % 40 === 0) {
  const networkMonitor = await this.page.evaluate(() => {
    // Check for active upsampleImage or flow API requests
    const resourceTiming = performance.getEntries().filter(entry => 
      entry.name.includes('upsampleImage') || 
      entry.name.includes('flow')
    );
    return {
      hasRecentRequests: resourceTiming.length > 0,
      requestCount: resourceTiming.length,
      lastRequestTime: resourceTiming[...].responseEnd
    };
  });
  
  if (networkMonitor.hasRecentRequests) {
    console.log(`  🌐 API activity detected: ${networkMonitor.requestCount} requests...`);
  }
}
```

**Benefits:**
- Confirms Google API is actually processing
- Helps debug if network is stuck
- Shows when API responses come back

---

### 5. **Better File Detection** 📁
Improved filtering to exclude incomplete downloads:

```javascript
const newFiles = currentFiles.filter(f => {
  // Skip: .crdownload, .tmp, .partial, .download, hidden files
  if (f.endsWith('.crdownload') || 
      f.endsWith('.tmp') || 
      f.endsWith('.partial') || 
      f.endsWith('.download') ||
      f.startsWith('.')) {
    return false;
  }
  
  // Only count new files not yet downloaded
  const isNew = !initialFiles.includes(f);
  const notDownloaded = !downloadedFiles.some(df => df.includes(f));
  
  return isNew && notDownloaded;
});
```

---

## 📊 Expected Behavior

### Scenario: 2K Download Times Out

**Console Output:**
```
📊 Downloading 2 images (expected: 2)
⏱️  2K Timeout: 120s | 1K Fallback: 30s | Preview Fallback: Enabled

📍 Downloading image 1/2...
  ✓ Download button clicked
  ✓ Selected 2K download (Nano Banana Pro)
  ✓ Image upgrading detected...
  ⏳ Waiting for file (10s / 120s)... Files in dir: 20
  ⏳ Waiting for file (20s / 120s)... Files in dir: 20
  🌐 API activity detected: 1 requests, last response at 45000ms
  ⏳ Waiting for file (40s / 120s)... Files in dir: 20
  ...
  ⏳ File upgrading (2450KB at 115s)...
  ✓ File saved: image.jpg (3200KB)  ← SUCCESS!

📍 Downloading image 2/2...
  ✓ Download button clicked
  ✓ Selected 2K download (Nano Banana Pro)
  ✓ Image upgrading detected...
  ⏳ Waiting for file (10s / 120s)... Files in dir: 20
  ...
  ⏳ 2K download timeout (120s), attempting 1K fallback...
  ✓ Clicked 1K fallback option
  ⏳ Waiting for file (5s / 30s)... Files in dir: 21
  ✓ File saved: image_1k.jpg (1200KB)  ← 1K SUCCESS!

✓ Download complete! 2/2 images downloaded.

📊 Downloaded Images:
  1. image.jpg (3200KB)
  2. image_1k.jpg (1200KB)
```

### Scenario: Complete Download Failure

**Console Output:**
```
📍 Downloading image 3/3...
  ✓ Download button clicked
  ✓ Selected 2K download
  ⏳ Waiting for file (120s)...
  ⏳ 2K download timeout (120s), attempting 1K fallback...
  ⏳ Waiting for file (30s)...
  ❌ Cannot download image 3: File download timeout
  💾 Attempting to save preview image as fallback...
  ✅ Preview URL available: https://storage.googleapis.com/...xyz789 (512x512)
  💡 You can manually download this preview image if needed
```

---

## 🔄 Download Retry Logic

**Multi-Level Timeout Strategy:**

```
Attempt 1: 2K Download
├─ Timeout: 120 seconds
├─ File size check: > 100KB
└─ If fails → Continue to Attempt 2

Attempt 2: 1K Fallback
├─ Timeout: 30 seconds (faster)
├─ File size check: > 100KB
└─ If fails → Continue to Attempt 3

Attempt 3: Preview Fallback
├─ Retrieves preview URL from UI
├─ Resolution: Typically 512x512
└─ User can manually save or use
```

---

## 📋 Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| 2K Timeout | 120s | Google API upsampling takes 60-120s |
| 1K Timeout | 30s | Smaller resolution processes faster |
| File Size Min | 100KB | Filters out corrupted/partial downloads |
| Monitor Interval | Every 20 iterations (10s) | Shows progress without spam |
| API Monitor | Every 40 iterations (20s) | Confirms API is still processing |

---

## 🛠️ Files Modified

**Backend:**
- `backend/services/imageGenerationService.js`
  - Lines 1298-1436: Enhanced download timeout logic
  - Lines 1439-1482: Preview image fallback
  - Line 1103: Download configuration display

**No frontend changes needed** ✅

---

## 🧪 Testing Recommendations

1. **Test 2K Success Path:**
   - Generate images
   - Select 2K download
   - Verify completes within 120s
   - Download file > 100KB

2. **Test 1K Fallback:**
   - Simulate slow 2K by using network throttling
   - Force 2K timeout to trigger
   - Verify 1K option is found and clicked
   - Verify 1K completes within 30s

3. **Test Preview Fallback:**
   - Network offline mode
   - Verify preview URL is retrieved
   - Verify URL is accessible

---

## 📝 User Instructions (Vietnamese)

**Khi download 2K bị timeout:**

1. **Automatic 1K Fallback** ✅
   - Hệ thống sẽ tự động chuyển sang 1K
   - Đợi 30 giây thêm

2. **Preview Image** 🖼️
   - Nếu 1K cũng fail, sẽ có URL preview
   - Bạn có thể click URL để download preview thủ công

3. **Manual 1K Download:**
   - Bấm download lại
   - Chọn 1K (không bấm 2K)
   - Thường sẽ thành công trong 30s

---

## 🔍 Troubleshooting

**Problem:** Still timing out even with increased timeout
**Solution:** Check Google API rate limits or network connection

**Problem:** 1K fallback not working
**Solution:** Verify menu items are rendering correctly (check browser console)

**Problem:** Preview URL not retrieving
**Solution:** Check if image element exists in DOM (inspect with DevTools)

---

## 📅 Implementation Date
- Modified: February 24, 2026
- Status: Ready for testing
