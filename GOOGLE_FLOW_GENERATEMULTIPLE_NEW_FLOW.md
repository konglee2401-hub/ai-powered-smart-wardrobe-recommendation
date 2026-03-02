# Google Flow generateMultiple() - NEW FLOW DESIGN

**Commit:** `fd65f03`  
**Date:** March 2, 2026

---

## Overview

The `generateMultiple()` method has been completely refactored to simplify the flow and improve error handling. Instead of using the `uploadImages()` method and complex image re-attachment logic, the new flow directly pastes images via the clipboard and monitors generation by tracking href changes in the gallery.

---

## New Flow Diagram

```
INIT → CONFIG → UPLOAD IMAGES → MONITOR UPLOAD
  ↓
FOR EACH PROMPT:
  - Clear previous prompt (Ctrl+A + Backspace)
  - Paste new prompt
  - Submit
  - Monitor for NEW href (generation)
  - If error: Retry via "reuse command" (max 5 times)
  - Download image
  ↓
CLOSE BROWSER
```

---

## Key Changes from Old Flow

| Aspect | Old | New |
|--------|-----|-----|
| Image Upload | `uploadImages()` method | Clipboard paste → Ctrl+V |
| Upload Monitor | Wait for gallery items | Monitor for new hrefs |
| Between Prompts | `rightClickReuseCommand()` + clear | Ctrl+A + Backspace |
| Error Handling | Full `handleGenerationFailureRetry()` | Right-click failed href only |
| Image Clearing | DOM `<img>` removal | Not needed |

---

## Detailed Flow

### STEPS 1-4: Setup & Upload

1. **Initialize** - Start browser, navigate to Google Flow
2. **Configure** - Set model, aspect ratio, count (once)
3. **Capture initial hrefs** - Note what's in gallery before upload
4. **Upload images** - Paste character image + product image directly
5. **Monitor** - Wait until images appear in gallery (new hrefs)

```javascript
// Capture initial state
let initialHrefs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a[href]'))
    .map(link => link.getAttribute('href'));
});

// Paste images to textbox
await page.focus('.iTYalL[role="textbox"]');
// Paste character image (Ctrl+V)
// Paste product image (Ctrl+V)

// Monitor until new hrefs appear
while (uploadedHrefsAppeared === false) {
  currentHrefs = await page.evaluate(() => {
    return document.querySelectorAll('a[href]').length;
  });
  if (currentHrefs > initialHrefs.length) {
    uploadedHrefsAppeared = true;
  }
}
```

---

### STEP 5: Main Prompt Loop

For each prompt (wearing → holding):

#### A. Clear Previous Prompt
```javascript
if (i > 0) {
  await page.focus('.iTYalL[role="textbox"]');
  await page.keyboard.down('Control');
  await page.keyboard.press('a');          // Select all
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');  // Delete
}
```

#### B. Paste New Prompt
```javascript
await page.focus('.iTYalL[role="textbox"]');
// Copy to clipboard
await page.evaluate((text) => {
  navigator.clipboard.writeText(text);
}, prompt);
// Paste
await page.keyboard.down('Control');
await page.keyboard.press('v');
await page.keyboard.up('Control');
```

#### C. Submit & Monitor
```javascript
// Click submit button
const submitBtn = await page.evaluate(() => {
  return document.querySelector('button [i.google-symbols] with arrow_forward');
});
submitBtn?.click();

// Monitor for new href
let generationDetected = false;
while (!generationDetected) {
  const currentHrefs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(link => link.getAttribute('href'));
  });
  
  // Find new href not in prePromptHrefs
  for (const href of currentHrefs) {
    if (!prePromptHrefs.includes(href)) {
      generatedHref = href;
      generationDetected = true;
      break;
    }
  }
  
  await page.waitForTimeout(1000);
}
```

#### D. Handle Errors
```javascript
// Check if generated item has error icon
const hasError = await page.evaluate((href) => {
  const link = document.querySelector(`a[href="${href}"]`);
  const parent = link.closest('[data-tile-id]');
  return parent?.querySelector('i.google-symbols')?.textContent.includes('warning');
}, generatedHref);

if (hasError) {
  // Retry via "reuse command" (max 5 times)
  for (let retry = 0; retry < 5; retry++) {
    // Right-click on generated item
    const pos = await page.evaluate((href) => {
      const link = document.querySelector(`a[href="${href}"]`);
      const rect = link.getBoundingClientRect();
      return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    }, generatedHref);
    
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    
    // Click "Sử dụng lại câu lệnh"
    const btn = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button[role="menuitem"]');
      for (const b of buttons) {
        if (b.textContent.includes('Sử dụng lại')) return b.getBoundingClientRect();
      }
    });
    
    await page.mouse.click(btn.left + btn.width/2, btn.top + btn.height/2);
    
    // Submit again
    submitBtn?.click();
    await page.waitForTimeout(2000);
    
    // Check if error resolved
    hasError = await page.evaluate((href) => {
      const link = document.querySelector(`a[href="${href}"]`);
      return link?.closest('[data-tile-id]')?.querySelector('i.google-symbols')?.textContent.includes('warning');
    }, generatedHref);
    
    if (!hasError) break;  // Success!
  }
}
```

#### E. Download
```javascript
// Wait for image UI
await page.waitForTimeout(3000);

// Download
let downloadFile = await this.downloadItemViaContextMenu(generatedHref);

// Rename with image number
const newName = `${downloadFile.split('.')[0]}-img${i+1}.png`;
fs.renameSync(downloadFile, newName);

results.push({
  success: true,
  imageNumber: i + 1,
  downloadedFile: newName
});
```

---

## Why This Works Better

### 1. **Simpler Code**
- No complex image DOM manipulation
- Direct clipboard use (built-in browser feature)
- Linear, easy-to-follow steps

### 2. **Faster Error Recovery**
- Retry on specific failing image (not full re-upload)
- "Reuse command" keeps same prompt text
- 5 seconds/retry vs 30+ seconds/full retry

### 3. **Reliable Monitoring**
- Track by href (what users see in UI)
- Detect errors immediately (warning icon)
- Clear "success" vs "failed" state

### 4. **No Image Clearing Complexity**
- Just clear text with Ctrl+A + Backspace
- Images are content, not separate objects
- No DOM manipulation needed

---

## Configuration

```javascript
await googleFlowService.generateMultiple(
  '/path/to/character-image.png',
  '/path/to/product-image.png',
  ['wearing prompt text', 'holding prompt text']
);
```

Returns:
```javascript
{
  success: true/false,
  results: [
    { success: true, imageNumber: 1, downloadedFile: 'img-img01.png' },
    { success: true, imageNumber: 2, downloadedFile: 'img-img02.png' }
  ],
  totalGenerated: 2,
  totalRequested: 2,
  downloadedFiles: ['img-img01.png', 'img-img02.png']
}
```

---

## Error Scenarios

### Success Case
```
Submit → Monitor → New href (no error) → Download ✅
```

### Failure + Retry
```
Submit → Monitor → New href with error icon
  → Right-click href
  → "Sử dụng lại câu lệnh"
  → Submit
  → Check status
  → If resolved: Download ✅
  → If retry #5 still fails: Skip ⏭️
```

### Timeout  
```
Submit → Monitor for 120s → No new href
  → Skip to next prompt ⏭️
```

---

## Testing

Run with a test prompt to verify the flow:

```bash
# In backend directory
node -e "
const GoogleFlowService = require('./services/googleFlowAutomationService.js').default;
const service = new GoogleFlowService({
  type: 'image',
  model: 'Nano Banana Pro',
  imageCount: 1,
  outputDir: './downloads'
});

service.generateMultiple(
  './test-images/character.png',
  './test-images/product.png',
  ['beautiful woman wearing casual t-shirt, high quality', 'woman holding phone showing app']
)
.then(result => console.log('Result:', result))
.catch(err => console.error('Error:', err));
"
```

---

## Related Code

- [googleFlowAutomationService.js](backend/services/googleFlowAutomationService.js)
- `generateMultiple()` - Main method (lines 4175+)
- `init()` - Browser initialization
- `navigateToFlow()` - Navigate to Google Flow Labs
- `configureSettings()` - Configure model/settings
- `downloadItemViaContextMenu()` - Download helper

---

**File Updated:** March 2, 2026  
**Commit:** `fd65f03`
