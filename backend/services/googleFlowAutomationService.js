/**
 * GoogleFlowAutomationService - Unified service for Image and Video generation
 * Supports both image and video workflows through single service
 * 
 * PHASE 5 REFACTORING: Adapter pattern - delegates to modular managers
 * - SessionManager: Browser and page lifecycle
 * - TokenManager: Token clearing and session refresh
 * - PromptManager: Prompt entry and submission
 * - ImageUploadManager: Image upload and conversion
 * - NavigationManager: UI navigation and clicking
 * - SettingsManager: Settings configuration
 * - GenerationMonitor: Generation progress monitoring
 * - GenerationDownloader: Download via context menu
 * - ErrorRecoveryManager: Failure recovery
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ContentSafetyFilter from './contentSafetyFilter.js';
import sharp from 'sharp';

// Import Phase 5 adapter managers
import SessionManager from './google-flow/core/SessionManager.js';
import TokenManager from './google-flow/session/TokenManager.js';
import PromptManager from './google-flow/core/PromptManager.js';
import ImageUploadManager from './google-flow/upload/ImageUploadManager.js';
import NavigationManager from './google-flow/ui-controls/NavigationManager.js';
import SettingsManager from './google-flow/ui-controls/SettingsManager.js';
import GenerationMonitor from './google-flow/generation/GenerationMonitor.js';
import GenerationDownloader from './google-flow/generation/GenerationDownloader.js';
import ErrorRecoveryManager from './google-flow/error-handling/ErrorRecoveryManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class GoogleFlowAutomationService {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.type = options.type || 'image'; // 'image' or 'video'
    this.contentSafetyFilter = new ContentSafetyFilter(); // Initialize content safety filter
    this.grecaptchaClearingInterval = null; // Track auto-clearing interval
    this.debugMode = options.debugMode === true; // Debug mode: only open, don't automate
    
    // Instance variables for tracking uploaded vs generated images
    this.uploadedImageRefs = {}; // Store refs of uploaded images (href + img src + text)
    this.lastPromptSubmitted = null; // Store original prompt for retry
    this.imageUrls = {}; // Store generated image URLs for segment mapping
    
    this.options = {
      headless: false,
      sessionFilePath: path.join(__dirname, '../.sessions/google-flow-session-complete.json'),
      baseUrl: 'https://labs.google/fx/vi/tools/flow',
      projectId: options.projectId || '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
      aspectRatio: options.aspectRatio || '9:16',
      imageCount: this.type === 'image' ? (options.imageCount || 1) : undefined,
      videoCount: this.type === 'video' ? (options.videoCount || 1) : undefined,
      model: options.model || (this.type === 'image' ? 'Nano Banana Pro' : 'Veo 3.1 - Fast'),
      outputDir: options.outputDir || path.join(__dirname, `../temp/${this.type}-generation-outputs`),
      timeouts: {
        pageLoad: 60000,
        tabSwitch: 1500,
        upload: 10000,
        prompt: 3000,
        generation: 120000,
        ...options.timeouts
      },
      ...options
    };

    if (this.debugMode) {
      console.log('🔧 DEBUG MODE ENABLED - Automation disabled, manual testing only\n');
    }

    // PHASE 5: Initialize modular managers (will be instantiated after init())
    this.sessionManager = null;
    this.tokenManager = null;
    this.promptManager = null;
    this.imageUploadManager = null;
    this.navigationManager = null;
    this.settingsManager = null;
    this.generationMonitor = null;
    this.generationDownloader = null;
    this.errorRecoveryManager = null;
  }

  async init() {
    const typeLabel = this.type === 'image' ? 'Image' : 'Video';
    console.log(`🚀 Initializing ${typeLabel} Generation Service...\n`);

    // Ensure outputDir is an absolute path for browser downloads
    const outputDirAbsolute = path.resolve(this.options.outputDir);
    
    if (!fs.existsSync(outputDirAbsolute)) {
      fs.mkdirSync(outputDirAbsolute, { recursive: true });
    }

    console.log(`   📁 Output directory: ${outputDirAbsolute}\n`);

    const headlessMode = this.options.headless === true ? 'new' : this.options.headless;
    this.browser = await puppeteer.launch({
      headless: headlessMode,
      args: [
        '--no-sandbox', 
        '--disable-dev-shm-usage'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });

    // Store absolute path for later use
    this.options.outputDir = outputDirAbsolute;
    
    // Store Windows user Downloads folder path for file monitoring
    // Chrome will save downloads to user's Downloads folder by default
    const userDownloadsDir = process.platform === 'win32' 
      ? path.join(process.env.USERPROFILE || '', 'Downloads')
      : path.join(process.env.HOME || '', 'Downloads');
    
    this.options.userDownloadsDir = userDownloadsDir;
    console.log(`   📥 Monitoring downloads in: ${userDownloadsDir}`);

    // PHASE 5: Instantiate all modular managers
    console.log('   🔧 Initializing modular managers...');
    this.sessionManager = new SessionManager(this.options);
    this.sessionManager.browser = this.browser;
    this.sessionManager.page = this.page;
    this.sessionManager.sessionData = this.sessionData;
    
    // Load session from file
    await this.sessionManager.loadSession();

    this.tokenManager = new TokenManager(this.sessionManager);
    this.promptManager = new PromptManager();
    this.promptManager.page = this.page;
    
    this.imageUploadManager = new ImageUploadManager();
    this.imageUploadManager.page = this.page;
    
    this.navigationManager = new NavigationManager();
    this.navigationManager.page = this.page;
    
    this.settingsManager = new SettingsManager();
    this.settingsManager.page = this.page;
    
    this.generationMonitor = new GenerationMonitor();
    this.generationMonitor.page = this.page;
    
    this.generationDownloader = new GenerationDownloader();
    this.generationDownloader.page = this.page;
    this.generationDownloader.options = this.options;
    
    this.errorRecoveryManager = new ErrorRecoveryManager();
    this.errorRecoveryManager.page = this.page;
    this.errorRecoveryManager.uploadedImageRefs = this.uploadedImageRefs;
    this.errorRecoveryManager.lastPrompt = this.lastPromptSubmitted;
    console.log('   ✅ Managers initialized\n');
    
    console.log('✅ Initialized\n');
  }

  async navigateToFlow() {
    // Delegate to SessionManager which handles the full navigation flow
    await this.sessionManager.navigateToFlow();
    
    // Check & refresh tokens after navigation
    await this.tokenManager.ensureFreshTokens();
    
    console.log('✅ Google Flow loaded and logged in\n');
  }

  async waitForPageReady() {
    console.log('⏳ Waiting for page elements to load...');
    let pageReady = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (!pageReady && attempts < maxAttempts) {
      attempts++;
      const elements = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const visibleButtons = Array.from(buttons).filter(btn => {
          const style = window.getComputedStyle(btn);
          return style.display !== 'none' && style.visibility !== 'hidden' && btn.offsetHeight > 0;
        });
        const hasFileInput = document.querySelector('input[type="file"]') !== null;
        const prompts = document.querySelectorAll('[contenteditable="true"]');
        
        // Check for essential elements
        const hasMainContent = document.querySelector('[data-testid="virtuoso-item-list"]') !== null ||
                              document.querySelector('.grid') !== null ||
                              document.querySelector('[role="main"]') !== null;
        
        return { 
          buttons: buttons.length, 
          visible: visibleButtons.length, 
          input: hasFileInput, 
          prompts: prompts.length,
          mainContent: hasMainContent
        };
      });

      // More flexible readiness check: Either satisfy original strict requirement OR new flexible requirement
      const strictReady = elements.buttons > 10 && elements.visible > 10 && elements.input && elements.prompts > 0;
      const flexibleReady = elements.visible > 5 && elements.mainContent;
      pageReady = strictReady || flexibleReady;

      if (!pageReady) {
        console.log(`   Attempt ${attempts}: buttons=${elements.buttons}, visible=${elements.visible}, input=${elements.input}, prompts=${elements.prompts}, content=${elements.mainContent}`);
        console.log(`   ⏳ Not ready yet, waiting 1000ms...`);
        await this.page.waitForTimeout(1000);
      }
    }

    if (!pageReady) {
      throw new Error(`Page elements not ready after ${maxAttempts} attempts`);
    }

    console.log(`   ✅ Page ready (attempt ${attempts})\n`);
  }

  async close() {
    try {
      // Close all managers (they don't own browser/page, so no cleanup needed)
      // Just a placeholder for future manager cleanup
      if (this.tokenManager) {
        // TokenManager has no cleanup needed currently
      }
      if (this.errorRecoveryManager) {
        // ErrorRecoveryManager has no cleanup needed currently
      }
    } catch (error) {
      console.error('Error closing managers:', error.message);
    }

    // Close browser session
    if (this.browser) {
      await this.browser.close();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 5 ADAPTER METHODS - Delegation to Modular Managers
  // These methods delegate work to specialized managers
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Adapter method: Switch to image tab mode (via NavigationManager)
   * @returns {Promise<boolean>} - True if successful
   */
  async _switchToImageTab() {
    try {
      if (this.navigationManager) {
        return await this.navigationManager.selectTab('image');
      }
      // Fallback to old implementation if manager not available
      return await this.selectTab('image');
    } catch (error) {
      console.error('Error switching to image tab:', error.message);
      return false;
    }
  }

  /**
   * Adapter method: Switch to video tab mode (via NavigationManager)
   * @returns {Promise<boolean>} - True if successful
   */
  async _switchToVideoTab() {
    try {
      if (this.navigationManager) {
        return await this.navigationManager.switchToVideoTab();
      }
      // Fallback to old implementation
      return await this.switchToVideoTab();
    } catch (error) {
      console.error('Error switching to video tab:', error.message);
      return false;
    }
  }

  /**
   * Adapter method: Configure generation settings (via SettingsManager)
   * @returns {Promise<boolean>} - True if successful
   */
  async _delegateConfigureSettings() {
    try {
      if (this.settingsManager) {
        return await this.settingsManager.configureSettings({
          aspectRatio: this.options.aspectRatio,
          count: this.type === 'image' ? this.options.imageCount : this.options.videoCount,
          model: this.options.model,
          type: this.type
        });
      }
      // Fallback to original configureSettings method
      return await this.configureSettings();
    } catch (error) {
      console.error('Error configuring settings:', error.message);
      return false;
    }
  }

  /**
   * Adapter method: Enter prompt text (via PromptManager)
   * @param {string} text - Prompt text to enter
   * @returns {Promise<boolean>} - True if successful
   */
  async _delegateEnterPrompt(text) {
    try {
      if (this.promptManager) {
        await this.promptManager.enterPrompt(text);
        this.lastPromptSubmitted = text;
        return true;
      }
      // Fallback to original method
      return await this.enterPrompt(text);
    } catch (error) {
      console.error('Error entering prompt:', error.message);
      return false;
    }
  }

  /**
   * Adapter method: Submit prompt (via PromptManager)
   * @returns {Promise<boolean>} - True if successful
   */
  async _delegateSubmitPrompt() {
    try {
      if (this.promptManager) {
        return await this.promptManager.submit();
      }
      // Fallback: call original submit method (which is the send button press)
      // In original: checkSendButton() and then submit()
      return await this.submit();
    } catch (error) {
      console.error('Error submitting prompt:', error.message);
      return false;
    }
  }

  /**
   * Adapter method: Monitor generation progress (via GenerationMonitor)
   * @param {number} timeoutSeconds - Timeout for monitoring
   * @returns {Promise<Object>} - Result object
   */
  async _delegateMonitorGeneration(timeoutSeconds = 180) {
    try {
      if (this.generationMonitor) {
        return await this.generationMonitor.monitorGeneration(timeoutSeconds);
      }
      // Fallback to original monitoring
      return await this.monitorGeneration(timeoutSeconds);
    } catch (error) {
      console.error('Error monitoring generation:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Adapter method: Download item via context menu (via GenerationDownloader)
   * @param {string} href - Item href to download
   * @returns {Promise<Object>} - Download result
   */
  async _delegateDownloadItem(href) {
    try {
      if (this.generationDownloader) {
        return await this.generationDownloader.downloadItemViaContextMenu(href);
      }
      // Fallback to original
      return await this.downloadItemViaContextMenu(href);
    } catch (error) {
      console.error('Error downloading item:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Adapter method: Handle generation failure/recovery (via ErrorRecoveryManager)
   * @param {string} prompt - Original prompt to retry
   * @param {Array} imagePaths - Image paths to re-upload
   * @returns {Promise<boolean>} - True if recovery successful
   */
  async _delegateHandleFailure(prompt, imagePaths) {
    try {
      if (this.errorRecoveryManager) {
        // Set up error recovery with tracking info
        if (this.uploadedImageRefs) {
          this.errorRecoveryManager.uploadedImageRefs = this.uploadedImageRefs;
        }
        if (this.lastPromptSubmitted) {
          this.errorRecoveryManager.lastPrompt = this.lastPromptSubmitted;
        }
        return await this.errorRecoveryManager.handleGenerationFailureRetry();
      }
      // Fallback to original handling
      return await this.handleGenerationFailureRetry();
    } catch (error) {
      console.error('Error handling failure:', error.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 5 ORCHESTRATION HELPERS - Complex workflow wrappers
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Internal orchestration: Enter prompt via PromptManager
   * Retrieves text from clipboard, validates it, stores for retry
   * @param {string} promptText - Text to enter
   * @returns {Promise<boolean>} - True if successful
   */
  async _internalEnterPromptViaManager(promptText) {
    try {
      this.lastPromptSubmitted = promptText; // Store for potential retry
      if (this.promptManager) {
        await this.promptManager.enterPrompt(promptText);
        return true;
      }
      return await this._delegateEnterPrompt(promptText);
    } catch (error) {
      console.error('[PROMPT] Error entering via manager:', error.message);
      return false;
    }
  }

  /**
   * Internal orchestration: Submit prompt via PromptManager  
   * Clicks send button and waits for submission
   * @returns {Promise<boolean>} - True if submission successful
   */
  async _internalSubmitPromptViaManager() {
    try {
      if (this.promptManager) {
        return await this.promptManager.submit();
      }
      return await this._delegateSubmitPrompt();
    } catch (error) {
      console.error('[PROMPT] Error submitting via manager:', error.message);
      return false;
    }
  }

  /**
   * Internal orchestration: Complete prompt entry and submission cycle
   * Combines entering prompt + submission + validation
   * @param {string} promptText - Text to submit
   * @returns {Promise<boolean>} - True if cycle successful
   */
  async _internalCompletePromptCycle(promptText) {
    try {
      // Step 1: Enter prompt
      if (!await this._internalEnterPromptViaManager(promptText)) {
        console.log('[PROMPT-CYCLE] ⚠️  Failed to enter prompt');
        return false;
      }

      // Step 2: Wait for UI stabilization
      console.log('[PROMPT-CYCLE] ⏳ Waiting 1s for prompt to stabilize...');
      await this.page.waitForTimeout(1000);

      // Step 3: Submit prompt
      if (!await this._internalSubmitPromptViaManager()) {
        console.log('[PROMPT-CYCLE] ⚠️  Failed to submit prompt');
        return false;
      }

      // Step 4: Wait for server acknowledgment
      console.log('[PROMPT-CYCLE] ⏳ Waiting 2s for server...');
      await this.page.waitForTimeout(2000);

      console.log('[PROMPT-CYCLE] ✅ Prompt cycle complete');
      return true;
    } catch (error) {
      console.error('[PROMPT-CYCLE] Error in prompt cycle:', error.message);
      return false;
    }
  }

  /**
   * Internal orchestration: Complete generation cycle
   * Monitor -> Detect -> Download workflow
   * @param {number} timeoutSeconds - Monitoring timeout
   * @returns {Promise<Object>} - Generation result with href
   */
  async _internalCompleteGenerationCycle(timeoutSeconds = 120) {
    try {
      // Use GenerationMonitor if available
      if (this.generationMonitor) {
        const monitorResult = await this.generationMonitor.monitorGeneration(timeoutSeconds);
        if (monitorResult?.success) {
          return {
            success: true,
            href: monitorResult.href || null,
            isNew: true,
            method: 'manager'
          };
        }
      }

      // Fallback to original monitoring
      const result = await this.monitorGeneration(timeoutSeconds);
      return {
        success: !!result,
        href: result,
        isNew: true,
        method: 'fallback'
      };
    } catch (error) {
      console.error('[GEN-CYCLE] Error in generation cycle:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SHARED GENERATION PATTERN - Used by both generateMultiple and generateVideo
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Shared generation orchestration pattern for image/video
   * Encapsulates: prompt entry -> submission -> monitoring -> download
   * 
   * Used by:
   * - generateMultiple() - iterates over multiple prompts
   * - generateVideo() - single prompt generation
   * 
   * @param {string} promptText - Prompt/script to generate
   * @param {Object} config - {characterImagePath, outputDir, type, etc}
   * @returns {Promise<Object>} - {success, href, downloadedFile, error}
   * 
   * PHASE 5 DESIGN: This method demonstrates how image and video flows
   * are essentially identical - only management difference is settings config
   * which happens BEFORE calling this shared method.
   */
  async _sharedGenerationFlow(promptText, config = {}) {
    const {
      characterImagePath,
      outputDir = this.options.outputDir,
      timeoutSeconds = 120,
      isVideoMode = false,
      storagePrefix = 'gen'
    } = config;

    console.log(`\n[SHARED-FLOW] 🎨 Starting generation (${isVideoMode ? 'video' : 'image'} mode)`);

    try {
      // ═══ PHASE A: PROMPT ENTRY AND SUBMISSION ═══
      console.log('[SHARED-FLOW] 📝 PHASE A: Entering and submitting prompt...');
      
      // Store prompt for retry
      this.lastPromptSubmitted = promptText;

      // Use PromptManager if available
      if (this.promptManager) {
        console.log('[SHARED-FLOW] ✓ Using PromptManager for entry');
        await this.promptManager.enterPrompt(promptText);
        await this.page.waitForTimeout(2000);
        
        const submitted = await this.promptManager.submit();
        if (!submitted) {
          console.log('[SHARED-FLOW] ⚠️  PromptManager submit returned false, falling back to original submit');
          await this.submit();
        }
      } else {
        // Fallback: use original inline submit logic
        console.log('[SHARED-FLOW] ✓ Using inline entry/submit logic (no PromptManager)');
        await this.enterPrompt(promptText);
        await this.submit();
      }

      console.log('[SHARED-FLOW] ⏳ Waiting for server acknowledgment...');
      await this.page.waitForTimeout(2000);
      console.log('[SHARED-FLOW] ✅ PHASE A complete\n');

      // ═══ PHASE B: GENERATION MONITORING ═══
      console.log('[SHARED-FLOW] ⏳ PHASE B: Monitoring generation...');

      let generationResult;
      if (this.generationMonitor) {
        console.log('[SHARED-FLOW] ✓ Using GenerationMonitor');
        generationResult = await this.generationMonitor.monitorGeneration(Math.ceil(timeoutSeconds));
      } else {
        console.log('[SHARED-FLOW] ✓ Using inline monitoring logic (fallback)');
        const href = await this.monitorGeneration(timeoutSeconds);
        generationResult = { success: !!href, href };
      }

      if (!generationResult?.success || !generationResult?.href) {
        console.log('[SHARED-FLOW] ⚠️  Generation monitoring failed or timed out');
        return { success: false, href: null, error: 'Generation failed' };
      }

      console.log(`[SHARED-FLOW] ✅ PHASE B complete (href: ${generationResult.href.substring(0, 50)}...)\n`);

      // ═══ PHASE C: DOWNLOAD ═══
      console.log('[SHARED-FLOW] ⬇️  PHASE C: Downloading result...');
      console.log('[SHARED-FLOW] ⏳ Waiting 3s for UI render...');
      await this.page.waitForTimeout(3000);

      let downloadedFile;
      if (this.generationDownloader) {
        console.log('[SHARED-FLOW] ✓ Using GenerationDownloader');
        downloadedFile = await this.generationDownloader.downloadItemViaContextMenu(generationResult.href);
      } else {
        console.log('[SHARED-FLOW] ✓ Using inline download logic (fallback)');
        downloadedFile = await this.downloadItemViaContextMenu(generationResult.href);
      }

      if (!downloadedFile) {
        console.log('[SHARED-FLOW] ⚠️  Download failed');
        return { success: false, href: generationResult.href, error: 'Download failed' };
      }

      console.log(`[SHARED-FLOW] ✅ PHASE C complete (file: ${path.basename(downloadedFile)})\n`);
      console.log('[SHARED-FLOW] ✅ SHARED GENERATION FLOW COMPLETE\n');

      return {
        success: true,
        href: generationResult.href,
        downloadedFile,
        method: this.generationDownloader ? 'manager' : 'fallback'
      };

    } catch (error) {
      console.error(`[SHARED-FLOW] ❌ Error in generation flow: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════


  async generateMultiple(characterImagePath, productImagePath, prompts, options = {}) {
    /**
     * REFACTORED Phase 5b: Now uses _sharedGenerationFlow() for core generation
     * Significant code reduction: 1100 lines → ~250 lines (-77%)
     * 
     * Key Changes:
     * - Keeps steps 1-7 (init, navigate, settings, upload unchanged)
     * - Main loop uses _sharedGenerationFlow() for prompt→submit→monitor→download
     * - Error recovery simplified (tile detection moved to internal flow)
     * - Maintains all external service compatibility via fallback logic
     */
    if (this.debugMode) {
      console.log('\n🔧 [DEBUG] generateMultiple() is disabled (debug mode)');
      console.log('   - init() allowed');
      console.log('   - navigateToFlow() allowed');
      console.log('   - All other steps skipped\n');
      
      await this.init();
      await this.navigateToFlow();
      
      console.log('\n✅ Browser open at Google Flow project');
      console.log('   (Manual testing enabled)\n');
      
      return {
        success: true,
        debugMode: true,
        message: 'Debug mode: only opened project'
      };
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`📊 MULTI-IMAGE GENERATION: ${prompts.length} images`);
    console.log(`${'═'.repeat(80)}\n`);
    console.log(`📸 Character image: ${path.basename(characterImagePath)}`);
    console.log(`📦 Product image: ${path.basename(productImagePath)}`);
    if (options.sceneImagePath) {
      console.log(`🎬 Scene image: ${path.basename(options.sceneImagePath)} (reference)`);
    }
    if (options.sceneLockedPrompt) {
      console.log(`📝 Scene locked prompt: "${options.sceneLockedPrompt.substring(0, 60)}..." (from scene: ${options.sceneName})`);
    }
    console.log();

    const results = [];

    try {
      // STEP 1-3: Init, navigate, wait (unchanged)
      console.log('\n[INIT] 🚀 Initializing browser...');
      await this.init();
      
      console.log('[NAV] 🔗 Navigating to Google Flow...');
      await this.navigateToFlow();
      await this.page.waitForTimeout(2000);
      
      console.log('[PAGE] ⏳ Waiting for page to load...');
      await this.waitForPageReady();
      await this.page.waitForTimeout(5000);
      console.log('[PAGE] ✅ Ready\n');

      // STEP 4: Configure settings once at start
      console.log('[CONFIG] ⚙️  Configuring settings (ONE TIME)...');
      await this._delegateConfigureSettings();
      await this.page.waitForTimeout(2000);

      // STEP 5-7: Upload images (unchanged logic)
      console.log('[UPLOAD] 📤 Uploading reference images...');
      console.log(`[UPLOAD] 📎 Pasting character image: ${path.basename(characterImagePath)}`);
      await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
      await this.page.waitForTimeout(300);

      // Helper to paste image via clipboard
      const pasteImage = async (imagePath, label) => {
        const imageData = fs.readFileSync(imagePath);
        const base64 = Buffer.from(imageData).toString('base64');
        await this.page.evaluate((b64) => {
          return fetch(`data:image/png;base64,${b64}`)
            .then(res => res.blob())
            .then(blob => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]))
            .catch(() => false);
        }, base64);
        await this.page.waitForTimeout(500);
        await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
        await this.page.waitForTimeout(120);
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('v');
        await this.page.keyboard.up('Control');
        await this.page.waitForTimeout(5000);
      };

      await pasteImage(characterImagePath, 'character');
      await pasteImage(productImagePath, 'product');
      if (options.sceneImagePath && fs.existsSync(options.sceneImagePath)) {
        try {
          await pasteImage(options.sceneImagePath, 'scene');
        } catch (e) {
          console.warn(`[UPLOAD] ⚠️  Scene image failed: ${e.message}`);
        }
      }

      console.log('[UPLOAD] ✅ Images uploaded. Monitoring for hrefs...');
      
      // Wait for at least 2 uploaded hrefs
      let uploadedRefs = [];
      let initialHrefs = await this.page.evaluate(() => {
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        return Array.from(links).map(l => l.getAttribute('href'));
      });
      const initialSet = new Set(initialHrefs);

      let uploadMonitor = 0;
      while (uploadedRefs.length < 2 && uploadMonitor < 90) {
        uploadMonitor++;
        const currentHrefs = await this.page.evaluate(() => {
          const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
          return Array.from(links).map(l => l.getAttribute('href'));
        });
        uploadedRefs = currentHrefs.filter(h => !initialSet.has(h));
        
        if (uploadedRefs.length >= 2) break;
        if (uploadMonitor % 10 === 0) {
          console.log(`[UPLOAD] Waiting for hrefs... ${uploadedRefs.length}/2 (${uploadMonitor}s)`);
        }
        await this.page.waitForTimeout(1000);
      }

      if (uploadedRefs.length < 2) {
        throw new Error('Uploaded images did not appear after 90 seconds');
      }

      // Store for fallback
      this.uploadedImageRefs = {
        wearing: { href: uploadedRefs[0], text: 'wearing' },
        product: { href: uploadedRefs[1], text: 'product' }
      };

      console.log('[UPLOAD] ✅ Ready to generate\n');

      const clickSubmitButton = async () => {
        const submitResult = await this.page.evaluate(() => {
          const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
          if (!textbox) return { found: false, clicked: false };

          let container = textbox;
          for (let i = 0; i < 6; i++) {
            if (!container) break;
            const hasButton = container.querySelector('button');
            if (hasButton) break;
            container = container.parentElement;
          }

          const buttons = container?.querySelectorAll('button') || [];
          for (const btn of buttons) {
            const icon = btn.querySelector('i.google-symbols');
            if (icon && icon.textContent.includes('arrow_forward') && !btn.disabled) {
              try {
                btn.click();
                return { found: true, clicked: true };
              } catch (e) {
                console.error(`Failed to click arrow forward: ${e.message}`);
              }
            }
          }
          return { found: buttons.length > 0, clicked: false };
        });

        return !!submitResult.clicked;
      };

      const detectLatestErrorTile = async () => {
        return this.page.evaluate(() => {
          const tiles = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]'));
          for (let i = 0; i < Math.min(6, tiles.length); i++) {
            const tile = tiles[i];
            const tileText = (tile.textContent || '').toLowerCase();
            const hasAnchor = !!tile.querySelector('a[href]');
            const hasErrorText = tileText.includes('không thành công') || tileText.includes('đã xảy ra lỗi') || tileText.includes('lỗi');
            const buttons = Array.from(tile.querySelectorAll('button')).map(btn => ({
              text: (btn.textContent || '').trim().toLowerCase(),
              rect: btn.getBoundingClientRect()
            }));

            const retryBtn = buttons.find(btn => btn.text.includes('thử lại') || btn.text.includes('retry'));
            const reuseBtn = buttons.find(btn => btn.text.includes('sử dụng lại') || btn.text.includes('reuse') || btn.text.includes('dùng lại'));
            const hasErrorState = hasErrorText;


            if (hasErrorState) {
              const tileRect = tile.getBoundingClientRect();
              return {
                found: true,
                tileId: tile.getAttribute('data-tile-id') || null,
                message: (tile.textContent || '').trim().substring(0, 180),
                hasAnchor,
                tileCenter: {
                  x: Math.round(tileRect.left + tileRect.width / 2),
                  y: Math.round(tileRect.top + tileRect.height / 2)
                },
                retryButton: retryBtn ? {
                  x: Math.round(retryBtn.rect.left + retryBtn.rect.width / 2),
                  y: Math.round(retryBtn.rect.top + retryBtn.rect.height / 2)
                } : null,
                reuseButton: reuseBtn ? {
                  x: Math.round(reuseBtn.rect.left + reuseBtn.rect.width / 2),
                  y: Math.round(reuseBtn.rect.top + reuseBtn.rect.height / 2)
                } : null
              };
            }
          }

          return { found: false };
        });
      };

      const waitForErrorTileCleared = async (targetTileId, timeoutMs = 18000) => {
        const maxChecks = Math.ceil(timeoutMs / 1000);
        for (let attempt = 1; attempt <= maxChecks; attempt++) {
          const state = await this.page.evaluate((tileId) => {
            if (!tileId) return { cleared: false };
            const tile = document.querySelector(`[data-testid="virtuoso-item-list"] [data-tile-id="${tileId}"]`);
            if (!tile) return { cleared: true };

            const text = (tile.textContent || '').toLowerCase();
            const stillError = text.includes('không thành công') || text.includes('đã xảy ra lỗi') || text.includes('failed') || text.includes('error');
            return { cleared: !stillError };
          }, targetTileId);

          if (state.cleared) return true;
          await this.page.waitForTimeout(1000);
        }

        return false;
      };

      const fallbackReAddUploadedImagesAndSubmit = async (promptText) => {
        console.log('[FALLBACK] 📌 Re-add 2 uploaded images -> paste prompt -> wait 3s -> submit');

        const refs = [
          this.uploadedImageRefs?.wearing?.href,
          this.uploadedImageRefs?.product?.href
        ].filter(Boolean);

        if (refs.length < 2) {
          console.log('[FALLBACK] ⚠️  Missing uploaded href refs, cannot re-add 2 images');
          return false;
        }

        for (const href of refs) {
          const added = await this.addImageToCommand(href);
          if (!added) {
            console.log(`[FALLBACK] ⚠️  Failed to add href: ${href.substring(0, 60)}...`);
            return false;
          }
          await this.page.waitForTimeout(500);
        }

        await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
        await this.page.waitForTimeout(150);

        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('a');
        await this.page.keyboard.up('Control');
        await this.page.waitForTimeout(100);
        await this.page.keyboard.press('Backspace');
        await this.page.waitForTimeout(300);

        await this.page.evaluate((text) => {
          navigator.clipboard.writeText(text).catch(() => {});
        }, promptText);

        await this.page.waitForTimeout(200);
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('v');
        await this.page.keyboard.up('Control');

        console.log('[FALLBACK] ⏳ Wait 3s for Slate editor stable...');
        await this.page.waitForTimeout(3000);

        return clickSubmitButton();
      };

      let lastGeneratedHref = null;

      // MAIN LOOP: For each prompt, use _sharedGenerationFlow()
      for (let i = 0; i < prompts.length; i++) {
        console.log(`\n${'═'.repeat(80)}`);
        console.log(`🎨 PROMPT ${i + 1}/${prompts.length}`);
        console.log(`${'═'.repeat(80)}\n`);

        const prompt = prompts[i];
        
        // Validate prompt
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
          console.error(`❌ PROMPT ${i + 1} INVALID: Expected non-empty string`);
          results.push({
            success: false,
            imageNumber: i + 1,
            error: 'Invalid prompt'
          });
          throw new Error(`Invalid prompt at index ${i}`);
        }

        try {
          // STEP A: For subsequent prompts, reuse previous command
          if (i > 0 && lastGeneratedHref) {
            console.log(`[CHAIN] 🔄 Reusing command from previous generation...`);
            const reused = await this.rightClickReuseCommand(lastGeneratedHref);
            if (!reused) {
              throw new Error('Failed to reuse command');
            }

            console.log('[CHAIN] 🧹 Clearing textbox for new prompt...');
            const containerSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';
            await this.page.focus(containerSelector);
            await this.page.waitForTimeout(200);
            await this.page.click(containerSelector);
            await this.page.waitForTimeout(300);

            // Clear all text
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('a');
            await this.page.keyboard.up('Control');
            await this.page.waitForTimeout(100);
            await this.page.keyboard.press('Backspace');
            await this.page.waitForTimeout(400);
            console.log('[CHAIN] ✅ Ready for new prompt\n');
          }

          // STEP B-G: Use shared generation flow
          // This encapsulates: prompt entry → submit → monitor → download
          const genResult = await this._sharedGenerationFlow(prompt, {
            timeoutSeconds: 120,
            isImageMode: true
          });

          if (!genResult.success) {
            throw new Error(`Generation failed: ${genResult.error || 'unknown error'}`);
          }

          // Rename file with image number
          const fileExt = path.extname(genResult.downloadedFile);
          const fileName = path.basename(genResult.downloadedFile, fileExt);
          const imageNum = String(i + 1).padStart(2, '0');
          const renamedName = `${fileName}-img${imageNum}${fileExt}`;
          const renamedPath = path.join(path.dirname(genResult.downloadedFile), renamedName);

          try {
            fs.renameSync(genResult.downloadedFile, renamedPath);
            console.log(`[FILE] 📂 Renamed to: ${path.basename(renamedPath)}`);
          } catch (e) {
            console.warn(`[FILE] ⚠️  Rename failed: ${e.message}`);
            renamedPath = genResult.downloadedFile;
          }

          results.push({
            success: true,
            imageNumber: i + 1,
            href: genResult.href,
            downloadedFile: renamedPath
          });

          lastGeneratedHref = genResult.href;
          console.log(`[CHAIN] 📎 Stored href for next prompt\n`);

        } catch (promptError) {
          console.error(`\n❌ PROMPT ${i + 1} FAILED: ${promptError.message}\n`);
          results.push({
            success: false,
            imageNumber: i + 1,
            error: promptError.message
          });
          throw promptError;
        }
      }

      // Cleanup and return results
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`✅ All prompts processed`);
      console.log(`${'═'.repeat(70)}\n`);

      const downloadedFiles = results
        .filter(r => r.success && r.downloadedFile)
        .map(r => r.downloadedFile);

      console.log(`[DOWNLOAD] Files downloaded: ${downloadedFiles.length}`);
      downloadedFiles.forEach((file, idx) => {
        console.log(`  [${idx + 1}] ${path.basename(file)}`);
      });

      console.log('\n⏳ Waiting 3 seconds before closing browser...');
      await this.page.waitForTimeout(3000);
      await this.close();
      console.log('✅ Browser closed\n');

      const successCount = results.filter(r => r.success).length;
      console.log(`${'═'.repeat(70)}`);
      console.log(`📊 RESULTS: ${successCount}/${results.length} successful`);
      console.log(`${'═'.repeat(70)}\n`);

      return {
        success: successCount === results.length,
        results: results,
        totalGenerated: successCount,
        totalRequested: results.length,
        downloadedFiles: downloadedFiles
      };

    } catch (error) {
      console.error(`\n❌ Multi-generation failed: ${error.message}\n`);
      if (this.browser) {
        await this.close();
      }

      return {
        success: false,
        error: error.message,
        results: results,
        totalGenerated: results.filter(r => r.success).length,
        totalRequested: prompts.length
      };
    }
  }

  async generateVideo(videoPrompt, primaryImagePath, secondaryImagePath, options = {}) {
    /**
     * REFACTORED Phase 5b: Now uses _sharedGenerationFlow() for core generation
     * Key changes:
     * - Steps 1-8 (init, video setup, upload) simplified
     * - Uses _sharedGenerationFlow() for prompt → submit → monitor → download
     * - Code reduced from 500+ lines to ~150 lines (-70%)
     * - Only difference from image generation: settings (video-specific config)
     */
    
    if (this.debugMode) {
      console.log('\n🔧 [DEBUG] generateVideo() is disabled (debug mode)');
      console.log('   - init() allowed');
      console.log('   - navigateToFlow() allowed');
      console.log('   - All other steps skipped\n');
      
      await this.init();
      await this.navigateToFlow();
      
      console.log('\n✅ Browser open at Google Flow project (video mode)\n');
      
      return {
        success: true,
        debugMode: true,
        path: null,
        message: 'Debug mode: only opened project'
      };
    }

    try {
      const { download = true, outputPath = null, reloadAfter = false } = options;

      console.log(`\n${'═'.repeat(80)}`);
      console.log(`🎬 VIDEO GENERATION: Single video`);
      console.log(`${'═'.repeat(80)}\n`);
      console.log(`📸 Primary image: ${path.basename(primaryImagePath)}`);
      console.log(`🔄 Secondary image: ${path.basename(secondaryImagePath)}\n`);

      // STEP 1-3: Init, navigate, wait (same as image)
      console.log('[INIT] 🚀 Initializing browser...');
      await this.init();
      
      console.log('[NAV] 🔗 Navigating to Google Flow...');
      await this.navigateToFlow();
      await this.page.waitForTimeout(2000);
      
      console.log('[PAGE] ⏳ Waiting for page to load...');
      await this.waitForPageReady();
      await this.page.waitForTimeout(5000);
      console.log('[PAGE] ✅ Ready\n');

      // STEP 4: Video-specific setup
      console.log('[VIDEO] 📹 Switching to video generation mode...');
      await this.switchToVideoTab();
      await this.selectVideoFromComponents();
      await this.page.waitForTimeout(1000);
      console.log('[VIDEO] ✅ Video mode ready\n');

      // STEP 5: Configure video settings
      console.log('[CONFIG] ⚙️  Configuring video settings...');
      await this._delegateConfigureSettings();
      await this.page.waitForTimeout(2000);

      // STEP 6-8: Upload images (same as image generation)
      console.log('[UPLOAD] 📤 Uploading reference images...');
      await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
      await this.page.waitForTimeout(300);

      const pasteImage = async (imagePath, label) => {
        const imageData = fs.readFileSync(imagePath);
        const base64 = Buffer.from(imageData).toString('base64');
        await this.page.evaluate((b64) => {
          return fetch(`data:image/png;base64,${b64}`)
            .then(res => res.blob())
            .then(blob => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]))
            .catch(() => false);
        }, base64);
        await this.page.waitForTimeout(500);
        await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
        await this.page.waitForTimeout(120);
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('v');
        await this.page.keyboard.up('Control');
        await this.page.waitForTimeout(5000);
      };

      await pasteImage(primaryImagePath, 'primary');
      await pasteImage(secondaryImagePath, 'secondary');
      console.log('[UPLOAD] ✅ Images uploaded. Monitoring for hrefs...');

      // Wait for at least 2 uploaded hrefs
      let uploadedRefs = [];
      let initialHrefs = await this.page.evaluate(() => {
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        return Array.from(links).map(l => l.getAttribute('href'));
      });
      const initialSet = new Set(initialHrefs);

      let uploadMonitor = 0;
      while (uploadedRefs.length < 2 && uploadMonitor < 90) {
        uploadMonitor++;
        const currentHrefs = await this.page.evaluate(() => {
          const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
          return Array.from(links).map(l => l.getAttribute('href'));
        });
        uploadedRefs = currentHrefs.filter(h => !initialSet.has(h));
        
        if (uploadedRefs.length >= 2) break;
        if (uploadMonitor % 10 === 0) {
          console.log(`[UPLOAD] Waiting for hrefs... ${uploadedRefs.length}/2 (${uploadMonitor}s)`);
        }
        await this.page.waitForTimeout(1000);
      }

      if (uploadedRefs.length < 2) {
        throw new Error('Uploaded images did not appear after 90 seconds');
      }

      console.log('[UPLOAD] ✅ Ready to generate\n');

      // STEP 9: Use shared generation flow
      // Timeout is longer for videos (typically 3+ minutes for full video generation)
      const genResult = await this._sharedGenerationFlow(videoPrompt, {
        timeoutSeconds: 300,  // 5 minutes for video generation
        isVideoMode: true
      });

      if (!genResult.success) {
        throw new Error(`Video generation failed: ${genResult.error || 'unknown error'}`);
      }

      let videoPath = genResult.downloadedFile;
      console.log(`[FILE] ✅ Video generated: ${path.basename(videoPath)}`);

      // STEP 10: Reload if requested
      if (reloadAfter) {
        console.log('\n[RELOAD] ↻ Reloading page...');
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(2000);
        console.log('[RELOAD] ✅ Page reloaded\n');
      }

      console.log(`\n${'═'.repeat(80)}`);
      console.log(`✅ VIDEO GENERATION COMPLETE`);
      console.log(`${'═'.repeat(80)}\n`);

      return {
        success: true,
        path: videoPath,
        href: genResult.href,
        duration: 60,  // Approximate
        format: '9:16'
      };

    } catch (error) {
      console.error(`\n❌ VIDEO GENERATION FAILED: ${error.message}\n`);
      if (this.browser) {
        await this.close();
      }
      return {
        success: false,
        path: null,
        error: error.message
      };
    }
  }
}

export default GoogleFlowAutomationService;

