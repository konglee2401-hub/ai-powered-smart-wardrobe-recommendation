# Phase 5: Integration Code Examples

**Purpose**: Show exactly how generateMultiple() and generateVideo() will be refactored to use the shared pattern and managers.

## Refactoring Strategy

Instead of completely rewriting these large methods (which could introduce bugs), we'll:
1. Keep existing error recovery logic as-is (it's complex and works)
2. Delegate the core operations (prompt, submit, monitor, download)
3. Extract the shared pattern for single-prompt generation
4. Incrementally migrate prompts to use the new flow

## Example 1: Updated generateMultiple() Structure

### Current (6000+ lines total, generateMultiple ~500 lines)

```javascript
async generateMultiple(characterImagePath, productImagePath, prompts, options = {}) {
  // 500 lines of:
  // - Init
  // - Navigation  
  // - Upload images
  // - Configure settings
  // - For each prompt:
  //   - Reuse command (if not first)
  //   - Enter prompt (130+ lines of clipboard logic)
  //   - Submit (5 lines)
  //   - Monitor (150+ lines of complex polling)
  //   - Download (50+ lines)
  //   - Error recovery (200+ lines)
  // - Close
}
```

### After Phase 5 Refactoring (Proposed: 100-150 lines)

```javascript
/**
 * Generate multiple images using Google Flow [REFACTORED - Phase 5]
 * Key improvement: Delegates to managers, uses shared generation pattern
 * 
 * WHAT'S DIFFERENT:
 * - Uses SettingsManager for configuration (step 4)
 * - Uses PromptManager + GenerationMonitor + GenerationDownloader
 * - Uses _sharedGenerationFlow() for core generation pattern
 * - Maintains backward compatibility via fallbacks
 */
async generateMultiple(characterImagePath, productImagePath, prompts, options = {}) {
  if (this.debugMode) {
    // Debug mode handling unchanged
    console.log('🔧 [DEBUG] generateMultiple() is disabled (debug mode)');
    await this.init();
    await this.navigateToFlow();
    return { success: true, debugMode: true, message: 'Debug mode: only opened project' };
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📊 MULTI-IMAGE GENERATION: ${prompts.length} images`);
  console.log(`${'═'.repeat(80)}\n`);

  const results = [];

  try {
    // STEP 1-3: Init, Navigate, Wait (unchanged)
    console.log('[INIT] 🚀 Initializing browser...');
    await this.init();
    
    console.log('[NAV] 🔗 Navigating to Google Flow...');
    await this.navigateToFlow();
    await this.page.waitForTimeout(2000);
    
    console.log('[PAGE] ⏳ Waiting for page to load...');
    await this.waitForPageReady();
    await this.page.waitForTimeout(5000);
    
    // STEP 4: Configure settings ONCE (NOW USING SettingsManager)
    console.log('[CONFIG] ⚙️  Configuring settings...');
    await this._delegateConfigureSettings();
    await this.page.waitForTimeout(2000);
    
    // STEP 5-6: Upload images (unchanged - simple operations)
    console.log('[UPLOAD] 📤 Uploading images...');
    await this.uploadImages(characterImagePath, productImagePath);
    
    // MAIN LOOP: For each prompt
    let lastGeneratedHref = null;
    
    for (let i = 0; i < prompts.length; i++) {
      console.log(`\n${'═'.repeat(80)}`);
      console.log(`🎨 PROMPT ${i + 1}/${prompts.length}`);
      console.log(`${'═'.repeat(80)}\n`);

      const prompt = prompts[i];

      try {
        // STEP A: Reuse command for subsequent prompts (unchanged)
        if (i > 0 && lastGeneratedHref) {
          console.log('[CHAIN] 🔄 Reusing command from previous href...');
          await this.rightClickReuseCommand(lastGeneratedHref);
          // ... (existing textbox clearing logic - 20 lines)
        }

        // STEP B-D: CORE GENERATION - NOW USING SHARED PATTERN
        console.log(`[GENERATION] 📝 Processing prompt: "${prompt.substring(0, 60)}..."`);
        
        // THIS IS THE KEY REFACTORING: Use the shared pattern
        const genResult = await this._sharedGenerationFlow(prompt, {
          timeoutSeconds: 180,
          isVideoMode: false
        });

        if (!genResult.success) {
          console.log(`[GENERATION] ❌ Generation failed: ${genResult.error}`);
          
          // ERROR RECOVERY (unchanged - complex logic stays as-is)
          const recovered = await this._attemptGenerationRecovery(prompt);
          if (!recovered) {
            throw new Error(`Failed to generate prompt ${i + 1}: ${genResult.error}`);
          }
        } else {
          lastGeneratedHref = genResult.href;
          
          // Rename and store result (unchanged)
          const imageNum = String(i + 1).padStart(2, '0');
          const renamedFile = await this._renameDownloadedFile(genResult.downloadedFile, imageNum);
          
          results.push({
            success: true,
            imageNumber: i + 1,
            href: genResult.href,
            path: renamedFile
          });
        }

      } catch (error) {
        console.error(`❌ PROMPT ${i + 1} ERROR: ${error.message}`);
        results.push({
          success: false,
          imageNumber: i + 1,
          error: error.message
        });
        // Continue with next prompt
      }
    }

    // Close browser
    await this.close();

    return {
      success: results.every(r => r.success),
      total: prompts.length,
      completed: results.filter(r => r.success).length,
      results: results
    };

  } catch (error) {
    console.error(`❌ GENERATION FAILED: ${error.message}`);
    await this.close();
    return { success: false, error: error.message, results };
  }
}

// HELPER: Error recovery (extracted from inline code for clarity)
async _attemptGenerationRecovery(prompt) {
  console.log('[RECOVERY] 🔄 Attempting recovery...');
  if (this.errorRecoveryManager) {
    return await this.errorRecoveryManager.handleGenerationFailureRetry();
  }
  // Fallback to original recovery method
  return await this.handleGenerationFailureRetry();
}

// HELPER: Rename downloaded file with image number
async _renameDownloadedFile(filePath, imageNum) {
  // Existing rename logic (currently inline)
  const fileExt = path.extname(filePath);
  const fileName = path.basename(filePath, fileExt);
  const renamedFileName = `${fileName}-img${imageNum}${fileExt}`;
  const renamedFilePath = path.join(path.dirname(filePath), renamedFileName);
  fs.renameSync(filePath, renamedFilePath);
  return renamedFilePath;
}
```

## Example 2: Updated generateVideo() Structure

### Current (300+ lines)

```javascript
async generateVideo(videoPrompt, primaryImagePath, secondaryImagePath, options = {}) {
  // 300 lines of nearly identical logic to generateMultiple
  // Only difference: settings configuration and single prompt
}
```

### After Phase 5 Refactoring (Proposed: 80-100 lines)

```javascript
/**
 * Generate a single video using Google Flow [REFACTORED - Phase 5]
 * 
 * KEY INSIGHT: This is IDENTICAL to generateMultiple, just:
 * - Single prompt instead of loop
 * - Video settings instead of image settings
 * - Uses shared generation pattern (80% identical code)
 */
async generateVideo(videoPrompt, primaryImagePath, secondaryImagePath, options = {}) {
  if (this.debugMode) {
    console.log('🔧 [DEBUG] generateVideo() is disabled (debug mode)');
    await this.init();
    await this.navigateToFlow();
    return { success: true, debugMode: true, message: 'Debug mode: only opened project' };
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🎬 VIDEO GENERATION: Single video`);
  console.log(`${'═'.repeat(80)}\n`);

  const { download = true, outputPath = null, reloadAfter = false } = options;

  try {
    // STEP 1-3: Init, Navigate, Wait (IDENTICAL to image)
    console.log('[INIT] 🚀 Initializing browser for video...');
    await this.init();
    
    console.log('[NAV] 🔗 Navigating to Google Flow...');
    await this.navigateToFlow();
    await this.page.waitForTimeout(2000);
    
    console.log('[PAGE] ⏳ Waiting for page to load...');
    await this.waitForPageReady();
    await this.page.waitForTimeout(5000);

    // STEP 4: Video-specific setup (different from image)
    console.log('[VIDEO] 📹 Switching to video mode...');
    await this.switchToVideoTab();
    await this.selectVideoFromComponents();
    
    // STEP 5: Configure video settings (DIFFERENT: video model and settings)
    console.log('[CONFIG] ⚙️  Configuring video settings...');
    await this._delegateConfigureSettings(); // SettingsManager with video params
    await this.page.waitForTimeout(2000);

    // STEP 6: Upload images (IDENTICAL logic)
    console.log('[UPLOAD] 📤 Uploading reference images...');
    await this.uploadImages(primaryImagePath, secondaryImagePath);

    // STEP 7-9: CORE GENERATION - IDENTICAL TO generateMultiple
    console.log(`[GENERATION] 🎬 Processing video: "${videoPrompt.substring(0, 60)}..."`);
    
    // THIS IS THE KEY REFACTORING: Use the SAME shared pattern
    const genResult = await this._sharedGenerationFlow(videoPrompt, {
      timeoutSeconds: 300, // Videos take longer
      isVideoMode: true
    });

    if (!genResult.success) {
      throw new Error(`Video generation failed: ${genResult.error}`);
    }

    // Download handling (IDENTICAL)
    const videoPath = genResult.downloadedFile;
    console.log(`✅ Video generated: ${path.basename(videoPath)}`);

    // Cleanup
    await this.close();

    return {
      success: true,
      path: videoPath,
      href: genResult.href,
      method: genResult.method
    };

  } catch (error) {
    console.error(`❌ VIDEO GENERATION FAILED: ${error.message}`);
    await this.close();
    return { success: false, error: error.message };
  }
}
```

## Code Reduction Analysis

### Line Count Reduction

| Method | Before | After | Reduction |
|--------|--------|-------|-----------|
| generateMultiple() | 500 lines | 150 lines | -70% |
| generateVideo() | 300 lines | 100 lines | -67% |
| Shared pattern | 0 lines | 100 lines | +100 new |
| Error recovery | 200 lines | 50 lines (extracted) | -75% |
| **Total** | 6065 lines | **~500 lines** | **-92%** |

### Key Changes

1. **Shared Pattern Extracts 90% Duplication**
   - Before: 800 lines (500 + 300) with near-identical logic
   - After: 250 lines (150 + 100) + 100 line shared method

2. **Manager Delegation Simplifies Logic**
   - Before: 130 lines of inline clipboard logic for prompt entry
   - After: 1 line call to PromptManager

3. **Extracted Helpers for Clarity**
   - Error recovery extracted to named method
   - Makes main flow readable and testable

## Implementation Checklist

### Phase 5b: Integration Implementation

```
Preparation:
- [ ] Review existing generateMultiple() error recovery logic
- [ ] Verify _sharedGenerationFlow() handles all cases
- [ ] Create test cases for shared pattern

Refactoring:
- [ ] Replace generateMultiple() prompt loop with shared pattern calls
- [ ] Update generateVideo() to use shared pattern
- [ ] Extract error recovery to named helpers
- [ ] Remove duplicated code sections

Testing:
- [ ] Test generateMultiple() with external services
- [ ] Test generateVideo() with external services
- [ ] Verify fallback logic works
- [ ] Performance benchmarking
- [ ] Run full test suite

Cleanup:
- [ ] Delete old inline implementations
- [ ] Delete duplicate sections
- [ ] Update documentation
- [ ] Final code review
```

## Benefits of This Refactoring

### For Developers
- **Easier to understand**: Clear separation of concerns
- **Easier to test**: Small focused methods
- **Easier to debug**: Error messages point to specific managers
- **Easier to extend**: Add new image/video types via settings only

### For Maintenance
- **Single source of truth**: Shared pattern ensures consistency
- **Fewer bugs**: Less duplicate code = fewer places to fix
- **Faster changes**: Modify one manager instead of finding all uses
- **Better performance**: Easier to optimize focused methods

### For Users
- **No breaking changes**: API completely unchanged
- **Better reliability**: More thorough testing of extracted code
- **Faster execution**: Optimized managers (eventual)
- **Better error messages**: Delegated to specialized managers

---

**Status**: Code examples complete and ready for implementation
**Next Step**: Begin Phase 5b integration with generateMultiple() refactoring
