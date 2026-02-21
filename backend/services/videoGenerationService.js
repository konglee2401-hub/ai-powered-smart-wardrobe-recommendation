// Video Generation Service - integrates with Google Labs Flow
// Creates videos from components: upload image -> select video mode -> configure settings -> enter prompt -> generate
// Workflow: Upload image -> Select "Tạo video từ các thành phần" -> Verify Veo -> Configure -> Enter prompt -> Check Send button -> Submit

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class VideoGenerationAutomation {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.parentContainerId = null;  // Store for image upload process
    this.options = {
      headless: false,
      sessionFilePath: path.join(__dirname, '../.sessions/google-flow-session.json'),
      projectUrl: 'https://labs.google/fx/vi/tools/flow/project/3ba9e02e-0a33-4cf2-9d55-4c396941d7b7',
      imagePath: options.imagePath || null,  // Path to image file to upload
      duration: options.duration || 5,
      aspectRatio: options.aspectRatio || '16:9',
      quality: options.quality || 'high',
      timeouts: {
        action: 2000,           // 2 seconds after each action
        menuClick: 2000,        // 2 seconds after clicking menu
        settingConfig: 2000,    // 2 seconds after configuring settings
        imageUpload: 3000,      // 3 seconds after uploading image
        promptType: 2000,       // 2 seconds after typing prompt
        submitWait: 2000,       // 2 seconds after submitting
        generation: 300000,     // 5 minutes for video generation
      },
      ...options
    };
  }

  async init() {
    console.log('🚀 Initializing Video Generation...');
    
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ['--no-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });

    // Load session cookies
    try {
      const sessionData = JSON.parse(fs.readFileSync(this.options.sessionFilePath, 'utf8'));
      for (const cookie of sessionData.cookies) {
        try { await this.page.setCookie(cookie); } catch (e) {}
      }
      console.log('✅ Session restored');
    } catch (error) {
      console.warn('⚠️ No session found');
    }
  }

  async navigateToProject() {
    console.log('📍 Navigating to video generation project...');
    await this.page.goto(this.options.projectUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.page.waitForTimeout(this.options.timeouts.action);
    console.log('✓ Project loaded');

    // We start on image tab by default, so no need to switch tab initially
  }

  async switchToImageTab() {
    console.log('📍 Switching to image tab...');
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('image');
      })?.click();
    });
    await this.page.waitForTimeout(this.options.timeouts.action);
    console.log('✓ Image tab active');
  }

  async switchToVideoTab() {
    console.log('📍 Switching to video tab...');
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('videocam');
      })?.click();
    });
    await this.page.waitForTimeout(this.options.timeouts.action);
    console.log('✓ Video tab active');
  }

  async reinitializeComponent() {
    // Switch to image tab
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('image');
      })?.click();
    });
    await this.page.waitForTimeout(1000);

    // Switch back to video tab
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('videocam');
      })?.click();
    });
    await this.page.waitForTimeout(1500);
  }

  async uploadImage(imagePath) {
    console.log('📍 Uploading image for video generation...');

    try {
      // Reinitialize component first (switch tab trick)
      console.log('  └─ Reinitializing component...');
      await this.reinitializeComponent();

      // Step 1: Detect textarea parent and save container ID
      console.log('  └─ Detecting textarea parent...');
      this.parentContainerId = await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return null;

        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) {
          container = textarea.parentElement;
        }

        if (!container.id) {
          container.id = `button-container-${Date.now()}`;
        }

        return container.id;
      });

      if (!this.parentContainerId) {
        throw new Error('Could not identify parent container');
      }

      // Step 2: Click add button
      console.log('  └─ Clicking add button...');
      const addBtnClicked = await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return false;

        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) return false;

        const children = container.children;
        if (children.length < 3) return false;

        const buttonContainer = children[2];
        const buttons = Array.from(buttonContainer.querySelectorAll('button'));
        const addBtn = buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.trim() === 'add' && !btn.disabled;
        });

        if (addBtn) {
          addBtn.click();
          return true;
        }
        return false;
      });

      if (!addBtnClicked) {
        throw new Error('Could not click add button');
      }

      await this.page.waitForTimeout(2000);
      console.log('  ✓ Add button clicked, popup opened');

      // Step 3: Upload file through file input
      console.log('  └─ Uploading file...');
      const fileChooserPromise = this.page.waitForFileChooser({ timeout: 8000 });

      const fileinputClicked = await this.page.evaluate(() => {
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        for (const input of fileInputs) {
          const accept = (input.accept || '').toLowerCase();
          if (accept.includes('jpg') || accept.includes('png') || accept.includes('image')) {
            input.click();
            return true;
          }
        }
        return false;
      });

      if (!fileinputClicked) {
        throw new Error('Could not click file input');
      }

      const fileChooser = await fileChooserPromise;
      await fileChooser.accept([imagePath]);
      await this.page.waitForTimeout(3000);
      console.log('  ✓ File uploaded');

      // Step 4: Find crop dialog and click "Cắt và lưu"
      console.log('  └─ Waiting for crop dialog...');
      try {
        await this.page.waitForFunction(
          () => {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return dialogs.some(dialog => {
              const title = dialog.querySelector('h2');
              return title && title.textContent.includes('Cắt');
            });
          },
          { timeout: 15000 }
        );
        console.log('  ✓ Crop dialog appeared');
      } catch (e) {
        throw new Error(`Crop dialog timeout: ${e.message}`);
      }

      await this.page.waitForTimeout(500);

      const cutClicked = await this.page.evaluate(() => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
        const cropDialog = dialogs.find(dialog => {
          const title = dialog.querySelector('h2');
          return title && title.textContent.includes('Cắt');
        });

        if (!cropDialog) return false;

        const buttons = Array.from(cropDialog.querySelectorAll('button'));
        const cutBtn = buttons.find(btn => {
          const text = btn.textContent.toLowerCase().trim();
          return text.includes('cắt') && text.includes('lưu');
        });

        if (cutBtn && !cutBtn.disabled) {
          cutBtn.click();
          return true;
        }
        return false;
      });

      if (!cutClicked) {
        throw new Error('"Cắt và lưu" button not found');
      }

      console.log('  ✓ "Cắt và lưu" clicked');

      // Step 5: Wait for dialog to close
      console.log('  └─ Waiting for dialog close...');
      try {
        await this.page.waitForFunction(
          () => {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return !dialogs.some(dialog => {
              const title = dialog.querySelector('h2');
              return title && title.textContent.includes('Cắt');
            });
          },
          { timeout: 10000 }
        );
        console.log('  ✓ Dialog closed');
      } catch (e) {
        throw new Error(`Dialog close timeout: ${e.message}`);
      }

      // Step 6: Poll for button count ready
      console.log('  └─ Waiting for preview ready...');
      const expectedButtonCount = 3; // add button should be present
      let buttonCountReady = false;
      let pollAttempts = 0;
      const maxPolls = 60;

      while (!buttonCountReady && pollAttempts < maxPolls) {
        await this.page.waitForTimeout(500);
        pollAttempts++;

        const buttonInfo = await this.page.evaluate((containerId) => {
          const container = document.getElementById(containerId);
          if (!container) return { error: 'container not found', buttons: 0 };

          const buttons = Array.from(container.querySelectorAll('button'));
          return {
            totalButtons: buttons.length,
            buttons: buttons.map(b => ({
              icon: b.querySelector('i')?.textContent.trim() || 'NO_ICON',
              disabled: b.disabled
            }))
          };
        }, this.parentContainerId);

        if (buttonInfo.totalButtons >= expectedButtonCount) {
          buttonCountReady = true;
        }
      }

      if (buttonCountReady) {
        console.log('  ✓ Preview ready\n');
      } else {
        console.log('  ⚠️  Timeout waiting for buttons, continuing...\n');
      }

      console.log('✓ Image uploaded successfully');
      return true;

    } catch (error) {
      console.error(`❌ Error uploading image: ${error.message}`);
      throw error;
    }
  }

  async selectVideoFromComponentsOption() {
    console.log('📍 Selecting "Tạo video từ các thành phần" option from dropdown...');
    
    try {
      // Debug: Check what comboboxes exist on the page
      const comboboxInfo = await this.page.evaluate(() => {
        const comboboxes = document.querySelectorAll('[role="combobox"]');
        const buttons = document.querySelectorAll('button');
        const allSpans = document.querySelectorAll('span');
        
        return {
          comboboxCount: comboboxes.length,
          comboboxTexts: Array.from(comboboxes).map(c => c.textContent.trim()),
          pageBodyText: document.body.innerText.split('\n').slice(0, 20).join(' '),
          buttonCount: buttons.length,
          hasVideoText: document.body.innerText.toLowerCase().includes('video'),
          hasVeo: document.body.innerText.toLowerCase().includes('veo')
        };
      });
      
      console.log(`  Debug: Comboboxes: ${comboboxInfo.comboboxCount} found. Texts: [${comboboxInfo.comboboxTexts.join(', ')}]`);
      console.log(`  Debug: Has 'video' text: ${comboboxInfo.hasVideoText}, Has 'veo': ${comboboxInfo.hasVeo}`);

      // If no combobox and page has video/veo text, we might already be in video mode
      if (comboboxInfo.comboboxCount === 0 && (comboboxInfo.hasVideoText || comboboxInfo.hasVeo)) {
        console.log('ℹ️ No combobox found, but video interface detected - already in video mode');
        return;
      }

      // Step 1: Find and click the combobox to open dropdown
      const comboboxClicked = await this.page.evaluate(() => {
        const comboboxes = document.querySelectorAll('[role="combobox"]');
        
        for (const combobox of comboboxes) {
          const text = combobox.textContent.trim().toLowerCase();
          // Find the combobox that shows video/image generation options
          if (text && (text.includes('hình') || text.includes('image') || 
                       text.includes('video') || text.includes('tạo'))) {
            combobox.click();
            return true;
          }
        }
        
        // If no match by text, try clicking first combobox if available
        if (comboboxes.length > 0) {
          comboboxes[0].click();
          return true;
        }
        
        return false;
      });

      if (!comboboxClicked) {
        throw new Error(`Could not click combobox. Found ${comboboxInfo.comboboxCount} comboboxes.`);
      }

      console.log('✓ Dropdown opened');
      await this.page.waitForTimeout(this.options.timeouts.action);

      // Step 2: Find and click "Tạo video từ các thành phần" option
      const optionSelected = await this.page.evaluate(() => {
        const listItems = document.querySelectorAll('[role="option"], [role="menuitem"], button, li, span');
        
        for (const item of listItems) {
          const text = item.textContent.trim();
          
          // Look for video component option
          if (text.includes('Tạo video') && text.includes('thành phần')) {
            item.click();
            return true;
          }
        }
        return false;
      });

      if (!optionSelected) {
        throw new Error('Could not find "Tạo video từ các thành phần" option in dropdown');
      }

      console.log('✓ Selected "Tạo video từ các thành phần"');
      await this.page.waitForTimeout(this.options.timeouts.menuClick);

      // Step 3: Verify selection was successful
      const selectionVerified = await this.page.evaluate(() => {
        const comboboxes = document.querySelectorAll('[role="combobox"]');
        
        for (const combobox of comboboxes) {
          const text = combobox.textContent.toLowerCase();
          if (text.includes('video') && text.includes('thành phần')) {
            return true;
          }
        }
        return false;
      });

      if (!selectionVerified) {
        // Check if we're in a video-ready state anyway
        const isVideoReady = await this.page.evaluate(() => {
          const pageText = document.body.innerText.toLowerCase();
          return pageText.includes('video') && pageText.includes('veo');
        });

        if (!isVideoReady) {
          throw new Error('Failed to verify "Tạo video từ các thành phần" was selected');
        }
      }

      console.log('✓ Verified: Now in video generation mode');
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async verifyVideoInterface() {
    console.log('📍 Verifying video generation interface...');
    
    try {
      // Step 1: Click config button to open settings and verify Veo model
      const configClicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        
        for (const btn of buttons) {
          const icon = btn.querySelector('i');
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          
          // Look for settings/config button with "tune" icon
          if ((icon && icon.textContent.includes('tune')) || ariaLabel.includes('setting')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!configClicked) {
        throw new Error('Could not find config/settings button');
      }

      console.log('  Opened config...');
      await this.page.waitForTimeout(this.options.timeouts.settingConfig);

      // Step 2: Check for Veo model
      const hasVeoModel = await this.page.evaluate(() => {
        const pageText = document.body.innerText.toLowerCase();
        return pageText.includes('veo');
      });

      if (!hasVeoModel) {
        throw new Error('Could not verify Veo video model - wrong interface');
      }

      console.log('  ✓ Confirmed Veo model');
      await this.page.waitForTimeout(500);

      // Step 3: Close config dialog
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(this.options.timeouts.action);

      console.log('✓ Video interface verified (Veo model)');
      return true;

    } catch (error) {
      console.error(`❌ Interface verification failed: ${error.message}`);
      throw error;
    }
  }

  async configureVideoSettings() {
    console.log('📍 Configuring video settings (duration, quality, aspect ratio)...');
    
    try {
      // Configure duration
      const durationConfigured = await this.page.evaluate((duration) => {
        const inputs = document.querySelectorAll('input[type="number"], input[type="range"]');
        
        for (const input of inputs) {
          const label = input.parentElement?.querySelector('label') || 
                       input.previousElementSibling;
          
          if (label && (label.textContent.includes('Duration') || 
                        label.textContent.includes('Thời lượng'))) {
            input.value = duration;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, this.options.duration);

      if (durationConfigured) {
        console.log(`✓ Duration set to ${this.options.duration}s`);
        await this.page.waitForTimeout(this.options.timeouts.settingConfig);
      }

      // Configure quality
      const qualityConfigured = await this.page.evaluate((quality) => {
        const selects = document.querySelectorAll('select, [role="listbox"], button[aria-haspopup="listbox"]');
        
        for (const select of selects) {
          const label = select.parentElement?.querySelector('label') || 
                       select.previousElementSibling;
          
          if (label && (label.textContent.includes('Quality') || 
                        label.textContent.includes('Chất lượng'))) {
            // Click to open dropdown
            if (select.tagName !== 'SELECT') {
              select.click();
            }
            return true;
          }
        }
        return false;
      }, this.options.quality);

      if (qualityConfigured) {
        console.log(`✓ Quality set to ${this.options.quality}`);
        await this.page.waitForTimeout(this.options.timeouts.settingConfig);
      }

      // Configure aspect ratio
      const aspectRatioConfigured = await this.page.evaluate((ratio) => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        
        for (const btn of buttons) {
          const text = btn.textContent;
          if (text.includes(ratio)) {
            btn.click();
            return true;
          }
        }
        return false;
      }, this.options.aspectRatio);

      if (aspectRatioConfigured) {
        console.log(`✓ Aspect ratio set to ${this.options.aspectRatio}`);
        await this.page.waitForTimeout(this.options.timeouts.settingConfig);
      }

      console.log('✓ Video configuration complete');
    } catch (error) {
      console.warn('⚠️ Error configuring settings:', error.message);
    }
  }

  async enterPrompt(prompt) {
    console.log('📍 Entering video prompt...');

    try {
      // Focus on the textarea - MUST use the specific ID
      await this.page.focus('#PINHOLE_TEXT_AREA_ELEMENT_ID');
      await this.page.waitForTimeout(300);
      console.log('  ✓ Textarea focused');

      // Type prompt with delay (few characters first, then rest)
      await this.page.type('#PINHOLE_TEXT_AREA_ELEMENT_ID', prompt, { delay: 10 });
      await this.page.waitForTimeout(this.options.timeouts.promptType);
      console.log('✓ Prompt entered');

    } catch (error) {
      console.error(`❌ Error entering prompt: ${error.message}`);
      throw error;
    }
  }

  async checkSendButtonReady() {
    console.log('📍 Checking Send button status...');

    const sendButtonStatus = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      for (const btn of buttons) {
        const icon = btn.querySelector('i');
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        
        // Look for send/arrow_forward button
        if ((icon && (icon.textContent.includes('arrow_forward') || icon.textContent.includes('send'))) ||
            ariaLabel.includes('send') || ariaLabel.includes('submit')) {
          
          return {
            found: true,
            disabled: btn.disabled,
            text: btn.textContent.trim(),
            iconText: icon ? icon.textContent.trim() : ''
          };
        }
      }
      
      return {
        found: false,
        disabled: true,
        text: '',
        iconText: ''
      };
    });

    if (!sendButtonStatus.found) {
      console.log('⚠️  Send button not found');
      return false;
    }

    if (sendButtonStatus.disabled) {
      console.log('⚠️  Send button is DISABLED - prompt may be incomplete');
      return false;
    }

    console.log('✓ Send button is READY');
    return true;
  }

  async submitAndWaitForGeneration() {
    console.log('📍 Submitting and monitoring video generation...');

    // First check if Send button is ready
    const sendReady = await this.checkSendButtonReady();
    if (!sendReady) {
      console.log('⚠️  Send button not ready - attempting to submit anyway');
    }

    // Click submit/generate button
    const submitted = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      for (const btn of buttons) {
        const icon = btn.querySelector('i');
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        
        if ((icon && (icon.textContent.includes('arrow_forward') || icon.textContent.includes('send'))) ||
            ariaLabel.includes('send') || ariaLabel.includes('submit')) {
          
          if (!btn.disabled && btn.offsetParent !== null) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    });

    if (!submitted) {
      throw new Error('Could not find/click send button');
    }

    console.log('✓ Generation submitted');
    await this.page.waitForTimeout(this.options.timeouts.submitWait);

    // Monitor generation progress
    console.log('📍 Monitoring video generation (max 5 min)...');
    const startTime = Date.now();
    const maxWaitTime = this.options.timeouts.generation;
    let lastProgressLog = startTime;

    while (Date.now() - startTime < maxWaitTime) {
      const state = await this.page.evaluate(() => {
        const progressBars = document.querySelectorAll('[role="progressbar"], .progress');
        const videos = document.querySelectorAll('video');
        const loadingIndicators = document.querySelectorAll('[class*="loading"], [class*="skeleton"], .spinner');
        
        return {
          hasProgress: progressBars.length > 0,
          videoCount: videos.length,
          isLoading: loadingIndicators.length > 0,
          progressPercent: progressBars.length > 0 ? progressBars[0].getAttribute('aria-valuenow') : null
        };
      });

      // Check if completed
      if (state.videoCount > 0 && !state.isLoading) {
        console.log('✓ Generation complete!');
        return true;
      }

      // Log progress every 20 seconds
      const now = Date.now();
      if (now - lastProgressLog > 20000) {
        const elapsed = Math.round((now - startTime) / 1000);
        console.log(`⏳ Still generating... (${elapsed}s ${state.progressPercent ? `- ${state.progressPercent}%` : ''})`);
        lastProgressLog = now;
      }

      await this.page.waitForTimeout(this.options.timeouts.action);
    }

    console.warn('⚠️ Generation timeout - video may still be processing');
    return false;
  }

  async downloadVideo() {
    console.log('📍 Retrieving video URL...');
    
    try {
      const videoUrl = await this.page.evaluate(() => {
        // Look for video element
        const videos = document.querySelectorAll('video');
        
        if (videos.length > 0) {
          const video = videos[0];
          
          // Try to get URL from source tag
          const source = video.querySelector('source');
          if (source) {
            return source.src;
          }
          
          // Try direct src attribute
          if (video.src) {
            return video.src;
          }
        }

        // Look for download buttons/links
        const links = document.querySelectorAll('a[href*="video"], a[download]');
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href && (href.includes('video') || href.includes('mp4'))) {
            return href;
          }
        }

        return null;
      });

      if (videoUrl) {
        console.log('✓ Video URL retrieved');
        return videoUrl;
      } else {
        console.log('⚠️ Could not find video URL');
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Error retrieving video:', error.message);
      return null;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

/**
 * Main video generation function
 * Usage: await runVideoGeneration({
 *   prompt: 'Video description',
 *   imagePath: '/path/to/image.jpg',  // Optional image to upload
 *   duration: 5,
 *   quality: 'high',
 *   aspectRatio: '16:9'
 * })
 */
export async function runVideoGeneration(options = {}) {
  const videoGen = new VideoGenerationAutomation(options);

  try {
    console.log('\n' + '═'.repeat(64));
    console.log('🎬 VIDEO GENERATION - Google Labs Flow');
    console.log('═'.repeat(64));
    console.log(`⏱️  Duration: ${options.duration || 5}s`);
    console.log(`📐 Aspect Ratio: ${options.aspectRatio || '16:9'}`);
    console.log(`✨ Quality: ${options.quality || 'high'}`);
    console.log(`📸 Image: ${options.imagePath ? 'Yes' : 'No'}`);
    console.log(`📝 Prompt: ${(options.prompt || '').substring(0, 50)}...`);
    console.log('═'.repeat(64) + '\n');

    // Initialize and navigate
    await videoGen.init();
    await videoGen.navigateToProject();

    // Upload image if provided
    if (options.imagePath) {
      if (!fs.existsSync(options.imagePath)) {
        throw new Error(`Image file not found: ${options.imagePath}`);
      }
      try {
        await videoGen.uploadImage(options.imagePath);
      } catch (error) {
        await videoGen.close();
        throw new Error(`Image upload failed: ${error.message}`);
      }
    }

    // Select video from components option - THIS MUST SUCCEED
    try {
      await videoGen.selectVideoFromComponentsOption();
    } catch (error) {
      await videoGen.close();
      throw new Error(`Video mode selection failed: ${error.message}`);
    }

    // Verify we're in correct video interface with Veo model - THIS MUST SUCCEED
    try {
      await videoGen.verifyVideoInterface();
    } catch (error) {
      await videoGen.close();
      throw new Error(`Video interface verification failed: ${error.message}`);
    }

    // Configure settings
    await videoGen.configureVideoSettings();

    // Enter prompt
    if (!options.prompt) {
      throw new Error('Prompt is required');
    }
    await videoGen.enterPrompt(options.prompt);

    // Check if send button is ready
    await videoGen.checkSendButtonReady();

    // Submit and wait
    await videoGen.submitAndWaitForGeneration();

    // Get video URL
    const videoUrl = await videoGen.downloadVideo();

    await videoGen.close();

    console.log('\n' + '═'.repeat(64));
    console.log('✅ VIDEO GENERATION COMPLETE');
    console.log('═'.repeat(64) + '\n');

    return {
      success: true,
      videoUrl,
      duration: options.duration,
      quality: options.quality,
      aspectRatio: options.aspectRatio,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await videoGen.close();
    
    return {
      success: false,
      error: error.message,
      duration: options.duration,
      quality: options.quality,
      aspectRatio: options.aspectRatio
    };
  }
}

export { VideoGenerationAutomation };
export default VideoGenerationAutomation;
