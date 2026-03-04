# Asset Flow Investigation - Affiliate Video TikTok Step 2

## Current Flow Analysis

### Step 2: Generate 2 Images (wearing + holding)
- **Location**: `affiliateVideoTikTokService.js` line 856+
- **Action**: Calls `GoogleFlowAutomationService.generateMultiple()`
- **Output**: 2 images saved to local disk (`img01.jpeg`, `img02.jpeg`)
- **Result Variables**: `imageResults[]` with `.screenshotPath` populated

### Step 2.5: Upload Generated Images to Google Drive
- **Location**: `affiliateVideoTikTokService.js` line 1073+
- **Problem 1**: Images uploaded to Drive BUT **asset records NOT created yet**
- **Problem 2**: Drive upload results (ID, webViewLink) are **NOT saved anywhere**
- **Problem 3**: Upload happens but is **fire-and-forget** (no return tracking)
- **Code**: Lines 1119-1121 do upload but no storage of result

```javascript
// Current: Upload to drive but don't track result
const uploadResults = await Promise.all(uploadPromises);  // ← Results not used!
```

### Critical Gap: Missing Asset Creation & Drive Metadata Capture
- **Should happen**: After Drive upload, save:
  - Asset record for each generated image
  - Google Drive file ID
  - Google Drive web view link
  - Sync status: 'synced'

- **Actually happens**: Nothing! Asset creation happens LATER in Step 5

### Step 5: Create Asset Records (TOO LATE!)
- **Location**: `affiliateVideoTikTokService.js` line 1430+
- **Issue**: Creates asset with **ONLY local path**
- **Missing**: No Google Drive metadata

```javascript
// Line 1430: Asset created with incomplete storage info
storage: {
  location: 'local',
  path: imageResults[0].screenshotPath,
  url: imageResults[0].href || imageResults[0].screenshotPath  // ← Local URL, not Drive
}
```

### Gallery Picker Query
- **Location**: `assetRoutes.js` line 16
- **Query**: Looks for `storage.location` or `localStorage.path` or `cloudStorage.googleDriveId`
- **Result**: Shows images with local path ✓
- **Problem**: No Drive URLs/IDs in asset record ✗

---

## Problems Identified

### ❌ Problem 1: Upload Results Lost
- Step 2.5 uploads to Drive but `uploadResults` array is not used
- No code saves Drive file ID back to database
- No one knows the Drive file ID for the generated images

### ❌ Problem 2: Asset Created Too Late
- Generates images → uploads to drive → ~then later~ creates asset
- Asset should be created WITH drive metadata
- Instead, asset created without knowing about drive upload

### ❌ Problem 3: No Drive Metadata in Asset Record
- Generated image assets have `storage.location: 'local'`
- Should have `cloudStorage.googleDriveId` and `cloudStorage.webViewLink`
- Gallery picker has info but can't serve proper Drive URLs

### ❌ Problem 4: Sync Status Missing
- Asset records should have `syncStatus: 'synced'` after Drive upload
- Currently no sync status tracked
- Can't tell if image is synced to Drive or not

---

## Impact on Gallery Picker

### What Currently Happens:
1. Image generated locally ✓
2. Image uploaded to Drive ✓
3. Asset record created with **local path only** ✗
4. Gallery picker retrieves asset ✓
5. Gallery uses local proxy path ✓
6. Image serves from local disk ✓

### What SHOULD Happen:
1. Image generated locally ✓
2. Image uploaded to Drive ✓
3. **Asset record created WITH Drive metadata** ✗ ← FIX NEEDED
4. Gallery picker retrieves asset ✓
5. **Gallery can use Drive OR local URL** ✓ ← Asset has both
6. **Image serves from Drive when available** ✗ ← Need to switch to Drive URL

---

## Solution

### FIX 1: Capture & Store Drive Upload Results

In Step 2.5, after upload completes:

```javascript
const uploadResults = await Promise.all(uploadPromises);

// 🔴 NEW: Store upload results
uploadResults.forEach((result, idx) => {
  if (result && result.id) {
    imageResults[idx].googleDriveId = result.id;
    imageResults[idx].googleDriveWebViewLink = result.webViewLink;
    imageResults[idx].googleDrivePath = result.webViewLink;
    console.log(`   📌 Stored Drive ID: ${result.id}`);
  }
});
```

### FIX 2: Create Assets WITH Drive Metadata

Move asset creation to AFTER drive upload or include drive metadata when creating:

```javascript
// In Step 5, when creating asset for generated image:
const wearingAssetResult = await AssetManager.saveAsset({
  filename: wearingFilename,
  // ... existing fields ...
  storage: {
    location: 'hybrid',  // ← Has both local and cloud
    path: imageResults[0].screenshotPath,
    url: imageResults[0].href || imageResults[0].screenshotPath,
    googleDriveId: imageResults[0].googleDriveId,  // ← FROM CAPTURE
    webViewLink: imageResults[0].googleDriveWebViewLink  // ← FROM CAPTURE
  },
  cloudStorage: {
    location: 'google-drive',
    googleDriveId: imageResults[0].googleDriveId,
    webViewLink: imageResults[0].googleDriveWebViewLink,
    status: 'synced'
  },
  syncStatus: 'synced',  // ← Mark as synced
  // ... rest ...
}, { verbose: true });
```

### FIX 3: Update Gallery Proxy to Use Drive URL When Available

In `assetRoutes.js` proxy endpoint:

```javascript
// Line 90: When serving image
if (asset.cloudStorage?.googleDriveId) {
  // Use Drive URL instead of local
  const driveUrl = `https://drive.google.com/uc?export=download&id=${asset.cloudStorage.googleDriveId}`;
  return res.redirect(driveUrl);
}
// Fallback to local
```

---

## Implementation Steps

1. **Step 1**: In Step 2.5 upload loop - **capture drive upload results**
2. **Step 2**: Store Drive IDs/URLs in `imageResults[]`
3. **Step 3**: In Step 5, pass captured Drive metadata to `AssetManager.saveAsset()`
4. **Step 4**: Update gallery proxy to prefer Drive URLs
5. **Step 5**: Test gallery picker shows images with correct source

---

## Expected Result

After fix:
- ✅ Generated images have Drive URLs in asset records
- ✅ Gallery picker shows images from correct source
- ✅ Images serve from Drive when available
- ✅ Local fallback still works if Drive unavailable
- ✅ Sync status properly tracked

---

## Files to Modify

1. `backend/services/affiliateVideoTikTokService.js`
   - Line 1122: Capture upload results
   - Line 1430: Include Drive metadata in asset
   
2. `backend/routes/assetRoutes.js`
   - Line 90: Update proxy to prefer Drive URLs

3. Testing:
   - Run Step 2 flow
   - Check asset record in database
   - Verify gallery picker shows image
   - Test image loads correctly

