# Google Flow Modules - Quick Reference

## Architecture Overview

```
GoogleFlowAutomationService (MAIN ORCHESTRATOR)
│
├─ SessionManager
│  ├─ TokenManager (token lifecycle)
│  └─ SessionStorage (save/load)
│
├─ PromptManager
│  ├─ ClipboardHelper ✅ (text entry)
│  └─ UI validation
│
├─ ImageUploadManager
│  ├─ ImageConverter (PNG conversion)
│  ├─ ClipboardHelper ✅ (image paste)
│  └─ VirtuosoQueryHelper ✅ (track uploads)
│
├─ GenerationMonitor
│  ├─ VirtuosoQueryHelper ✅ (track hrefs)
│  ├─ ErrorDetector
│  └─ GenerationDownloader
│      └─ MouseInteractionHelper ✅ (right-click download)
│
├─ ErrorRecoveryManager
│  ├─ ErrorDetector (find error tiles)
│  ├─ MouseInteractionHelper ✅ (click retry)
│  └─ Retry logic orchestration
│
├─ NavigationManager
│  ├─ DOMElementFinder ✅ (find buttons/tabs)
│  ├─ MouseInteractionHelper ✅ (click elements)
│  └─ UI state verification
│
└─ SettingsManager
   ├─ DOMElementFinder ✅
   └─ MouseInteractionHelper ✅
```

## Module Responsibilities

### 🟢 Foundation Utilities (Created) ✅

#### `DOMElementFinder.js`
**Purpose**: Unified element finding across UI
**Used by**: NavigationManager, SettingsManager, ErrorDetector
**Key methods**:
- `findElementsByText(searchText, selector)` → Find buttons, menu items, etc.
- `findButton(text)` → Find button by text
- `getElementPosition(selector)` → Get coordinates
- `waitForElement(selector, timeoutMs)` → Wait for appearance
- `isVisible(selector)` → Check visibility

#### `VirtuosoQueryHelper.js`
**Purpose**: Query the virtuoso list (generated items)
**Used by**: ImageUploadManager, GenerationMonitor, HrefTracker
**Key methods**:
- `getHrefsFromVirtuosoList()` → Get all item hrefs
- `findNewHrefs(previousHrefs)` → New items since last check
- `getHrefByPosition(position)` → Get item at index
- `findGeneratedImageItem()` → Find image preview
- `getAllTileData()` → Detailed status for all items

#### `ClipboardHelper.js`
**Purpose**: Handle clipboard + paste operations
**Used by**: PromptManager, ImageUploadManager
**Key methods**:
- `copyToClipboard(text)` → Clear + write text
- `copyImageToClipboard(imagePath)` → Convert image + copy
- `pasteFromClipboard(selector)` → Paste to textbox
- `clearTextbox(selector)` → Ctrl+A + Backspace
- `enterTextCompletely(text, selector)` → Full clear+copy+paste flow

#### `MouseInteractionHelper.js`
**Purpose**: Standardized mouse interaction patterns
**Used by**: NavigationManager, ErrorRecoveryManager, GenerationDownloader
**Key methods**:
- `moveAndClick(x, y, options)` → Universal click
- `rightClick(x, y, waitMs)` → Context menu
- `rightClickAndSelect(x, y, menuItemText)` → Right-click + select menu
- `hover(x, y, durationMs)` → Hover over element
- `doubleClick(x, y)` → Double-click
- `drag(startX, startY, endX, endY)` → Drag & drop

### 🟡 To Create - Phase 2-5

#### SessionManager
**Purpose**: Session lifecycle (init, restore, close)
**Methods**:
- `initialize()` - Launch browser + load session
- `restoreSession()` - Apply cookies/localStorage
- `refreshTokens()` - Auto-refresh tokens
- `close()` - Cleanup

#### PromptManager
**Purpose**: Enter and validate prompts
**Methods**:
- `enterPrompt(text)` - Full prompt entry
- `submit()` - Click submit button
- `validatePrompt()` - Verify prompt was entered
- `clearPrompt()` - Empty textbox

#### ImageUploadManager
**Purpose**: Upload images to prompts
**Methods**:
- `uploadImages(paths...)` - Upload multiple
- `convertImageToPNG(imagePath)` - Format conversion
- `monitorUploadedItems()` - Wait for items to appear
- `validateUploads(expectedCount)` - Verify success

#### GenerationMonitor
**Purpose**: Monitor generation progress
**Methods**:
- `monitorGeneration(timeout)` - Track status
- `waitForCompletion()` - Poll until done
- `detectErrors()` - Find error tiles
- `downloadGeneratedItem(href)` - Retrieve output

#### ErrorDetector
**Purpose**: Identify generation failures
**Methods**:
- `findErrorTile()` - Locate failed item
- `getErrorMessage()` - Extract error text
- `hasLoadingIndicator()` - Check for %
- `isConfirmedError()` - Verify real error

#### ErrorRecoveryManager
**Purpose**: Retry logic + recovery strategies
**Methods**:
- `retryFailed(tileId)` - Retry button
- `reuseCommand(href)` - Re-run prompt
- `executeRecoveryStrategy()` - Choose best retry
- `handlePermanentFailure()` - Give up + log

#### NavigationManager
**Purpose**: UI navigation (tabs, routes)
**Methods**:
- `selectTab(label)` - Switch to tab
- `selectVideoMode()` - Switch to video
- `switchComponent(name)` - Change section
- `waitForPageReady()` - Page load check

#### SettingsManager
**Purpose**: Configure Google Flow settings
**Methods**:
- `configureSettings(options)` - Apply settings
- `selectModelQuality(quality)` - Choose 2K/1K
- `setAspectRatio(ratio)` - Set video size
- `verifySettings()` - Check applied

## Data Flow Examples

### Image Generation Flow
```
generateMultiple()
  │
  ├─ SessionManager.initialize()
  │   └─ load session file
  │
  ├─ NavigationManager.selectTab('Image')
  │   └─ DOMElementFinder.findElementByText()
  │   └─ MouseInteractionHelper.moveAndClick()
  │
  ├─ ImageUploadManager.uploadImages(char, product)
  │   ├─ ClipboardHelper.copyImageToClipboard()
  │   ├─ MouseInteractionHelper.moveAndClick()
  │   └─ VirtuosoQueryHelper.monitorUploadedItems()
  │
  ├─[Loop for each prompt]:
  │   ├─ PromptManager.enterPrompt(prompt)
  │   │   └─ ClipboardHelper.enterTextCompletely()
  │   ├─ PromptManager.submit()
  │   │   └─ MouseInteractionHelper.moveAndClick()
  │   ├─ GenerationMonitor.monitorGeneration()
  │   │   ├─ VirtuosoQueryHelper.findNewHrefs()
  │   │   └─ ErrorDetector.detectErrors()
  │   └─ [if error]:
  │       └─ ErrorRecoveryManager.retryFailed()
  │
  └─ SessionManager.close()
```

### Video Generation Flow
```
generateVideo()
  │
  ├─ SessionManager.initialize()
  ├─ NavigationManager.selectTab('Video')
  ├─ ImageUploadManager.uploadImages(primary, secondary)
  ├─ PromptManager.enterPrompt(videoPrompt)
  ├─ PromptManager.submit()
  ├─ GenerationMonitor.monitorGeneration(180s)
  │   └─ VirtuosoQueryHelper.findNewHrefs()
  │   └─ [if error]: ErrorRecoveryManager.retryFailed()
  ├─ GenerationMonitor.downloadGeneratedItem()
  │   └─ MouseInteractionHelper.rightClickAndSelect()
  └─ SessionManager.close()
```

## Import Pattern

### Option 1: Import from Index
```javascript
import { 
  DOMElementFinder,
  VirtuosoQueryHelper,
  ClipboardHelper,
  MouseInteractionHelper
} from './google-flow/index.js';
```

### Option 2: Import Directly
```javascript
import DOMElementFinder from './google-flow/dom-queries/DOMElementFinder.js';
import VirtuosoQueryHelper from './google-flow/dom-queries/VirtuosoQueryHelper.js';
```

### Option 3: Dynamic Binding
```javascript
class GoogleFlowAutomationService {
  constructor(page) {
    this.page = page;
    
    // Auto-bind all utilities
    this._setupUtilities();
  }
  
  _setupUtilities() {
    // All utilities get access to this.page
    const utilities = [
      DOMElementFinder,
      VirtuosoQueryHelper,
      ClipboardHelper,
      MouseInteractionHelper
    ];
    
    utilities.forEach(util => {
      util.page = this.page;
    });
  }
}
```

## Testing Strategy

### Unit Tests (Isolated)
```javascript
// test/dom-queries/DOMElementFinder.test.js
describe('DOMElementFinder', () => {
  beforeEach(() => {
    // Mock page object
    DOMElementFinder.page = mockPage;
  });
  
  test('findElementsByText', async () => {
    const results = await DOMElementFinder.findElementsByText('Generate');
    expect(results.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests (Full Flow)
```javascript
// test/integration/full-flow.test.js
describe('Full Image Generation Flow', () => {
  test('Should generate image end-to-end', async () => {
    const service = new GoogleFlowAutomationService();
    const result = await service.generateMultiple(charImg, prodImg, prompts);
    expect(result.success).toBe(true);
    expect(result.images.length).toBe(prompts.length);
  });
});
```

## Performance Notes

- **Element Finding**: Consolidated patterns reduce redundant DOM queries
- **Mouse Interactions**: Standardized timing (100-300ms delays) can be tuned
- **Clipboard**: Direct API access faster than typing
- **Virtuoso Queries**: Batched instead of individual checks

Estimated improvements:
- Overall flow time: 5-10% faster (less DOM manipulation)
- Code execution: 15-20% faster (less redundant code)
- Debugging time: 50% faster (clear responsibility areas)

## Debugging Guide

### Enable detailed logging
```javascript
const service = new GoogleFlowAutomationService({
  debugMode: true,
  logLevel: 'verbose'
});
```

### Check individual components
```javascript
// Test clipboard
await ClipboardHelper.copyToClipboard('test text');

// Test element finding
const btn = await DOMElementFinder.findElementByText('Generate');

// Test virtuoso queries
const hrefs = await VirtuosoQueryHelper.getHrefsFromVirtuosoList();
```

### Trace flow execution
```javascript
// In each manager method, add:
console.log(`[${ManagerName}] Executing ${methodName}`);

// At end:
console.log(`[${ManagerName}] ✅ ${methodName} complete`);
```

## Next Steps

1. **Verify** foundation utilities work with existing code
2. **Create** core managers (Phase 2)
3. **Test** each manager independently
4. **Integrate** managers into generateMultiple/generateVideo
5. **Clean** up old code
6. **Document** all flows
