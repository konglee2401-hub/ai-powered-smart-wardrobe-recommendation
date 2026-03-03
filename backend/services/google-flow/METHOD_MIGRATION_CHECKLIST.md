# Google Flow - Method Migration Checklist

## Methods to DELETE (Unused) ❌

These methods are never called - should be removed after verification:

```
[ ] selectReferencePath(imagePath)
    Location: Line ~1808
    Reason: Never called, incomplete implementation
    Dependent code: None identified

[ ] verifyImageSelected()
    Location: Line ~1792
    Reason: Never called, returns undefined
    Dependent code: None identified
    
[ ] uploadImage(imagePath)
    Location: Line ~1813
    Reason: Only stub, logic in uploadImages()
    Dependent code: None identified
    
[ ] navigateToProject()
    Location: Line ~1819
    Reason: Alias of navigateToFlow(), never called
    Dependent code: None identified
```

## Methods to MIGRATE (Extract to Managers)

### SessionManager (Phase 2)
```
From: GoogleFlowAutomationService
To: core/SessionManager.js

[ ] init()
    Current line: 57
    Action: Move to SessionManager.init()
    
[ ] loadSession()
    Current line: 136
    Action: Move to SessionManager.loadSession()
    
[ ] restoreSessionBeforeNavigation()
    Current line: 178
    Action: Move to SessionManager.restoreSessionBeforeNavigation()
    
[ ] navigateToFlow()
    Current line: 236
    Action: Move to SessionManager.navigateToFlow()
    
[ ] close()
    Current line: 3939
    Action: Move to SessionManager.close()
```

### TokenManager (Phase 2)
```
From: GoogleFlowAutomationService
To: session/TokenManager.js

[ ] ensureFreshTokens()
    Current line: 100
    Action: Move to TokenManager.ensureFreshTokens()
    
[ ] refreshTokensAutomatically()
    Current line: 122
    Action: Move to TokenManager.refreshTokensAutomatically()
    
[ ] clearGrecaptchaTokens()
    Current line: 1090
    Action: Move to TokenManager.clearGrecaptchaTokens()
```

### PromptManager (Phase 3)
```
From: GoogleFlowAutomationService
To: core/PromptManager.js

[ ] enterPrompt(prompt)
    Current line: 930
    Action: Refactor to use ClipboardHelper.enterTextCompletely()
    
[ ] submit()
    Current line: 1218
    Action: Move and refactor
    
[ ] checkSendButton()
    Current line: 1056
    Action: Move to PromptManager.checkSendButton()
    
[ ] waitForSendButtonEnabled()
    Current line: 1018
    Action: Move to PromptManager.waitForSendButtonEnabled()
```

### ImageUploadManager (Phase 3)
```
From: GoogleFlowAutomationService
To: upload/ImageUploadManager.js

[ ] uploadImages(characterImagePath, productImagePath, existingImages)
    Current line: 415
    Action: Refactor to use ClipboardHelper for image paste
    
[ ] convertImageToPNG(imagePath)
    Current line: 391
    Action: Move to ImageConverter.js
    
[ ] storeUploadedImage(imagePath)
    Current line: 358
    Action: Move to upload module
    
[ ] prepareSegmentImages(imageComposition, imageUrls)
    Current line: 3978
    Action: Move to ImageUploadManager.prepareSegmentImages()
    
[ ] addImageToCommand(itemHref)
    Current line: 4034
    Action: Move and refactor to use MouseInteractionHelper
```

### NavigationManager (Phase 3)
```
From: GoogleFlowAutomationService
To: ui-controls/NavigationManager.js

[ ] selectTab(label)
    Current line: 2701
    Action: Refactor to use DOMElementFinder
    
[ ] selectRadixTab(selector, displayName)
    Current line: 2836
    Action: Merge into selectTab() with strategy parameter
    
[ ] switchToVideoTab()
    Current line: 1678
    Action: Move to VideoModeManager
    
[ ] selectVideoFromComponents()
    Current line: 1690
    Action: Move to VideoModeManager
    
[ ] waitForPageReady()
    Current line: 257
    Action: Move (can integrate with SessionManager)
```

### SettingsManager (Phase 3)
```
From: GoogleFlowAutomationService
To: ui-controls/SettingsManager.js

[ ] configureSettings()
    Current line: 2082
    Action: Refactor to use DOMElementFinder + MouseInteractionHelper
    
[ ] clickSettingsButton()
    Current line: 2420
    Action: Move to SettingsManager.clickSettingsButton()
    
[ ] clickDropdownButton(selector, displayName)
    Current line: 1830
    Action: Move to MenuInteraction.js
    
[ ] clickMenuItemByText(itemText, menuSelector)
    Current line: 1895
    Action: Refactor to use MouseInteractionHelper.rightClickAndSelect()
    
[ ] selectVideoReferenceType(referenceType)
    Current line: 2029
    Action: Move to SettingsManager
    
[ ] debugSettingsButtons()
    Current line: 2536
    Action: Keep as debug utility (non-critical)
    
[ ] clickCreate()
    Current line: 2909
    Action: Move to NavigationManager
    
[ ] handleTermsModal()
    Current line: 3036
    Action: Move to NavigationManager
```

### GenerationMonitor (Phase 4)
```
From: GoogleFlowAutomationService
To: generation/GenerationMonitor.js

[ ] monitorGeneration(timeoutSeconds)
    Current line: 1555
    Action: Move and extend with error detection
    
[ ] findNewHref(previousHrefs) 
    Current line: 320
    Action: REPLACE with VirtuosoQueryHelper.findNewHrefs()
    
[ ] findHrefByPosition(position)
    Current line: 340
    Action: REPLACE with VirtuosoQueryHelper.getHrefByPosition()
    
[ ] findGeneratedImage()
    Current line: 1277
    Action: REPLACE with VirtuosoQueryHelper.findGeneratedImageItem()
    
[ ] getHrefsFromVirtuosoList()
    Current line: 307
    Action: REPLACE with VirtuosoQueryHelper.getHrefsFromVirtuosoList()
```

### GenerationDownloader (Phase 4)
```
From: GoogleFlowAutomationService
To: generation/GenerationDownloader.js

[ ] downloadItemViaContextMenu(newHref)
    Current line: 3268
    Action: Refactor to use MouseInteractionHelper.rightClickAndSelect()
    
[ ] downloadVideo()
    Current line: 1624
    Action: Move and refactor (wrapper around downloadItemViaContextMenu)
```

### ErrorRecoveryManager (Phase 4)
```
From: GoogleFlowAutomationService
To: error-handling/ErrorRecoveryManager.js

[ ] handleGenerationFailureRetry(prompt)
    Current line: 1329
    Action: Move and refactor
    
[ ] detectAndHandleFailures(maxAttempts)
    Current line: 3186
    Action: Move to ErrorRecoveryManager
    
[ ] checkAndRetryFailedItemOnce()
    Current line: 3105
    Action: Move to ErrorRecoveryManager (consolidate similar retry logic)
```

### Utility Methods (Phase 4)
```
From: GoogleFlowAutomationService
To: utilities module

[ ] reuseLastCommand()
    Current line: 3945
    Action: Move to utilities/CommandReuseHelper.js
    
[ ] rightClickReuseCommand(itemHref)
    Current line: 4254
    Action: Refactor to use MouseInteractionHelper.rightClickAndSelect()
```

## Consolidate These Patterns ✅ (Already identified)

### Pattern 1: Element Finding
**Consolidate from**: 8+ scattered find patterns
**Consolidate to**: `DOMElementFinder`
**Status**: ✅ DONE

### Pattern 2: Virtuoso List Queries
**Consolidate from**: getHrefsFromVirtuosoList(), findNewHref(), findHrefByPosition(), findGeneratedImage()
**Consolidate to**: `VirtuosoQueryHelper` 
**Status**: ✅ DONE

### Pattern 3: Clipboard & Paste
**Consolidate from**: enterPrompt(), pasteImageToTextbox(), handleGenerationFailureRetry()
**Consolidate to**: `ClipboardHelper`
**Status**: ✅ DONE

### Pattern 4: Mouse Interactions
**Consolidate from**: All mouse.move() + mouse.down() + mouse.up() patterns
**Consolidate to**: `MouseInteractionHelper`
**Status**: ✅ DONE

### Pattern 5: Menu Click (Remaining)
**Current instances**: clickMenuItemByText(), clickDropdownButton(), selectVideoReferenceType()
**Consolidate to**: Use `MouseInteractionHelper.rightClickAndSelect()` or improved menu finder

### Pattern 6: Error Retry (Remaining)
**Current instances**: checkAndRetryFailedItemOnce(), handleGenerationFailureRetry(), detectAndHandleFailures()
**Consolidate to**: `ErrorRecoveryManager` with unified retry logic

### Pattern 7: Tab Selection (Remaining)
**Current instances**: selectTab(), selectRadixTab(), switchToVideoTab()
**Strategy**: Unified `NavigationManager.selectTab()` with selector strategy parameter

## Code Coverage by Phase

| Phase | Files | Methods | Lines | Status |
|-------|-------|---------|-------|--------|
| Phase 1 Utils | 4 files | - | ~800 | ✅ DONE |
| Phase 2 Core | 3 files | 10 | ~600 | 📋 Planned |
| Phase 3 Mgmt | 4 files | 22 | ~1200 | 📋 Planned |
| Phase 4 Gen | 4 files | 18 | ~1000 | 📋 Planned |
| Refactor Main | 1 file | 2 | ~400 | 📋 Planned |
| **TOTAL** | **16 files** | **52** | **~5000** | |

## Integration Checklist Per Phase

### Phase 1 ✅ DONE
- [x] Create DOMElementFinder.js
- [x] Create VirtuosoQueryHelper.js
- [x] Create ClipboardHelper.js
- [x] Create MouseInteractionHelper.js
- [x] Create index.js with exports
- [ ] Create unit tests for utilities
- [ ] Test binding to GoogleFlowAutomationService.page
- [ ] Verify utilities compile without errors

### Phase 2 (Next)
- [ ] Create SessionManager.js
- [ ] Create TokenManager.js
- [ ] Create SessionStorage.js
- [ ] Move methods from GoogleFlowAutomationService
- [ ] Update GoogleFlowAutomationService constructor
- [ ] Create unit tests for each manager
- [ ] Integration test: SessionManager.initialize() → restoreSessionBeforeNavigation()
- [ ] Verify closes don't break anything

### Phase 3
- [ ] Create PromptManager.js (use ClipboardHelper)
- [ ] Create ImageUploadManager.js (use ClipboardHelper + VirtuosoQueryHelper)
- [ ] Create NavigationManager.js (use DOMElementFinder + MouseInteractionHelper)
- [ ] Create SettingsManager.js (use DOMElementFinder + MouseInteractionHelper)
- [ ] Refactor generateMultiple() to use managers
- [ ] Test image generation flow end-to-end
- [ ] Performance profiling

### Phase 4
- [ ] Create GenerationMonitor.js (use VirtuosoQueryHelper)
- [ ] Create GenerationDownloader.js (use MouseInteractionHelper)
- [ ] Create ErrorDetector.js
- [ ] Create ErrorRecoveryManager.js
- [ ] Test error scenarios and retry logic
- [ ] Test generation monitoring accuracy

### Phase 5
- [ ] Refactor generateVideo() to use all managers
- [ ] Test video generation flow
- [ ] Compare performance vs original

### Phase 6
- [ ] Delete unused 4 methods
- [ ] Delete now-redundant old methods
- [ ] Final integration testing
- [ ] Performance benchmarking
- [ ] Documentation review
- [ ] Code review
- [ ] Merge to production

## Success Metrics

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| Main file size | 5844 lines | <1200 lines | 📋 In Progress |
| Number of files | 1 | 16 | 🟢 4 files done |
| Max method size | 1000+ lines | 200-300 lines | 📋 Pending |
| Code duplication | Many patterns | Consolidated | 🟢 4 patterns done |
| Test coverage | ~10% | 80%+ | 📋 Pending |
| Time to understand flow | ~2 hours | ~30 min | 📋 Expected |
