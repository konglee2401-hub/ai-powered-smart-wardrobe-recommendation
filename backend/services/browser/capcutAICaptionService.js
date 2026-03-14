import BrowserService from './browserService.js';
import CapCutSessionManager from './capcutSessionManager.js';
import AccountSessionRegistry from './accountSessionRegistry.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAPCUT_PROFILE_BASE = path.join(path.dirname(path.dirname(__dirname)), 'data', 'capcut-profiles');
const CAPCUT_SHARED_PROFILE = path.join(CAPCUT_PROFILE_BASE, 'default');
const CAPCUT_SHARED_SESSION = path.join(CAPCUT_SHARED_PROFILE, 'session.json');
const DEFAULT_CAPCUT_URL =
  'https://www.capcut.com/magic-tools/ai-captions?enter_from=entrance&from_page=work_space&start_tab=video&tool_type=ai_caption&position=my_draft';

class CapCutAICaptionService extends BrowserService {
  constructor(options = {}) {
    const flowId = options.flowId || 'default';
    const sessionRegistry = new AccountSessionRegistry('capcut', { baseDir: CAPCUT_PROFILE_BASE });
    const preferredEmail = String(options.accountEmail || process.env.CAPCUT_ACCOUNT_EMAIL || '').trim();
    const preferredKey = String(options.accountKey || options.profileKey || process.env.CAPCUT_PROFILE_KEY || '').trim();
    let selectedAccount = (preferredEmail || preferredKey)
      ? sessionRegistry.ensureAccount({ email: preferredEmail, accountKey: preferredKey, label: options.accountLabel })
      : sessionRegistry.selectAccount({ preferEmail: preferredEmail, preferKey: preferredKey }) || null;
    const resolvedProfileKey = selectedAccount?.accountKey || preferredKey || 'default';
    if (!selectedAccount) {
      selectedAccount = sessionRegistry.ensureAccount({ accountKey: resolvedProfileKey, label: options.accountLabel });
    }
    const profileDir = selectedAccount?.profileDir
      ? selectedAccount.profileDir
      : (options.sharedProfile === false ? path.join(CAPCUT_PROFILE_BASE, flowId) : CAPCUT_SHARED_PROFILE);

    super({
      ...options,
      userDataDir: profileDir,
      headless: options.headless !== true ? false : options.headless,
    });

    this.baseUrl = options.baseUrl || process.env.CAPCUT_AI_CAPTION_URL || DEFAULT_CAPCUT_URL;
    this.flowId = flowId;
    this.profileDir = profileDir;
    this._stepLogger = null;
    this.accountEmail = selectedAccount?.email || preferredEmail || '';
    this.accountKey = selectedAccount?.accountKey || resolvedProfileKey || '';
    this.accountLabel = selectedAccount?.label || options.accountLabel || '';
    this.sessionRegistry = sessionRegistry;

    this.sessionManager = new CapCutSessionManager({
      sessionPath: options.sessionPath || selectedAccount?.sessionPath || CAPCUT_SHARED_SESSION,
      sessionDir: options.sessionDir,
      sessionFile: options.sessionFile,
    });

  }

  async initialize() {
    await this.launch({ skipSession: true });

    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
    }

    await this.sessionManager.injectSession(this.page);

    await this.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 120000 });
    await this.waitForPageReady();

    const authed = await this.isAuthenticated();
    if (!authed) {
      console.log('CapCut not authenticated. Manual login required.');
    } else {
      console.log('CapCut authenticated with saved session.');
    }
  }

  async isAuthenticated() {
    try {
      const authState = await this.page.evaluate(() => {
        const text = document.body?.innerText || '';
        const hasLoginText = /log in|sign in|sign up|register/i.test(text);

        const avatar = document.querySelector(
          '.avatar-wrap-S4SJvJ img.avatar-MPgomX, .avatar-wrap-S4SJvJ, img.avatar-MPgomX, [class*="avatar-wrap"] img[alt="avatar"], [data-testid*="avatar"]'
        );

        const userMenu = document.querySelector(
          '.user-info-menu-lB5oQH, [class*="user-info-menu"], [data-testid*="user"], [aria-label*="account" i], [aria-label*="profile" i]'
        );
        const hasUpgrade = Array.from(document.querySelectorAll('button, [role="menuitem"], [class*="vip"], [class*="upgrade"]'))
          .some((el) => (el.textContent || '').toLowerCase().includes('upgrade'));

        const uploadInput = document.querySelector('input.upload-input-nIqsAj, input[type="file"]');
        const hasWorkspaceText = /my drafts|workspace|project|timeline/i.test(text);

        return {
          hasLoginText,
          hasAvatar: !!avatar,
          hasUserMenu: !!userMenu,
          hasUpgrade,
          hasUploadInput: !!uploadInput,
          hasWorkspaceText,
        };
      });

      return (
        (authState.hasAvatar || authState.hasUserMenu || authState.hasUpgrade || authState.hasUploadInput || authState.hasWorkspaceText) &&
        !authState.hasLoginText
      );
    } catch (error) {
      console.log(`Auth check error: ${error.message}`);
      return false;
    }
  }

  async waitForPageReady(timeoutMs = 60000) {
    try {
      await this.page.waitForFunction(() => document.readyState === 'complete', { timeout: timeoutMs });
    } catch {
      // best effort
    }
    await this.page.waitForTimeout(2000);
  }

  async detectLoginModal() {
    return this.page.evaluate(() => {
      const modal = document.querySelector('.lv_sign_in_panel_wide_base_page');
      const modalTitle = modal?.querySelector('h2')?.textContent || '';
      return {
        found: !!modal,
        title: modalTitle.trim(),
      };
    });
  }

  async waitForManualLogin(timeoutSeconds = 180) {
    console.log(`Waiting ${timeoutSeconds}s for manual CapCut login...`);
    const start = Date.now();
    while (Date.now() - start < timeoutSeconds * 1000) {
      const authed = await this.isAuthenticated();
      if (authed) {
        console.log('Manual login detected.');
        return true;
      }
      await this.page.waitForTimeout(2000);
    }
    console.log('Manual login timeout.');
    return false;
  }

  async ensureAuthenticated(timeoutSeconds = 180) {
    const authed = await this.isAuthenticated();
    if (authed) return true;

    const avatarConfirm = await this._tryOpenAvatarMenu();
    if (avatarConfirm) {
      return true;
    }

    return this.waitForManualLogin(timeoutSeconds);
  }

  async saveSession(metadata = {}) {
    const enriched = {
      ...metadata,
      email: this.accountEmail || metadata.email || '',
    };
    return this.sessionManager.saveSession(this.page, enriched);
  }

  async close() {
    try {
      if (this.page && !this.page.isClosed?.()) {
        await this.waitForPageReady(15000);
        await this.saveSession({ reason: 'close' });
      }
    } catch (error) {
      console.error(`CapCut session save failed: ${error.message}`);
    }

    return super.close();
  }

  async generateCaptions(options = {}) {
    return this.generateCaptionedVideo(options);
  }

  async generateCaptionedVideo(options = {}) {
    const {
      videoPath,
      outputDirVideo = path.join(path.dirname(path.dirname(__dirname)), 'media', 'temp', 'capcut-exports'),
      language = 'auto',
      timeoutMs = 20 * 60 * 1000, // 💫 Increased from 10 to 20 minutes for reliable CapCut AI processing
      applyStyle = true,
      resolution = '1080p',
      fps = '60fps',
      onStep = null,
    } = options;

    const logStep = typeof onStep === 'function' ? onStep : () => {};
    this._stepLogger = logStep;

    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error(`Video not found: ${videoPath}`);
    }

    if (!fs.existsSync(outputDirVideo)) {
      fs.mkdirSync(outputDirVideo, { recursive: true });
    }

    await this._setDownloadDirectory(outputDirVideo);

    logStep('auth-check', 'Checking CapCut authentication...');
    const authed = await this.ensureAuthenticated();
    if (!authed) {
      throw new Error('CapCut authentication required.');
    }

    if (!this.accountEmail) {
      this.accountEmail = await this._detectAccountEmail();
      if (this.accountEmail) {
        if (this.accountKey) {
          this.sessionRegistry.updateAccount({ accountKey: this.accountKey }, { email: this.accountEmail });
        } else {
          const ensured = this.sessionRegistry.ensureAccount({ email: this.accountEmail, label: this.accountLabel });
          this.accountKey = ensured?.accountKey || this.accountKey;
        }
      }
    }
    if (this.accountEmail) {
      this.sessionRegistry.markUsed({ accountKey: this.accountKey, email: this.accountEmail });
    }

    logStep('open-tool', 'Opening CapCut AI captions tool...');
    await this.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 120000 });
    await this.waitForPageReady();

    logStep('upload', 'Uploading video to CapCut...');
    await this._uploadVideo(videoPath);

    logStep('processing', 'Waiting for AI processing...');
    await this._waitForProcessingToFinish(timeoutMs);

    logStep('edit-page', 'Waiting for edit page...');
    await this._waitForEditPage(timeoutMs);
    logStep('preview-ready', 'Waiting for preview to finish loading...');
    await this._waitForPreviewReady(timeoutMs);

    const subtitleState = await this._getSubtitleState();
    if (subtitleState.empty) {
      logStep('subtitle-empty', 'No subtitles detected (audio may be silent). Skipping CapCut styling/export.');
      await this.saveSession({ reason: 'subtitle-empty', videoPath });
      return {
        success: true,
        outputVideoPath: videoPath,
        provider: 'capcut',
        skipped: true,
      };
    }

    if (applyStyle && !subtitleState.empty) {
      logStep('style-tab', 'Opening Style tab...');
      await this._openStyleTab();
      logStep('style-apply', 'Applying caption style...');
      await this._applyCaptionStyle(timeoutMs);
    }

    logStep('export-open', 'Opening export modal...');
    await this._openExportModal();

    logStep('export-settings', `Setting export options: ${resolution}, ${fps}...`);
    await this._configureExportSettings({ resolution, fps });

    logStep('export-start', 'Starting export...');
    const downloadStartedAt = Date.now();
    await this._startExport();

    logStep('export-wait', 'Waiting for export to complete...');
    await this._waitForExportReady(timeoutMs);

    logStep('download', 'Waiting for auto download...');
    let downloadedPath = await this._waitForNewFile(outputDirVideo, downloadStartedAt, timeoutMs, [
      '.mp4',
      '.mov',
      '.m4v',
      '.webm',
      '.mkv',
    ]);
    if (!downloadedPath) {
      logStep('download-fallback', 'Auto download not detected. Clicking Download button...');
      const downloadClicked = await this._clickDownloadExportedVideo();
      if (!downloadClicked) {
        throw new Error('Could not find Download button for exported video.');
      }
      downloadedPath = await this._waitForNewFile(outputDirVideo, Date.now(), timeoutMs, [
        '.mp4',
        '.mov',
        '.m4v',
        '.webm',
        '.mkv',
      ]);
      if (!downloadedPath) {
        throw new Error('Video download timed out.');
      }
    }

    await this.saveSession({ reason: 'captioned-video', videoPath });

    return {
      success: true,
      outputVideoPath: downloadedPath,
      provider: 'capcut',
    };
  }

  _logStep(stage, message) {
    if (typeof this._stepLogger === 'function') {
      this._stepLogger(stage, message);
    }
    if (stage && message) {
      console.log(`[CapCut:${stage}] ${message}`);
    }
  }

  async _setDownloadDirectory(outputDir) {
    const client = await this.page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: outputDir,
    });
  }

  async _uploadVideo(videoPath) {
    console.log(`Uploading video to CapCut: ${videoPath}`);
    this._logStep('upload-input', 'Looking for upload input...');

    await this._selectSpokenLanguage('Auto detect', ['Auto Detect', 'Auto']);

    const inputHandle = await this._findFileInput();
    if (inputHandle) {
      await inputHandle.uploadFile(videoPath);
      console.log('File input upload triggered.');
      this._logStep('upload-input', 'Uploaded via file input.');
      return;
    }

    this._logStep('upload-click', 'Falling back to upload button click...');
    const uploadClicked = await this._clickBySelectorOrText(
      ['.upload-area-wrapper-DpF4j3', '.dropdown-button-huh7s_', 'button'],
      ['Upload', 'Upload video', 'Select video', 'Import', 'Add video', 'Choose file']
    );

    if (!uploadClicked) {
      throw new Error('Could not locate upload control for CapCut. Expected selectors: .upload-area-wrapper-DpF4j3, .dropdown-button-huh7s_, input.upload-input-nIqsAj');
    }

    const chooser = await this.page.waitForFileChooser({ timeout: 20000 });
    await chooser.accept([videoPath]);
    this._logStep('upload-click', 'Upload file chooser accepted.');
  }

  async _findFileInput() {
    const preferred = await this.page.$('input.upload-input-nIqsAj');
    if (preferred) return preferred;

    const handles = await this.page.$$('input[type="file"]');
    if (!handles.length) return null;

    for (const handle of handles) {
      try {
        const accept = await this.page.evaluate((el) => el.getAttribute('accept') || '', handle);
        if (!accept || accept.toLowerCase().includes('video')) {
          return handle;
        }
      } catch {
        // ignore
      }
    }

    return handles[0] || null;
  }

  async _waitForProcessingToFinish(timeoutMs) {
    console.log('Waiting for CapCut to load uploaded video...');
    this._logStep('processing-modal', 'Waiting for processing modal to finish...');
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      // 💫 Check if browser page was closed by user
      if (this.page.isClosed?.()) {
        throw new Error('CapCut browser window closed by user - upload cancelled');
      }

      const ready = await this.page.evaluate(() => {
        const text = document.body?.innerText || '';
        const errorModal = document.querySelector('.ai-task-modal-hJtn9D, [class*="ai-task-modal"]');
        const errorText = errorModal?.textContent || '';
        const hasTimeline = document.querySelector('[class*="timeline"], [data-testid*="timeline"]');
        const hasProgress = document.querySelector('.ai-task-modal-generating-j13Asw, .ai-task-modal-hJtn9D, [class*="ai-task-modal"]');
        const hasUploadArea = document.querySelector('.upload-area-wrapper-DpF4j3');
        const hasEditUrl = location.pathname.includes('/magic-tools/ai-captions/edit/');
        const hasTranscribing = /transcrib|caption|subtitle|processing/i.test(text);
        const hasRateLimit = /captions couldn['’]t be generated|try again|rate limit|limit/i.test(errorText);
        return {
          hasTimeline: !!hasTimeline,
          hasProgress: !!hasProgress,
          hasUploadArea: !!hasUploadArea,
          hasEditUrl,
          hasTranscribing,
          hasRateLimit,
          errorText,
        };
      });

      if (ready.hasRateLimit) {
        const message = ready.errorText || 'CapCut rate limit detected';
        if (this.accountEmail) {
          this.sessionRegistry.markRateLimited(this.accountEmail, message);
        }
        throw new Error(`CAPCUT_RATE_LIMIT:${message}`);
      }

      if (ready.hasEditUrl || (ready.hasTimeline && !ready.hasProgress)) {
        console.log('Processing done, edit page ready.');
        return true;
      }

      if (!ready.hasUploadArea && !ready.hasProgress && ready.hasTranscribing) {
        return true;
      }

      await this.page.waitForTimeout(2000);
    }

    const snapshot = await this.page.evaluate(() => ({
      url: location.href,
      hasTimeline: !!document.querySelector('[class*="timeline"], [data-testid*="timeline"]'),
      hasProgress: !!document.querySelector('.ai-task-modal-generating-j13Asw, .ai-task-modal-hJtn9D, [class*="ai-task-modal"]'),
      hasUploadArea: !!document.querySelector('.upload-area-wrapper-DpF4j3'),
      hasEditUrl: location.pathname.includes('/magic-tools/ai-captions/edit/'),
      bodySample: (document.body?.innerText || '').slice(0, 300),
    }));
    this._logStep('processing-timeout', `Processing timeout. url=${snapshot.url}`);
    console.warn('[CapCut] Processing timeout snapshot:', snapshot);
    throw new Error('Upload processing timed out.');
  }

  async _detectAccountEmail() {
    try {
      const email = await this.page.evaluate(() => {
        const text = document.body?.innerText || '';
        const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        return match ? match[0] : '';
      });
      return String(email || '').trim();
    } catch {
      return '';
    }
  }

  async _triggerAutoCaptions(language = 'auto') {
    console.log('Triggering auto captions...');

    const clicked = await this._clickByText([
      'Auto captions',
      'AI captions',
      'Generate captions',
      'Generate subtitles',
      'Create captions',
      'Caption',
    ]);

    if (!clicked) {
      console.log('Auto captions trigger not found. Continuing (may auto-run).');
    }

    if (language && language !== 'auto') {
      await this._selectLanguage(language);
    }
  }

  async _waitForEditPage(timeoutMs) {
    this._logStep('edit-detect', 'Checking edit page URL and Subtitles panel...');
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const isEdit = await this.page.evaluate(() => {
        const urlOk = location.pathname.includes('/magic-tools/ai-captions/edit/');
        const subtitleTab = Array.from(document.querySelectorAll('.lv-tabs-header-title-text'))
          .some((el) => (el.textContent || '').trim().toLowerCase() === 'subtitles');
        const subtitlePanel = document.querySelector('.subtitlesPanel-PRxhhb, [class*="subtitlesPanel"]');
        return urlOk && (subtitleTab || subtitlePanel);
      });
      if (isEdit) return true;
      await this.page.waitForTimeout(1000);
    }
    const snapshot = await this.page.evaluate(() => ({
      url: location.href,
      urlOk: location.pathname.includes('/magic-tools/ai-captions/edit/'),
      hasSubtitleTab: Array.from(document.querySelectorAll('.lv-tabs-header-title-text'))
        .some((el) => (el.textContent || '').trim().toLowerCase() === 'subtitles'),
      hasSubtitlePanel: !!document.querySelector('.subtitlesPanel-PRxhhb, [class*="subtitlesPanel"]'),
      bodySample: (document.body?.innerText || '').slice(0, 300),
    }));
    this._logStep('edit-timeout', `Edit page not detected. url=${snapshot.url}`);
    console.warn('[CapCut] Edit detect timeout snapshot:', snapshot);
    throw new Error('Edit page not detected.');
  }

  async _waitForPreviewReady(timeoutMs) {
    this._logStep('preview-detect', 'Checking preview controls and duration...');
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ready = await this.page.evaluate(() => {
        const preview = document.querySelector('.previewWrapper-UBq_tm, [class*="previewWrapper"]');
        const playButton = document.querySelector('.playerButton-o8RC3o, [class*="playerButton"]');
        const totalTime = document.querySelector('.player-total-time-qH39jA, [class*="player-total-time"]');
        const totalText = (totalTime?.textContent || '').replace(/\s+/g, '');
        const currentTime = document.querySelector('.player-current-time-LYBjmc, [class*="player-current-time"]');
        const currentText = (currentTime?.textContent || '').replace(/\s+/g, '');
        const isZeroTime = (value) => !value || /^\/?0{1,2}:0{2}(:0{2})?$/.test(value);
        const hasDuration = !isZeroTime(totalText);
        const hasCurrent = !isZeroTime(currentText);
        const hasTimeUi = hasDuration || hasCurrent || !!totalTime || !!currentTime;
        const canvas = document.querySelector('#video-editor-canvas');
        return {
          hasPreview: !!preview,
          hasPlay: !!playButton,
          hasTimeUi,
          hasCanvas: !!canvas,
        };
      });

      if (ready.hasPreview && ready.hasPlay && (ready.hasTimeUi || ready.hasCanvas)) {
        return true;
      }

      await this.page.waitForTimeout(1000);
    }
    const snapshot = await this.page.evaluate(() => {
      const totalTime = document.querySelector('.player-total-time-qH39jA, [class*="player-total-time"]');
      const currentTime = document.querySelector('.player-current-time-LYBjmc, [class*="player-current-time"]');
      return {
        url: location.href,
        hasPreview: !!document.querySelector('.previewWrapper-UBq_tm, [class*="previewWrapper"]'),
        hasPlay: !!document.querySelector('.playerButton-o8RC3o, [class*="playerButton"]'),
        totalText: (totalTime?.textContent || '').replace(/\s+/g, ''),
        currentText: (currentTime?.textContent || '').replace(/\s+/g, ''),
        hasCanvas: !!document.querySelector('#video-editor-canvas'),
        bodySample: (document.body?.innerText || '').slice(0, 300),
      };
    });
    this._logStep('preview-timeout', `Preview did not finish loading. url=${snapshot.url}`);
    console.warn('[CapCut] Preview timeout snapshot:', snapshot);
    throw new Error('Preview did not finish loading in time.');
  }

  async _getSubtitleState() {
    const state = await this.page.evaluate(() => {
      const items = document.querySelectorAll('.subtitleItem-tCwBoi');
      const addButton = document.querySelector('.subtitleAddButton-WeDROt');
      return {
        count: items.length,
        hasAdd: !!addButton,
      };
    });
    return {
      count: state.count || 0,
      empty: (state.count || 0) === 0 && state.hasAdd,
    };
  }

  async _openStyleTab() {
    this._logStep('style-tab', 'Clicking Style tab...');
    const clicked = await this.page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"], .lv-tabs-header-title'));
      const target = tabs.find((el) => /style/i.test(el.textContent || ''));
      if (target) {
        target.scrollIntoView({ block: 'center', inline: 'center' });
        (target instanceof HTMLElement ? target : target?.closest('button'))?.click();
        return true;
      }
      return false;
    });
    if (!clicked) {
      throw new Error('Style tab not found. Expected tab text "Style".');
    }
    await this.page.waitForTimeout(1000);
  }

  async _applyCaptionStyle(timeoutMs) {
    this._logStep('style-try', 'Clicking Try it button...');
    const clicked = await this.page.evaluate(() => {
      const normalize = (value) =>
        (value || '').toString().trim().toLowerCase();
      const panels = Array.from(document.querySelectorAll('[role="tabpanel"], .stylePanel-JnekWw'));
      const activePanel = panels.find((el) => el.getAttribute('aria-hidden') !== 'true') || document;
      const buttons = Array.from(activePanel.querySelectorAll('button'));
      const target = buttons.find((btn) => normalize(btn.textContent) === 'try it');
      if (target) {
        target.scrollIntoView({ block: 'center', inline: 'center' });
        target.click();
        return true;
      }
      return false;
    });
    if (!clicked) {
      throw new Error('Try it button not found. Expected text "Try it".');
    }
    this._logStep('style-wait', 'Waiting for style processing modal to close...');
    await this._waitForModalToDisappear('.ai-task-modal-generating-j13Asw, .ai-task-modal-hJtn9D', timeoutMs);
  }

  async _openExportModal() {
    this._logStep('export-button', 'Clicking Export button...');
    const clicked = await this._clickBySelectorOrText([
      '.captions-quick-edit-page-export-btn',
      '[class*="export-btn"]',
      'button',
    ], ['Export']);
    if (!clicked) {
      throw new Error('Export button not found. Expected selector .captions-quick-edit-page-export-btn.');
    }
    await this._waitForSelectorVisible('.captions-quick-edit-page-export', 30000);
    this._logStep('export-modal', 'Export modal detected.');
    this._logStep('export-download', 'Selecting Download in export menu...');
    const downloadClicked = await this._clickBySelectorOrText(
      ['.download-more-video-dsnuYX button', '.button-qchiac', '.lv_share-choosePage-download-btn-iWRAuU button', 'button'],
      ['Download']
    );
    if (!downloadClicked) {
      throw new Error('Download option not found in export menu.');
    }
    await this._waitForSelectorVisible('.material-export-modal-content-HnAboT, .material-export-modal-container-vB7uXU', 30000);
    this._logStep('export-settings-modal', 'Export settings modal detected.');
  }

  async _configureExportSettings({ resolution = '1080p', fps = '60fps' }) {
    // 💫 Wait for form container to ensure Download button already triggered the form render
    // Settings modal might still be animating, so wait for actual form elements
    this._logStep('export-form-wait', 'Waiting for export form elements to fully render...');
    await this.page.waitForSelector('.material-export-modal-form-ggCsVg', { timeout: 10000 }).catch(() => null);
    await this.page.waitForTimeout(2000); // Wait for React form state to settle
    
    // Verify form controls exist before interacting
    const hasFormDefinition = await this.page.$('#form-definition');
    if (!hasFormDefinition) {
      throw new Error('Export form resolution control not found after waiting');
    }
    
    this._logStep('export-resolution', `Selecting resolution ${resolution}...`);
    await this._selectComboboxOption('#form-definition', resolution);
    this._logStep('export-fps', `Selecting frame rate ${fps}...`);
    await this._selectComboboxOption('#form-fps', fps);
  }

  async _startExport() {
    this._logStep('export-confirm', 'Confirming export...');
    const primary = await this.page.$('#export-confirm-button');
    if (primary) {
      await this.page.evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'center' });
      }, primary);
      const enabled = await this.page.evaluate((el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true', primary);
      if (enabled) {
        await this.page.evaluate((el) => {
          el.click();
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, primary);
        return;
      }
    }

    const clicked = await this._clickBySelectorOrText(
      ['.material-export-modal-footer-fG_c5x button', '.material-export-modal-content-HnAboT button', 'button'],
      ['Export']
    );
    if (!clicked) {
      throw new Error('Export confirm button not found. Expected selector #export-confirm-button or text "Export".');
    }
  }

  async _waitForExportReady(timeoutMs) {
    this._logStep('export-progress', 'Waiting for export progress or download ready...');
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ready = await this.page.evaluate(() => {
        const downloadBtn = document.querySelector('.downloadBtn-duTN5c, .downloadButton, .downloadContainer button');
        const progress = document.querySelector('.lv_exportProcess-container-processNumber-statistic');
        return { hasDownload: !!downloadBtn, hasProgress: !!progress };
      });
      if (ready.hasDownload) {
        return true;
      }
      await this.page.waitForTimeout(2000);
    }
    throw new Error('Export did not finish in time.');
  }

  async _clickDownloadExportedVideo() {
    const clicked = await this._clickBySelectorOrText(
      ['.downloadBtn-duTN5c', '.downloadButton', '.downloadContainer button'],
      ['Download']
    );
    if (clicked) return true;

    const anchorClicked = await this.page.evaluate(() => {
      const anchor = document.querySelector('.shadowAnchor-H_6edX, .downloadContainer a[download]');
      if (anchor) {
        anchor.click();
        return true;
      }
      return false;
    });
    return Boolean(anchorClicked);
  }

  async _selectLanguage(language) {
    await this._clickByText(['Language', 'Subtitle language', 'Caption language']);
    await this.page.waitForTimeout(1000);
    await this._clickByText([language]);
  }

  async _selectSpokenLanguage(label = 'Auto detect', synonyms = []) {
    const displayTargets = ['Select spoken language', 'Spoken language', 'Language'];
    const clicked = await this._clickBySelectorOrText(
      ['.language-select-value-LvPghv', '.language-select', '.language-select-tip-sz0dhD'],
      displayTargets
    );
    if (!clicked) {
      return false;
    }

    await this._waitForSelectorVisible('.language-select-popup, .lv-select-popup', 8000);
    const options = [label, ...synonyms, 'Auto detect', 'Auto Detect', 'AT'];
    const picked = await this._clickByText(options);
    if (!picked) {
      this._logStep('language-select', `Could not find "${label}" option in language list.`);
      return false;
    }

    this._logStep('language-select', `Selected spoken language: ${label}`);
    await this.page.waitForTimeout(500);
    return true;
  }


  async _clickByText(labels = []) {
    if (!labels.length) return false;

    return this.page.evaluate((targets) => {
      const normalize = (value) =>
        (value || '')
          .toString()
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

      const candidates = Array.from(
        document.querySelectorAll('button, [role="button"], a, span, div')
      ).filter((el) => el && el.offsetParent !== null);

      for (const target of targets) {
        const normalizedTarget = normalize(target);
        const match = candidates.find((el) => normalize(el.textContent) === normalizedTarget);
        if (match) {
          const clickable = match.closest('button,[role="button"],a') || match;
          clickable.click();
          return true;
        }
      }

      for (const target of targets) {
        const normalizedTarget = normalize(target);
        const match = candidates.find((el) => normalize(el.textContent).includes(normalizedTarget));
        if (match) {
          const clickable = match.closest('button,[role="button"],a') || match;
          clickable.click();
          return true;
        }
      }

      return false;
    }, labels);
  }

  async _waitForNewFile(outputDir, startTime, timeoutMs, extensions = []) {
    const start = Date.now();
    const known = new Set(fs.readdirSync(outputDir));

    while (Date.now() - start < timeoutMs) {
      const files = fs.readdirSync(outputDir);
      const candidates = files.filter((file) => !known.has(file));

      const match = candidates.find((file) => {
        const lower = file.toLowerCase();
        return extensions.length ? extensions.some((ext) => lower.endsWith(ext)) : true;
      });

      if (match) {
        const fullPath = path.join(outputDir, match);
        const stats = fs.statSync(fullPath);
        if (stats.mtimeMs >= startTime) {
          return fullPath;
        }
      }

      await this.page.waitForTimeout(1000);
    }

    return null;
  }

  async _waitForSelectorVisible(selector, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await this.page.$(selector);
      if (found) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  async _waitForModalToDisappear(selector, timeoutMs = 120000) {
    const start = Date.now();
    // Wait for modal to appear (best effort)
    await this._waitForSelectorVisible(selector, 15000);
    while (Date.now() - start < timeoutMs) {
      const found = await this.page.$(selector);
      if (!found) return true;
      await this.page.waitForTimeout(1000);
    }
    throw new Error('Processing modal did not close.');
  }

  async _selectComboboxOption(containerSelector, optionText) {
    const container = await this.page.$(containerSelector);
    if (!container) {
      throw new Error(`Combobox not found: ${containerSelector}`);
    }
    await this.page.evaluate((selector) => {
      const root = document.querySelector(selector);
      const target = root?.querySelector('.lv-select') || root;
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, containerSelector);
    await this.page.waitForTimeout(500);
    const clicked = await this._clickByText([optionText]);
    if (!clicked) {
      throw new Error(`Option not found: ${optionText} (combobox: ${containerSelector})`);
    }
  }

  async _clickBySelectorOrText(selectors = [], texts = []) {
    for (const selector of selectors) {
      try {
        const handle = await this.page.$(selector);
        if (handle) {
          try {
            await this.page.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }), handle);
          } catch {
            // ignore
          }
          await handle.click({ delay: 50 });
          return true;
        }
      } catch {
        // ignore
      }
    }
    if (texts.length) {
      return this._clickByText(texts);
    }
    return false;
  }

  async _tryOpenAvatarMenu() {
    try {
      const avatar = await this.page.$('.avatar-wrap-S4SJvJ, img.avatar-MPgomX, [class*="avatar-wrap"] img[alt="avatar"]');
      if (!avatar) return false;
      await avatar.click();
      await this.page.waitForTimeout(800);
      const menu = await this.page.$('.user-info-menu-lB5oQH, [class*="user-info-menu"]');
      if (menu) {
        this._logStep('auth-avatar', 'Avatar menu detected (login confirmed).');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

}

export default CapCutAICaptionService;
