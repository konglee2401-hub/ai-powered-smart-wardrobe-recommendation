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
import VirtuosoQueryHelper from './google-flow/dom-queries/VirtuosoQueryHelper.js';

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
    this._generationResponseObserverAttached = false;
    this.lastGenerationApiFailure = null;
    this.lastGenerationApiEvent = null;
    
    // 🔐 Support flowId for flow-specific Chrome profile isolation
    // This prevents "profile locked by another process" errors when flows run in parallel
    const flowId = options.flowId || `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.options = {
      headless: false,
      flowId: flowId,  // ✅ Pass flowId for per-flow Chrome profile
      // 💫 FIX: Don't override sessionFilePath - use SessionManager's shared profile default
      // sessionFilePath will default to: data/google-flow-profiles/default/session.json
      baseUrl: 'https://labs.google/fx/vi/tools/flow',
      projectId: options.projectId || '87b78b0e-8b5a-40fc-9142-cdeda1419be7',
      aspectRatio: options.aspectRatio || '9:16',
      imageCount: this.type === 'image' ? (options.imageCount || 1) : undefined,
      videoCount: this.type === 'video' ? (options.videoCount || 1) : undefined,
      model: options.model || (this.type === 'image' ? 'Nano Banana 2' : 'Veo 3.1 - Fast'),
      videoReferenceType: options.videoReferenceType || 'frames',
      outputDir: options.outputDir || path.join(__dirname, `../uploads/generated-images`),
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
    this._installGenerationResponseObserver();

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
    this.promptManager = new PromptManager(this.page, { type: this.type, debugMode: this.debugMode });
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
    
    this.preGenerationMonitor = new PreGenerationMonitor(this.page, { preferredMediaType: this.type });
    this.preGenerationMonitor.page = this.page;
    
    this.generationMonitor = new GenerationMonitor(this.page, { type: this.type });
    this.generationMonitor.page = this.page;
    this.generationMonitor.mediaType = this.type;
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

        console.log(`[SEED] Intercepted flowMedia:batchGenerateImages | incoming=${JSON.stringify(incomingSeeds)} | outgoing=${this.seedControl.fixedSeed}`);

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
  // 
  _installGenerationResponseObserver() {
    if (this._generationResponseObserverAttached || !this.page) {
      return;
    }

    const generationEndpoints = [
      'batchAsyncGenerateVideoStartAndEndImage',
      'flowMedia:batchGenerateImages'
    ];

    this.page.on('response', async (response) => {
      const url = response.url();
      if (!generationEndpoints.some((endpoint) => url.includes(endpoint))) {
        return;
      }

      let body = '';
      try {
        body = await response.text();
      } catch {
        body = '';
      }

      const status = response.status();
      const bodySnippet = typeof body === 'string' ? body.slice(0, 1000) : '';
      const isRecaptchaFailure = /reCAPTCHA evaluation failed/i.test(bodySnippet);
      const isPromptFailure = /errorPrompt must be provided/i.test(bodySnippet);
      const isPermissionDenied = /PERMISSION_DENIED/i.test(bodySnippet);
      const isFailure = status >= 400 || isRecaptchaFailure || isPromptFailure || isPermissionDenied;

      const event = {
        url,
        status,
        bodySnippet,
        at: new Date().toISOString()
      };

      this.lastGenerationApiEvent = event;

      if (!isFailure) {
        this.lastGenerationApiFailure = null;
        return;
      }

      const failure = {
        ...event,
        type: isRecaptchaFailure ? 'recaptcha' : (isPromptFailure ? 'prompt' : 'generation')
      };

      if (failure.type === 'recaptcha') {
        failure.message = 'Google Flow rejected generation with reCAPTCHA evaluation failed. Refresh session or solve CAPTCHA, then resume.';
      } else if (failure.type === 'prompt') {
        failure.message = 'Google Flow rejected generation because prompt was not accepted by the composer.';
      } else {
        failure.message = 'Google Flow generation request failed with status ' + status + '.';
      }

      this.lastGenerationApiFailure = failure;
      console.warn('[FLOW-API] ' + failure.message);
      if (bodySnippet) {
        console.warn('[FLOW-API] Response snippet: ' + bodySnippet);
      }
    });

    this._generationResponseObserverAttached = true;
  }

  _resetGenerationApiState() {
    this.lastGenerationApiFailure = null;
    this.lastGenerationApiEvent = null;
  }

  _consumeGenerationApiFailure() {
    const failure = this.lastGenerationApiFailure;
    this.lastGenerationApiFailure = null;
    return failure;
  }

  _classifyGenerationFailure(error) {
    const message = error?.message || '';
    if (/reCAPTCHA evaluation failed/i.test(message)) {
      return {
        errorCode: 'google_flow_recaptcha_failed',
        actionRequired: 'refresh_google_flow_session'
      };
    }

    if (/prompt was not accepted|errorPrompt must be provided/i.test(message)) {
      return {
        errorCode: 'google_flow_prompt_rejected',
        actionRequired: null
      };
    }

    return {
      errorCode: 'google_flow_generation_failed',
      actionRequired: null
    };
  }

  async _primeRecaptchaForGeneration(contextLabel = 'generation') {
    if (!this.page) {
      return { primed: false, reason: 'no-page' };
    }

    const textboxSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';
    try {
      const primed = await this.page.evaluate((selector) => {
        const box = document.querySelector(selector);
        if (!box) return false;
        box.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(box);
        selection.removeAllRanges();
        selection.addRange(range);
        return document.activeElement === box;
      }, textboxSelector);

      if (!primed) {
        return { primed: false, reason: 'textbox-not-focused' };
      }

      await this.page.keyboard.type('prime', { delay: 35 });
      await this.page.waitForTimeout(600);
      for (let i = 0; i < 5; i++) {
        await this.page.keyboard.press('Backspace');
      }
      await this.page.waitForTimeout(1200);

      const tokenSummary = await this.page.evaluate(() => {
        const localMatches = Object.keys(localStorage)
          .filter((key) => /grecaptcha|rc::/i.test(key))
          .map((key) => ({ key, len: (localStorage.getItem(key) || '').length }));
        const sessionMatches = Object.keys(sessionStorage)
          .filter((key) => /grecaptcha|rc::/i.test(key))
          .map((key) => ({ key, len: (sessionStorage.getItem(key) || '').length }));
        return { localMatches, sessionMatches };
      });

      console.log('[RECAPTCHA] Prime completed for ' + contextLabel + ': local=' + tokenSummary.localMatches.length + ', session=' + tokenSummary.sessionMatches.length);
      return { primed: true, ...tokenSummary };
    } catch (error) {
      console.warn('[RECAPTCHA] Prime failed for ' + contextLabel + ': ' + error.message);
      return { primed: false, reason: error.message };
    }
  }

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
  sanitizePromptForFlow(promptText = '') {
    const originalPrompt = (promptText || '').toString();
    const validation = this.contentSafetyFilter.validatePrompt(originalPrompt);
    const safePrompt = validation.hasHighRisk
      ? this.contentSafetyFilter.autoCorrect(originalPrompt, 'all')
      : validation.hasMediumRisk
        ? this.contentSafetyFilter.autoCorrect(originalPrompt, 'medium')
        : originalPrompt;

    if (safePrompt !== originalPrompt) {
      console.log(`[PROMPT-SAFETY] Adjusted prompt for Flow safety (${validation.riskScore}/100)`);
    }

    return {
      prompt: safePrompt,
      validation
    };
  }

  async _internalEnterPromptViaManager(promptText) {
    try {
      const safePromptResult = this.sanitizePromptForFlow(promptText);
      const safePromptText = safePromptResult.prompt;
      this.lastPromptSubmitted = safePromptText; // Store for potential retry
      if (this.promptManager) {
        await this.promptManager.enterPrompt(promptText);
        return true;
      }
      return await this._delegateEnterPrompt(safePromptText);
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
      expectedNewHrefs = this.options.imageCount || 1,  // 💫 FIX: Get expected count from options
      skipPromptEntry = false
    } = config;

    console.log(`\n[SHARED-FLOW] 🎨 Starting generation (${isVideoMode ? 'video' : 'image'} mode) - expecting ${expectedNewHrefs} image(s)`);

    try {
      const safePromptResult = this.sanitizePromptForFlow(promptText);
      promptText = safePromptResult.prompt;
      this.lastPromptSubmitted = promptText;

      if (!skipPromptEntry) {
        // ??? PHASE A: PROMPT ENTRY AND SUBMISSION ???
        console.log('[SHARED-FLOW] ?? PHASE A: Entering and submitting prompt...');
        
        // BEFORE SUBMIT: Refresh baseline to account for any page changes
        // This ensures we have the most current snapshot before generation starts
        console.log('[SHARED-FLOW] ?? Refreshing baseline before submit...');
        if (this.preGenerationMonitor) {
          await this.preGenerationMonitor.refreshBaseline();
        }

        // Use PromptManager if available
        if (this.promptManager) {
          console.log('[SHARED-FLOW] ? Using PromptManager for entry');
          await this.promptManager.enterPrompt(promptText);
          console.log('[SHARED-FLOW] ? Waiting 5s for Slate editor to stabilize...');
          await this.page.waitForTimeout(5000);  // 5s to let editor stabilize
          this._resetGenerationApiState();
          
          const submitted = await this.promptManager.submit();
          if (!submitted) {
            console.log('[SHARED-FLOW] ??  PromptManager submit returned false, falling back to original submit');
            await this.submit();
          }
        } else {
          // Fallback: use original inline submit logic
          console.log('[SHARED-FLOW] ? Using inline entry/submit logic (no PromptManager)');
          await this.enterPrompt(promptText);
          console.log('[SHARED-FLOW] ? Waiting 5s for Slate editor to stabilize...');
          await this.page.waitForTimeout(5000);  // 5s to let editor stabilize before submit
          this._resetGenerationApiState();
          await this.submit();
        }

        console.log('[SHARED-FLOW] ? Waiting for server acknowledgment...');
        await this.page.waitForTimeout(2000);
        console.log('[SHARED-FLOW] ? PHASE A complete\n');
      } else {
        console.log('[SHARED-FLOW] ?? PHASE A skipped: prompt already prepared and submitted by caller');
      }

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
        
        // 💫 NEW REQUIREMENT: Only retry if we have 0 images. If we have >= 1, skip retries!
        if (generationResult.found >= 1) {
          console.log(`[SHARED-FLOW] ✅ Already got ${generationResult.found} image(s) - per requirement (1 image = download + next prompt), skipping retries`);
        } else {
        
        while (retryCount < maxPartialRetries && generationResult.found < 1) {
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
        
        } // End of else block (only retry if found < 1)
        
        if (generationResult.found < 1 && generationResult.found < generationResult.expected) {
          console.log(`[SHARED-FLOW] ⚠️  Could not get any images after ${retryCount} retry attempt(s)`);
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
    console.log(`[UPLOAD-CHECK] Checking for ${imageLabel} upload...`);

    const describeTile = (tile) => {
      if (!tile) return 'N/A';
      const markers = [];
      if (tile.hasImg) markers.push('img');
      if (tile.hasVideo) markers.push('video');
      if (tile.isLoading) markers.push('loading');
      if (tile.hasError) markers.push('error');
      return `tile=${tile.tileId || 'none'} href=${(tile.href || 'none').substring(0, 80)} media=${markers.join(',') || 'none'} text=${(tile.text || '').substring(0, 80)}`;
    };

    const baselineTiles = await VirtuosoQueryHelper.getVisibleTileSnapshots(this.page, { limit: 20 });
    const baselineTileIds = new Set(baselineTiles.map((tile) => tile.tileId).filter(Boolean));
    const baselineHrefs = new Set(baselineTiles.map((tile) => tile.href).filter(Boolean));

    console.log(`[UPLOAD-CHECK] Baseline visible tiles: ${baselineTiles.length}`);
    baselineTiles.slice(0, 6).forEach((tile, idx) => {
      console.log(`   [${idx}] ${describeTile(tile)}`);
    });

    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let lastSignature = '';
    let fallbackCandidate = null;

    while (Date.now() - startTime < timeoutMs) {
      const currentTiles = await VirtuosoQueryHelper.getVisibleTileSnapshots(this.page, { limit: 20 });
      const newTiles = currentTiles.filter((tile) => {
        const isNewTile = tile.tileId && !baselineTileIds.has(tile.tileId);
        const isNewHref = tile.href && !baselineHrefs.has(tile.href);
        return isNewTile || isNewHref;
      });

      const readyTiles = newTiles.filter((tile) => !tile.isLoading && !tile.hasError && (tile.hasImg || tile.hasVideo));
      const pendingTiles = newTiles.filter((tile) => !tile.hasError && (tile.hasLink || tile.hasImg || tile.hasVideo));

      const signature = JSON.stringify({
        total: currentTiles.length,
        newTiles: newTiles.map((tile) => ({
          tileId: tile.tileId,
          href: tile.href,
          hasImg: tile.hasImg,
          hasVideo: tile.hasVideo,
          isLoading: tile.isLoading,
          hasError: tile.hasError
        }))
      });

      if (signature !== lastSignature) {
        console.log(`[UPLOAD-CHECK] Scan: visible=${currentTiles.length} new=${newTiles.length} ready=${readyTiles.length} pending=${pendingTiles.length}`);
        newTiles.slice(0, 6).forEach((tile, idx) => {
          console.log(`   [new ${idx}] ${describeTile(tile)}`);
        });
        lastSignature = signature;
      }

      if (readyTiles.length > 0) {
        const matched = readyTiles[0];
        console.log(`[UPLOAD-CHECK] Success: ${imageLabel} uploaded`);
        console.log(`   -> ${describeTile(matched)}\n`);
        return matched.href || matched.tileId;
      }

      if (!fallbackCandidate && pendingTiles.length > 0) {
        fallbackCandidate = pendingTiles[0];
      }

      await this.page.waitForTimeout(1000);
    }

    const finalTiles = await VirtuosoQueryHelper.getVisibleTileSnapshots(this.page, { limit: 24 });
    const finalNewTiles = finalTiles.filter((tile) => {
      const isNewTile = tile.tileId && !baselineTileIds.has(tile.tileId);
      const isNewHref = tile.href && !baselineHrefs.has(tile.href);
      return isNewTile || isNewHref;
    });
    const finalReadyTile = finalNewTiles.find((tile) => !tile.isLoading && !tile.hasError && (tile.hasImg || tile.hasVideo));

    console.error(`[UPLOAD-CHECK] Timeout after ${timeoutSeconds}s for ${imageLabel}`);
    finalNewTiles.slice(0, 8).forEach((tile, idx) => {
      console.error(`   [final ${idx}] ${describeTile(tile)}`);
    });

    if (finalReadyTile) {
      console.log(`[UPLOAD-CHECK] Final fallback found ready tile for ${imageLabel}`);
      return finalReadyTile.href || finalReadyTile.tileId;
    }

    if (fallbackCandidate && (fallbackCandidate.href || fallbackCandidate.tileId)) {
      console.warn(`[UPLOAD-CHECK] Returning pending tile fallback for ${imageLabel}: ${describeTile(fallbackCandidate)}`);
      return fallbackCandidate.href || fallbackCandidate.tileId;
    }

    console.error(`[UPLOAD-CHECK] No new visible tiles detected for ${imageLabel}`);
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
      sceneName = null,
      onPromptStart = null,
      onPromptComplete = null
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
          if (typeof onPromptStart === 'function') {
            await onPromptStart({
              index: i,
              promptNumber: i + 1,
              totalPrompts: prompts.length,
              prompt
            });
          }

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

          if (typeof onPromptComplete === 'function') {
            await onPromptComplete({
              index: i,
              promptNumber: i + 1,
              totalPrompts: prompts.length,
              result: resultObj
            });
          }

          lastGeneratedHref = genResult.href;

        } catch (promptError) {
          console.error(`\n❌ PROMPT ${i + 1} FAILED: ${promptError.message}\n`);
          const failedResult = {
            success: false,
            promptNumber: i + 1,
            error: promptError.message
          };
          results.push(failedResult);
          if (typeof onPromptComplete === 'function') {
            await onPromptComplete({
              index: i,
              promptNumber: i + 1,
              totalPrompts: prompts.length,
              result: failedResult
            });
          }
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

  async _pasteImageIntoPromptTextbox(imagePath, label = 'image') {
    const textboxSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';
    const imageData = fs.readFileSync(imagePath);
    const base64 = Buffer.from(imageData).toString('base64');

    await this.page.evaluate((b64) => {
      return fetch(`data:image/png;base64,${b64}`)
        .then((res) => res.blob())
        .then((blob) => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]))
        .catch(() => false);
    }, base64);

    await this.page.waitForTimeout(500);
    await this.page.focus(textboxSelector);
    await this.page.waitForTimeout(120);
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('v');
    await this.page.keyboard.up('Control');
    await this.page.waitForTimeout(5000);
    console.log(`[UPLOAD] ?? ${label} pasted into Flow library`);
  }

  async _uploadReferenceImageToLibrary(imagePath, label) {
    if (!imagePath || !fs.existsSync(imagePath)) {
      throw new Error(`${label} image not found: ${imagePath}`);
    }

    console.log(`[UPLOAD] ?? Uploading ${label}: ${path.basename(imagePath)}`);
    await this._pasteImageIntoPromptTextbox(imagePath, label);
    const href = await this.checkSingleImageUpload(label, 45);
    if (!href) {
      throw new Error(`${label} image upload check failed`);
    }

    this.uploadedImageRefs[label] = { href, text: label, validated: true };
    console.log(`[UPLOAD] ? ${label}: ${href.substring(0, 80)}`);
    return href;
  }

  async _getVideoComposerState() {
    return await this.page.evaluate(() => {
      const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      };

      const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
      let panel = textbox?.closest('[role="dialog"]') || textbox?.parentElement;
      while (panel && panel.parentElement && !panel.querySelector('button')) {
        panel = panel.parentElement;
      }

      const scope = panel || document;
      const buttons = Array.from(scope.querySelectorAll('button')).filter(isVisible);
      const attachmentButtons = buttons.filter((button) => {
        if (!button.querySelector('img')) return false;
        const meta = normalize(String(button.textContent || '') + ' ' + String(button.getAttribute('aria-label') || '') + ' ' + String(button.getAttribute('title') || ''));
        return !/xoa cau lenh|clear prompt|close prompt/.test(meta);
      });
      const clearButton = buttons.find((button) => {
        const meta = normalize(String(button.textContent || '') + ' ' + String(button.getAttribute('aria-label') || '') + ' ' + String(button.getAttribute('title') || ''));
        return /xoa cau lenh|clear prompt|close prompt/.test(meta);
      });
      const textValue = normalize(textbox?.textContent || '');

      return {
        attachmentCount: attachmentButtons.length,
        hasClearButton: !!clearButton,
        textLength: textValue.length
      };
    });
  }

  async _waitForComposerAttachmentCount(expectedCount, timeoutMs = 8000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const state = await this._getVideoComposerState();
      if (state.attachmentCount === expectedCount) {
        return state;
      }
      await this.page.waitForTimeout(250);
    }

    return await this._getVideoComposerState();
  }

  async _clearVideoFramesPromptComposer() {
    console.log('[VIDEO-FRAMES] ?? Clearing video composer...');
    const beforeState = await this._getVideoComposerState();

    if (beforeState.attachmentCount > 0 || beforeState.textLength > 0) {
      const cleared = await this.page.evaluate(() => {
        const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const isVisible = (el) => {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        };

        const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        let panel = textbox?.closest('[role="dialog"]') || textbox?.parentElement;
        while (panel && panel.parentElement && !panel.querySelector('button')) {
          panel = panel.parentElement;
        }

        const scope = panel || document;
        const clearButton = Array.from(scope.querySelectorAll('button'))
          .filter(isVisible)
          .find((button) => {
            const meta = normalize(String(button.textContent || '') + ' ' + String(button.getAttribute('aria-label') || '') + ' ' + String(button.getAttribute('title') || ''));
            return /xoa cau lenh|clear prompt|close prompt/.test(meta);
          });

        if (!clearButton) return false;
        clearButton.click();
        return true;
      });

      if (cleared) {
        await this.page.waitForTimeout(400);
      }
    }

    const afterState = await this._waitForComposerAttachmentCount(0, 5000);
    if (afterState.attachmentCount !== 0) {
      throw new Error(`Video composer clear did not remove attachments (remaining: ${afterState.attachmentCount})`);
    }
  }

  async _attachLibraryTileToVideoFramesPrompt(href, label = 'frame') {
    console.log(`[VIDEO-FRAMES] ?? Attaching ${label} to video prompt`);
    const beforeState = await this._getVideoComposerState();

    const monitoredItem = this.preGenerationMonitor
      ? await this.preGenerationMonitor.findItemByHref(href)
      : null;

    const tileBox = await this.page.evaluate(({ targetHref, targetPosition }) => {
      const tiles = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]'));
      const uniqueTiles = [];
      const seen = new Set();

      for (const tile of tiles) {
        const link = tile.querySelector('a[href*="/edit/"]');
        if (!link) continue;

        const href = link.getAttribute('href') || '';
        if (!href || !href.includes('/edit/') || seen.has(href)) continue;

        const rect = tile.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;

        seen.add(href);
        uniqueTiles.push({ href, tile });
      }

      const targetEntry = (typeof targetPosition === 'number' && uniqueTiles[targetPosition]?.href === targetHref)
        ? uniqueTiles[targetPosition]
        : uniqueTiles.find((entry) => entry.href === targetHref);

      if (!targetEntry?.tile) return null;

      targetEntry.tile.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = targetEntry.tile.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }, { targetHref: href, targetPosition: monitoredItem?.position ?? null });

    if (!tileBox) {
      throw new Error(`Could not find library tile for ${label}`);
    }

    await this.page.mouse.click(tileBox.x, tileBox.y, { button: 'right' });
    await this.page.waitForTimeout(650);

    // Flow context menu is a custom overlay; two ArrowDown presses consistently land on
    // "Th?m v?o c?u l?nh" for both the first and second frame attachments.
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(120);
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(120);
    await this.page.keyboard.press('Enter');

    const afterState = await this._waitForComposerAttachmentCount(beforeState.attachmentCount + 1, 3500);

    if (afterState.attachmentCount <= beforeState.attachmentCount) {
      throw new Error(`Attach failed for ${label}: composer attachment count stayed at ${afterState.attachmentCount}`);
    }

    await this.page.waitForTimeout(600);
  }

  async generateVideo(videoPrompt, primaryImagePath, secondaryImagePath, options = {}) {
    if (this.debugMode) {
      console.log('\n?? [DEBUG] generateVideo() is disabled (debug mode)');
      console.log('   - init() allowed');
      console.log('   - navigateToFlow() allowed');
      console.log('   - All other steps skipped\n');
      
      await this.init();
      await this.navigateToFlow();
      
      console.log('\n? Browser open at Google Flow project (video mode)\n');
      
      return {
        success: true,
        debugMode: true,
        path: null,
        message: 'Debug mode: only opened project'
      };
    }

    const { reloadAfter = false, onProgress = null } = options;
    const reportProgress = async (phase, details = {}) => {
      if (typeof onProgress !== 'function') return;
      await onProgress({ phase, timestamp: new Date().toISOString(), ...details });
    };

    try {

      console.log(`\n${'?'.repeat(80)}`);
      console.log('?? VIDEO GENERATION: Single video (frames mode)');
      console.log(`${'?'.repeat(80)}\n`);
      console.log(`?? Start image: ${path.basename(primaryImagePath)}`);
      console.log(`?? End image: ${path.basename(secondaryImagePath)}\n`);

      console.log('[INIT] ?? Initializing browser...');
      await reportProgress('init');
      await this.init();

      console.log('[NAV] ?? Navigating to Google Flow...');
      await reportProgress('navigate');
      await this.navigateToFlow();
      await this.page.waitForTimeout(2000);

      console.log('[PAGE] ? Waiting for page to load...');
      await this.waitForPageReady();
      await this.page.waitForTimeout(5000);
      console.log('[PAGE] ? Ready\n');

      console.log('[CONFIG] ??  Configuring video settings...');
      await reportProgress('configure-settings');
      await this._delegateConfigureSettings();
      await this.page.waitForTimeout(2000);

      console.log('[UPLOAD] ?? Uploading frame references to library...');
      await reportProgress('focus-composer');
      await this.page.focus('.iTYalL[role="textbox"][data-slate-editor="true"]');
      await this.page.waitForTimeout(300);

      await reportProgress('upload-primary-start', { asset: 'primary', fileName: path.basename(primaryImagePath) });
      const primaryRef = await this._uploadReferenceImageToLibrary(primaryImagePath, 'primary');
      await reportProgress('upload-primary-complete', { asset: 'primary', href: primaryRef });
      await reportProgress('upload-secondary-start', { asset: 'secondary', fileName: path.basename(secondaryImagePath) });
      const secondaryRef = await this._uploadReferenceImageToLibrary(secondaryImagePath, 'secondary');
      await reportProgress('upload-secondary-complete', { asset: 'secondary', href: secondaryRef });
      let sceneRef = null;
      if (options.sceneImagePath && fs.existsSync(options.sceneImagePath)) {
        try {
          await reportProgress('upload-scene-start', { asset: 'scene', fileName: path.basename(options.sceneImagePath) });
          sceneRef = await this._uploadReferenceImageToLibrary(options.sceneImagePath, 'scene');
          await reportProgress('upload-scene-complete', { asset: 'scene', href: sceneRef });
        } catch (error) {
          console.warn(`[UPLOAD] ?? Scene image skipped: ${error.message}`);
          await reportProgress('upload-scene-skipped', { asset: 'scene', error: error.message });
        }
      }

      this.uploadedImageRefs = {
        primary: { href: primaryRef, text: 'primary', validated: true },
        secondary: { href: secondaryRef, text: 'secondary', validated: true },
        ...(sceneRef ? { scene: { href: sceneRef, text: 'scene', validated: true } } : {})
      };

      if (this.generationMonitor) {
        this.generationMonitor.uploadedImageRefs = this.uploadedImageRefs;
      }
      if (this.errorRecoveryManager) {
        this.errorRecoveryManager.uploadedImageRefs = this.uploadedImageRefs;
      }
      if (this.generationMonitor) {
        console.log('[VIDEO-FRAMES] Clearing stale failed tiles before capturing baseline...');
        await this.generationMonitor.deleteFailedItems();
        await this.page.waitForTimeout(1000);
      }
      if (this.preGenerationMonitor) {
        await this.preGenerationMonitor.captureBaselineHrefs();
      }

      console.log('[VIDEO-FRAMES] ?? Preparing sequential frame attachments...');
      await reportProgress('clear-composer-start');
      await this._clearVideoFramesPromptComposer();
      await reportProgress('clear-composer-complete');
      await reportProgress('attach-first-start', { href: primaryRef });
      await this._attachLibraryTileToVideoFramesPrompt(primaryRef, 'first-frame');
      await reportProgress('attach-first-complete', { href: primaryRef });
      await reportProgress('attach-second-start', { href: secondaryRef });
      await this._attachLibraryTileToVideoFramesPrompt(secondaryRef, 'second-frame');
      await reportProgress('attach-second-complete', { href: secondaryRef });

      await reportProgress('prime-recaptcha-start');
      await this._primeRecaptchaForGeneration('video-frames');
      await reportProgress('prime-recaptcha-complete');

      await reportProgress('enter-prompt-start');
      const promptEntered = await this._delegateEnterPrompt(videoPrompt);
      if (!promptEntered) {
        throw new Error('Could not enter video prompt after attaching frames');
      }

      await reportProgress('enter-prompt-complete', { promptLength: videoPrompt?.length || 0 });
      await reportProgress('submit-prompt-start');
      this._resetGenerationApiState();
      const submitted = await this._delegateSubmitPrompt();
      if (!submitted) {
        throw new Error('Could not submit video prompt after attaching frames');
      }

      await reportProgress('submit-prompt-complete');

      await this.page.waitForTimeout(2000);

      const immediateVideoFailure = this._consumeGenerationApiFailure();
      if (immediateVideoFailure) {
        throw new Error(immediateVideoFailure.message);
      }

      await reportProgress('monitor-generation-start');
      const genResult = await this._sharedGenerationFlow(videoPrompt, {
        timeoutSeconds: 300,
        isVideoMode: true,
        skipPromptEntry: true
      });

      if (!genResult.success) {
        throw new Error(`Video generation failed: ${genResult.error || 'unknown error'}`);
      }

      const videoPath = genResult.downloadedFile;
      console.log(`[FILE] ? Video generated: ${path.basename(videoPath)}`);
      await reportProgress('download-complete', { href: genResult.href, path: videoPath });

      if (reloadAfter) {
        console.log('\n[RELOAD] ? Reloading page...');
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(2000);
        console.log('[RELOAD] ? Page reloaded\n');
      }

      console.log(`\n${'?'.repeat(80)}`);
      console.log('? VIDEO GENERATION COMPLETE');
      console.log(`${'?'.repeat(80)}\n`);

      return {
        success: true,
        path: videoPath,
        href: genResult.href,
        duration: 60,
        format: '9:16',
        uploadedImageRefs: this.uploadedImageRefs,
        progressPhase: 'completed'
      };
    } catch (error) {
      const failureMeta = this._classifyGenerationFailure(error);
      console.error(`
? VIDEO GENERATION FAILED: ${error.message}
`);
      await reportProgress('failed', { error: error.message, errorCode: failureMeta.errorCode, actionRequired: failureMeta.actionRequired });
      if (this.browser) {
        await this.close();
      }
      return {
        success: false,
        path: null,
        error: error.message,
        errorCode: failureMeta.errorCode,
        actionRequired: failureMeta.actionRequired
      };
    }
  }
}

export default GoogleFlowAutomationService;



