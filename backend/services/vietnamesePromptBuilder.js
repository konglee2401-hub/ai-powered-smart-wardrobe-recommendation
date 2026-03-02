/**
 * Vietnamese Prompt Builder - Language-specific prompt generation
 * Integrates Vietnamese templates with dynamic content
 * 
 * NOTE: Vietnamese prompts are for DEBUG/MAINTENANCE only.
 * English prompts should be used for actual model inference (BFL, Grok, etc.)
 */

import VIETNAM_PROMPTS from './vietnamesePromptTemplates.js';

class VietnamesePromptBuilder {
  /**
   * Build character analysis prompt (STEP 1)
   */
  static buildCharacterAnalysisPrompt() {
    return VIETNAM_PROMPTS.characterAnalysis.DEFAULT;
  }

  /**
   * Build image generation prompt for wearing product (Virtual Try-On)
   * OPTIMIZED: Uses new bilingual template format
   * Vietnamese version for debug/maintenance only
   */
  static buildImageGenerationWearingProductPrompt(garmentData = {}) {
    const {
      garment_type = 'trang phục',
      primary_color = 'màu chính',
      secondary_color = '',
      fabric_type = 'chất vải',
      fit_type = 'kiểu dáng',
      neckline = '',
      sleeves = '',
      key_details = 'chi tiết nổi bật',
      length_coverage = 'chiều dài',
      mood = 'chuyên nghiệp',
      style = 'hiện đại'
    } = garmentData;

    // Build prompt using new template format (Vietnamese for debug)
    let prompt = `[ÁNH XẠ HÌNH ẢNH]\n`;
    prompt += `Hình 1: NHÂN VẬT THAM CHIẾU.\n`;
    prompt += `Hình 2: TRANG PHỤC THAM CHIẾU.\n`;
    prompt += `Luôn giữ nhân vật từ Hình 1, không được nhầm hình.\n\n`;

    prompt += `[KHÓA NHÂN DẠNG — TUYỆT ĐỐI]\n`;
    prompt += `Giữ nguyên hoàn toàn nhân vật từ Hình 1:\n`;
    prompt += `khuôn mặt, cơ thể, tư thế, ánh nhìn, tóc.\n`;
    prompt += `Không chấp nhận bất kỳ thay đổi nào.\n\n`;

    prompt += `[CHẾ ĐỘ — wearing]\n`;
    prompt += `Nhân vật MẶC trang phục từ Hình 2.\n`;
    prompt += `Nếu Hình 2 có người mẫu, bỏ qua người mẫu và chỉ lấy trang phục.\n\n`;

    prompt += `[THÔNG TIN TRANG PHỤC]\n`;
    prompt += `Loại: ${garment_type}\n`;
    prompt += `Màu: ${primary_color}${secondary_color ? ` với ${secondary_color}` : ''}\n`;
    prompt += `Chất liệu: ${fabric_type}\n`;
    prompt += `Kiểu dáng: ${fit_type}\n`;
    prompt += `Chiều dài: ${length_coverage}\n`;
    if (neckline || sleeves || key_details) {
      prompt += `Chi tiết: ${[neckline, sleeves, key_details].filter(Boolean).join(', ')}\n`;
    }
    prompt += `\n`;

    prompt += `[HÀNH VI VẢI]\n`;
    prompt += `Độ rũ và nếp gấp đúng chất liệu.\n`;
    prompt += `Không thay đổi cơ thể để vừa đồ.\n\n`;

    prompt += `[RÀNG BUỘC CỨNG]\n`;
    prompt += `Không đổi nhân vật, không đổi khuôn mặt,\n`;
    prompt += `không trộn trang phục vào cơ thể,\n`;
    prompt += `không méo hình, không lỗi giải phẫu.`;

    return prompt;
  }

  /**
   * Build image generation prompt for holding product (Character Holding Product)
   * OPTIMIZED: Uses new bilingual template format
   * Vietnamese version for debug/maintenance only
   */
  static buildHoldingProductPrompt(garmentData = {}) {
    const {
      garment_type = 'trang phục',
      primary_color = 'màu chính',
      secondary_color = '',
      fabric_type = 'chất vải',
      fit_type = 'kiểu dáng',
      key_details = 'chi tiết nổi bật',
      length_coverage = 'chiều dài',
      mood = 'chuyên nghiệp',
      style = 'hiện đại'
    } = garmentData;

    // Build prompt using new template format (Vietnamese for debug)
    let prompt = `[ÁNH XẠ HÌNH ẢNH]\n`;
    prompt += `Hình 1: NHÂN VẬT THAM CHIẾU.\n`;
    prompt += `Hình 2: TRANG PHỤC THAM CHIẾU.\n`;
    prompt += `Luôn giữ nhân vật từ Hình 1, không được nhầm hình.\n\n`;

    prompt += `[KHÓA NHÂN DẠNG — TUYỆT ĐỐI]\n`;
    prompt += `Giữ nguyên hoàn toàn nhân vật từ Hình 1:\n`;
    prompt += `khuôn mặt, cơ thể, tư thế, ánh nhìn, tóc.\n`;
    prompt += `Không chấp nhận bất kỳ thay đổi nào.\n\n`;

    prompt += `[CHẾ ĐỘ — holding]\n`;
    prompt += `Nhân vật KHÔNG mặc trang phục.\n`;
    prompt += `Nhân vật CẦM trang phục trên tay để giới thiệu sản phẩm.\n`;
    prompt += `Nếu Hình 2 có người mẫu, bỏ qua người mẫu và chỉ lấy trang phục.\n\n`;

    prompt += `[THÔNG TIN TRANG PHỤC]\n`;
    prompt += `Loại: ${garment_type}\n`;
    prompt += `Màu: ${primary_color}${secondary_color ? ` với ${secondary_color}` : ''}\n`;
    prompt += `Chất liệu: ${fabric_type}\n`;
    prompt += `Kiểu dáng: ${fit_type}\n`;
    prompt += `Chiều dài: ${length_coverage}\n`;
    if (key_details) {
      prompt += `Chi tiết: ${key_details}\n`;
    }
    prompt += `\n`;

    prompt += `[TRÌNH BÀY SẢN PHẨM]\n`;
    prompt += `Nhân vật CẦM trang phục rõ ràng trước camera.\n`;
    prompt += `Vị trí tay tự nhiên, thoải mái.\n`;
    prompt += `Trang phục nhìn thấy rõ, không bị che khuất.\n\n`;

    prompt += `[RÀNG BUỘC CỨNG]\n`;
    prompt += `Không đổi nhân vật, không đổi khuôn mặt,\n`;
    prompt += `không trộn trang phục vào cơ thể,\n`;
    prompt += `không méo hình, không lỗi giải phẫu.`;

    return prompt;
  }

  /**
   * Build deep analysis prompt for video scripts (STEP 3)
   * @param {string} productFocus - full-outfit, top, bottom, accessories, shoes
   * @param {object} config - { videoDuration, voiceGender, voicePace }
   */
  static buildDeepAnalysisPrompt(productFocus = 'full-outfit', config = {}) {
    const { videoDuration = 30, voiceGender = 'female', voicePace = 'fast' } = config;
    
    let template = VIETNAM_PROMPTS.deepAnalysis[productFocus] || VIETNAM_PROMPTS.deepAnalysis['full-outfit'];
    
    // Replace variables in template
    template = template
      .replace('{videoDuration}', videoDuration)
      .replace('{voiceGender}', voiceGender)
      .replace('{voicePace}', voicePace);
    
    return template;
  }

  /**
   * Build video generation prompt (STEP 4)
   * @param {string} segment - Hook, Introduction, Features, CTA
   * @param {string} productFocus - full-outfit, top, bottom, accessories, shoes
   * @param {object} garmentInfo - { name, details, color, fit, etc }
   */
  static buildVideoGenerationPrompt(segment = 'Hook', productFocus = 'full-outfit', garmentInfo = {}) {
    const { name = 'trang phục', details = 'chi tiết', color = '', fit = 'vừa vặn' } = garmentInfo;
    
    const promptKey = `${productFocus}-${segment}`;
    let template = VIETNAM_PROMPTS.videoGeneration[promptKey];
    
    // Fallback to full-outfit if specific focus not found
    if (!template) {
      const fallbackKey = `full-outfit-${segment}`;
      template = VIETNAM_PROMPTS.videoGeneration[fallbackKey];
    }
    
    if (!template) {
      console.warn(`⚠️ No prompt found for ${promptKey}`);
      return '';
    }
    
    // Replace garment variables
    const garmentDetails = `${color} ${name}`.trim();
    template = template.replace('{garmentDetails}', garmentDetails);
    
    return template;
  }

  /**
   * Build image generation prompt for holding product (Character Holding Product)
   * Character prominently holds/presents product in hand
   */
  static buildHoldingProductPrompt(garmentData = {}) {
    const {
      garment_type = 'trang phục',
      primary_color = 'màu chính',
      secondary_color = '',
      fabric_type = 'chất vải',
      pattern = 'màu trơn',
      key_details = 'chi tiết nổi bật',
      scene = 'nền trắng',
      lighting = 'ánh sáng tự nhiên',
      mood = 'chuyên nghiệp',
      style = 'hiện đại',
      camera_angle = 'tầm ngang',
      color_palette = 'ấm áp'
    } = garmentData;

    let prompt = `[NHÂN VẬT CẦM SẢN PHẨM - IMAGE MAPPING]\n`;
    prompt += `Mục đích: Nhân vật cầm/trưng bày sản phẩm cho nội dung affiliate/marketing\n`;
    prompt += `Tỷ lệ: Nhân vật (60%) + Sản phẩm trên tay (40%)\n\n`;

    prompt += `[THAM CHIẾU ẢNH]\n`;
    prompt += `Ảnh 1 (upload đầu tiên) = THAM CHIẾU NHÂN VẬT - Người cần xuất hiện\n`;
    prompt += `Ảnh 2 (upload thứ hai) = THAM CHIẾU SẢN PHẨM - Vật phẩm cần cầm/trưng bày\n`;
    prompt += `QUAN TRỌNG: Nhân vật CẦM/TRƯNG BÀY sản phẩm từ Ảnh 2 trên tay hoặc vị trí nâng cao.\n\n`;

    prompt += `=== NHÂN VẬT (CHỦ ĐỀ CHÍNH - 60% chú ý) ===\n`;
    prompt += `Nhân vật là CHỦ ĐỀ CHÍNH - được nổi bật rõ ràng\n`;
    prompt += `- Giữ nguyên khuôn mặt, cơ thể từ Ảnh 1\n`;
    prompt += `- CÁCH TÁY/TƯƠNG TƯƠNG: Tư thế tự nhiên để CẦM hoặc TRƯNG BÀY sản phẩm\n`;
    prompt += `- Sản phẩm nhìn thấy rõ ràng trên tay hoặc gần cơ thể\n`;
    prompt += `- Biểu cảm: Hỏi cười hoặc nhìn chằm chằm về sản phẩm\n`;
    prompt += `- Tư thế: Mở, gần gũi, tư thế trưng bày sản phẩm\n`;
    prompt += `- Toàn thân hoặc close-up tập trung vào tay cầm sản phẩm\n\n`;

    prompt += `=== SẢN PHẨM (CHỦ ĐỀ PHỤ - TRÊN TAY) ===\n`;
    prompt += `Sản phẩm NỔIẾU CẦM, được nhân vật trưng bày\n`;
    prompt += `- Loại sản phẩm: ${garment_type}\n`;
    prompt += `- Màu sắc chính: ${primary_color}\n`;
    if (secondary_color) prompt += `- Màu sắc phụ: ${secondary_color}\n`;
    prompt += `- Chất liệu: ${fabric_type}\n`;
    prompt += `- Kiểu dáng: ${pattern}\n`;
    prompt += `- Chi tiết nổi bật: ${key_details}\n`;
    prompt += `- CÁC TỪ TRƯNG BÀY: Nhân vật CẦM sản phẩm rõ ràng, nhìn thấy từ camera\n`;
    prompt += `- Vị trí tay: Tư thế tự nhiên, thoải mái cầm\n`;
    prompt += `- Hướng sản phẩm: Nhìn thấy rõ ràng, không ẩn bí\n`;
    prompt += `- Ghi sáng sản phẩm: Được chiếu sáng tốt, màu sắc sống động\n\n`;

    prompt += `=== BỐI CẢNH & CHIẾU SÁNG ===\n`;
    prompt += `- Bối cảnh: ${scene}\n`;
    prompt += `- Chiếu sáng: ${lighting}\n`;
    prompt += `- Không bóng đen khó chịu trên nhân vật hoặc sản phẩm\n`;
    prompt += `- Tâm trạng: ${mood}\n\n`;

    prompt += `=== THÀNH PHẦN & KỸ THUẬT ===\n`;
    prompt += `- Độ phân giải: 8K chất lượng cao\n`;
    prompt += `- Phong cách: Nhiếp ảnh marketing chuyên nghiệp\n`;
    prompt += `- Chi tiết: Siêu chi tiết, lạc mắt, rõ nét cao\n`;
    prompt += `- Tính thẩm mỹ: Sạch sẽ, chuyên nghiệp, tập trung vào sản phẩm`;

    return prompt;
  }

  /**
   * Build complete video script prompt combining all segments
   */
  static buildCompleteVideoScript(productFocus = 'full-outfit', config = {}) {
    const deepAnalysis = this.buildDeepAnalysisPrompt(productFocus, config);
    
    // The deep analysis prompt already generates scripts
    return deepAnalysis;
  }

  /**
   * Build comprehensive video prompt for video generation (similar to English buildComprehensiveVideoPrompt)
   * Used for TikTok video generation with script content and product info
   * @param {string} scriptContent - The video script content
   * @param {object} productInfo - Product information { name, details, color, material }
   * @param {object} config - { videoDuration, voiceGender, voicePace, productFocus, aspectRatio, platform }
   */
  static buildComprehensiveVideoPrompt(scriptContent = '', productInfo = {}, config = {}) {
    const {
      videoDuration = 10,
      voiceGender = 'female',
      voicePace = 'fast',
      productFocus = 'full-outfit',
      aspectRatio = '9:16',
      platform = 'TikTok'
    } = config;

    const {
      name = 'trang phục',
      details = 'chi tiết',
      color = 'thời trang',
      material = 'chất lượng cao'
    } = productInfo;

    // Build comprehensive video prompt in Vietnamese
    let prompt = `Tạo video ${platform} chuyên nghiệp (tỷ lệ ${aspectRatio}, ${videoDuration} giây):\n\n`;

    prompt += `📝 KỊCH BẢN:\n`;
    prompt += `${scriptContent}\n\n`;

    prompt += `🎬 YẾU TỐ HÌNH ẢNH:\n`;
    prompt += `- Chủ đề chính: Người mẫu thể hiện ${color} ${name}\n`;
    prompt += `- Chất liệu: ${material}\n`;
    prompt += `- Chi tiết: ${details}\n`;
    prompt += `- Tiêu điểm: ${productFocus}\n`;
    prompt += `- Nhịp độ: Nhanh, cắt hấp dẫn cho ${platform}\n`;
    prompt += `- Chuyển cảnh: Fade mượt mà và cắt nhanh\n\n`;

    prompt += `🎙️ LỜI THOẠI:\n`;
    prompt += `- Giọng: ${voiceGender === 'female' ? 'Nữ' : 'Nam'}\n`;
    prompt += `- Tốc độ: ${voicePace === 'fast' ? 'Nhanh' : voicePace === 'moderate' ? 'Vừa phải' : 'Chậm'}\n`;
    prompt += `- Tông giọng: Năng động, thuyết phục, chân thực\n\n`;

    prompt += `🎨 PHONG CÁCH & TÂM TRẠNG:\n`;
    prompt += `- Thẩm mỹ tổng thể: Hiện đại, thời thượng, tập trung chuyển đổi\n`;
    prompt += `- Ánh sáng: Sáng, chuyên nghiệp, tôn vinh\n`;
    prompt += `- Chất lượng: Tối thiểu 720p\n`;
    prompt += `- Tỷ lệ khung hình: ${aspectRatio} (dọc cho ${platform})\n\n`;

    prompt += `⏱️ THỜI LƯỢNG: ${videoDuration} giây tổng thời lượng video\n`;

    return prompt;
  }

  /**
   * Get prompt statistics
   */
  static getPromptStats() {
    const stats = {
      characterAnalysis: Object.keys(VIETNAM_PROMPTS.characterAnalysis).length,
      deepAnalysis: Object.keys(VIETNAM_PROMPTS.deepAnalysis).length,
      videoGeneration: Object.keys(VIETNAM_PROMPTS.videoGeneration).length,
      total: 0
    };
    
    stats.total = stats.characterAnalysis + stats.deepAnalysis + stats.videoGeneration;
    
    return stats;
  }

  /**
   * List available product focuses
   */
  static getAvailableFocuses() {
    return Object.keys(VIETNAM_PROMPTS.deepAnalysis);
  }

  /**
   * List available video segments
   */
  static getAvailableSegments() {
    return ['Hook', 'Introduction', 'Features', 'CTA'];
  }
}

export default VietnamesePromptBuilder;
