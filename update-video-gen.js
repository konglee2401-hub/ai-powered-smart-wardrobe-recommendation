const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend/services/videoGenerationServiceV2.js');
let content = fs.readFileSync(filePath, 'utf-8');

// STEP 1: Add error detection to the return statement in monitorGeneration
console.log('Step 1: Adding error detection...');
content = content.replace(
  `        // Check if image/video is loaded in the item
        const mediaElement = indexOneItem ? indexOneItem.querySelector('img, video, [role="img"]') : null;
        const mediaLoaded = mediaElement ? mediaElement.complete || mediaElement.readyState >= 2 : false;

        return {
          method: 'virtuoso-itemlist',
          itemCount: items.length,
          hasContentAtIndex1,
          isLoading,
          mediaLoaded,
          isRendered: hasContentAtIndex1 && !isLoading && mediaLoaded,
          itemContainerHTML: indexOneItem ? indexOneItem.className : 'no-item'
        };`,
  `        // Check if image/video is loaded in the item
        const mediaElement = indexOneItem ? indexOneItem.querySelector('img, video, [role="img"]') : null;
        const mediaLoaded = mediaElement ? mediaElement.complete || mediaElement.readyState >= 2 : false;

        // 🆕 Check for error message "Không tạo được"
        const errorText = indexOneItem ? indexOneItem.innerText : '';
        const hasError = errorText.includes('Không tạo được') || 
                        errorText.includes('không được') ||
                        errorText.includes('lỗi') ||
                        (indexOneItem && indexOneItem.classList.toString().includes('error'));
        const errorMessage = hasError ? errorText.substring(0, 100) : null;

        return {
          method: 'virtuoso-itemlist',
          itemCount: items.length,
          hasContentAtIndex1,
          isLoading,
          mediaLoaded,
          isRendered: hasContentAtIndex1 && !isLoading && mediaLoaded,
          itemContainerHTML: indexOneItem ? indexOneItem.className : 'no-item',
          hasError,
          errorMessage
        };`
);

// STEP 2: Add error handling logic BEFORE the Log progress check
console.log('Step 2: Adding error handling and regenerate trigger...');
content = content.replace(
  `      // Log progress if changed
      if (renderState.itemCount !== previousItemCount) {
        console.log(\`  📦 Items rendered: \${renderState.itemCount} (method: \${renderState.method})\`);
        previousItemCount = renderState.itemCount;
      }`,
  `      // 🆕 Check for render failure and trigger regenerate
      if (renderState.hasError && renderState.errorMessage) {
        console.log(\`⚠️ Render failed: "\${renderState.errorMessage}"\`);
        console.log('  └─ Triggering regenerate...');
        const regenerated = await this.regenerateVideoSegment();
        if (regenerated) {
          console.log('✓ Regenerate submitted, monitoring again...\\n');
          lastLog = Date.now();
          continue;
        } else {
          console.log('⚠️ Regenerate failed');
          return false;
        }
      }

      // Log progress if changed
      if (renderState.itemCount !== previousItemCount) {
        console.log(\`  📦 Items rendered: \${renderState.itemCount} (method: \${renderState.method})\`);
        previousItemCount = renderState.itemCount;
      }`
);

// STEP 3: Add the new regenerateVideoSegment function after monitorGeneration
console.log('Step 3: Adding regenerateVideoSegment function...');
const regenerateFunc = `
  async regenerateVideoSegment() {
    console.log('  📍 Regenerating video segment...');
    console.log('    └─ Finding "Sử dụng lại câu lệnh" button...');

    try {
      // Find the regenerate button in the failed item
      const regenerateClicked = await this.page.evaluate(() => {
        // Find virtuoso container and item at index 1
        const container = document.querySelector('[data-testid*="virtuoso"], [class*="virtuoso"]');
        if (!container) return false;

        const item1 = container.querySelector('[data-index="1"]');
        if (!item1) return false;

        // Look for "Sử dụng lại câu lệnh" button (wrap_text icon)
        const buttons = Array.from(item1.querySelectorAll('button'));
        for (const btn of buttons) {
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          const buttonText = btn.textContent.toLowerCase();
          const icon = btn.querySelector('i')?.textContent.toLowerCase() || '';

          if ((ariaLabel.includes('sử dụng') && ariaLabel.includes('câu')) ||
              (buttonText.includes('sử dụng') && buttonText.includes('câu')) ||
              icon.includes('wrap_text')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!regenerateClicked) {
        console.log('    ⚠️ Could not find regenerate button');
        return false;
      }

      console.log('    ✓ Regenerate button clicked');
      await this.page.waitForTimeout(2000);

      // Since image is already selected, just find and click the send button
      console.log('    └─ Sending regenerate request (image already selected)...');
      const sent = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const icon = btn.querySelector('i')?.textContent.trim().toLowerCase() || '';
          if ((icon.includes('arrow_forward') || icon.includes('send')) && !btn.disabled) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!sent) {
        console.log('    ⚠️ Could not find send button');
        return false;
      }

      console.log('    ✓ Regenerate request sent (no image re-upload needed)');
      return true;

    } catch (error) {
      console.warn(\`    ⚠️ Error during regenerate: \${error.message}\`);
      return false;
    }
  }`;

// Find where to insert regenerateVideoSegment - right after closing brace of monitorGeneration
const monitorGenerationEnd = content.lastIndexOf('console.warn(\`⚠️ Generation timeout after');
const closingBrace = content.indexOf('\n  }', monitorGenerationEnd);
content = content.slice(0, closingBrace + 5) + regenerateFunc + content.slice(closingBrace + 5);

// STEP 4: Add the new waitForDownloadModalAndSelectQuality function before downloadVideo
console.log('Step 4: Adding waitForDownloadModalAndSelectQuality function...');
const modalFunc = `
  async waitForDownloadModalAndSelectQuality() {
    console.log('    └─ Checking for download modal...');

    try {
      // Wait for modal to appear (up to 10 seconds)
      let modalFound = false;
      let attempts = 0;
      const maxAttempts = 20;  // 20 * 500ms = 10 seconds

      while (!modalFound && attempts < maxAttempts) {
        const hasModal = await this.page.evaluate(() => {
          // Modal typically appears at the bottom of the page in a new div
          const modals = document.querySelectorAll('[role="dialog"], [role="menu"], [data-radix-popover-content], [data-popover]');
          for (const modal of modals) {
            const text = modal.innerText.toLowerCase();
            if (text.includes('1080') || text.includes('720') || text.includes('phân giải') || text.includes('độ phân giải')) {
              return true;
            }
          }
          return false;
        });

        if (hasModal) {
          modalFound = true;
          console.log('    ✓ Download modal appeared');
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            await this.page.waitForTimeout(500);
          }
        }
      }

      if (!modalFound) {
        console.log('    ℹ️ No download modal detected (may not be available)');
        return false;
      }

      // Select quality: Prefer 1080p, fallback to 720p
      console.log('    └─ Selecting video quality (1080p preferred)...');
      const qualitySelected = await this.page.evaluate(() => {
        const modals = document.querySelectorAll('[role="dialog"], [role="menu"], [data-radix-popover-content], [data-popover]');
        
        for (const modal of modals) {
          const options = Array.from(modal.querySelectorAll('button, a, [role="option"], [role="menuitem"], div[role="button"]'));
          
          // First pass: Look for 1080p option
          for (const option of options) {
            const text = option.textContent.toLowerCase();
            if ((text.includes('1080') || text.includes('tăng độ phân giải')) && !option.disabled) {
              option.click();
              return { selected: true, quality: '1080p' };
            }
          }
          
          // Second pass: Look for 720p fallback
          for (const option of options) {
            const text = option.textContent.toLowerCase();
            if ((text.includes('720') || text.includes('gốc') || text.includes('original')) && !option.disabled) {
              option.click();
              return { selected: true, quality: '720p' };
            }
          }
        }
        
        return { selected: false, quality: null };
      });

      if (qualitySelected.selected) {
        console.log(\`    ✓ Selected quality: \${qualitySelected.quality}\`);
        await this.page.waitForTimeout(1000);
        return true;
      } else {
        console.log('    ℹ️ Could not find quality options in modal');
        return false;
      }

    } catch (error) {
      console.warn(\`    ⚠️ Error handling download modal: \${error.message}\`);
      return false;
    }
  }`;

const downloadVideoStart = content.indexOf('async downloadVideo()');
const downloadVideoFunc = content.indexOf('console.log(\'📍 Downloading video...\');', downloadVideoStart);
const insertPoint = content.lastIndexOf('async downloadVideo()', downloadVideoStart - 100);
content = content.slice(0, insertPoint) + modalFunc + '\n\n  ' + content.slice(insertPoint);

// STEP 5: Update downloadVideo to call modal handler
console.log('Step 5: Updating downloadVideo to handle modal...');
content = content.replace(
  `      if (downloadClicked) {
        // 💫 Wait for download to complete and find new file
        console.log('  ✓ Download initiated, waiting for file...');`,
  `      if (downloadClicked) {
        // 🆕 NEW: Wait for download modal to appear
        console.log('  ✓ Download clicked, waiting for modal...');
        await this.page.waitForTimeout(1500);

        // 🆕 NEW: Wait for modal to appear and select quality
        const qualitySelected = await this.waitForDownloadModalAndSelectQuality();
        if (!qualitySelected) {
          console.log('  ⚠️ Could not handle download modal');
        }

        // 🆕 Wait for download to complete and find new file
        console.log('  ✓ Download initiated, waiting for file...')`
);

// Write the updated content back
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ All updates completed successfully!');
console.log(`📝 File updated: ${filePath}`);

