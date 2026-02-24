# Video Generation Flow - Enhancements Implementation Summary

## What Was Updated: `c:\Work\Affiliate-AI\smart-wardrobe\backend\services\videoGenerationServiceV2.js`

### ✅ 1. Error Detection & Automatic Regeneration

#### Added in `monitorGeneration()` function:
- **Error Detection** (lines 834-851):
  - Checks for "Không tạo được" (Cannot Create) error messages in virtuoso item at index 1
  - Also detects common error indicators like "không được" (not created) and "lỗi" (error)
  - Returns `hasError` and `errorMessage` in renderState object

- **Error Handling Trigger** (lines 856-868):
  - When error is detected, automatically triggers `regenerateVideoSegment()`
  - If regeneration succeeds, continues monitoring without resetting timer
  - If regeneration fails, stops the process

#### New Function: `regenerateVideoSegment()` (lines 903-955)
- Finds and clicks the "Sử dụng lại câu lệnh" button (Reuse Command)
- Since image is already selected, it just clicks Send button without re-uploading
- No need to go through upload flow again
- Handles button finding with multiple matching criteria (aria-label, text, icon)

### ✅ 2. Download Modal Handling

#### New Function: `waitForDownloadModalAndSelectQuality()` (lines 1104-1193)
- Waits up to 10 seconds for download modal to appear at bottom of page
- Looks for modal containers: `[role="dialog"]`, `[role="menu"]`, `[data-radix-popover-content]`, `[data-popover]`
- Searches for quality resolution options (1080p vs 720p)
- **Smart Quality Selection**:
  - Primary: "Đã tăng độ phân giải 1080p" (Upscaled to 1080p)
  - Fallback: "Kích thước gốc 720p" (Original 720p)
- Clicks the selected option and waits 1 second before returning

#### Integration in `downloadVideo()` (lines 1045-1049)
- After clicking download button, immediately calls `waitForDownloadModalAndSelectQuality()`
- Handles case where modal doesn't appear (gracefully continues)
- Modal selection happens before file detection loop

### 📋 Complete Flow Now Handles:

#### Scenario 1: Successful Render
```
1. Monitor rendering
2. Detect completion (hasContentAtIndex1 + mediaLoaded)
3. Click download button
4. Select quality (1080p preferred, fallback to 720p)
5. Wait for file download
6. Return downloaded file path
```

#### Scenario 2: Failed Render with Error Message
```
1. Monitor rendering
2. Detect error ("Không tạo được" message)
3. Click "Sử dụng lại câu lệnh" button
4. Click Send (image already selected)
5. Continue monitoring from step 2 (no timer reset)
6. (If regenerate succeeds, follow Scenario 1)
7. (If regenerate fails, return false)
```

#### Scenario 3: Download Modal Appears
```
1-6. Successfully render and click download
7. Modal appears at bottom of page
8. Find and select quality option (1080p → 720p)
9. Wait for file to appear in download folder
10. Return file path
```

## Key Technical Details

### Virtuoso Item Structure (per user's provided HTML)
- Container: `[data-testid="virtuoso-item-list"]`
- Items: `[data-index="0"]`, `[data-index="1"]`, etc. (only 1 video when output=x1)
- Video element: `<video src="...">` inside item at data-index="1"
- Error message: Text node with "Không tạo được âm thanh..." class text-red
- Regenerate button: wrap_text icon, text "Sử dụng lại câu lệnh"

### Download Modal Structure
- Appears dynamically after clicking download button
- Contains menu items with resolution options:
  - Button text includes "1080" or "tăng độ phân giải"
  - Button text includes "720" or "gốc" or "original"
- Uses Radix Dialog/Menu patterns
- Modal appears at bottom of viewport (may need scroll)

### Error Message Detection
- Primary: `errorText.includes('Không tạo được')`
- Secondary: `errorText.includes('không được')`
- Tertiary: `errorText.includes('lỗi')`
- CSS Class: `classList.includes('error')`

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `backend/services/videoGenerationServiceV2.js` | Error detection, regeneration, modal handling | 834-851, 856-868, 903-955, 1104-1193, 1045-1049 |

## Testing Checklist

- [ ] Test error detection when "Không tạo được" appears
- [ ] Verify regenerate button is found and clicked
- [ ] Confirm Send button is clicked without image re-upload
- [ ] Test monitoring continues after regenerate
- [ ] Verify download modal appears
- [ ] Check 1080p option selection
- [ ] Verify fallback to 720p works
- [ ] Confirm file download completes
- [ ] Test full flow with multiple segments (20s video = 3 segments)

## Expected Behavior After Update

1. **Fast Error Recovery**: If a video fails to render, automatic regeneration happens
2. **Quality Selection**: Download modal is properly detected and quality is selected
3. **No Manual Intervention**: User doesn't need to handle failed renders
4. **Clean UX**: All modal/button interactions are automated

## Potential Improvements for Future

- Retry limit for regeneration (currently unlimited)
- Log collection of all generated videos
- Batch error reporting
- Download modal timeout handling (if modal never appears)
