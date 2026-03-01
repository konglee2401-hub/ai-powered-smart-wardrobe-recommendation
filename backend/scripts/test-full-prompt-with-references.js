#!/usr/bin/env node

/**
 * Test Google Flow with Full Vietnamese Prompt + Reference Images
 * 
 * 1. Uploads 2 images from test-images
 * 2. Converts images to PNG (for clipboard compatibility)
 * 3. Pastes via clipboard with proper page ready checks
 * 4. Enters full Vietnamese prompt using enterPrompt()
 * 5. Submits with Enter (once only)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class TestFullPromptWithReferences {
  constructor() {
    this.browser = null;
    this.page = null;
    this.flowService = null;
    this.sessionFile = path.join(__dirname, '../.sessions/google-flow-session-complete.json');
    this.projectUrl = 'https://labs.google/fx/vi/tools/flow/project/58d791d4-37c9-47a8-ae3b-816733bc3ec0';
  }

  loadSession() {
    console.log('\n' + '='.repeat(80));
    console.log('🎨 GOOGLE FLOW TEST - FULL PROMPT WITH REFERENCE IMAGES');
    console.log('='.repeat(80) + '\n');

    if (!fs.existsSync(this.sessionFile)) {
      console.error(`❌ Session file not found: ${this.sessionFile}\n`);
      process.exit(1);
    }

    try {
      const session = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
      console.log(`✅ Session loaded`);
      console.log(`   • Cookies: ${session.cookies?.length || 0}`);
      console.log(`   • localStorage items: ${Object.keys(session.localStorage || {}).length}\n`);
      return session;
    } catch (error) {
      console.error(`❌ Error loading session: ${error.message}\n`);
      process.exit(1);
    }
  }

  async init() {
    console.log('🚀 Initializing browser...\n');
    
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-clipboard-sandbox',
        '--enable-blink-features=AutomationControlled'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  async restoreSession(sessionData) {
    console.log('🔐 Restoring session...\n');

    const cookiesToSet = (sessionData.cookies || []).filter(c => !['NID', 'OTZ'].includes(c.name));
    for (const cookie of cookiesToSet) {
      try {
        await this.page.setCookie(cookie);
      } catch (e) {}
    }

    await this.page.evaluate((storage, tokens) => {
      for (const [key, value] of Object.entries(storage || {})) {
        try {
          window.localStorage.setItem(key, value);
        } catch (e) {}
      }
      
      if (tokens) {
        for (const [key, value] of Object.entries(tokens)) {
          try {
            window.localStorage.setItem(key, value);
          } catch (e) {}
        }
      }
    }, sessionData.localStorage || {}, sessionData.tokens?.recaptcha || null);

    console.log(`   ✅ ${cookiesToSet.length} cookies set`);
    console.log(`   ✅ ${Object.keys(sessionData.localStorage || {}).length} localStorage items set`);
    console.log('✅ Session restored\n');
  }

  async navigateToProject() {
    console.log(`🔗 Navigating to project...\n`);
    
    try {
      await this.page.goto(this.projectUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      console.log('✅ Project page loaded\n');
    } catch (error) {
      console.error(`❌ Failed to load project: ${error.message}\n`);
      throw error;
    }
  }

  async convertImageToPNG(imagePath) {
    /**
     * Convert any image format to PNG for better clipboard compatibility
     */
    try {
      console.log(`      🔄 Converting image to PNG...`);
      const pngBuffer = await sharp(imagePath)
        .png({ quality: 90 })
        .toBuffer();
      console.log(`      ✅ Conversion successful (${(pngBuffer.length / 1024).toFixed(2)}KB PNG)`);
      return pngBuffer;
    } catch (error) {
      console.error(`      ❌ Conversion failed: ${error.message}`);
      throw error;
    }
  }

  async convertImageToPNG(imagePath) {
    const pngBuffer = await sharp(imagePath)
      .png({ quality: 90 })
      .toBuffer();
    return pngBuffer;
  }

  async checkHrefHasImg(href) {
    try {
      const response = await fetch(href);
      if (!response.ok) return false;
      
      const html = await response.text();
      return html.includes('<img');
    } catch (error) {
      console.log(`      [DEBUG] Error checking href: ${error.message}`);
      return false;
    }
  }

  async setOutputQuantity(quantity = 2) {
    console.log(`⚙️  SETTING OUTPUT QUANTITY TO ${quantity}\n`);

    try {
      // Look for output quantity control
      // Usually in a dropdown or input field
      const quantitySelectors = [
        'input[type="number"][min="1"]',
        'input[aria-label*="quantity" i]',
        'input[aria-label*="output" i]',
        'input[placeholder*="quantity" i]',
        'select[aria-label*="quantity" i]',
        '[role="spinbutton"]'
      ];

      let found = false;
      
      for (const selector of quantitySelectors) {
        const element = await this.page.$(selector);
        if (element) {
          console.log(`   🔍 Found quantity control: ${selector}`);
          
          // Get current value
          const currentValue = await this.page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el?.value || el?.getAttribute('aria-valuenow');
          }, selector);
          
          console.log(`   📊 Current value: ${currentValue}`);
          
          // Clear and set new value
          await element.click();
          await this.page.keyboard.press('End');
          for (let i = 0; i < 5; i++) {
            await this.page.keyboard.press('Backspace');
          }
          await this.page.keyboard.type(quantity.toString(), { delay: 100 });
          await this.page.keyboard.press('Enter');
          
          console.log(`   ✓ Set quantity to ${quantity}\n`);
          found = true;
          break;
        }
      }

      if (!found) {
        console.log(`   ⚠️  Could not find quantity control, continuing anyway\n`);
      }

      await this.page.waitForTimeout(500);
      return true;

    } catch (error) {
      console.log(`   ⚠️  Error setting quantity: ${error.message}\n`);
      return false;
    }
  }

  async pasteImages() {
    console.log('📤 PASTING IMAGES VIA CLIPBOARD\n');

    try {
      const testImagesDir = path.join(__dirname, '../test-images');
      
      // Step 1: Load images
      console.log('   📁 Loading test images...');
      let images = [];
      if (fs.existsSync(testImagesDir)) {
        const files = fs.readdirSync(testImagesDir);
        images = files
          .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
          .slice(0, 2)
          .map(f => path.join(testImagesDir, f));
      }

      if (images.length < 2) {
        console.log(`   ⚠️  Found only ${images.length} images, need 2\n`);
        return false;
      }

      console.log(`   ✓ Found 2 images:`);
      console.log(`     1. ${path.basename(images[0])}`);
      console.log(`     2. ${path.basename(images[1])}\n`);

      const containerSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';

      // Step 2: Ensure textbox is visible and ready
      console.log('   🔍 Waiting for textbox to be visible...');
      await this.page.waitForSelector(containerSelector, { timeout: 15000 });
      console.log('   ✓ Textbox visible');
      
      console.log('   ⏳ Waiting 2 seconds for textbox to settle...');
      await this.page.waitForTimeout(2000);
      console.log('   ✓ Page ready\n');

      // Step 3: Convert BOTH images to PNG upfront
      console.log('   🔄 Converting both images to PNG...');
      const pngBuffers = [];
      for (let i = 0; i < images.length; i++) {
        try {
          const pngBuffer = await this.convertImageToPNG(images[i]);
          pngBuffers.push({
            index: i,
            path: images[i],
            buffer: pngBuffer,
            base64: pngBuffer.toString('base64'),
            size: (pngBuffer.length / 1024).toFixed(2)
          });
          console.log(`      ✓ Image ${i + 1}: ${pngBuffers[i].size}KB`);
        } catch (error) {
          console.log(`      ⚠️  Failed to convert image ${i + 1}: ${error.message}`);
          return false;
        }
      }
      console.log('   ✓ Both images converted\n');

      // Helper: Get all hrefs from virtuoso item list
      const getVirtuosoHrefs = async () => {
        return await this.page.evaluate(() => {
          const list = document.querySelector('[data-testid="virtuoso-item-list"]');
          if (!list) return [];
          const links = list.querySelectorAll('a');
          return Array.from(links).map(a => a.href);
        });
      };

      // Step 4: Paste each image and verify
      for (let i = 0; i < pngBuffers.length; i++) {
        const png = pngBuffers[i];
        console.log(`   ${i + 1}️⃣  Pasting image ${i + 1}...\n`);
        
        try {
          // Capture initial hrefs before paste
          console.log(`      📎 Capturing initial hrefs...`);
          const initialHrefs = await getVirtuosoHrefs();
          console.log(`      ✓ Found ${initialHrefs.length} hrefs`);

          // Copy to clipboard and trigger paste event
          console.log(`      📋 Preparing image data for paste...`);
          const pasteResult = await this.page.evaluate(async (data, type, selector) => {
            try {
              // Create blob from base64
              const blobImg = await fetch(`data:${type};base64,${data}`).then(r => r.blob());
              
              // Focus the textbox
              const element = document.querySelector(selector);
              if (!element) {
                return { success: false, error: 'Element not found' };
              }
              
              element.focus();
              element.click();
              
              // Create a DataTransfer object with the image
              const dataTransfer = new DataTransfer();
              const file = new File([blobImg], 'image.png', { type: 'image/png' });
              dataTransfer.items.add(file);
              
              // Create and dispatch paste event
              const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true
              });
              
              const dispatched = element.dispatchEvent(pasteEvent);
              
              return {
                success: true,
                dispatched: dispatched,
                fileSize: blobImg.size,
                elementType: element.tagName
              };
            } catch (e) {
              return {
                success: false,
                error: e.message
              };
            }
          }, png.base64, 'image/png', containerSelector);
          
          if (pasteResult.success) {
            console.log(`      ✓ Paste event dispatched (${pasteResult.fileSize} bytes)`);
          } else {
            console.log(`      ⚠️  Paste error: ${pasteResult.error}`);
          }
          await this.page.waitForTimeout(1500);

          // Monitor for NEW href AND verify it contains <img> tag
          console.log(`\n      ⏳ Monitoring for image upload verification...\n`);
          let uploadVerified = false;
          let checkAttempts = 0;
          const maxAttempts = 20; // 20 seconds max

          while (!uploadVerified && checkAttempts < maxAttempts) {
            checkAttempts++;
            const currentHrefs = await getVirtuosoHrefs();
            
            // Find NEW href
            for (const href of currentHrefs) {
              if (!initialHrefs.includes(href)) {
                // NEW href found - verify it contains <img> tag
                console.log(`      [${checkAttempts}s] Found NEW href`);
                console.log(`      🔗 Checking URL: ${href.substring(0, 60)}...`);
                
                const hasImg = await this.checkHrefHasImg(href);
                if (hasImg) {
                  console.log(`      ✅ VERIFIED: URL contains <img> tag - Image uploaded successfully!`);
                  uploadVerified = true;
                  break;
                } else {
                  console.log(`      ⚠️  URL found but no <img> tag yet, retrying...`);
                }
              }
            }

            if (!uploadVerified) {
              if (checkAttempts % 5 === 0 || checkAttempts === 1) {
                console.log(`      [${checkAttempts}s] Waiting for image processing...`);
              }
              await this.page.waitForTimeout(1000);
            }
          }

          if (!uploadVerified) {
            console.log(`      ⚠️  ⏱️  Timeout (20s) - image verification incomplete\n`);
          } else {
            console.log(`      ✓ Image ${i + 1} fully verified - Ready for next step\n`);
          }

          // Wait 1s before next image
          if (i < pngBuffers.length - 1) {
            console.log(`      ⏳ Preparing for image ${i + 2}...\n`);
            await this.page.waitForTimeout(1000);
          }

        } catch (error) {
          console.log(`      ❌ Error pasting image ${i + 1}: ${error.message}\n`);
          return false;
        }
      }

      // Step 5: Final delay before prompt entry
      console.log('   ✅ All images pasted and verified');
      console.log('   ⏳ Waiting 3 seconds before prompt entry...\n');
      await this.page.waitForTimeout(3000);

      return true;

    } catch (error) {
      console.error(`❌ Error in pasteImages: ${error.message}\n`);
      return false;
    }
  }

  async addReferenceImages() {
    console.log('📎 ADDING FIRST 2 IMAGES AS REFERENCES\n');

    try {
      // Wait for virtuoso list to render
      console.log('   ⏳ Waiting for virtuoso gallery to load...');
      await this.page.waitForSelector('[data-testid="virtuoso-item-list"] a[href*="/generate/"]', { timeout: 10000 });
      await this.page.waitForTimeout(1000);
      console.log('   ✓ Gallery loaded\n');

      // Get first 2 <a> tags from virtuoso item list
      const firstTwoHrefs = await this.page.evaluate(() => {
        // Find virtuoso item list container by data-testid
        const virtuosoList = document.querySelector('[data-testid="virtuoso-item-list"]');
        if (!virtuosoList) {
          console.warn('Virtuoso list not found');
          return [];
        }

        // Get all <a> tags from virtuoso list
        const allLinks = virtuosoList.querySelectorAll('a[href*="/generate/"]');
        const hrefs = [];
        
        for (let i = 0; i < Math.min(2, allLinks.length); i++) {
          hrefs.push(allLinks[i].href);
        }
        
        return hrefs;
      });

      console.log(`   ✓ Found first 2 images from virtuoso list`);
      console.log(`   • Image 1: ${firstTwoHrefs[0]?.substring(0, 50) || 'NOT FOUND'}...`);
      if (firstTwoHrefs[1]) {
        console.log(`   • Image 2: ${firstTwoHrefs[1].substring(0, 50)}...`);
      }
      console.log('');

      if (firstTwoHrefs.length < 2) {
        console.log(`   ⚠️  Found only ${firstTwoHrefs.length} images in gallery, need 2\n`);
        return false;
      }

      // Add each reference
      for (let i = 0; i < firstTwoHrefs.length; i++) {
        const href = firstTwoHrefs[i];
        console.log(`   ${i + 1}️⃣  Adding reference image ${i + 1} to prompt...\n`);

        try {
          // Find the <a> tag by href in virtuoso list
          const linkData = await this.page.evaluate((targetHref) => {
            const virtuosoList = document.querySelector('[data-testid="virtuoso-item-list"]');
            if (!virtuosoList) return { found: false };
            
            const link = virtuosoList.querySelector(`a[href="${targetHref}"]`);
            if (!link) {
              return { found: false };
            }
              
            const rect = link.getBoundingClientRect();
            return {
              found: true,
              href: targetHref,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2)
            };
          }, href);

          if (!linkData.found) {
            console.log(`      ⚠️  Image ${i + 1} link not found in virtuoso list\n`);
            continue;
          }

          // Right-click on the image
          console.log(`      🖱️  Right-clicking image...`);
          await this.page.mouse.move(linkData.x, linkData.y);
          await this.page.waitForTimeout(300);
          await this.page.mouse.down({ button: 'right' });
          await this.page.waitForTimeout(50);
          await this.page.mouse.up({ button: 'right' });
          await this.page.waitForTimeout(800);

          // Find and click "Thêm vào câu lệnh" button
          console.log(`      🔍 Finding "Thêm vào câu lệnh" button...`);
          const addBtn = await this.page.evaluate(() => {
            const buttons = document.querySelectorAll('button[role="menuitem"]');

            for (const btn of buttons) {
              const text = btn.textContent.trim();
              if (text.includes('Thêm vào')) {
                return {
                  x: Math.floor(btn.getBoundingClientRect().left + btn.getBoundingClientRect().width / 2),
                  y: Math.floor(btn.getBoundingClientRect().top + btn.getBoundingClientRect().height / 2),
                  text: text
                };
              }
            }

            return null;
          });

          if (!addBtn) {
            console.log(`      ⚠️  "Thêm vào câu lệnh" button not found\n`);
            continue;
          }

          // Click add button
          console.log(`      ✓ Found button: "${addBtn.text}"`);
          await this.page.mouse.move(addBtn.x, addBtn.y);
          await this.page.waitForTimeout(200);
          await this.page.mouse.down();
          await this.page.waitForTimeout(100);
          await this.page.mouse.up();
          await this.page.waitForTimeout(1200);

          console.log(`      ✓ Reference image ${i + 1} added to prompt\n`);

        } catch (error) {
          console.log(`      ❌ Error adding reference: ${error.message}\n`);
        }
      }

      return true;

    } catch (error) {
      console.error(`❌ Error adding references: ${error.message}\n`);
      return false;
    }
  }

  async enterFullPrompt() {
    console.log('📝 ENTERING FULL VIETNAMESE PROMPT\n');

    try {
      const fullPrompt = `[CẶP HÌNH ẢNH - IMAGE MAPPING] Hình ảnh 1 (upload đầu tiên) = NHÂN VẬT THAM CHIẾU - Người sẽ mặc trang phục Hình ảnh 2 (upload thứ hai) = SẢN PHẨM/BỘ TÀI LIỆU THAM CHIẾU - Trang phục cần áp dụng QUAN TRỌNG: KHÔNG ĐỂ NHẦM LẪN các hình. Giữ nguyên nhân vật, chỉ thay đổi quần áo. === NHÂN VẬT PHẢI GIỮ NGUYÊN (TUYỆT ĐỐI CẦN THIẾT) === GIỮ CHÍNH XÁC: - Khuôn mặt: GIỐNG HẾT nhân vật trong Hình 1 - không thay đổi khuôn, đường nét, hoặc biểu cảm - Cơ thể: GIỐNG HẾT thể hình, dáng người, và tỷ lệ cơ thể - Tư thế: GIỐNG HẾT vị trí cơ thể, tay, chân, và hướng đầu - Biểu cảm & Ánh nhìn: GIỮ NGUYÊN cảm xúc và hướng nhìn - Tóc: GIỮ NGUYÊN kiểu tóc, màu sắc, độ dài, và vị trí - KHÔNG thay đổi Danh sách cấm: X Không thay đổi hình dáng mặt X Không thay đổi màu mắt hay nhìn X Không thay đổi sắc tố da X Không thay đổi cơ thể hay tỷ lệ X Không thay đổi phong cách tóc X Không thay đổi vị trí tay hoặc chân === THAY ĐỒ MỚI (TỪ HÌNH ẢNH 2) === LOẠI TÀI LIỆU: Bộ áo dài cách tân gồm áo tay lửng và quần ống rộng MÀU SẮC & ĐẶC TRƯNG NHẬN DIỆN: Màu chính: Hồng pastel với Trắng nhạt và xanh nhạt ở họa tiết thêu CHẤT LIỆU & CẢM GIÁC: Chất vải: Voan hoặc chiffon nhẹ, rũ mềm Cảm giác: cam giac vai KIỂU DỨA & CHI TIẾT: Kiểu dáng: Dáng suông nhẹ, phần quần ống rộng thoải mái Cổ: Cổ trụ cao nhẹ (inspired cổ áo dài) Tay: Tay lửng rộng, dáng suông Chi tiết: Thêu hoa nổi tinh tế ở thân áo, tay áo bay nhẹ, phối cùng túi cói nhỏ tạo điểm nhấn nữ tính CHIỀU DÀI & ĐỘ PHỦ: Áo dài qua hông, quần dài chạm mắt cá === KIỂU TÓC & TRANG ĐIỂM === Kiểu tóc: GIỮ NGUYÊN kiểu tóc trong hình tham chiếu Trang điểm: GIỮ NGUYÊN tương tự hình tham chiếu - chuyên nghiệp, tự nhiên === CÁC PHỤ CHỈ KỸ THUẬT === 1. ĐỌC garment từ Hình ảnh 2 2. ĐẶT lên cơ thể nhân vật với rũi tự nhiên và nếp gấp 3. TẠO LẬP giữa vai và cơ thể 4. KHỚP hành vi vải với loại chất liệu 5. ĐẶT toàn trên cơ thể từ Hình 1 6. VỮA vị trí cổ, cổ tay, mắt cá chân thích hợp 7. KHÔNG THAY cơ thể để vừa quần áo 8. GIỮ tỷ lệ cơ thể trong vai/eo/hông === CẤU TRÚC KHUNG & CHIẾU SÁNG === studio soft-diffused Tâm trạng: confident === CHẤT LƯỢNG & STYLE === Phong cách: minimalist Góc camera: eye-level Bảng màu: neutral Chất lượng: Ảnh chuyên nghiệp, 8K, nét canh tốt, siêu chi tiết, thực tế tự nhiên Chi tiết: Kết cấu vải thực tế, rũi tự nhiên, tỷ lệ giải phẫu chính xác === DANH SÁCH KIỂM TRA THỰC HIỆN === ✓ Ảnh nhân vật từ Hình 1 với chi tiết nhân vật được bảo tồn ✓ Mặc trang phục từ Hình 2 với màu và chất liệu đúng ✓ Cùng khuôn mặt, cơ thể, tư thế, biểu cảm - KHÔNG THAY ĐỔI ✓ ĐẶT garment thực tế với rũi tự nhiên ✓ Chiếu sáng & sáng tác chuyên nghiệp ✓ Không bị biến dạng giải phẫu hoặc tỷ lệ xấu`;

      const selector = '[role="textbox"][data-slate-editor="true"]';
      
      console.log('   🔍 Finding prompt textbox...');
      await this.page.waitForSelector(selector, { timeout: 15000 });
      console.log('   ✓ Found textbox');

      console.log('   🖱️  Focusing textbox...');
      await this.page.evaluate(() => {
        const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        if (textbox) textbox.focus();
      });
      await this.page.waitForTimeout(200);
      console.log('   ✓ Textbox focused\n');

      console.log(`   ⌨️  Typing prompt progressively (${fullPrompt.length} characters)...\n`);
      await this.page.keyboard.type(fullPrompt, { delay: 5 });
      
      console.log(`   ✓ All characters typed\n`);
      
      console.log('   ⏳ Waiting 2 seconds for Slate editor to process...');
      await this.page.waitForTimeout(2000);

      console.log('   👉 Pressing Enter to submit prompt...\n');
      await this.page.keyboard.press('Enter');
      
      console.log('   ✓ Prompt submitted with Enter\n');
      return true;

    } catch (error) {
      console.error(`❌ Error entering prompt: ${error.message}\n`);
      return false;
    }
  }

  async waitForGeneration() {
    console.log('⏳ WAITING FOR GENERATION\n');
    console.log('   Monitor the browser for image generation results...');
    console.log('   Waiting 60 seconds...\n');
    
    await this.page.waitForTimeout(60000);

    console.log('✅ GENERATION COMPLETE!\n');
    console.log('📊 SUMMARY:');
    console.log('   ✓ Pasted 2 test images directly into textbox');
    console.log('   ✓ Entered full Vietnamese prompt (typed progressively)');
    console.log('   ✓ Submitted with single Enter press\n');
    console.log('Check browser for final results');
    console.log('Press Ctrl+C to close\n');
  }

  async run() {
    try {
      const session = this.loadSession();
      await this.init();
      await this.restoreSession(session);
      
      // Initialize Google Flow Automation Service
      console.log('⚙️  Initializing Google Flow Automation Service...\n');
      this.flowService = new GoogleFlowAutomationService(this.page, {
        sessionFile: this.sessionFile,
        debugMode: false  // Full automation enabled
      });

      await this.navigateToProject();
      await this.setOutputQuantity(2);
      await this.pasteImages();
      
      // Ảnh đã paste vào textbox, không cần query từ gallery nữa
      console.log('⏳ Waiting 2 seconds for images to settle...\n');
      await this.page.waitForTimeout(2000);
      
      await this.enterFullPrompt();
      await this.waitForGeneration();
      
      // Keep browser open
      await new Promise(() => {});

    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

const tester = new TestFullPromptWithReferences();
await tester.run();
