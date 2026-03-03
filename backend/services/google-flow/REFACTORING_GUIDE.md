# Google Flow Automation Service - Refactoring Guide

## ⚠️ CRITICAL: Backward Compatibility First

**Golden Rule**: External services that import this file should NOT require any changes.

### What's Protected
```
✅ Import path: './googleFlowAutomationService.js' (unchanged)
✅ Constructor: new GoogleFlowAutomationService({...}) (unchanged)
✅ All public methods: generateMultiple(), generateVideo(), etc. (all available)
✅ Configuration object structure (unchanged)
✅ Return values and method signatures (unchanged)
```

### Services That Will Continue Working Without Changes
- ✅ `affiliateVideoTikTokService.js`
- ✅ `multiVideoGenerationService.js`
- ✅ `multiFlowOrchestrator.js`
- ✅ `sceneLockService.js`
- ✅ All test files (10+ files)

**See** [BACKWARD_COMPATIBILITY_STRATEGY.md](./BACKWARD_COMPATIBILITY_STRATEGY.md) for detailed implementation approach using Adapter Pattern.

## Overview
Refactoring the 5844-line `googleFlowAutomationService.js` into modular, maintainable components organized by responsibility.

## New Folder Structure
```
backend/services/google-flow/
├── index.js                          # Central exports
├── GoogleFlowAutomationService.js    # Main service (orchestrator)
├── core/
│   ├── SessionManager.js             # Session init, restore, cleanup
│   └── PromptManager.js              # Prompt entry, submission, validation
├── session/
│   ├── TokenManager.js               # Token lifecycle, auto-refresh
│   └── SessionStorage.js             # Load/save sessions, configs
├── upload/
│   ├── ImageUploadManager.js         # Image upload orchestration
│   ├── ImageConverter.js             # PNG/format conversion
│   └── ImageClipboardPaste.js        # Clipboard image handling
├── generation/
│   ├── GenerationMonitor.js          # Generation status monitoring
│   ├── GenerationDownloader.js       # Download generated items
│   └── HrefTracker.js                # Track generation progress
├── ui-controls/
│   ├── NavigationManager.js          # Tab switching, routing
│   ├── SettingsManager.js            # Settings configuration
│   ├── MenuInteraction.js            # Menu selection, dropdowns
│   └── VideoModeManager.js           # Video-specific UI
├── error-handling/
│   ├── ErrorDetector.js              # Detect generation errors
│   ├── ErrorRecoveryManager.js       # Recovery strategies
│   └── RetryLogic.js                 # Retry orchestration
├── dom-queries/
│   ├── DOMElementFinder.js           # Universal element finding ✅
│   ├── VirtuosoQueryHelper.js        # Virtuoso list queries ✅ 
│   └── PageStateChecks.js            # Page readiness, validation
└── utilities/
    ├── ClipboardHelper.js            # Clipboard ops ✅
    ├── MouseInteractionHelper.js     # Mouse ops ✅
    ├── KeyboardHelper.js             # Keyboard ops
    └── FileHelpers.js                # File I/O utils
```

## Refactoring Phases

### Phase 1: Foundation Utilities ✅ DONE
- [x] `DOMElementFinder.js` - Unified element finding
- [x] `VirtuosoQueryHelper.js` - Consolidated href/tile queries  
- [x] `ClipboardHelper.js` - Clipboard + paste operations
- [x] `MouseInteractionHelper.js` - Mouse interaction patterns
- [ ] Port remaining utilities: KeyboardHelper, FileHelpers

### Phase 2: Session & Token Management
- [ ] SessionManager - Consolidate init, loadSession, navigateToFlow
- [ ] TokenManager - ensureFreshTokens, refreshTokensAutomatically, clearGrecaptchaTokens
- [ ] SessionStorage - Load/restore session files

### Phase 3: Core Automation
- [ ] PromptManager - enterPrompt, submit, checkSendButton, waitForSendButtonEnabled
- [ ] ImageUploadManager - uploadImages, convertImageToPNG, storeUploadedImage
- [ ] NavigationManager - selectTab, selectVideoFromComponents, switchToVideoTab
- [ ] SettingsManager - configureSettings, clickSettingsButton

### Phase 4: Generation & Monitoring
- [ ] GenerationMonitor - monitorGeneration, findGeneratedImage, handleFailures
- [ ] GenerationDownloader - downloadItemViaContextMenu, downloadVideo
- [ ] ErrorDetector - detectLatestErrorTile, hasErrorState, hasLoadingPercent
- [ ] ErrorRecoveryManager - handleGenerationFailureRetry, retry logic

### Phase 5: Refactor Main Entry Points
- [ ] Refactor `generateMultiple()` - Use managers, split into smaller steps
- [ ] Refactor `generateVideo()` - Use managers, match image generation pattern
- [ ] Update GoogleFlowAutomationService - Inject dependencies, orchestrate

### Phase 6: Cleanup & Testing
- [ ] Delete unused methods: selectReferencePath, verifyImageSelected, uploadImage, navigateToProject
- [ ] Add unit tests for utilities
- [ ] Add integration tests for entire flow
- [ ] Performance testing

## Key Consolidations Done

### DOMElementFinder (consolidates 8+ find patterns)
```javascript
// OLD - scattered across code
const buttons = document.querySelectorAll('button');
for (const btn of buttons) {
  if (btn.textContent.includes('text')) { ... }
}

// NEW - unified approach
const element = await DOMElementFinder.findElementByText('text', 'button');
```

### VirtuosoQueryHelper (consolidates 3 methods)
```javascript
// getHrefsFromVirtuosoList
// findNewHref
// findHrefByPosition
// findGeneratedImage

// All now in VirtuosoQueryHelper
const hrefs = await VirtuosoQueryHelper.getHrefsFromVirtuosoList();
const newItems = await VirtuosoQueryHelper.findNewHrefs(previousSet);
```

### ClipboardHelper (consolidates clipboard patterns)
```javascript
// OLD - scattered clear + write + paste logic
await page.evaluate(() => navigator.clipboard.writeText('').catch(() => {}));
await page.evaluate(text => navigator.clipboard.writeText(text), prompt);
await page.keyboard.down('Control');
await page.keyboard.press('v');
await page.keyboard.up('Control');

// NEW - one call
await ClipboardHelper.enterTextCompletely(prompt, textboxSelector);
```

### MouseInteractionHelper (consolidates 8+ mouse patterns)
```javascript
// OLD - repeated pattern
await page.mouse.move(x, y);
await page.waitForTimeout(100);
await page.mouse.down();
await page.waitForTimeout(50);
await page.mouse.up();

// NEW - reusable method
await MouseInteractionHelper.moveAndClick(x, y);
```

## Methods to Delete (Unused)

1. **selectReferencePath** - Never called, stub method
2. **verifyImageSelected** - Never called, incomplete
3. **uploadImage** - Redundant with uploadImages, only stub
4. **navigateToProject** - Alias of navigateToFlow, not called

## Code Metrics

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Main file size | 5844 lines | ~1200 lines | 79% |
| Max method size | 1000+ lines | 200-300 lines | 70% |
| Methods per file | 50 methods | 5-8 methods | 86% |
| Code duplication | Multiple patterns | Consolidated utils | 60% |

## Migration Checklist

- [ ] Phase 1 utilities created ✅
- [ ] Phase 2-5: Create remaining modules
- [ ] Add mixin or composition pattern for page/browser references
- [ ] Update GoogleFlowAutomationService constructor
- [ ] Inject managers into service
- [ ] Refactor generateMultiple() to use managers
- [ ] Refactor generateVideo() to use managers
- [ ] Delete unused 4 methods
- [ ] Add JSDoc to all public methods
- [ ] Create unit test suite
- [ ] Create integration test suite
- [ ] Update imports in controllers
- [ ] Verify all flows work end-to-end
- [ ] Updated backward compatibility layer if needed

## Example Migration: Simple Method

### Before
```javascript
async enterPrompt(prompt) {
  console.log('📝 Entering prompt...');
  await this.page.evaluate(() => {
    const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
    if (textbox) textbox.focus();
  });
  await this.page.waitForTimeout(300);
  
  await this.page.keyboard.down('Control');
  await this.page.keyboard.press('a');
  await this.page.keyboard.up('Control');
  await this.page.waitForTimeout(100);
  await this.page.keyboard.press('Backspace');
  await this.page.waitForTimeout(300);

  await this.page.evaluate((promptText) => {
    navigator.clipboard.writeText(promptText).catch(() => {});
  }, prompt);
  await this.page.waitForTimeout(200);

  await this.page.keyboard.down('Control');
  await this.page.keyboard.press('v');
  await this.page.keyboard.up('Control');
  
  console.log('✅ Prompt entered');
}
```

### After
```javascript
async enterPrompt(prompt) {
  const textboxSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';
  return PromptManager.enterPrompt(prompt, textboxSelector);
}

// In PromptManager
static async enterPrompt(prompt, textboxSelector) {
  console.log('📝 Entering prompt...');
  
  const success = await ClipboardHelper.enterTextCompletely(prompt, textboxSelector);
  
  if (!success) {
    throw new Error('Failed to enter prompt');
  }
  
  console.log('✅ Prompt entered');
  return true;
}
```

## Benefits

✅ **Maintainability**: Each file has clear, single responsibility
✅ **Reusability**: Utilities can be imported individually
✅ **Testability**: Small, focused methods are easier to unit test
✅ **Performance**: Reduce method complexity, better code caching
✅ **Readability**: Clear file organization matches code functionality
✅ **Scalability**: Easy to add new providers (Grok, Runway, etc.)

## Next Steps

1. Create remaining Phase 2-5 modules (estimated 2-3 days)
2. Update GoogleFlowAutomationService to use new modules
3. Test end-to-end flows (1-2 days)
4. Delete unused methods and verify no breaks
5. Add comprehensive test coverage (3-5 days)

## Note

This refactoring maintains **100% backward compatibility** - all existing APIs remain unchanged, only internal implementation changes.
