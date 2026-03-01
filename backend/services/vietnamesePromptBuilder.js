/**
 * Vietnamese Prompt Builder - Language-specific prompt generation
 * Integrates Vietnamese templates with dynamic content
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
   * Replaces characterAnalysis template which was incorrectly used for image generation
   */
  static buildImageGenerationWearingProductPrompt(garmentData = {}) {
    const {
      garment_type = 'trang phuc',
      primary_color = 'mau chinh',
      secondary_color_line = '',
      fabric_type = 'chat vai',
      fabric_texture = 'cam giac vai',
      fit_type = 'kieu dang',
      neckline_line = '',
      sleeves_line = '',
      key_details_line = '',
      length_coverage = 'chieu dai',
      scene_directive = 'canh nhat tren nha',
      lighting_info = 'sang tu nhien',
      mood = 'tinh cam',
      style = 'phong cach',
      camera_angle = 'goc nhin',
      color_palette = 'bang mau'
    } = garmentData;

    let template = VIETNAM_PROMPTS.imageGeneration.wearingProduct;
    
    // Replace template variables with actual garment data
    template = template
      .replace('{garment_type}', garment_type)
      .replace('{primary_color}', primary_color)
      .replace('{secondary_color_line}', secondary_color_line)
      .replace('{fabric_type}', fabric_type)
      .replace('{fabric_texture}', fabric_texture)
      .replace('{fit_type}', fit_type)
      .replace('{neckline_line}', neckline_line)
      .replace('{sleeves_line}', sleeves_line)
      .replace('{key_details_line}', key_details_line)
      .replace('{length_coverage}', length_coverage)
      .replace('{scene_directive}', scene_directive)
      .replace('{lighting_info}', lighting_info)
      .replace('{mood}', mood)
      .replace('{style}', style)
      .replace('{camera_angle}', camera_angle)
      .replace('{color_palette}', color_palette);

    return template;
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
