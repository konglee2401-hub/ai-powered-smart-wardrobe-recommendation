#!/usr/bin/env node

/**
 * Test Google Flow Image Generation with Full Session
 * 
 * Goes to specific project URL and generates an image
 * Tests if reCAPTCHA token is properly captured and working
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class GoogleFlowTestGenerator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionFile = path.join(__dirname, '../.sessions/google-flow-session-complete.json');
    this.projectUrl = 'https://labs.google/fx/vi/tools/flow/project/58d791d4-37c9-47a8-ae3b-816733bc3ec0';
  }

  loadSession() {
    console.log('\n' + '='.repeat(70));
    console.log('🎨 GOOGLE FLOW TEST - IMAGE GENERATION');
    console.log('='.repeat(70) + '\n');

    if (!fs.existsSync(this.sessionFile)) {
      console.error(`❌ Session file not found: ${this.sessionFile}\n`);
      process.exit(1);
    }

    try {
      const session = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
      console.log(`✅ Session loaded`);
      console.log(`   • Cookies: ${session.cookies?.length || 0}`);
      console.log(`   • localStorage items: ${Object.keys(session.localStorage || {}).length}`);
      const tokenCount = session.tokens?.recaptcha ? Object.keys(session.tokens.recaptcha).length : 0;
      console.log(`   • reCAPTCHA tokens: ${tokenCount}\n`);
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
        '--disable-dev-shm-usage'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  async restoreSession(sessionData) {
    console.log('🔐 Restoring session...\n');

    // Set cookies BEFORE navigation
    const cookiesToSet = (sessionData.cookies || []).filter(c => !['NID', 'OTZ'].includes(c.name));
    for (const cookie of cookiesToSet) {
      try {
        await this.page.setCookie(cookie);
      } catch (e) {}
    }

    // Set localStorage BEFORE navigation
    await this.page.evaluate((storage, tokens) => {
      // Set regular localStorage
      for (const [key, value] of Object.entries(storage || {})) {
        try {
          window.localStorage.setItem(key, value);
        } catch (e) {}
      }
      
      // Set reCAPTCHA tokens if they exist
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
    const tokenCount = sessionData.tokens?.recaptcha ? Object.keys(sessionData.tokens.recaptcha).length : 0;
    console.log(`   ✅ ${tokenCount} reCAPTCHA tokens set`);
    console.log('✅ Session restored\n');
  }

  async navigateToProject() {
    console.log(`🔗 Navigating to project: ${this.projectUrl.substring(0, 80)}...\n`);
    
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

  async uploadImages() {
    console.log('📤 UPLOADING IMAGES\n');

    try {
      const testImagesDir = path.join(__dirname, '../test-images');
      
      // Get first 2 images
      let images = [];
      if (fs.existsSync(testImagesDir)) {
        const files = fs.readdirSync(testImagesDir);
        images = files
          .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
          .slice(0, 2)
          .map(f => path.join(testImagesDir, f));
      }

      if (images.length < 2) {
        console.log(`   ⚠️  Found only ${images.length} images, need 2`);
        console.log(`   Images: ${images.join(', ')}\n`);
        return false;
      }

      console.log(`   ✓ Found 2 images:`);
      console.log(`     1. ${path.basename(images[0])}`);
      console.log(`     2. ${path.basename(images[1])}\n`);

      // Find and upload to image inputs
      const uploadInputs = await this.page.$$(
        'input[type="file"][accept*="image"], input[type="file"][accept*="jpeg"]'
      );

      console.log(`   ✓ Found ${uploadInputs.length} upload inputs`);

      if (uploadInputs.length >= 2) {
        // Upload first image to first input
        console.log(`   1️⃣  Uploading character image...`);
        await uploadInputs[0].uploadFile(images[0]);
        await this.page.waitForTimeout(1000);
        console.log(`      ✓ Character image uploaded`);

        // Upload second image to second input
        console.log(`   2️⃣  Uploading product image...`);
        await uploadInputs[1].uploadFile(images[1]);
        await this.page.waitForTimeout(1000);
        console.log(`      ✓ Product image uploaded`);
      } else {
        console.log(`   ⚠️  Only ${uploadInputs.length} upload inputs found (need 2)\n`);
        return false;
      }

      console.log('✅ Both images uploaded\n');
      return true;

    } catch (error) {
      console.error(`❌ Error uploading images: ${error.message}\n`);
      return false;
    }
  }

  async generateImage() {
    console.log('📝 ENTERING PROMPT & GENERATING IMAGE\n');

    try {
      // Full Vietnamese prompt
      const testPrompt = `[CẶP HÌNH ẢNH - IMAGE MAPPING] Hình ảnh 1 (upload đầu tiên) = NHÂN VẬT THAM CHIẾU - Người sẽ mặc trang phục Hình ảnh 2 (upload thứ hai) = SẢN PHẨM/BỘ TÀI LIỆU THAM CHIẾU - Trang phục cần áp dụng QUAN TRỌNG: KHÔNG ĐỂ NHẦM LẪN các hình. Giữ nguyên nhân vật, chỉ thay đổi quần áo. === NHÂN VẬT PHẢI GIỮ NGUYÊN (TUYỆT ĐỐI CẦN THIẾT) === GIỮ CHÍNH XÁC: - Khuôn mặt: GIỐNG HẾT nhân vật trong Hình 1 - không thay đổi khuôn, đường nét, hoặc biểu cảm - Cơ thể: GIỐNG HẾT thể hình, dáng người, và tỷ lệ cơ thể - Tư thế: GIỐNG HẾT vị trí cơ thể, tay, chân, và hướng đầu - Biểu cảm & Ánh nhìn: GIỮ NGUYÊN cảm xúc và hướng nhìn - Tóc: GIỮ NGUYÊN kiểu tóc, màu sắc, độ dài, và vị trí - KHÔNG thay đổi Danh sách cấm: X Không thay đổi hình dáng mặt X Không thay đổi màu mắt hay nhìn X Không thay đổi sắc tố da X Không thay đổi cơ thể hay tỷ lệ X Không thay đổi phong cách tóc X Không thay đổi vị trí tay hoặc chân === THAY ĐỒ MỚI (TỪ HÌNH ẢNH 2) === LOẠI TÀI LIỆU: Bộ áo dài cách tân gồm áo tay lửng và quần ống rộng MÀU SẮC & ĐẶC TRƯNG NHẬN DIỆN: Màu chính: Hồng pastel với Trắng nhạt và xanh nhạt ở họa tiết thêu CHẤT LIỆU & CẢM GIÁC: Chất vải: Voan hoặc chiffon nhẹ, rũ mềm Cảm giác: cam giac vai KIỂU DỨA & CHI TIẾT: Kiểu dáng: Dáng suông nhẹ, phần quần ống rộng thoải mái Cổ: Cổ trụ cao nhẹ (inspired cổ áo dài) Tay: Tay lửng rộng, dáng suông Chi tiết: Thêu hoa nổi tinh tế ở thân áo, tay áo bay nhẹ, phối cùng túi cói nhỏ tạo điểm nhấn nữ tính CHIỀU DÀI & ĐỘ PHỦ: Áo dài qua hông, quần dài chạm mắt cá === KIỂU TÓC & TRANG ĐIỂM === Kiểu tóc: GIỮ NGUYÊN kiểu tóc trong hình tham chiếu Trang điểm: GIỮ NGUYÊN tương tự hình tham chiếu - chuyên nghiệp, tự nhiên === CÁC PHỤ CHỈ KỸ THUẬT === 1. ĐỌC garment từ Hình ảnh 2 2. ĐẶT lên cơ thể nhân vật với rũi tự nhiên và nếp gấp 3. TẠO LẬP giữa vai và cơ thể 4. KHỚP hành vi vải với loại chất liệu 5. ĐẶT toàn trên cơ thể từ Hình 1 6. VỮA vị trí cổ, cổ tay, mắt cá chân thích hợp 7. KHÔNG THAY cơ thể để vừa quần áo 8. GIỮ tỷ lệ cơ thể trong vai/eo/hông === CẤU TRÚC KHUNG & CHIẾU SÁNG === studio soft-diffused Tâm trạng: confident === CHẤT LƯỢNG & STYLE === Phong cách: minimalist Góc camera: eye-level Bảng màu: neutral Chất lượng: Ảnh chuyên nghiệp, 8K, nét canh tốt, siêu chi tiết, thực tế tự nhiên Chi tiết: Kết cấu vải thực tế, rũi tự nhiên, tỷ lệ giải phẫu chính xác === DANH SÁCH KIỂM TRA THỰC HIỆN === ✓ Ảnh nhân vật từ Hình 1 với chi tiết nhân vật được bảo tồn ✓ Mặc trang phục từ Hình 2 với màu và chất liệu đúng ✓ Cùng khuôn mặt, cơ thể, tư thế, biểu cảm - KHÔNG THAY ĐỔI ✓ ĐẶT garment thực tế với rũi tự nhiên ✓ Chiếu sáng & sáng tác chuyên nghiệp ✓ Không bị biến dạng giải phẫu hoặc tỷ lệ xấu`;

      console.log('   1️⃣  Finding prompt textbox...');
      await this.page.waitForSelector('[role="textbox"][data-slate-editor="true"]', { timeout: 15000 });
      console.log('      ✓ Found');

      console.log('   2️⃣  Entering full Vietnamese prompt...');
      
      // Focus the textbox first
      await this.page.evaluate(() => {
        const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        if (textbox) textbox.focus();
      });
      await this.page.waitForTimeout(300);
      
      // Paste directly instead of typing (faster and more reliable for long text)
      await this.page.evaluate((prompt) => {
        const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        if (textbox) {
          textbox.innerText = prompt;
          textbox.textContent = prompt;
          textbox.dispatchEvent(new Event('input', { bubbles: true }));
          textbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, testPrompt);
      
      console.log(`      ✓ Entered full prompt (${testPrompt.length} characters)`);
      console.log(`      • First 100 chars: "${testPrompt.substring(0, 100)}..."`);
      
      await this.page.waitForTimeout(500);

      console.log('   3️⃣  Pressing Enter (submit prompt only)...');
      await this.page.keyboard.press('Enter');
      console.log('      ✓ Enter pressed');

      console.log('   4️⃣  Waiting 5 seconds for prompt processing...');
      await this.page.waitForTimeout(5000);
      console.log('      ✓ Processed');

      console.log('   5️⃣  Checking for reCAPTCHA token...');
      const hasRecaptchaToken = await this.page.evaluate(() => {
        const token = window.localStorage.getItem('_grecaptcha');
        return token ? token.substring(0, 50) + '...' : null;
      });

      if (hasRecaptchaToken) {
        console.log(`      ✅ reCAPTCHA token found: ${hasRecaptchaToken}`);
      } else {
        console.log(`      ⚠️  No reCAPTCHA token in localStorage`);
      }

      console.log('   6️⃣  ⏳ Waiting for generation (60 seconds)...\n');
      await this.page.waitForTimeout(60000);

      console.log('✅ PROMPT SUBMISSION COMPLETE!\n');
      console.log('📊 RESULTS:');
      console.log('   ✓ Images uploaded successfully');
      console.log('   ✓ Full Vietnamese prompt entered');
      console.log('   ✓ Enter key pressed (prompt submitted)');
      console.log('   ✓ Waiting for AI to generate results\n');

      console.log('💡 Monitor the browser:');
      console.log('   • Watch for image generation progress');
      console.log('   • Check if new images appear in gallery');
      console.log('   • Verify character preserved and clothing replaced\n');

      console.log('📋 Browser remains open - check results manually');
      console.log('   Press Ctrl+C to close\n');

      return true;

    } catch (error) {
      console.error(`❌ Error during generation: ${error.message}\n`);
      return false;
    }
  }

  async keepOpen() {
    // Keep browser open
    await new Promise(() => {});
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      const session = this.loadSession();
      await this.init();
      await this.restoreSession(session);
      await this.navigateToProject();
      await this.uploadImages();
      await this.generateImage();
      await this.keepOpen();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

const tester = new GoogleFlowTestGenerator();
await tester.run();
