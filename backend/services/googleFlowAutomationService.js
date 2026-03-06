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
import PreGenerationMonitor from './google-flow/generation/PreGenerationMonitor.js';
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

    // Seed interception/monitoring for Flow API requests
    const requestedSeed = Number.isInteger(options.seed) ? options.seed : null;
    this.seedControl = {
      enabled: options.enableSeedInterceptor !== false,
      fixedSeed: requestedSeed ?? Math.floor(Math.random() * 1000000),
      observedRequests: []
    };
    this._requestInterceptorReady = false;
    
    // 🔐 Support flowId for flow-specific Chrome profile isolation
    // This prevents "profile locked by another process" errors when flows run in parallel
    const flowId = options.flowId || `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.options = {
      headless: false,
      flowId: flowId,  // ✅ Pass flowId for per-flow Chrome profile
      // 💫 FIX: Don't override sessionFilePath - use SessionManager's shared profile default
      // sessionFilePath will default to: data/google-flow-profiles/default/session.json
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
    this.preGenerationMonitor = null; // NEW: Capture baseline before generation
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

    if (this.seedControl.enabled) {
      await this.setupFlowSeedInterceptor();
    }

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
    
    this.settingsManager = new SettingsManager(this.page, {
      type: this.type,
      imageCount: this.options.imageCount,
      videoCount: this.options.videoCount,
      aspectRatio: this.options.aspectRatio,
      model: this.options.model,
      videoReferenceType: this.options.videoReferenceType
    });
    
    this.preGenerationMonitor = new PreGenerationMonitor();
    this.preGenerationMonitor.page = this.page;
    
    this.generationMonitor = new GenerationMonitor();
    this.generationMonitor.page = this.page;
    this.generationMonitor.uploadedImageRefs = this.uploadedImageRefs;
    this.generationMonitor.setPreGenerationMonitor(this.preGenerationMonitor); // NEW: Pass baseline monitor
    
    // IMPORTANT: Pass options to GenerationDownloader constructor, don't overwrite them
    // This ensures downloadTimeoutSeconds is properly set and validated
    this.generationDownloader = new GenerationDownloader(this.page, {
      ...this.options,
      downloadTimeoutSeconds: 45  // Increase to 45s - upgrades can take time
    });
    
    this.errorRecoveryManager = new ErrorRecoveryManager();
    this.errorRecoveryManager.page = this.page;
    this.errorRecoveryManager.uploadedImageRefs = this.uploadedImageRefs;
    this.errorRecoveryManager.lastPrompt = this.lastPromptSubmitted;
    console.log('   ✅ Managers initialized\n');
    
    console.log('✅ Initialized\n');
  }



  async setupFlowSeedInterceptor() {
    if (this._requestInterceptorReady || !this.page) return;

    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      const url = request.url();
      if (!url.includes('flowMedia:batchGenerateImages') || request.method() !== 'POST') {
        return request.continue();
      }

      try {
        const rawBody = request.postData() || '{}';
        const parsed = JSON.parse(rawBody);
        const incomingSeeds = [];

        if (Array.isArray(parsed?.requests)) {
          parsed.requests.forEach((req) => {
            if (typeof req?.seed !== 'undefined') incomingSeeds.push(req.seed);
            req.seed = this.seedControl.fixedSeed;
          });
        }

        if (typeof parsed?.seed !== 'undefined') {
          incomingSeeds.push(parsed.seed);
          parsed.seed = this.seedControl.fixedSeed;
        }

        this.seedControl.observedRequests.push({
          timestamp: new Date().toISOString(),
          endpoint: 'flowMedia:batchGenerateImages',
          incomingSeeds,
          outgoingSeed: this.seedControl.fixedSeed
        });

        return request.continue({
          headers: {
            ...request.headers(),
            'content-type': 'text/plain;charset=UTF-8'
          },
          postData: JSON.stringify(parsed)
        });
      } catch (error) {
        console.warn(`[SEED] Could not parse/override Flow request body: ${error.message}`);
        return request.continue();
      }
    });

    this._requestInterceptorReady = true;
    console.log(`[SEED] Interceptor active. Fixed seed: ${this.seedControl.fixedSeed}`);
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

    // ✅ Close browser session with auto-save via SessionManager
    // SessionManager.close() will capture and save session before closing browser
    if (this.sessionManager) {
      await this.sessionManager.close();
    } else if (this.browser) {
      // Fallback: close browser directly if SessionManager not available
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
   * Adapter method: Select video generation mode (via NavigationManager)
   * @returns {Promise<boolean>} - True if successful
   */
  async _selectVideoFromComponents() {
    try {
      if (this.navigationManager) {
        return await this.navigationManager.selectVideoFromComponents();
      }
      // Fallback to direct page operation
      return await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('video') && !btn.disabled) {
            try {
              btn.click();
              return true;
            } catch (e) {
              // Continue searching
            }
          }
        }
        return false;
      });
    } catch (error) {
      console.error('Error selecting video mode:', error.message);
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
        // Update SettingsManager options with current type and settings
        this.settingsManager.options.type = this.type;
        this.settingsManager.options.aspectRatio = this.options.aspectRatio;
        this.settingsManager.options.model = this.options.model;
        this.settingsManager.options.imageCount = this.options.imageCount;
        this.settingsManager.options.videoCount = this.options.videoCount;
        
        return await this.settingsManager.configureSettings();
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
   * @param {number} expectedNewHrefs - How many new images to expect (default 1)
   * @returns {Promise<Object>} - Result object
   */
  async _delegateMonitorGeneration(timeoutSeconds = 180, expectedNewHrefs = 1) {
    try {
      if (this.generationMonitor) {
        return await this.generationMonitor.monitorGeneration(timeoutSeconds, expectedNewHrefs);
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
        // Ensure mediaType is set correctly before downloading
        this.generationDownloader.options.mediaType = this.type;
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
   * @param {number} expectedNewHrefs - How many new images to expect (default 1)
   * @returns {Promise<Object>} - Generation result with href
   */
  async _internalCompleteGenerationCycle(timeoutSeconds = 120, expectedNewHrefs = 1) {
    try {
      // Use GenerationMonitor if available
      if (this.generationMonitor) {
        const monitorResult = await this.generationMonitor.monitorGeneration(timeoutSeconds, expectedNewHrefs);
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
      storagePrefix = 'gen',
      expectedNewHrefs = this.options.imageCount || 1  // 💫 FIX: Get expected count from options
    } = config;

    console.log(`\n[SHARED-FLOW] 🎨 Starting generation (${isVideoMode ? 'video' : 'image'} mode) - expecting ${expectedNewHrefs} image(s)`);

    try {
      // ═══ PHASE A: PROMPT ENTRY AND SUBMISSION ═══
      console.log('[SHARED-FLOW] 📝 PHASE A: Entering and submitting prompt...');
      
      // BEFORE SUBMIT: Refresh baseline to account for any page changes
      // This ensures we have the most current snapshot before generation starts
      console.log('[SHARED-FLOW] 🔄 Refreshing baseline before submit...');
      if (this.preGenerationMonitor) {
        await this.preGenerationMonitor.refreshBaseline();
      }
      
      // Store prompt for retry
      this.lastPromptSubmitted = promptText;

      // Use PromptManager if available
      if (this.promptManager) {
        console.log('[SHARED-FLOW] ✓ Using PromptManager for entry');
        await this.promptManager.enterPrompt(promptText);
        console.log('[SHARED-FLOW] ⏳ Waiting 5s for Slate editor to stabilize...');
        await this.page.waitForTimeout(5000);  // 5s to let editor stabilize
        
        const submitted = await this.promptManager.submit();
        if (!submitted) {
          console.log('[SHARED-FLOW] ⚠️  PromptManager submit returned false, falling back to original submit');
          await this.submit();
        }
      } else {
        // Fallback: use original inline submit logic
        console.log('[SHARED-FLOW] ✓ Using inline entry/submit logic (no PromptManager)');
        await this.enterPrompt(promptText);
        console.log('[SHARED-FLOW] ⏳ Waiting 5s for Slate editor to stabilize...');
        await this.page.waitForTimeout(5000);  // 5s to let editor stabilize before submit
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
        console.log(`[SHARED-FLOW] 📊 Expecting ${expectedNewHrefs} new image(s)...`);
        generationResult = await this.generationMonitor.monitorGeneration(Math.ceil(timeoutSeconds), expectedNewHrefs, promptText);  // 💫 Pass expectedNewHrefs
      } else {
        console.log('[SHARED-FLOW] ✓ Using inline monitoring logic (fallback)');
        const href = await this.monitorGeneration(timeoutSeconds);
        generationResult = { success: !!href, href };
      }

      // 💫 Handle partial success (some images generated, others failed)
      if (generationResult?.partial && generationResult?.href) {
        console.log(`[SHARED-FLOW] ✅ PARTIAL SUCCESS: ${generationResult.found}/${generationResult.expected} image(s) detected`);
        console.log(`[SHARED-FLOW] � Attempting to retry for remaining ${generationResult.expected - generationResult.found} image(s)...`);
        
        // 💫 NEW: Auto-retry for missing images (up to 3 attempts)
        let retryCount = 0;
        const maxPartialRetries = 3;
        let partialRetryResult = null;
        
        while (retryCount < maxPartialRetries && generationResult.found < generationResult.expected) {
          retryCount++;
          console.log(`\n[SHARED-FLOW] 🔄 Retry ${retryCount}/${maxPartialRetries} for missing images...`);
          
          // Wait before retry
          await this.page.waitForTimeout(3000);
          
          // Re-monitor for missing images
          console.log(`[SHARED-FLOW] 📊 Checking for ${generationResult.expected - generationResult.found} more image(s)...`);
          partialRetryResult = await this.generationMonitor.monitorGeneration(
            Math.ceil(timeoutSeconds / 2),  // Shorter timeout for retry
            generationResult.expected - generationResult.found,  // Check for remaining count
            promptText
          );
          
          if (partialRetryResult?.success && partialRetryResult?.href) {
            // Successfully got more images, update count
            const newCount = (partialRetryResult.newCount || 1) + generationResult.found;
            console.log(`[SHARED-FLOW] ✅ Got more image(s)! Total: ${newCount}/${generationResult.expected}`);
            generationResult.found = newCount;
            
            if (newCount >= generationResult.expected) {
              console.log(`[SHARED-FLOW] ✅ All ${generationResult.expected} images now available!`);
              break;  // Got all images, exit retry loop
            }
          } else if (partialRetryResult?.partial && partialRetryResult?.newCount > 0) {
            // Got some more but still partial
            const newCount = (partialRetryResult.newCount || 1) + generationResult.found;
            console.log(`[SHARED-FLOW] 📈 Got ${partialRetryResult.newCount} more image(s), total: ${newCount}/${generationResult.expected}`);
            generationResult.found = newCount;
          } else {
            console.log(`[SHARED-FLOW] ⚠️  Retry ${retryCount} did not produce new images`);
            if (retryCount < maxPartialRetries) {
              console.log(`[SHARED-FLOW] 🔄 Continuing to next retry attempt...`);
            }
          }
        }
        
        if (generationResult.found < generationResult.expected) {
          console.log(`[SHARED-FLOW] ⚠️  Could only get ${generationResult.found}/${generationResult.expected} after ${retryCount} retry attempt(s)`);
        }
        
        console.log(`[SHARED-FLOW] 💾 Proceeding to download ${generationResult.found} available image(s)`);
        // Continue to download phase with what we have
      } else if (!generationResult?.success || !generationResult?.href) {
        console.log('[SHARED-FLOW] ⚠️  Generation monitoring failed or timed out');
        console.log(`[SHARED-FLOW] 📋 Result: success=${generationResult?.success}, href=${generationResult?.href ? 'found' : 'null'}`);
        if (generationResult?.error) {
          console.log(`[SHARED-FLOW] 📋 Error: ${generationResult.error}`);
        }
        console.log('[SHARED-FLOW] 🔄 Condition 1: Trying lighter retry via click buttons...\n');
        
        // LIGHTER RETRY: Try clicking refresh/undo buttons (3 attempts, 5s apart)
        let lightRetrySuccess = false;
        if (this.errorRecoveryManager) {
          if (generationResult?.href) {
            console.log(`[SHARED-FLOW] 🔧 Attempting light retry with href: ${generationResult.href.substring(0, 60)}...`);
            lightRetrySuccess = await this.errorRecoveryManager.retryGenerationViaClickButtons(
              generationResult.href, 
              3  // max 3 attempts
            );
          } else {
            console.log('[SHARED-FLOW] ⚠️  No href available for light retry, proceeding to heavy recovery');
          }
          
          if (lightRetrySuccess) {
            console.log('[SHARED-FLOW] ✅ Light retry succeeded, continuing with monitoring...\n');
            // Wait for potential new generation after retry
            await this.page.waitForTimeout(5000);
            // Try monitoring again
            console.log(`[SHARED-FLOW] 📊 Re-checking for ${expectedNewHrefs} image(s)...`);
            const retryMonitorResult = await this.generationMonitor.monitorGeneration(Math.ceil(timeoutSeconds), expectedNewHrefs, promptText);  // 💫 Pass expectedNewHrefs
            if (retryMonitorResult?.success && retryMonitorResult?.href) {
              generationResult = retryMonitorResult;
              // Continue to download phase
            } else {
              console.log('[SHARED-FLOW] ⚠️  Re-monitoring after light retry failed');
              lightRetrySuccess = false;
            }
          }
        }
        
        if (!lightRetrySuccess) {
          console.log('[SHARED-FLOW] 🔄 Condition 2: Trying heavier recovery (full rehash)...\n');
          
          // HEAVIER FALLBACK: Full flow rehash with retry loop (max 2 attempts)
          let heavyRecoverySuccess = false;
          const maxHeavyRetries = 2;
          
          for (let heavyAttempt = 1; heavyAttempt <= maxHeavyRetries; heavyAttempt++) {
            console.log(`[SHARED-FLOW] 📍 Rehash attempt ${heavyAttempt}/${maxHeavyRetries}`);
            
            const recoverySuccess = await this.errorRecoveryManager?.handleGenerationFailureRetry(
              this.lastPromptSubmitted,
              this.uploadedImageRefs
            );
            
            if (!recoverySuccess) {
              if (heavyAttempt < maxHeavyRetries) {
                console.log(`[SHARED-FLOW] ⚠️  Rehash attempt ${heavyAttempt} failed, retrying...\n`);
                await this.page.waitForTimeout(3000);
                continue;
              } else {
                console.log('[SHARED-FLOW] ❌ All rehash attempts failed');
                return { success: false, href: null, error: 'Generation and recovery both failed' };
              }
            }
            
            console.log(`[SHARED-FLOW] ✅ Rehash attempt ${heavyAttempt} submitted, monitoring...\n`);
            
            // Wait for recovery generation
            await this.page.waitForTimeout(5000);
            console.log(`[SHARED-FLOW] 📊 Checking for ${expectedNewHrefs} image(s) after rehash...`);
            const recoveryMonitorResult = await this.generationMonitor.monitorGeneration(Math.ceil(timeoutSeconds), expectedNewHrefs, promptText);  // 💫 Pass expectedNewHrefs
            
            if (recoveryMonitorResult?.success && recoveryMonitorResult?.href) {
              generationResult = recoveryMonitorResult;
              heavyRecoverySuccess = true;
              break;  // Success, exit retry loop
            } else {
              if (heavyAttempt < maxHeavyRetries) {
                console.log(`[SHARED-FLOW] ⚠️  Rehash monitoring attempt ${heavyAttempt} failed, retrying...\n`);
                await this.page.waitForTimeout(2000);
              }
            }
          }
          
          if (!heavyRecoverySuccess) {
            console.log('[SHARED-FLOW] ❌ All recovery attempts exhausted');
            return { success: false, href: null, error: 'Recovery monitoring failed' };
          }
        }
      }
      
      // 💫 Allow download proceeding even for partial success
      if (!generationResult?.success || !generationResult?.href) {
        console.log('[SHARED-FLOW] ❌ All recovery attempts exhausted');
        return { success: false, href: null, error: 'Generation failed after all retries' };
      }

      console.log(`[SHARED-FLOW] ✅ PHASE B complete (href: ${generationResult.href.substring(0, 50)}...)\n`);

      // ═══ PHASE C: DOWNLOAD ═══
      console.log('[SHARED-FLOW] ⬇️  PHASE C: Downloading result...');
      console.log('[SHARED-FLOW] ⏳ Waiting 3s for UI render...');
      await this.page.waitForTimeout(3000);

      let downloadedFile;
      if (this.generationDownloader) {
        console.log('[SHARED-FLOW] ✓ Using GenerationDownloader');
        // 🔥 CRITICAL: Set mediaType BEFORE downloading
        this.generationDownloader.options.mediaType = this.type;
        downloadedFile = await this.generationDownloader.downloadItemViaContextMenu(generationResult.href);
      } else {
        console.log('[SHARED-FLOW] ✓ Using inline download logic (fallback)');
        downloadedFile = await this.downloadItemViaContextMenu(generationResult.href);
      }

      if (!downloadedFile) {
        console.log('[SHARED-FLOW] ⚠️  Download failed');
        
        // 🔴 FINAL FAILURE: Close browser when all download attempts exhausted
        if (this.generationDownloader && this.page) {
          console.log('[SHARED-FLOW] 🔴 Initiating browser cleanup due to download failure...');
          try {
            await this.generationDownloader.closeBrowserOnFailure();
          } catch (closeError) {
            console.error(`[SHARED-FLOW] ⚠️  Error during browser cleanup: ${closeError.message}`);
          }
        }
        
        return { success: false, href: generationResult.href, error: 'Download failed after all retries - browser closed' };
      }

      console.log(`[SHARED-FLOW] ✅ PHASE C complete (file: ${path.basename(downloadedFile)})\n`);
      console.log('[SHARED-FLOW] ✅ SHARED GENERATION FLOW COMPLETE\n');
      
      // 💫 Return result with partial success info if applicable
      const result = {
        success: true,
        href: generationResult.href,
        downloadedFile,
        method: this.generationDownloader ? 'manager' : 'fallback'
      };
      
      // Add partial success info if available
      if (generationResult.partial) {
        result.partial = true;
        result.found = generationResult.found;
        result.expected = generationResult.expected;
        console.log(`[SHARED-FLOW] 📊 NOTE: Partial success - downloaded ${result.found}/${result.expected} image(s)`);
      }
      
      return result;

    } catch (error) {
      console.error(`[SHARED-FLOW] ❌ Error in generation flow: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Check for a SINGLE image upload (simpler than checking 2)
   * Call this after pasting each image
   * 
   * STRICT: Must have BOTH href AND img tag
   * 
   * @returns {string|null} - href of the new image, or null if failed
   */
  async checkSingleImageUpload(imageLabel = 'image', timeoutSeconds = 45) {
    console.log(`[UPLOAD-CHECK] 🔍 Checking for ${imageLabel} upload...`);
    
    // 🔥 DEBUG: Check DOM structure first
    const domDebugInfo = await this.page.evaluate(() => {
      const virtuosoList = document.querySelector('[data-testid="virtuoso-item-list"]');
      const allLinks = document.querySelectorAll('a[href]');
      const allImages = document.querySelectorAll('img');
      const linksWithImg = document.querySelectorAll('a[href] img');
      
      return {
        virtuosoListExists: !!virtuosoList,
        virtuosoListSelector: virtuosoList ? virtuosoList.className : 'N/A',
        totalAnchorLinks: allLinks.length,
        totalImages: allImages.length,
        linksWithImages: linksWithImg.length,
        virtuosoItemsCount: virtuosoList ? virtuosoList.querySelectorAll('a[href]').length : 0
      };
    });
    
    console.log(`[UPLOAD-CHECK] 📋 DOM DEBUG INFO:`);
    console.log(`   Virtuoso list exists: ${domDebugInfo.virtuosoListExists}`);
    console.log(`   Total anchor links on page: ${domDebugInfo.totalAnchorLinks}`);
    console.log(`   Total images on page: ${domDebugInfo.totalImages}`);
    console.log(`   Links with images: ${domDebugInfo.linksWithImages}`);
    console.log(`   Items in virtuoso list: ${domDebugInfo.virtuosoItemsCount}`);
    
    // Capture baseline of current items BEFORE we start checking for new ones
    // 💫 VIRTUALIZATION FIX: Only check first 15 items (tail items disappear in virtuoso list)
    let baselineItems = await this.page.evaluate(() => {
      const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
      const firstLinks = Array.from(links).slice(0, 15);  // Only first 15
      return firstLinks.map((link, idx) => {
        const href = link.getAttribute('href');
        const img = link.querySelector('img');
        const imgTag = img ? `<img src="${img.getAttribute('src')?.substring(0, 50) || 'N/A'}...">` : 'NO IMG';
        return { 
          idx,
          href, 
          hasImg: !!img,
          imgInfo: imgTag
        };
      }).filter(item => item.href);
    });
    
    const baselineHrefs = new Set(baselineItems.map(item => item.href));
    console.log(`[UPLOAD-CHECK] 📸 BASELINE: ${baselineItems.length} items`);
    baselineItems.forEach((item, idx) => {
      console.log(`   [${idx}] ${item.hasImg ? '✓' : '✗'} img | ${item.href.substring(0, 70)}...`);
    });
    
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let checkCount = 0;
    let lastNewCount = 0;
    
    while (Date.now() - startTime < timeoutMs) {
      checkCount++;
      
      // 💫 STRICT: Check BOTH href and img present
      // 💫 VIRTUALIZATION FIX: Only check first 15 items
      const currentItems = await this.page.evaluate((baselineHrefs) => {
        const baseline = new Set(baselineHrefs);
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        const firstLinks = Array.from(links).slice(0, 15);  // Only first 15
        
        const allItems = firstLinks.map((link, idx) => {
          const href = link.getAttribute('href');
          const img = link.querySelector('img');
          const hasImg = !!img;
          return { 
            idx,
            href, 
            hasImg, 
            isNew: !baseline.has(href),
            imgSrc: img ? img.getAttribute('src')?.substring(0, 40) : 'N/A'
          };
        }).filter(item => item.href);
        
        // Only count NEW items with BOTH href + img
        const newValid = allItems.filter(item => item.isNew && item.hasImg);
        const newInvalid = allItems.filter(item => item.isNew && !item.hasImg);
        
        return {
          totalItems: allItems.length,
          newValidCount: newValid.length,
          newValidItems: newValid,
          newInvalidCount: newInvalid.length,
          newInvalidItems: newInvalid,
          allNewItems: allItems.filter(item => item.isNew),
          allItems: allItems  // All items for debug
        };
      }, Array.from(baselineHrefs));
      
      // Log detailed progress
      const statusIcon = currentItems.newValidCount > lastNewCount ? '📈' : '  ';
      console.log(`[UPLOAD-CHECK] Check ${checkCount}: NEW valid=${currentItems.newValidCount} | NEW invalid=${currentItems.newInvalidCount} | Total=${currentItems.totalItems} ${statusIcon}`);
      
      // Show ALL new items found
      if (currentItems.allNewItems.length > 0) {
        console.log(`   📍 New items found:`);
        currentItems.allNewItems.forEach((item, idx) => {
          console.log(`      [${idx}] ${item.hasImg ? '✓' : '✗'} img | ${item.href.substring(0, 70)}... | src=${item.imgSrc}`);
        });
      }
      
      // If found 1 new valid image, we're done
      if (currentItems.newValidCount >= 1) {
        const newRef = currentItems.newValidItems[0];
        console.log(`[UPLOAD-CHECK] ✅ SUCCESS: ${imageLabel} uploaded (href + img both present)`);
        console.log(`   └─ ${newRef.href.substring(0, 100)}\n`);
        return newRef.href;
      }
      
      lastNewCount = currentItems.newValidCount;
      
      // Wait before next check
      await this.page.waitForTimeout(1000);
    }
    
    // Timeout - show what we found
    console.error(`[UPLOAD-CHECK] ❌ TIMEOUT: ${imageLabel} not found after ${timeoutSeconds}s`);
    
    // 🔥 FINAL DEBUG: Check final state
    const finalState = await this.page.evaluate((baselineHrefs) => {
      const baseline = new Set(baselineHrefs);
      const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
      const firstLinks = Array.from(links).slice(0, 20);  // Check more on final
      
      const allItems = firstLinks.map((link, idx) => {
        const href = link.getAttribute('href');
        const img = link.querySelector('img');
        return { 
          idx,
          href, 
          hasImg: !!img, 
          isNew: !baseline.has(href),
          imgSrc: img ? img.getAttribute('src')?.substring(0, 40) : 'N/A'
        };
      });
      
      return {
        totalItemsScanned: allItems.length,
        newValid: allItems.filter(i => i.isNew && i.hasImg),
        newInvalid: allItems.filter(i => i.isNew && !i.hasImg),
        allItems: allItems
      };
    }, Array.from(baselineHrefs));
    
    console.error(`[UPLOAD-CHECK] 📊 FINAL STATE:`);
    console.error(`   Total items: ${finalState.totalItemsScanned}`);
    console.error(`   New valid: ${finalState.newValid.length}`);
    console.error(`   New invalid: ${finalState.newInvalid.length}`);
    if (finalState.allItems.length > 0) {
      console.error(`   All items:`);
      finalState.allItems.slice(0, 10).forEach(item => {
        const marker = item.isNew ? '🆕' : '   ';
        console.error(`      ${marker} [${item.idx}] ${item.hasImg ? '✓' : '✗'} | ${item.href.substring(0, 70)}...`);
      });
    }
    
    if (finalState.newValid.length > 0) {
      console.log(`[UPLOAD-CHECK] ✅ Found ${finalState.newValid.length} valid new item(s) on final check`);
      return finalState.newValid[0].href;
    }
    if (finalState.newInvalid.length > 0) {
      console.warn(`[UPLOAD-CHECK] ⚠️  Found ${finalState.newInvalid.length} new href(s) but no img tag`);
      console.warn(`   This suggests images uploaded but renders still pending...`);
      return finalState.newInvalid[0].href;  // Return even without img as fallback
    }
    
    console.error(`[UPLOAD-CHECK] ❌ No new items found at all`);
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════


  /**
   * UNIFIED IMAGE GENERATION METHOD - Supports 3 generation modes
   * 
   * Mode 1: Single prompt, multiple outputs
   *   generateImages(null, { prompts: ['prompt'], outputCount: 2 })
   * 
   * Mode 2: Reference image(s) + single prompt
   *   generateImages({ characterImagePath: '...' }, { prompts: ['prompt'] })
   * 
   * Mode 3: Reference images + multiple prompts (batch generation)
   *   generateImages({ 
   *     characterImagePath: '...', 
   *     productImagePath: '...' 
   *   }, { 
   *     prompts: ['prompt1', 'prompt2', ...] 
   *   })
   * 
   * All modes use shared flow:
   * - Init → Navigate → Page ready
   * - Upload reference images (if provided)
   * - Capture baseline
   * - For each prompt: submit → monitor (with error recovery) → download
   * - Cleanup & close
   * 
   * @param {Object} images - Reference images (optional)
   *   - characterImagePath: Path to main reference image
   *   - productImagePath: Path to secondary reference (optional)
   *   - sceneImagePath: Path to scene reference (optional)
   * @param {Object} config - Generation configuration
   *   - prompts: Array of prompts to generate (required)
   *   - outputCount: Number of images per prompt (default: 1)
   *   - sceneImagePath: Scene reference image
   *   - sceneLockedPrompt: Scene locked prompt text
   *   - sceneName: Scene name for logging
   */
  async generateImages(images = null, config = {}) {
    const {
      prompts = [],
      outputCount = 1,
      sceneImagePath = null,
      sceneLockedPrompt = null,
      sceneName = null
    } = config;

    // Validate inputs
    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error('Configuration must include prompts array with at least one prompt');
    }

    const characterImagePath = images?.characterImagePath || null;
    const productImagePath = images?.productImagePath || null;
    const characterReferenceImagePaths = Array.isArray(images?.characterReferenceImagePaths) ? images.characterReferenceImagePaths : [];
    const hasReferenceImages = !!characterImagePath || !!productImagePath || characterReferenceImagePaths.length > 0;

    if (this.debugMode) {
      console.log('\n🔧 [DEBUG] generateImages() is disabled (debug mode)');
      console.log('   - init() allowed');
      console.log('   - navigateToFlow() allowed\n');
      
      await this.init();
      await this.navigateToFlow();
      
      console.log('\n✅ Browser open at Google Flow project');
      console.log('   (Manual testing enabled)\n');
      
      return {
        success: true,
        debugMode: true,
        message: 'Debug mode: only opened project',
        results: []
      };
    }

    console.log(`\n${'═'.repeat(80)}`);
    if (hasReferenceImages) {
      console.log(`📸 IMAGE GENERATION: ${prompts.length} prompt(s) × ${outputCount} output(s)`);
      console.log(`📎 Reference images: ${characterImagePath ? 'character' : ''}${characterImagePath && productImagePath ? ' + ' : ''}${productImagePath ? 'product' : ''}`);
    } else {
      console.log(`🎨 IMAGE GENERATION: ${prompts.length} prompt(s) × ${outputCount} output(s) - No reference images`);
    }
    console.log(`${'═'.repeat(80)}\n`);

    const results = [];

    try {
      // STEP 1-3: Init, navigate, wait
      console.log('[INIT] 🚀 Initializing browser...');
      await this.init();
      
      console.log('[NAV] 🔗 Navigating to Google Flow...');
      await this.navigateToFlow();
      await this.page.waitForTimeout(2000);
      
      console.log('[PAGE] ⏳ Waiting for page to load...');
      await this.waitForPageReady();
      await this.page.waitForTimeout(5000);
      console.log('[PAGE] ✅ Ready\n');

      // STEP 4: Configure settings
      console.log('[CONFIG] ⚙️  Configuring settings (imageCount=${outputCount})...');
      this.options.imageCount = outputCount;  // Set output count for this batch
      await this._delegateConfigureSettings();
      await this.page.waitForTimeout(2000);

      // STEP 5-7: Upload reference images (if provided)
      if (hasReferenceImages) {
        console.log('[UPLOAD] 📤 Uploading reference images...');
        
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

        // Upload character image (required if any images provided)
        if (characterImagePath && fs.existsSync(characterImagePath)) {
          try {
            console.log(`[UPLOAD] 📎 ${path.basename(characterImagePath)}`);
            await pasteImage(characterImagePath, 'character');
            const charRef = await this.checkSingleImageUpload('character', 45);
            if (!charRef) throw new Error('Character image upload check failed');
            
            this.uploadedImageRefs.wearing = { href: charRef, text: 'wearing', validated: true };
            console.log(`[UPLOAD] ✅ Character: ${charRef.substring(0, 60)}...`);
          } catch (e) {
            console.error(`[UPLOAD] ❌ Character image failed: ${e.message}`);
            throw e;
          }
        }


        // Upload additional character reference images (optional, improves identity lock)
        if (characterReferenceImagePaths.length > 0) {
          console.log(`[UPLOAD] 📚 Uploading ${characterReferenceImagePaths.length} extra character references...`);
          for (let refIdx = 0; refIdx < characterReferenceImagePaths.length; refIdx++) {
            const refPath = characterReferenceImagePaths[refIdx];
            if (!refPath || !fs.existsSync(refPath)) continue;
            if (characterImagePath && path.resolve(refPath) === path.resolve(characterImagePath)) continue;

            try {
              console.log(`[UPLOAD] 📎 character-ref-${refIdx + 1}: ${path.basename(refPath)}`);
              await pasteImage(refPath, `character-ref-${refIdx + 1}`);
              const refHref = await this.checkSingleImageUpload(`character-ref-${refIdx + 1}`, 45);
              if (refHref) {
                this.uploadedImageRefs[`character_ref_${refIdx + 1}`] = { href: refHref, text: `character_ref_${refIdx + 1}`, validated: true };
                console.log(`[UPLOAD] ✅ character-ref-${refIdx + 1}: ${refHref.substring(0, 60)}...`);
              }
            } catch (e) {
              console.warn(`[UPLOAD] ⚠️ character-ref-${refIdx + 1} failed: ${e.message}`);
            }
          }
        }

        // Upload product image (optional)
        if (productImagePath && fs.existsSync(productImagePath)) {
          try {
            console.log(`[UPLOAD] 📎 ${path.basename(productImagePath)}`);
            await pasteImage(productImagePath, 'product');
            const productRef = await this.checkSingleImageUpload('product', 45);
            if (!productRef) throw new Error('Product image upload check failed');
            
            this.uploadedImageRefs.product = { href: productRef, text: 'product', validated: true };
            console.log(`[UPLOAD] ✅ Product: ${productRef.substring(0, 60)}...`);
          } catch (e) {
            console.error(`[UPLOAD] ❌ Product image failed: ${e.message}`);
            throw e;
          }
        }

        // Upload scene image (optional)
        if (sceneImagePath && fs.existsSync(sceneImagePath)) {
          try {
            console.log(`[UPLOAD] 📎 ${path.basename(sceneImagePath)}`);
            await pasteImage(sceneImagePath, 'scene');
            const sceneRef = await this.checkSingleImageUpload('scene', 45);
            if (sceneRef) {
              this.uploadedImageRefs.scene = { href: sceneRef, text: 'scene', validated: true };
              console.log(`[UPLOAD] ✅ Scene: ${sceneRef.substring(0, 60)}...`);
            }
          } catch (e) {
            console.warn(`[UPLOAD] ⚠️  Scene image: ${e.message}`);
          }
        }

        // Update managers with uploaded refs
        if (this.generationMonitor) {
          this.generationMonitor.uploadedImageRefs = this.uploadedImageRefs;
        }
        if (this.errorRecoveryManager) {
          this.errorRecoveryManager.uploadedImageRefs = this.uploadedImageRefs;
        }

        // Capture baseline after uploads
        console.log('[UPLOAD] 📸 Capturing baseline for generation detection...');
        if (this.preGenerationMonitor) {
          await this.preGenerationMonitor.captureBaselineHrefs();
        }
        
        console.log('[UPLOAD] ✅ Complete\n');
      }

      let lastGeneratedHref = null;

      // MAIN LOOP: For each prompt
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
            promptNumber: i + 1,
            error: 'Invalid prompt'
          });
          throw new Error(`Invalid prompt at index ${i}`);
        }

        try {
          // For subsequent prompts with reference images, reuse command
          if (i > 0 && hasReferenceImages && lastGeneratedHref) {
            console.log(`[CHAIN] 🔄 Reusing command from previous prompt...\n`);
            
            const reuseSuccess = await this.page.evaluate((href) => {
              const link = document.querySelector(`a[href="${href}"]`);
              if (!link) return false;

              const rect = link.getBoundingClientRect();
              const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: Math.round(rect.left + rect.width / 2),
                clientY: Math.round(rect.top + rect.height / 2)
              });
              link.dispatchEvent(event);
              return true;
            }, lastGeneratedHref);

            if (reuseSuccess) {
              await this.page.waitForTimeout(1000);
              
              const clickedReuse = await this.page.evaluate(() => {
                const items = document.querySelectorAll('[role="menuitem"]');
                for (const item of items) {
                  const text = item.textContent.toLowerCase();
                  if (text.includes('sử dụng lại') || (text.includes('use') && text.includes('command'))) {
                    try {
                      item.click();
                      return true;
                    } catch (e) {
                      return false;
                    }
                  }
                }
                return false;
              });

              if (clickedReuse) {
                await this.page.waitForTimeout(1500);

                // Clear textbox
                const containerSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';
                await this.page.focus(containerSelector);
                await this.page.waitForTimeout(200);
                await this.page.click(containerSelector);
                await this.page.waitForTimeout(300);
                await this.page.keyboard.down('Control');
                await this.page.keyboard.press('a');
                await this.page.keyboard.up('Control');
                await this.page.waitForTimeout(100);
                await this.page.keyboard.press('Backspace');
                await this.page.waitForTimeout(400);
                console.log('[CHAIN] ✅ Ready for new prompt\n');
              }
            }
          } else if (i > 0) {
            console.log('[CHAIN] 🔧 Reconfiguring settings for next prompt...\n');
            await this._delegateConfigureSettings();
            await this.page.waitForTimeout(1500);
          }

          // GENERATION FLOW: prompt → submit → monitor → download (with error recovery)
          const genResult = await this._sharedGenerationFlow(prompt, {
            timeoutSeconds: 300,
            isImageMode: true
          });

          if (!genResult.success) {
            throw new Error(`Generation failed: ${genResult.error || 'unknown error'}`);
          }

          // Rename with prompt number
          const fileExt = path.extname(genResult.downloadedFile);
          const fileName = path.basename(genResult.downloadedFile, fileExt);
          const promptNum = String(i + 1).padStart(2, '0');
          const renamedName = `${fileName}-prompt${promptNum}${fileExt}`;
          let finalFilePath = path.join(path.dirname(genResult.downloadedFile), renamedName);

          try {
            fs.renameSync(genResult.downloadedFile, finalFilePath);
            console.log(`[FILE] 📂 Renamed to: ${path.basename(finalFilePath)}`);
          } catch (e) {
            console.warn(`[FILE] ⚠️  Rename failed: ${e.message}`);
            finalFilePath = genResult.downloadedFile;
          }

          // 💫 Handle partial success result
          const resultObj = {
            success: true,
            promptNumber: i + 1,
            href: genResult.href,
            downloadedFile: finalFilePath,
            seed: this.seedControl.fixedSeed
          };

          // Mark if this was partial success (some images generated, others failed)
          if (genResult.partial) {
            resultObj.partial = true;
            resultObj.found = genResult.found;
            resultObj.expected = genResult.expected;
            console.log(`[PARTIAL] ⚠️  Downloaded ${genResult.found}/${genResult.expected} image(s)`);
            console.log(`[PARTIAL] 💡 Remaining ${genResult.expected - genResult.found} image(s) can be retried in next generation`);
          }

          results.push(resultObj);

          lastGeneratedHref = genResult.href;

        } catch (promptError) {
          console.error(`\n❌ PROMPT ${i + 1} FAILED: ${promptError.message}\n`);
          results.push({
            success: false,
            promptNumber: i + 1,
            error: promptError.message
          });
          throw promptError;
        }
      }

      // Summary
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`✅ Generation Complete`);
      console.log(`${'═'.repeat(70)}\n`);

      const downloadedFiles = results
        .filter(r => r.success && r.downloadedFile)
        .map(r => r.downloadedFile);

      // 💫 Count partial successes
      const partialSuccesses = results.filter(r => r.partial);
      
      console.log(`[RESULTS] Generated: ${downloadedFiles.length} image(s)`);
      if (partialSuccesses.length > 0) {
        console.log(`[RESULTS] Partial successes: ${partialSuccesses.length} (some images failed to generate)`);
        partialSuccesses.forEach(r => {
          console.log(`  Prompt ${r.promptNumber}: ${r.found}/${r.expected} images`);
        });
      }
      
      downloadedFiles.forEach((file, idx) => {
        console.log(`  [${idx + 1}] ${path.basename(file)}`);
      });

      return {
        success: true,
        results,
        downloadedFiles,
        seed: this.seedControl.fixedSeed,
        observedSeedRequests: this.seedControl.observedRequests,
        partialSuccesses: partialSuccesses.length > 0 ? partialSuccesses : undefined
      };

    } finally {
      console.log('\n[CLOSE] 🚪 Closing browser...');
      await this.close();
      console.log('[CLOSE] ✅ Complete\n');
    }
  }

  // Backward compatibility: Keep generateMultiple as wrapper for generateImages
  async generateMultiple(characterImagePath, productImagePath, prompts, options = {}) {
    return this.generateImages(
      { characterImagePath, productImagePath, ...options },
      { prompts, outputCount: options.outputCount || 1, ...options }
    );
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

      // STEP 4: Video setup is now handled inside settings popup only
      console.log('[VIDEO] ⚙️  Video mode will be selected via settings dialog');

      // STEP 5: Configure video settings

      console.log('[CONFIG] ⚙️  Configuring video settings...');
      await this._delegateConfigureSettings();
      await this.page.waitForTimeout(2000);
      
      // 🔥 DEBUG: Check DOM after config
      const domStateAfterConfig = await this.page.evaluate(() => {
        return {
          virtuosoList: !!document.querySelector('[data-testid="virtuoso-item-list"]'),
          virtuosoItems: document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]').length,
          virtuosoItemsSlice15: Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]')).slice(0, 15).length
        };
      });
      console.log('[VIDEO] 🔍 DOM state after config:');
      console.log(`   Virtuoso list: ${domStateAfterConfig.virtuosoList ? '✓' : '✗'}`);
      console.log(`   Virtuoso items total: ${domStateAfterConfig.virtuosoItems}`);
      console.log(`   First 15 items: ${domStateAfterConfig.virtuosoItemsSlice15}\n`);

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

      // 💫 NEW: Upload image 1, check it, then upload image 2, check it (SEQUENTIAL)
      let primaryRef = null;
      try {
        console.log(`[UPLOAD] 📎 Before pasting primary: checking virtuoso state...`);
        const virtuosoBeforePrimary = await this.page.evaluate(() => {
          return {
            itemsCount: document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]').length,
            firstItems: Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]')).slice(0, 5).map(l => ({
              href: l.getAttribute('href').substring(0, 50),
              hasImg: !!l.querySelector('img')
            }))
          };
        });
        console.log(`   Items before paste: ${virtuosoBeforePrimary.itemsCount}`);
        
        await pasteImage(primaryImagePath, 'primary');
        console.log('[UPLOAD] 📤 Primary image pasted, waiting for virtuoso to update...');
        
        // 🔥 DEBUG: Check virtuoso state immediately after paste
        await this.page.waitForTimeout(1000);
        const virtuosoAfterPaste = await this.page.evaluate(() => {
          return {
            itemsCount: document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]').length,
            imageElements: document.querySelectorAll('[data-testid="virtuoso-item-list"] img').length,
            firstItems: Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]')).slice(0, 5).map((l, idx) => ({
              idx,
              href: l.getAttribute('href').substring(0, 50),
              hasImg: !!l.querySelector('img'),
              imgSrc: l.querySelector('img')?.getAttribute('src')?.substring(0, 30) || 'N/A'
            }))
          };
        });
        console.log(`   Items after paste: ${virtuosoAfterPaste.itemsCount} (was: ${virtuosoBeforePrimary.itemsCount})`);
        console.log(`   Image elements in list: ${virtuosoAfterPaste.imageElements}`);
        if (virtuosoAfterPaste.firstItems.length > 0) {
          virtuosoAfterPaste.firstItems.forEach(item => {
            console.log(`      [${item.idx}] ${item.hasImg ? '✓' : '✗'} | ${item.href}... | img=${item.imgSrc}`);
          });
        }
        
        console.log('[UPLOAD] 📤 Primary image pasted, checking upload...');
        primaryRef = await this.checkSingleImageUpload('primary', 45);
        if (!primaryRef) {
          throw new Error('Primary image upload check failed');
        }
        console.log(`[UPLOAD] ✅ Primary confirmed: ${primaryRef.substring(0, 80)}\n`);
      } catch (e) {
        console.error(`[UPLOAD] ❌ Primary image failed: ${e.message}`);
        throw e;
      }

      let secondaryRef = null;
      try {
        console.log(`[UPLOAD] 📎 Before pasting secondary: checking virtuoso state...`);
        const virtuosoBeforeSecondary = await this.page.evaluate(() => {
          return {
            itemsCount: document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]').length
          };
        });
        console.log(`   Items before paste: ${virtuosoBeforeSecondary.itemsCount}`);
        
        console.log(`[UPLOAD] 📎 Pasting secondary image: ${path.basename(secondaryImagePath)}`);
        await pasteImage(secondaryImagePath, 'secondary');
        console.log('[UPLOAD] 📤 Secondary image pasted, waiting for virtuoso to update...');
        
        // 🔥 DEBUG: Check virtuoso state immediately after paste
        await this.page.waitForTimeout(1000);
        const virtuosoAfterSecondaryPaste = await this.page.evaluate(() => {
          return {
            itemsCount: document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]').length,
            imageElements: document.querySelectorAll('[data-testid="virtuoso-item-list"] img').length,
            firstItems: Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]')).slice(0, 5).map((l, idx) => ({
              idx,
              href: l.getAttribute('href').substring(0, 50),
              hasImg: !!l.querySelector('img'),
              imgSrc: l.querySelector('img')?.getAttribute('src')?.substring(0, 30) || 'N/A'
            }))
          };
        });
        console.log(`   Items after paste: ${virtuosoAfterSecondaryPaste.itemsCount} (was: ${virtuosoBeforeSecondary.itemsCount})`);
        console.log(`   Image elements in list: ${virtuosoAfterSecondaryPaste.imageElements}`);
        if (virtuosoAfterSecondaryPaste.firstItems.length > 0) {
          virtuosoAfterSecondaryPaste.firstItems.forEach(item => {
            console.log(`      [${item.idx}] ${item.hasImg ? '✓' : '✗'} | ${item.href}... | img=${item.imgSrc}`);
          });
        }
        
        console.log('[UPLOAD] 📤 Secondary image pasted, checking upload...');
        secondaryRef = await this.checkSingleImageUpload('secondary', 45);
        if (!secondaryRef) {
          throw new Error('Secondary image upload check failed');
        }
        console.log(`[UPLOAD] ✅ Secondary confirmed: ${secondaryRef.substring(0, 80)}\n`);
      } catch (e) {
        console.error(`[UPLOAD] ❌ Secondary image failed: ${e.message}`);
        throw e;
      }

      // Optional scene image for video generation
      let sceneRef = null;
      if (options.sceneImagePath && fs.existsSync(options.sceneImagePath)) {
        try {
          console.log(`[UPLOAD] 📎 Pasting scene image: ${path.basename(options.sceneImagePath)}`);
          await pasteImage(options.sceneImagePath, 'scene');
          console.log('[UPLOAD] 📤 Scene image pasted, checking upload...');
          sceneRef = await this.checkSingleImageUpload('scene', 45);
          if (sceneRef) {
            console.log(`[UPLOAD] ✅ Scene confirmed: ${sceneRef.substring(0, 80)}\n`);
          } else {
            console.warn('[UPLOAD] ⚠️  Scene image check failed, continuing without it');
          }
        } catch (e) {
          console.warn(`[UPLOAD] ⚠️  Scene image error: ${e.message}, continuing`);
        }
      }

      // Store confirmed refs
      this.uploadedImageRefs = {
        primary: { href: primaryRef, text: 'primary', validated: true },
        secondary: { href: secondaryRef, text: 'secondary', validated: true },
        ...(sceneRef ? { scene: { href: sceneRef, text: 'scene', validated: true } } : {})
      };
      
      console.log(`[UPLOAD] 📦 Uploaded references confirmed and stored`);
      console.log(`   [0] primary: ${primaryRef.substring(0, 80)}`);
      console.log(`   [1] secondary: ${secondaryRef.substring(0, 80)}\n`);
      if (sceneRef) {
        console.log(`   [2] scene: ${sceneRef.substring(0, 80)}\n`);
      }
      
      // Update managers with uploaded refs so they can identify generated video
      if (this.generationMonitor) {
        this.generationMonitor.uploadedImageRefs = this.uploadedImageRefs;
      }
      if (this.errorRecoveryManager) {
        this.errorRecoveryManager.uploadedImageRefs = this.uploadedImageRefs;
      }

      // CAPTURE BASELINE: After upload completes, capture current state as baseline
      // This baseline includes the 2 uploaded images
      // When generation completes, we'll find hrefs NOT in this baseline = generated video
      console.log('[UPLOAD] 📸 Capturing baseline hrefs for generation detection...');
      if (this.preGenerationMonitor) {
        await this.preGenerationMonitor.captureBaselineHrefs();
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
