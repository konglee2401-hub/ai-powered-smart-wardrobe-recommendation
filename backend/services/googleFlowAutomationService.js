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
      storagePrefix = 'gen'
    } = config;

    console.log(`\n[SHARED-FLOW] 🎨 Starting generation (${isVideoMode ? 'video' : 'image'} mode)`);

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
        generationResult = await this.generationMonitor.monitorGeneration(Math.ceil(timeoutSeconds), 1);  // Expect 1 new image (sequential upload)
      } else {
        console.log('[SHARED-FLOW] ✓ Using inline monitoring logic (fallback)');
        const href = await this.monitorGeneration(timeoutSeconds);
        generationResult = { success: !!href, href };
      }

      if (!generationResult?.success || !generationResult?.href) {
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
            const retryMonitorResult = await this.generationMonitor.monitorGeneration(Math.ceil(timeoutSeconds), 1);  // Still expect 1
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
          
          // HEAVIER FALLBACK: Full flow rehash (re-paste images + re-enter prompt + resubmit)
          const recoverySuccess = await this.errorRecoveryManager?.handleGenerationFailureRetry(
            this.lastPromptSubmitted,
            this.uploadedImageRefs
          );
          
          if (!recoverySuccess) {
            console.log('[SHARED-FLOW] ❌ Both retry methods failed');
            return { success: false, href: null, error: 'Generation and recovery both failed' };
          }
          
          console.log('[SHARED-FLOW] ✅ Recovery succeeded, waiting for generation...\n');
          
          // Wait for recovery generation
          await this.page.waitForTimeout(5000);
          const recoveryMonitorResult = await this.generationMonitor.monitorGeneration(Math.ceil(timeoutSeconds), 1);  // Still expect 1
          
          if (!recoveryMonitorResult?.success || !recoveryMonitorResult?.href) {
            console.log('[SHARED-FLOW] ⚠️  Generation monitoring after recovery failed');
            return { success: false, href: null, error: 'Recovery monitoring failed' };
          }
          
          generationResult = recoveryMonitorResult;
        }
      }
      
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
    console.log(`📦 Product image: ${productImagePath ? path.basename(productImagePath) : '(using character as placeholder)'}`);
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

      // STEP 5-7: Upload images SEQUENTIALLY (one at a time, check each)
      console.log('[UPLOAD] 📤 Uploading reference images (SEQUENTIAL)...');
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

      // 💫 NEW: Upload image 1, check it, then upload image 2, check it
      let charRef = null;
      try {
        await pasteImage(characterImagePath, 'character');
        console.log('[UPLOAD] 📤 Character image pasted, checking upload...');
        charRef = await this.checkSingleImageUpload('character', 45);
        if (!charRef) {
          throw new Error('Character image upload check failed');
        }
        console.log(`[UPLOAD] ✅ Character confirmed: ${charRef.substring(0, 80)}\n`);
      } catch (e) {
        console.error(`[UPLOAD] ❌ Character image failed: ${e.message}`);
        throw e;
      }

      let productRef = null;
      try {
        console.log(`[UPLOAD] 📎 Pasting product image: ${productImagePath ? path.basename(productImagePath) : '(character placeholder)'}`);
        await pasteImage(productImagePath, 'product');
        console.log('[UPLOAD] 📤 Product image pasted, checking upload...');
        productRef = await this.checkSingleImageUpload('product', 45);
        if (!productRef) {
          throw new Error('Product image upload check failed');
        }
        console.log(`[UPLOAD] ✅ Product confirmed: ${productRef.substring(0, 80)}\n`);
      } catch (e) {
        console.error(`[UPLOAD] ❌ Product image failed: ${e.message}`);
        throw e;
      }

      // Optional scene image
      let sceneRef = null;
      if (options.sceneImagePath && fs.existsSync(options.sceneImagePath)) {
        try {
          console.log(`[UPLOAD] 📎 Pasting scene image: ${path.basename(options.sceneImagePath)}`);
          await pasteImage(options.sceneImagePath, 'scene');
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
        wearing: { href: charRef, text: 'wearing', validated: true },
        product: { href: productRef, text: 'product', validated: true },
        ...(sceneRef ? { scene: { href: sceneRef, text: 'scene', validated: true } } : {})
      };
      
      console.log(`[UPLOAD] 📦 Uploaded references confirmed and stored`);
      console.log(`   [0] wearing: ${charRef.substring(0, 80)}`);
      console.log(`   [1] product: ${productRef.substring(0, 80)}\n`);
      if (sceneRef) {
        console.log(`   [2] scene: ${sceneRef.substring(0, 80)}\n`);
      }
      
      // Update managers with uploaded refs so they can identify generated images
      if (this.generationMonitor) {
        this.generationMonitor.uploadedImageRefs = this.uploadedImageRefs;
      }
      if (this.errorRecoveryManager) {
        this.errorRecoveryManager.uploadedImageRefs = this.uploadedImageRefs;
      }

      // CAPTURE BASELINE: After upload completes, capture current state as baseline
      // This baseline includes the 2 uploaded images
      // When generation completes, we'll find hrefs NOT in this baseline = generated image
      console.log('[UPLOAD] 📸 Capturing baseline hrefs for generation detection...');
      if (this.preGenerationMonitor) {
        await this.preGenerationMonitor.captureBaselineHrefs();
      }

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
          this.uploadedImageRefs?.product?.href,
          this.uploadedImageRefs?.scene?.href
        ].filter(Boolean);

        if (refs.length < 2) {
          console.log('[FALLBACK] ⚠️  Missing uploaded href refs, cannot re-add reference images');
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
        
        // 💫 NEW: Before each iteration (except first), refresh settings and ensure image mode
        if (i > 0) {
          console.log(`\n[CHAIN] 🔧 Preparing for iteration ${i + 1}...`);
          console.log('[CHAIN] 🔧 Re-configuring image settings...');
          await this._delegateConfigureSettings();
          await this.page.waitForTimeout(1500);
          
          console.log('[CHAIN] 📸 Ensuring we are in Image mode...');
          const navigationManager = this.navigationManager || 
            (this.contextManagers?.navigationManager);
          if (navigationManager && navigationManager.selectTab) {
            const imageTabSelected = await navigationManager.selectTab('Image');
            if (imageTabSelected) {
              console.log('[CHAIN] ✅ Image tab confirmed active');
            } else {
              console.log('[CHAIN] ⚠️  Could not explicitly select Image tab, continuing...');
            }
          }
          await this.page.waitForTimeout(1000);
          console.log('[CHAIN] ✅ Settings and mode ready\n');
        }
        
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
            console.log(`[CHAIN] 🔄 Reusing command from previous generation (iteration ${i + 1})...`);
            console.log(`[CHAIN] 📌 Using href: ${lastGeneratedHref.substring(0, 80)}...`);
            
            // Right-click the image to open context menu and select "Sử dụng lại câu lệnh"
            const reuseSuccess = await this.page.evaluate((href) => {
              // Find item by href
              const link = document.querySelector(`a[href="${href}"]`);
              if (!link) {
                console.log('[CHAIN] ❌ Item not found for reuse');
                return false;
              }

              // Get position and right-click
              const rect = link.getBoundingClientRect();
              const x = Math.round(rect.left + rect.width / 2);
              const y = Math.round(rect.top + rect.height / 2);

              // Simulate right-click via event (can't do actual right-click in evaluate)
              const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
              });
              link.dispatchEvent(event);
              return true;
            }, lastGeneratedHref);

            if (!reuseSuccess) {
              console.error(`[CHAIN] ❌ Failed to trigger context menu for reuse`);
              throw new Error('Failed to reuse command: could not find item');
            }

            // Wait for context menu to appear
            console.log('[CHAIN] ⏳ Waiting for context menu...');
            await this.page.waitForTimeout(1000);

            // Click "Sử dụng lại câu lệnh" in context menu
            const clickedReuse = await this.page.evaluate(() => {
              const menuItems = document.querySelectorAll('[role="menuitem"]');
              for (const item of menuItems) {
                const text = item.textContent.toLowerCase();
                if (text.includes('sử dụng lại') || text.includes('use') && text.includes('command')) {
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

            if (!clickedReuse) {
              console.warn('[CHAIN] ⚠️  Could not find/click "Sử dụng lại" option');
              throw new Error('Failed to click reuse command option');
            }

            console.log('[CHAIN] ✓ Clicked "Sử dụng lại câu lệnh"');
            await this.page.waitForTimeout(1500);

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
          } else if (i > 0 && !lastGeneratedHref) {
            console.warn(`[CHAIN] ⚠️  No lastGeneratedHref available for iteration ${i + 1}, cannot reuse command`);
            throw new Error('Cannot reuse command: no previous href');
          }

          // STEP B-G: Use shared generation flow
          // This encapsulates: prompt entry → submit → monitor → download
          const genResult = await this._sharedGenerationFlow(prompt, {
            timeoutSeconds: 300,
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
          let finalFilePath = path.join(path.dirname(genResult.downloadedFile), renamedName);  // Use let instead of const

          try {
            fs.renameSync(genResult.downloadedFile, finalFilePath);
            console.log(`[FILE] 📂 Renamed to: ${path.basename(finalFilePath)}`);
          } catch (e) {
            console.warn(`[FILE] ⚠️  Rename failed: ${e.message}`);
            finalFilePath = genResult.downloadedFile;  // Safe to reassign since it's let
          }

          results.push({
            success: true,
            imageNumber: i + 1,
            href: genResult.href,
            downloadedFile: finalFilePath
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

      // 🔍 DEBUG: Show detailed results structure
      console.log(`\n🔥 DEBUG: Detailed results array from generateMultiple():`);
      results.forEach((result, idx) => {
        console.log(`\n  [${idx}] Success: ${result.success}`);
        if (result.success) {
          console.log(`      imageNumber: ${result.imageNumber}`);
          console.log(`      downloadedFile: ${result.downloadedFile}`);
          console.log(`      href: ${result.href?.substring(0, 80) || 'N/A'}...`);
          if (result.downloadedFile && require('fs').existsSync(result.downloadedFile)) {
            const fileSize = require('fs').statSync(result.downloadedFile).size;
            console.log(`      fileSize: ${(fileSize / 1024).toFixed(2)}KB`);
          }
        } else {
          console.log(`      error: ${result.error}`);
        }
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
      await this._switchToVideoTab();
      
      // 🔥 DEBUG: Check DOM after switching to video tab
      let domStateAfterTabSwitch = await this.page.evaluate(() => {
        return {
          virtuosoList: !!document.querySelector('[data-testid="virtuoso-item-list"]'),
          virtuosoItems: document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]').length,
          textEditor: !!document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]'),
          allTextAreas: document.querySelectorAll('[role="textbox"]').length,
          componentButtons: document.querySelectorAll('button').length,
          videoButtonExists: !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('video'))
        };
      });
      console.log('[VIDEO] 🔍 DOM state after tab switch:');
      console.log(`   Virtuoso list: ${domStateAfterTabSwitch.virtuosoList ? '✓' : '✗'}`);
      console.log(`   Virtuoso items visible: ${domStateAfterTabSwitch.virtuosoItems}`);
      console.log(`   Text editor: ${domStateAfterTabSwitch.textEditor ? '✓' : '✗'}`);
      console.log(`   All textboxes: ${domStateAfterTabSwitch.allTextAreas}`);
      console.log(`   Buttons on page: ${domStateAfterTabSwitch.componentButtons}`);
      console.log(`   Video button found: ${domStateAfterTabSwitch.videoButtonExists ? '✓' : '✗'}\n`);
      
      await this._selectVideoFromComponents();
      
      // 🔥 DEBUG: Check DOM after selecting video
      const domStateAfterVideoSelect = await this.page.evaluate(() => {
        return {
          virtuosoList: !!document.querySelector('[data-testid="virtuoso-item-list"]'),
          virtuosoItems: document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]').length,
          textEditor: !!document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]'),
          visibleTextEditors: document.querySelectorAll('[role="textbox"]:not([style*="display: none"])').length,
          imageElements: document.querySelectorAll('img').length
        };
      });
      console.log('[VIDEO] 🔍 DOM state after video selection:');
      console.log(`   Virtuoso list: ${domStateAfterVideoSelect.virtuosoList ? '✓' : '✗'}`);
      console.log(`   Virtuoso items visible: ${domStateAfterVideoSelect.virtuosoItems}`);
      console.log(`   Expected text editor: ${domStateAfterVideoSelect.textEditor ? '✓' : '✗'}`);
      console.log(`   All visible textboxes: ${domStateAfterVideoSelect.visibleTextEditors}`);
      console.log(`   Image elements on page: ${domStateAfterVideoSelect.imageElements}\n`);
      
      await this.page.waitForTimeout(1000);
      console.log('[VIDEO] ✅ Video mode ready\n');

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
