#!/usr/bin/env node

/**
 * Seed Prompt Options Script
 * Creates default prompt options for browser automation workflow
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import PromptOption from '../models/PromptOption.js';

const promptOptions = [
  // Scene options
  {
    category: 'scene',
    label: 'Try-On Room (Linh Pháp)',
    labelVi: 'Phòng Thử Đồ (Linh Pháp)',
    value: 'linhphap-tryon-room',
    description: 'Realistic home try-on room for women fashion, lived-in and natural',
    descriptionVi: 'Phòng thử đồ tại nhà chân thực cho thời trang nữ, tự nhiên, có dấu hiệu sử dụng',
    keywords: ['try-on room', 'home fitting', 'women fashion', 'lived-in', 'natural light', 'bedroom try on'],
    technicalDetails: {
      environment: 'real apartment try-on room',
      lighting: 'soft daylight from window',
      elements: 'mirror, chair, bed, clothes, accessories',
      usage: 'fashion overlay, lifestyle, AI model'
    },
    promptSuggestion: 'A realistic home try-on room for women fashion, slightly messy lived-in environment, natural window daylight, mirror/chair/bed and mixed fashion items for authentic styling context.',
    promptSuggestionVi: 'Phòng thử đồ tại nhà chân thực cho thời trang nữ, hơi bừa bộn tự nhiên, ánh sáng cửa sổ mềm, có gương/ghế/giường và nhiều món đồ thời trang đa dạng.',
    sceneLockedPrompt: 'A realistic home try-on room for women\'s fashion, neutral walls and natural materials, wooden floor with visible texture, light curtains softly diffusing daylight, a full-length mirror leaning against the wall, a chair and bed with various fashion items casually placed, women\'s clothing including tops, dresses, matching sets, loungewear, sleepwear, and sexy outfits, different fabrics such as cotton, silk, lace, satin, a mix of colors, patterns, and tones, not uniform, women\'s accessories visible around the room, handbags, shoes, sandals, heels placed naturally on the floor, a small shelf with makeup items, cosmetics, and beauty products, a few hats and fashion accessories casually arranged, natural folds, real fabric texture, soft daylight with realistic shadows, slightly messy lived-in feeling, a small fabric tag reading "Linh Pháp" attached to a clothing hanger, empty scene, no people, no human, no mannequin, no reflection of people, background only, realistic apartment environment, ultra realistic high detail photography',
    sceneLockedPromptVi: 'Phòng thay đồ tại nhà chân thực cho thời trang nữ, tường trung tính và chất liệu tự nhiên, sàn gỗ có vân rõ, rèm sáng khuếch tán ánh sáng ban ngày, gương đứng tựa tường, ghế và giường có nhiều món đồ thời trang đặt tự nhiên, gồm áo, váy, set bộ, đồ mặc nhà, đồ ngủ và đồ sexy, đa dạng chất liệu cotton/silk/lace/satin, màu sắc và họa tiết phong phú không đồng nhất, phụ kiện nữ xuất hiện quanh phòng, túi xách/giày/sandal/giày cao gót đặt tự nhiên trên sàn, kệ nhỏ có đồ makeup và mỹ phẩm, mũ và phụ kiện sắp xếp ngẫu nhiên, nếp vải tự nhiên và texture thật, ánh sáng ban ngày mềm với bóng đổ thực tế, cảm giác có người ở, hơi bừa nhưng hợp lý, có tag vải chữ "Linh Pháp" trên móc treo, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, môi trường căn hộ chân thực, ảnh siêu thực chi tiết cao',
    sceneNegativePrompt: 'people, human, model, mannequin, face, body, hands, reflection of people, menswear, masculine style, single color palette, pastel only, monochrome, perfect studio setup, luxury showroom, cgi, unreal, artificial, camera POV, selfie, portrait',
    sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, cơ thể, tay, phản chiếu người, đồ nam, phong cách nam tính, bảng màu đơn sắc, chỉ pastel, setup studio hoàn hảo, showroom xa xỉ, CGI, giả, góc nhìn POV, selfie, chân dung',
    previewImage: '/images/options/scene-linhphap-tryon.jpg',
    isActive: true,
    useSceneLock: true,
    sortOrder: 1
  },
  {
    category: 'scene',
    label: 'Small Boutique (Linh Pháp)',
    labelVi: 'Boutique Nhỏ (Linh Pháp)',
    value: 'linhphap-boutique',
    description: 'Authentic small women fashion boutique with diverse products',
    descriptionVi: 'Boutique thời trang nữ quy mô nhỏ, chân thực, hàng hóa đa dạng',
    keywords: ['boutique', 'small shop', 'women fashion store', 'real retail', 'local business'],
    technicalDetails: {
      environment: 'small local fashion boutique',
      lighting: 'mixed daylight and warm ambient',
      elements: 'clothing racks, shoes, bags, cosmetics',
      usage: 'selling visuals, product showcase'
    },
    promptSuggestion: 'Authentic small women fashion boutique interior with mixed daylight and warm ambient light, diverse fashion racks and accessories, natural local retail atmosphere.',
    promptSuggestionVi: 'Không gian boutique thời trang nữ nhỏ, ánh sáng pha giữa daylight và đèn ấm, rack đồ đa dạng cùng phụ kiện, không khí bán hàng địa phương chân thực.',
    sceneLockedPrompt: 'A small local women\'s fashion boutique interior, neutral base colors with warm wooden elements, clothing racks filled with women\'s fashion items, a wide variety of apparel including tops, dresses, matching sets, loungewear, sexy outfits, diverse colors, patterns, and fabrics, shoes, sandals, heels displayed near the racks, handbags hanging or placed on shelves, hats and fashion accessories integrated naturally, a small display table with makeup and beauty products, natural arrangement, not perfectly styled, no single dominant color palette, warm ambient lighting mixed with daylight, authentic small business atmosphere, a subtle handwritten sign reading "Linh Pháp" placed on a shelf, empty store, no people, no mannequin, background only, realistic retail environment, ultra realistic',
    sceneLockedPromptVi: 'Không gian boutique thời trang nữ địa phương quy mô nhỏ, tông nền trung tính với điểm nhấn gỗ ấm, rack quần áo đầy đủ sản phẩm nữ, đa dạng áo, váy, set bộ, đồ mặc nhà, đồ sexy, màu sắc/họa tiết/chất liệu phong phú, giày/sandal/giày cao gót trưng gần kệ, túi xách treo hoặc đặt trên shelf, mũ và phụ kiện sắp xếp tự nhiên, bàn trưng bày nhỏ có mỹ phẩm và đồ làm đẹp, bố cục tự nhiên không quá hoàn hảo, không có bảng màu đơn điệu, ánh sáng đèn ấm pha daylight, bầu không khí cửa hàng nhỏ chân thực, có bảng viết tay "Linh Pháp" đặt trên kệ, cửa hàng trống không người, không mannequin, chỉ background, môi trường bán lẻ chân thực, siêu thực',
    sceneNegativePrompt: 'people, human, model, mannequin, face, body, hands, menswear, luxury fashion house, perfect showroom, single color theme, cgi, artificial lighting, camera POV, portrait',
    sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, cơ thể, tay, đồ nam, cửa hàng thời trang xa xỉ, showroom hoàn hảo, tông màu đơn điệu, CGI, ánh sáng giả, POV, chân dung',
    previewImage: '/images/options/scene-linhphap-boutique.jpg',
    isActive: true,
    useSceneLock: true,
    sortOrder: 2
  },
  {
    category: 'scene',
    label: 'Bedroom Lifestyle (Linh Pháp)',
    labelVi: 'Phòng Ngủ Lifestyle (Linh Pháp)',
    value: 'linhphap-bedroom-lifestyle',
    description: 'Realistic feminine bedroom for lifestyle fashion content',
    descriptionVi: 'Phòng ngủ nữ tính chân thực cho nội dung thời trang lifestyle',
    keywords: ['bedroom', 'lifestyle', 'women fashion', 'home wear', 'daily life'],
    technicalDetails: {
      environment: 'real lived-in bedroom',
      lighting: 'natural window light',
      elements: 'bed, clothes, shoes, bags, vanity',
      usage: 'lifestyle fashion, home wear, sexy wear'
    },
    promptSuggestion: 'Feminine lived-in bedroom with natural daylight, mixed women fashion items and accessories, authentic everyday lifestyle mood for homewear content.',
    promptSuggestionVi: 'Phòng ngủ nữ tính có dấu hiệu sử dụng, ánh sáng tự nhiên từ cửa sổ, nhiều items thời trang và phụ kiện, phù hợp nội dung lifestyle tại nhà.',
    sceneLockedPrompt: 'A realistic feminine bedroom lifestyle background, neutral wall tones and wooden furniture, bed, chair, and small table with women\'s fashion items, a mix of tops, dresses, sets, sleepwear, and sexy outfits, clothes casually placed with natural folds, variety of colors and textures, handbags resting on a chair, shoes and sandals placed near the bed, hats and accessories casually arranged, a vanity or small table with makeup and cosmetics, soft daylight coming through a window, realistic shadows and depth, lived-in everyday atmosphere, a small fabric tag reading "Linh Pháp" placed on folded clothing, empty scene, no people, background only, realistic home environment, ultra realistic photography',
    sceneLockedPromptVi: 'Background phòng ngủ nữ tính chân thực cho lifestyle, tường trung tính và nội thất gỗ, giường/ghế/bàn nhỏ có các món thời trang nữ, gồm áo, váy, set bộ, đồ ngủ, đồ sexy, quần áo đặt tự nhiên với nếp gấp thật, đa dạng màu sắc và texture, túi xách đặt trên ghế, giày và sandal gần giường, mũ và phụ kiện sắp xếp ngẫu nhiên, bàn trang điểm nhỏ có mỹ phẩm, ánh sáng cửa sổ mềm, bóng đổ và chiều sâu thực tế, không khí đời thường có người ở, có tag vải chữ "Linh Pháp" trên đồ gấp, cảnh trống không người, chỉ background, môi trường nhà ở chân thực, ảnh siêu thực',
    sceneNegativePrompt: 'people, human, model, mannequin, face, hands, reflection of people, menswear, hotel room, luxury suite, single color palette, cgi, artificial, camera POV',
    sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, tay, phản chiếu người, đồ nam, phòng khách sạn, luxury suite, bảng màu đơn điệu, CGI, giả, góc POV',
    previewImage: '/images/options/scene-linhphap-bedroom.jpg',
    isActive: true,
    useSceneLock: true,
    sortOrder: 3
  },
  {
    category: 'scene',
    label: 'Workroom & Livestream (Linh Pháp)',
    labelVi: 'Phòng Làm Việc & Livestream (Linh Pháp)',
    value: 'linhphap-workroom-livestream',
    description: 'Home workroom with livestream setup and Linh Pháp LED sign',
    descriptionVi: 'Phòng làm việc tại nhà có setup livestream và đèn LED Linh Pháp',
    keywords: ['livestream', 'workroom', 'fashion seller', 'home business', 'behind the scenes'],
    technicalDetails: {
      environment: 'home workroom used for selling',
      lighting: 'daylight + soft indoor + LED sign',
      elements: 'tripod, ring light, mic, desk, clothes',
      branding: 'LED sign reading Linh Pháp',
      usage: 'livestream background, selling video'
    },
    promptSuggestion: 'Realistic home workroom for women fashion seller with livestream tools, mixed lighting and visible Linh Pháp LED sign, slightly messy but organized.',
    promptSuggestionVi: 'Phòng làm việc tại nhà của chủ shop thời trang nữ, có thiết bị livestream, ánh sáng pha trộn và đèn LED Linh Pháp, hơi bừa nhưng có tổ chức.',
    sceneLockedPrompt: 'A realistic home workroom of a female fashion shop owner, used for daily work and livestream selling, natural materials, wooden desk and shelves, a clothing rack filled with women\'s fashion items, including tops, dresses, matching sets, loungewear, and sexy outfits, diverse colors, patterns, and fabric types, no uniform color palette, shoes, handbags, and fashion accessories placed naturally around the room, cosmetics and beauty products on a side table, livestream tools integrated naturally into the space, a smartphone mounted on a tripod positioned for livestream, a ring light visible near the desk, a small desk microphone or clip-on mic, charging cables, power strips, and adapters slightly visible, a laptop or tablet open on the desk, a soft LED neon sign on the wall reading "Linh Pháp", warm white or soft pink LED glow not overpowering, open boxes with fashion items and packaging materials nearby, fabric samples, tags, ribbons, notebooks scattered naturally, natural daylight mixed with soft indoor lighting and LED glow, realistic shadows and depth, slightly messy but organized workspace, empty room, no people, no human, background only, authentic lived-in working and livestream selling environment, ultra realistic high detail photography',
    sceneLockedPromptVi: 'Phòng làm việc tại nhà chân thực của nữ chủ shop thời trang, dùng cho công việc hàng ngày và livestream bán hàng, vật liệu tự nhiên, bàn và kệ gỗ, rack đồ chứa nhiều sản phẩm nữ gồm áo, váy, set bộ, đồ mặc nhà, đồ sexy, màu sắc/họa tiết/chất liệu đa dạng, không đồng nhất bảng màu, giày/túi/phụ kiện đặt tự nhiên quanh phòng, mỹ phẩm và đồ làm đẹp trên bàn phụ, thiết bị livestream tích hợp tự nhiên trong không gian, điện thoại gắn tripod để livestream, ring light gần bàn, micro bàn hoặc micro cài áo, dây sạc/ổ cắm/adapter hơi lộ, laptop hoặc tablet mở trên bàn, đèn LED chữ "Linh Pháp" trên tường, ánh LED trắng ấm hoặc hồng nhẹ không quá gắt, có thùng hàng mở và vật liệu đóng gói, mẫu vải/tag/ribbon/sổ ghi chú đặt tự nhiên, ánh sáng ban ngày pha đèn trong nhà và LED, bóng đổ có chiều sâu, không gian hơi bừa nhưng có tổ chức, phòng trống không người, chỉ background, môi trường làm việc và livestream chân thực, ảnh siêu thực chi tiết cao',
    sceneNegativePrompt: 'people, human, model, mannequin, face, body, hands, reflection of people, menswear, masculine style, professional TV studio, perfect influencer room, luxury showroom, single color palette, pastel only, overly bright neon, cgi, unreal, artificial, camera POV, selfie, portrait',
    sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, cơ thể, tay, phản chiếu người, đồ nam, phong cách nam tính, studio TV chuyên nghiệp, phòng influencer quá hoàn hảo, showroom xa xỉ, bảng màu đơn điệu, chỉ pastel, đèn neon quá gắt, CGI, giả, POV, selfie, chân dung',
    previewImage: '/images/options/scene-linhphap-workroom.jpg',
    isActive: true,
    useSceneLock: true,
    sortOrder: 4
  },
  {
    category: 'scene',
    label: 'Studio',
    labelVi: 'Phòng Studio',
    value: 'studio',
    description: 'Professional studio setting with controlled lighting',
    descriptionVi: 'Cài đặt phòng studio chuyên nghiệp với ánh sáng kiểm soát được',
    keywords: ['studio', 'professional', 'controlled', 'lighting'],
    technicalDetails: {
      lighting: 'controlled studio lighting',
      background: 'clean white or neutral',
      equipment: 'professional photography setup'
    },
    promptSuggestion: 'Photography studio with white seamless backdrop, professional lighting setup, pristine clean floor, perfect for fashion photography displays',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'scene',
    label: 'Beach',
    labelVi: 'Bãi Biển',
    value: 'beach',
    description: 'Natural beach environment with golden hour lighting',
    descriptionVi: 'Môi trường bãi biển tự nhiên với ánh sáng golden hour',
    keywords: ['beach', 'ocean', 'golden hour', 'natural'],
    technicalDetails: {
      lighting: 'natural golden hour',
      background: 'beach with ocean',
      atmosphere: 'relaxed summer vibes'
    },
    promptSuggestion: 'Golden hour beach setting with ocean waves in background, sandy beach, warm sunlight creating golden tones, relaxed vacation aesthetic',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'scene',
    label: 'Urban',
    labelVi: 'Đô Thị',
    value: 'urban',
    description: 'Urban street environment with city aesthetics',
    descriptionVi: 'Môi trường đường phố đô thị với thẩm mỹ thành phố',
    keywords: ['urban', 'city', 'street', 'modern'],
    technicalDetails: {
      lighting: 'natural street lighting',
      background: 'city architecture',
      atmosphere: 'contemporary urban'
    },
    promptSuggestion: 'Urban street setting with modern city architecture, brick walls or glass buildings, street-level perspective, contemporary metropolitan vibe',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'scene',
    label: 'Nature',
    labelVi: 'Thiên Nhiên',
    value: 'nature',
    description: 'Natural outdoor environment with organic elements',
    descriptionVi: 'Môi trường ngoài trời tự nhiên với các yếu tố hữu cơ',
    keywords: ['nature', 'organic', 'outdoor', 'natural'],
    technicalDetails: {
      lighting: 'natural outdoor',
      background: 'trees and plants',
      atmosphere: 'earthy and organic'
    },
    promptSuggestion: 'Natural outdoor environment with lush green trees, plants, garden setting, organic natural lighting, earthy peaceful atmosphere',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'scene',
    label: 'Office',
    value: 'office',
    description: 'Modern office environment with professional ambiance',
    keywords: ['office', 'professional', 'corporate', 'modern'],
    technicalDetails: {
      lighting: 'professional office lighting',
      background: 'modern office setting',
      atmosphere: 'corporate professional'
    },
    promptSuggestion: 'Modern office environment with sleek furniture, minimalist desk setup, professional ambiance, corporate professional aesthetic, business-ready setting',
    isActive: true,
    sortOrder: 5
  },

  // Lighting options
  {
    category: 'lighting',
    label: 'Natural',
    value: 'natural',
    description: 'Natural lighting with soft, realistic illumination',
    keywords: ['natural', 'soft', 'realistic', 'daylight'],
    technicalDetails: {
      type: 'natural daylight',
      quality: 'soft and diffused',
      shadows: 'natural soft shadows'
    },
    promptSuggestion: 'Soft natural daylight, warm and flattering tones, gentle shadows that define features without harsh contrast, creates authentic and relatable aesthetic',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'lighting',
    label: 'Studio',
    value: 'studio',
    description: 'Professional studio lighting with controlled setup',
    keywords: ['studio', 'controlled', 'professional', 'setup'],
    technicalDetails: {
      type: 'studio strobes',
      quality: 'controlled and even',
      shadows: 'minimal and controlled'
    },
    promptSuggestion: 'Professional studio lighting with precise control, even illumination across subject, minimal shadows, perfect controlled light for fashion photography',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'lighting',
    label: 'Golden Hour',
    value: 'golden-hour',
    description: 'Warm golden hour lighting with soft shadows',
    keywords: ['golden hour', 'warm', 'sunset', 'soft shadows'],
    technicalDetails: {
      type: 'golden hour sunlight',
      quality: 'warm and soft',
      shadows: 'long and soft'
    },
    promptSuggestion: 'Warm golden hour light creating magical warm tones, soft long shadows, romantic and dreamy atmosphere, perfect for editorial and lifestyle photography',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'lighting',
    label: 'Dramatic',
    value: 'dramatic',
    description: 'Dramatic lighting with high contrast and shadows',
    keywords: ['dramatic', 'high contrast', 'shadows', 'moody'],
    technicalDetails: {
      type: 'dramatic studio lighting',
      quality: 'high contrast',
      shadows: 'deep and defined'
    },
    promptSuggestion: 'High-contrast dramatic lighting with defined shadows, moody and intense atmosphere, creates powerful editorial aesthetic and strong visual impact',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'lighting',
    label: 'Soft',
    value: 'soft',
    description: 'Soft, diffused lighting with gentle illumination',
    keywords: ['soft', 'diffused', 'gentle', 'even'],
    technicalDetails: {
      type: 'softbox lighting',
      quality: 'diffused and even',
      shadows: 'minimal and soft'
    },
    promptSuggestion: 'Soft diffused lighting creating flattering skin tones, minimal shadows, gentle and forgiving illumination, perfect for fashion and beauty photography',
    isActive: true,
    sortOrder: 5
  },

  // Mood options
  {
    category: 'mood',
    label: 'Playful',
    value: 'playful',
    description: 'Playful and joyful atmosphere with positive energy',
    keywords: ['playful', 'joyful', 'positive', 'fun'],
    technicalDetails: {
      expression: 'genuine smile',
      posture: 'relaxed and natural',
      energy: 'positive and lively'
    },
    promptSuggestion: 'Playful and joyful mood with genuine smiling expression, relaxed natural posture, positive energy and lively movement, perfect for fun and lighthearted fashion showcases',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'mood',
    label: 'Serious',
    value: 'serious',
    description: 'Serious and focused professional atmosphere',
    keywords: ['serious', 'focused', 'professional', 'composed'],
    technicalDetails: {
      expression: 'composed and serious',
      posture: 'upright and professional',
      energy: 'focused and serious'
    },
    promptSuggestion: 'Serious and focused professional mood with composed expression, upright posture, concentrated gaze, adds formality and corporate polish to the look',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'mood',
    label: 'Romantic',
    value: 'romantic',
    description: 'Romantic and dreamy intimate atmosphere',
    keywords: ['romantic', 'dreamy', 'intimate', 'soft'],
    technicalDetails: {
      expression: 'soft and dreamy',
      posture: 'intimate and close',
      energy: 'romantic and gentle'
    },
    promptSuggestion: 'Romantic and dreamy mood with soft ethereal expression, intimate posture, gentle movement, creates elegant and luxurious editorial aesthetic',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'mood',
    label: 'Energetic',
    value: 'energetic',
    description: 'Energetic and dynamic active atmosphere',
    keywords: ['energetic', 'dynamic', 'active', 'vibrant'],
    technicalDetails: {
      expression: 'energized and lively',
      posture: 'active and dynamic',
      energy: 'high energy and movement'
    },
    promptSuggestion: 'Energetic and dynamic mood with vibrant expression, active movement and bold poses, high energy and motion, perfect for contemporary and sporty fashion',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'mood',
    label: 'Calm',
    value: 'calm',
    description: 'Calm and serene peaceful atmosphere',
    keywords: ['calm', 'serene', 'peaceful', 'tranquil'],
    technicalDetails: {
      expression: 'peaceful and calm',
      posture: 'relaxed and composed',
      energy: 'tranquil and serene'
    },
    promptSuggestion: 'Calm and serene mood with peaceful expression, relaxed composed posture, tranquil energy, creates zen-like and minimalist fashion aesthetic',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'mood',
    label: 'Elegant',
    value: 'elegant',
    description: 'Elegant and sophisticated refined atmosphere',
    keywords: ['elegant', 'sophisticated', 'refined', 'graceful'],
    technicalDetails: {
      expression: 'graceful and poised',
      posture: 'elegant and refined',
      energy: 'sophisticated and polished'
    },
    promptSuggestion: 'Elegant and sophisticated mood with graceful poised expression, refined posture, sophisticated energy, exudes luxury and high-fashion editorial appeal',
    isActive: true,
    sortOrder: 6
  },

  // Style options
  {
    category: 'style',
    label: 'Casual',
    value: 'casual',
    description: 'Casual and relaxed fashion style',
    keywords: ['casual', 'relaxed', 'comfortable', 'everyday'],
    technicalDetails: {
      fit: 'relaxed fit',
      materials: 'comfortable fabrics',
      vibe: 'casual and comfortable'
    },
    promptSuggestion: 'Casual relaxed fashion style with comfortable fabrics and relaxed fit, everyday approachable look, perfect for lifestyle and street fashion photography',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'style',
    label: 'Formal',
    value: 'formal',
    description: 'Formal and professional fashion style',
    keywords: ['formal', 'professional', 'business', 'elegant'],
    technicalDetails: {
      fit: 'tailored and fitted',
      materials: 'premium fabrics',
      vibe: 'professional and polished'
    },
    promptSuggestion: 'Formal professional fashion with tailored fit and premium fabrics, polished corporate aesthetic, perfect for business and formal event photography',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'style',
    label: 'Elegant',
    value: 'elegant',
    description: 'Elegant and sophisticated fashion style',
    keywords: ['elegant', 'sophisticated', 'luxury', 'refined'],
    technicalDetails: {
      fit: 'elegant and flowing',
      materials: 'luxury fabrics',
      vibe: 'sophisticated and refined'
    },
    promptSuggestion: 'Elegant sophisticated fashion with flowing silhouettes and luxury materials, refined upscale aesthetic, perfect for editorial and high-fashion photography',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'style',
    label: 'Sporty',
    value: 'sporty',
    description: 'Sporty and athletic fashion style',
    keywords: ['sporty', 'athletic', 'active', 'performance'],
    technicalDetails: {
      fit: 'athletic fit',
      materials: 'performance fabrics',
      vibe: 'active and sporty'
    },
    promptSuggestion: 'Sporty athletic fashion with performance fabrics and dynamic silhouettes, energetic active aesthetic, perfect for activewear and lifestyle photography',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'style',
    label: 'Vintage',
    value: 'vintage',
    description: 'Vintage and retro fashion style',
    keywords: ['vintage', 'retro', 'nostalgic', 'classic'],
    technicalDetails: {
      fit: 'vintage inspired',
      materials: 'retro fabrics',
      vibe: 'nostalgic and classic'
    },
    promptSuggestion: 'Vintage retro fashion with nostalgic inspiration and classic elements, timeless aesthetic, perfect for period and editorial fashion photography',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'style',
    label: 'Luxury',
    value: 'luxury',
    description: 'Luxury and high-end fashion style',
    keywords: ['luxury', 'high-end', 'premium', 'exclusive'],
    technicalDetails: {
      fit: 'premium tailored',
      materials: 'luxury materials',
      vibe: 'exclusive and premium'
    },
    promptSuggestion: 'Luxury high-end fashion with premium tailored fit and exclusive materials, prestige and opulence, perfect for luxury brand and editorial photography',
    isActive: true,
    sortOrder: 6
  },
  {
    category: 'style',
    label: 'Bohemian',
    value: 'bohemian',
    description: 'Bohemian and free-spirited fashion style',
    keywords: ['bohemian', 'free-spirited', 'organic', 'artistic'],
    technicalDetails: {
      fit: 'flowing and loose',
      materials: 'natural fabrics',
      vibe: 'artistic and free-spirited'
    },
    promptSuggestion: 'Bohemian free-spirited fashion with flowing forms and natural materials, artistic expressive aesthetic, perfect for lifestyle and artistic photography',
    isActive: true,
    sortOrder: 7
  },
  {
    category: 'style',
    label: 'Minimalist',
    value: 'minimalist',
    description: 'Minimalist and modern fashion style',
    keywords: ['minimalist', 'modern', 'simple', 'clean'],
    technicalDetails: {
      fit: 'clean and simple',
      materials: 'minimalist fabrics',
      vibe: 'simple and modern'
    },
    promptSuggestion: 'Minimalist modern fashion with clean lines and simple aesthetic, contemporary elegant simplicity, perfect for minimalist and editorial photography',
    isActive: true,
    sortOrder: 8
  },
  {
    category: 'style',
    label: 'Edgy',
    value: 'edgy',
    description: 'Edgy and alternative fashion style',
    keywords: ['edgy', 'alternative', 'bold', 'rebellious'],
    technicalDetails: {
      fit: 'edgy and bold',
      materials: 'alternative materials',
      vibe: 'rebellious and bold'
    },
    promptSuggestion: 'Edgy alternative fashion with bold attitude and rebellious aesthetic, contemporary avant-garde style, perfect for fashion editorial and statement photography',
    isActive: true,
    sortOrder: 9
  },

  // Color Palette options
  {
    category: 'colorPalette',
    label: 'Vibrant',
    value: 'vibrant',
    description: 'Vibrant and saturated color palette',
    keywords: ['vibrant', 'saturated', 'bright', 'colorful'],
    technicalDetails: {
      saturation: 'high saturation',
      contrast: 'high contrast',
      colors: 'vibrant and bold'
    },
    promptSuggestion: 'Vibrant saturated color palette with high contrast bold colors, energetic and eye-catching aesthetic, perfect for contemporary and fun fashion photography',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'colorPalette',
    label: 'Monochrome',
    value: 'monochrome',
    description: 'Monochrome and black & white palette',
    keywords: ['monochrome', 'black and white', 'grayscale', 'classic'],
    technicalDetails: {
      saturation: 'no saturation',
      contrast: 'high contrast',
      colors: 'black and white only'
    },
    promptSuggestion: 'Monochrome black and white color palette with high dramatic contrast, classic timeless aesthetic, perfect for sophisticated editorial photography',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'colorPalette',
    label: 'Pastel',
    value: 'pastel',
    description: 'Soft pastel and muted color palette',
    keywords: ['pastel', 'soft', 'muted', 'gentle'],
    technicalDetails: {
      saturation: 'low saturation',
      contrast: 'soft contrast',
      colors: 'pastel and gentle'
    },
    promptSuggestion: 'Soft pastel muted color palette with gentle contrast, romantic dreamy aesthetic, perfect for lifestyle and artistic fashion photography',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'colorPalette',
    label: 'Jewel Tones',
    value: 'jewel-tones',
    description: 'Rich jewel-toned and luxurious colors',
    keywords: ['jewel tones', 'rich', 'luxurious', 'deep'],
    technicalDetails: {
      saturation: 'rich saturation',
      contrast: 'medium contrast',
      colors: 'jewel-toned and rich'
    },
    promptSuggestion: 'Rich jewel-toned colors with luxurious deep saturation, opulent sophisticated aesthetic, perfect for luxury and high-fashion editorial photography',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'colorPalette',
    label: 'Earth Tones',
    value: 'earth-tones',
    description: 'Natural earth tones and warm colors',
    keywords: ['earth tones', 'natural', 'warm', 'organic'],
    technicalDetails: {
      saturation: 'natural saturation',
      contrast: 'warm contrast',
      colors: 'earth and warm tones'
    },
    promptSuggestion: 'Natural earth tone color palette with warm organic aesthetic, grounded authentic feel, perfect for lifestyle and sustainable fashion photography',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'colorPalette',
    label: 'Black & White',
    value: 'black-and-white',
    description: 'Classic black and white contrast',
    keywords: ['black and white', 'classic', 'contrast', 'timeless'],
    technicalDetails: {
      saturation: 'no saturation',
      contrast: 'high contrast',
      colors: 'black and white only'
    },
    promptSuggestion: 'Classic black and white high contrast palette, timeless sophisticated aesthetic, perfect for formal and editorial fashion photography',
    isActive: true,
    sortOrder: 6
  },

  // Camera Angle options
  {
    category: 'cameraAngle',
    label: 'Front View',
    value: 'front-view',
    description: 'Front-facing camera angle',
    keywords: ['front view', 'face forward', 'direct', 'head-on'],
    technicalDetails: {
      angle: '0 degrees',
      focus: 'front facing',
      perspective: 'direct view'
    },
    promptSuggestion: 'Direct front-facing camera angle showing full frontal view of the outfit and face, focuses on overall look and front-facing presentation, perfect for full-body fashion shots',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'cameraAngle',
    label: 'Side View',
    value: 'side-view',
    description: 'Side profile camera angle',
    keywords: ['side view', 'profile', 'lateral', 'side'],
    technicalDetails: {
      angle: '90 degrees',
      focus: 'side profile',
      perspective: 'lateral view'
    },
    promptSuggestion: 'Side profile camera angle showing silhouette and body contour, emphasizes fit and drape of clothing, perfect for showcasing garment shape and lines',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'cameraAngle',
    label: 'Three-Quarter View',
    value: 'three-quarter-view',
    description: 'Three-quarter angle view',
    keywords: ['three-quarter', '3/4 view', 'angled', 'diagonal'],
    technicalDetails: {
      angle: '45 degrees',
      focus: 'angled view',
      perspective: 'three-quarter angle'
    },
    promptSuggestion: 'Three-quarter angled view balancing front and side perspective, shows depth and dimension of outfit, most flattering for general fashion photography',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'cameraAngle',
    label: 'Overhead View',
    value: 'overhead-view',
    description: 'Overhead or bird\'s eye view',
    keywords: ['overhead', 'bird\'s eye', 'top down', 'aerial'],
    technicalDetails: {
      angle: '90 degrees down',
      focus: 'top down',
      perspective: 'aerial view'
    },
    promptSuggestion: 'Overhead top-down bird\'s eye view showing full outfit layout, unique perspective emphasizing silhouette, perfect for flat lay and overhead fashion photography',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'cameraAngle',
    label: 'Low Angle',
    value: 'low-angle',
    description: 'Low angle shot looking up',
    keywords: ['low angle', 'looking up', 'worm\'s eye', 'upward'],
    technicalDetails: {
      angle: 'looking up',
      focus: 'upward perspective',
      perspective: 'worm\'s eye view'
    },
    promptSuggestion: 'Low angle upward perspective looking up at subject, adds drama and makes outfit appear grander, flattering for leg and silhouette emphasis',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'cameraAngle',
    label: 'High Angle',
    value: 'high-angle',
    description: 'High angle shot looking down',
    keywords: ['high angle', 'looking down', 'god\'s eye', 'downward'],
    technicalDetails: {
      angle: 'looking down',
      focus: 'downward perspective',
      perspective: 'god\'s eye view'
    },
    promptSuggestion: 'High angle downward perspective looking down on subject, shows proportions and waistline, perfect for emphasizing outfit detail and shoe display',
    isActive: true,
    sortOrder: 6
  },

  // ============ NEW: Hairstyle options ============
  {
    category: 'hairstyle',
    label: 'Long Straight',
    value: 'long-straight',
    description: 'Long straight hair, sleek and smooth',
    keywords: ['long', 'straight', 'sleek', 'smooth', 'silky'],
    technicalDetails: {
      length: 'long',
      texture: 'straight',
      style: 'sleek and polished'
    },
    promptSuggestion: 'Long straight hair flowing smoothly, silky and polished appearance, perfect for elegant and sophisticated looks or editorial fashion shots',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'hairstyle',
    label: 'Long Wavy',
    value: 'long-wavy',
    description: 'Long wavy hair with natural waves',
    keywords: ['long', 'wavy', 'waves', 'natural', 'flowing'],
    technicalDetails: {
      length: 'long',
      texture: 'wavy',
      style: 'natural and flowing'
    },
    promptSuggestion: 'Long wavy hair with natural waves and movement, romantic and flowing appearance, adds softness and dimension to the overall aesthetic',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'hairstyle',
    label: 'Long Curly',
    value: 'long-curly',
    description: 'Long curly hair with defined curls',
    keywords: ['long', 'curly', 'curls', 'bouncy', 'voluminous'],
    technicalDetails: {
      length: 'long',
      texture: 'curly',
      style: 'bouncy and voluminous'
    },
    promptSuggestion: 'Long curly hair with defined bouncy curls, voluminous and full-bodied, adds drama and personality to the outfit, very expressive and fashion-forward',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'hairstyle',
    label: 'Medium Straight',
    value: 'medium-straight',
    description: 'Medium length straight hair',
    keywords: ['medium', 'straight', 'shoulder length', 'sleek'],
    technicalDetails: {
      length: 'medium',
      texture: 'straight',
      style: 'clean and simple'
    },
    promptSuggestion: 'Medium length straight hair with clean lines, versatile and modern look, flatters most face shapes and works with many outfit styles',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'hairstyle',
    label: 'Medium Wavy',
    value: 'medium-wavy',
    description: 'Medium length wavy hair',
    keywords: ['medium', 'wavy', 'waves', 'shoulder length'],
    technicalDetails: {
      length: 'medium',
      texture: 'wavy',
      style: 'relaxed and natural'
    },
    promptSuggestion: 'Medium length wavy hair with relaxed waves, casual yet polished, adds movement and texture while maintaining easy-to-style practicality',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'hairstyle',
    label: 'Short Bob',
    value: 'short-bob',
    description: 'Short bob cut hair',
    keywords: ['short', 'bob', 'chic', 'modern'],
    technicalDetails: {
      length: 'short',
      texture: 'straight to wavy',
      style: 'chic and modern'
    },
    promptSuggestion: 'Chic short bob cut, modern and fashionable, frames the face beautifully, adds sophistication and editorial appeal to the overall look',
    isActive: true,
    sortOrder: 6
  },
  {
    category: 'hairstyle',
    label: 'Short Pixie',
    value: 'short-pixie',
    description: 'Short pixie cut',
    keywords: ['short', 'pixie', 'edgy', 'bold'],
    technicalDetails: {
      length: 'very short',
      texture: 'short cropped',
      style: 'edgy and bold'
    },
    promptSuggestion: 'Edgy short pixie cut, bold and fashion-forward, shows confidence and modern aesthetic, perfect for androgynous or avant-garde styling',
    isActive: true,
    sortOrder: 7
  },
  {
    category: 'hairstyle',
    label: 'Braided',
    value: 'braided',
    description: 'Braided hairstyle',
    keywords: ['braided', 'braids', 'plaited', 'traditional'],
    technicalDetails: {
      length: 'any',
      texture: 'braided',
      style: 'traditional and intricate'
    },
    promptSuggestion: 'Intricate braided hairstyle, could be single braid, multiple braids, or complex plaited patterns, adds artistry and cultural sophistication',
    isActive: true,
    sortOrder: 8
  },
  {
    category: 'hairstyle',
    label: 'Bun',
    value: 'bun',
    description: 'Bun updo hairstyle',
    keywords: ['bun', 'updo', 'elegant', 'formal'],
    technicalDetails: {
      length: 'any',
      texture: 'pulled back',
      style: 'elegant and formal'
    },
    promptSuggestion: 'Elegant bun updo, sleek and polished, perfect for formal occasions or editorial shoots, showcases neck and facial features beautifully',
    isActive: true,
    sortOrder: 9
  },

  // ============ Makeup options ============
  {
    category: 'makeup',
    label: 'Natural',
    value: 'natural',
    description: 'Natural no-makeup look',
    keywords: ['natural', 'no makeup', 'bare', 'minimal'],
    technicalDetails: {
      coverage: 'light',
      finish: 'natural',
      emphasis: 'skin clarity'
    },
    promptSuggestion: 'Light natural makeup enhancing skin clarity, fresh and clean appearance, perfect for daytime or casual looks that focus on skin quality',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'makeup',
    label: 'Light',
    value: 'light',
    description: 'Light and fresh makeup look',
    keywords: ['light', 'fresh', 'daytime', 'subtle'],
    technicalDetails: {
      coverage: 'light to medium',
      finish: 'dewy',
      emphasis: 'healthy glow'
    },
    promptSuggestion: 'Light dewy makeup with healthy glow, fresh and approachable appearance, adds radiance without heavy coverage, ideal for editorial and daytime shoots',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'makeup',
    label: 'Glowing',
    value: 'glowing',
    description: 'Glowing radiant makeup',
    keywords: ['glowing', 'radiant', 'glow', 'highlight'],
    technicalDetails: {
      coverage: 'medium',
      finish: 'radiant',
      emphasis: 'highlighter and glow'
    },
    promptSuggestion: 'Radiant glowing makeup with strategic highlight placement, beautiful luminous finish, captures light beautifully in photography, adds luxury and dimension',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'makeup',
    label: 'Bold Lips',
    value: 'bold-lips',
    description: 'Bold lip color makeup',
    keywords: ['bold lips', 'red lip', 'vibrant', 'statement'],
    technicalDetails: {
      coverage: 'full face',
      finish: 'matte or satin',
      emphasis: 'bold lip color'
    },
    promptSuggestion: 'Bold statement lipstick in rich colors like red or burgundy, focal point of the makeup, exudes confidence and sophistication, perfect for editorial looks',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'makeup',
    label: 'Smokey Eyes',
    value: 'smokey-eyes',
    description: 'Smokey eye makeup',
    keywords: ['smokey', 'smoke', 'eyeshadow', 'dramatic'],
    technicalDetails: {
      coverage: 'full face',
      finish: 'matte or shimmer',
      emphasis: 'dramatic eyes'
    },
    promptSuggestion: 'Dramatic smokey eye makeup with blended dark eyeshadow tones, creates depth and mystery, draws attention to eyes, adds editorial and luxurious impact',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'makeup',
    label: 'Winged Eyeliner',
    value: 'winged-liner',
    description: 'Winged eyeliner look',
    keywords: ['winged', 'cat eye', 'eyeliner', 'precise'],
    technicalDetails: {
      coverage: 'full face',
      finish: 'precise',
      emphasis: 'eyeliner wings'
    },
    promptSuggestion: 'Precise winged eyeliner with sharp cat-eye flick, classic and fashion-forward, defines eyes and adds geometric sophistication to the face',
    isActive: true,
    sortOrder: 6
  },
  {
    category: 'makeup',
    label: 'Glamorous',
    value: 'glamorous',
    description: 'Glamorous full makeup',
    keywords: ['glamorous', 'glam', 'full makeup', 'party'],
    technicalDetails: {
      coverage: 'full',
      finish: 'glamorous',
      emphasis: 'overall dramatic look'
    },
    promptSuggestion: 'Full glamorous makeup with bold eyes and lips, luxurious and dramatic overall look, perfect for party photography and high-fashion editorial shoots',
    isActive: true,
    sortOrder: 7
  },

  // ============ Bottoms options ============
  {
    category: 'bottoms',
    label: 'Jeans',
    value: 'jeans',
    description: 'Denim jeans pants',
    keywords: ['jeans', 'denim', 'pants', 'casual'],
    technicalDetails: {
      type: 'denim pants',
      fit: 'various fits',
      style: 'casual versatile'
    },
    promptSuggestion: 'Well-fitted denim jeans in classic wash or trendy style, could be skinny, straight-leg, or wide-leg, provides timeless casual foundation for the outfit',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'bottoms',
    label: 'Trousers',
    value: 'trousers',
    description: 'Formal trousers pants',
    keywords: ['trousers', 'dress pants', 'formal', 'professional'],
    technicalDetails: {
      type: 'dress pants',
      fit: 'tailored',
      style: 'formal professional'
    },
    promptSuggestion: 'Tailored formal trousers in neutral colors or patterns, structured fit with crisp creases, elevates the look with professional polish and sophistication',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'bottoms',
    label: 'Shorts',
    value: 'shorts',
    description: 'Casual shorts',
    keywords: ['shorts', 'casual', 'summer', 'sporty'],
    technicalDetails: {
      type: 'shorts',
      length: 'above knee',
      style: 'casual summer'
    },
    promptSuggestion: 'Stylish shorts in appropriate length and fabric, could be denim, linen, or tailored, perfect for summer looks and vacation-ready outfits',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'bottoms',
    label: 'Skirt',
    value: 'skirt',
    description: 'Skirt bottom',
    keywords: ['skirt', 'feminine', 'elegant', 'versatile'],
    technicalDetails: {
      type: 'skirt',
      length: 'various',
      style: 'feminine versatile'
    },
    promptSuggestion: 'Feminine skirt in flattering length and silhouette, could be pencil, A-line, or maxi, adds elegance and showcases leg line beautifully',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'bottoms',
    label: 'Leggings',
    value: 'leggings',
    description: 'Fitted leggings pants',
    keywords: ['leggings', 'fitted', 'athletic', 'comfortable'],
    technicalDetails: {
      type: 'leggings',
      fit: 'tight fitted',
      style: 'athletic comfortable'
    },
    promptSuggestion: 'Sleek leggings in premium fabric, could be black, patterned, or trendy colors, provides comfortable fit while maintaining polished appearance',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'bottoms',
    label: 'Cargo Pants',
    value: 'cargo-pants',
    description: 'Cargo pants with pockets',
    keywords: ['cargo', 'utility', 'pockets', 'streetwear'],
    technicalDetails: {
      type: 'cargo pants',
      fit: 'relaxed',
      style: 'utility streetwear'
    },
    promptSuggestion: 'Utilitarian cargo pants in neutral tones, features multiple pockets and relaxed fit, adds streetwear edge and practical functionality to the look',
    isActive: true,
    sortOrder: 6
  },

  // ============ Shoes options ============
  {
    category: 'shoes',
    label: 'Sneakers',
    value: 'sneakers',
    description: 'Casual sneakers shoes',
    keywords: ['sneakers', 'casual', 'sporty', 'comfortable'],
    technicalDetails: {
      type: 'sneakers',
      heel: 'flat',
      style: 'casual sporty'
    },
    promptSuggestion: 'Trendy sneakers in neutral or style-matching colors, could be minimalist court shoes, chunky fashion sneakers, or designer trainer styles, adds casual cool vibe',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'shoes',
    label: 'Heels',
    value: 'heels',
    description: 'High heel shoes',
    keywords: ['heels', 'high heels', 'formal', 'elegant'],
    technicalDetails: {
      type: 'heels',
      heel: 'high',
      style: 'formal elegant'
    },
    promptSuggestion: 'Elegant high heels complementing the outfit, could be classic pumps, strappy sandals, or statement heels, adds sophistication and defines the silhouette',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'shoes',
    label: 'Boots',
    value: 'boots',
    description: 'Boot footwear',
    keywords: ['boots', 'booties', 'ankle boots', 'stylish'],
    technicalDetails: {
      type: 'boots',
      heel: 'various',
      style: 'stylish versatile'
    },
    promptSuggestion: 'Fashionable boots that elevate the look, could be ankle boots, knee-high, leather or suede, adds texture and editorial edge to the overall styling',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'shoes',
    label: 'Flats',
    value: 'flats',
    description: 'Flat shoes',
    keywords: ['flats', 'ballet flats', 'comfortable', 'casual'],
    technicalDetails: {
      type: 'flats',
      heel: 'flat',
      style: 'comfortable casual'
    },
    promptSuggestion: 'Comfortable flat shoes in coordinating colors, could be ballet flats, loafers, or minimalist slip-ons, provides effortless elegance and all-day comfort',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'shoes',
    label: 'Sandals',
    value: 'sandals',
    description: 'Open sandals',
    keywords: ['sandals', 'summer', 'open toe', 'breathable'],
    technicalDetails: {
      type: 'sandals',
      heel: 'various',
      style: 'summer breathable'
    },
    promptSuggestion: 'Stylish summer sandals, could be strappy heeled sandals, flat beach sandals, or designer thong sandals, perfect for warm-weather or vacation aesthetics',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'shoes',
    label: 'Loafers',
    value: 'loafers',
    description: 'Loafer shoes',
    keywords: ['loafers', 'slip on', 'smart casual', 'classic'],
    technicalDetails: {
      type: 'loafers',
      heel: 'flat',
      style: 'smart casual classic'
    },
    promptSuggestion: 'Classic loafers adding smart-casual polish, could be leather dress loafers or embellished designer styles, elevates casual wear with refined presentation',
    isActive: true,
    sortOrder: 6
  },

  // ============ Accessories options ============
  {
    category: 'accessories',
    label: 'Necklace',
    value: 'necklace',
    description: 'Necklace accessory',
    keywords: ['necklace', 'pendant', 'chain', 'jewelry'],
    technicalDetails: {
      type: 'necklace',
      placement: 'neck',
      style: 'decorative'
    },
    promptSuggestion: 'Elegant necklace complementing the neckline, could be delicate chain, pendant style, or layered pieces, adds sophistication and draws attention to the face',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'accessories',
    label: 'Earrings',
    value: 'earrings',
    description: 'Earrings accessory',
    keywords: ['earrings', 'ear rings', 'jewelry', 'ear'],
    technicalDetails: {
      type: 'earrings',
      placement: 'ears',
      style: 'decorative'
    },
    promptSuggestion: 'Statement or subtle earrings framing the face, could be studs, hoops, or dangles, matches the overall style aesthetic and face shape',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'accessories',
    label: 'Watch',
    value: 'watch',
    description: 'Wrist watch accessory',
    keywords: ['watch', 'wrist watch', 'timepiece', 'accessory'],
    technicalDetails: {
      type: 'watch',
      placement: 'wrist',
      style: 'functional decorative'
    },
    promptSuggestion: 'Luxury timepiece on wrist, could be elegant dress watch, sporty smartwatch, or designer chronograph, complements arm gestures and overall styling',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'accessories',
    label: 'Bag',
    value: 'bag',
    description: 'Handbag or purse',
    keywords: ['bag', 'purse', 'handbag', 'accessory'],
    technicalDetails: {
      type: 'bag',
      placement: 'hand or shoulder',
      style: 'functional decorative'
    },
    promptSuggestion: 'Designer handbag that complements the outfit, could be luxury leather tote, crossbody bag, or clutch, adds polish and completes the look with texture and brand prestige',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'accessories',
    label: 'Sunglasses',
    value: 'sunglasses',
    description: 'Sunglasses eyewear',
    keywords: ['sunglasses', 'shades', 'eyewear', 'sun'],
    technicalDetails: {
      type: 'sunglasses',
      placement: 'eyes',
      style: 'protective fashionable'
    },
    promptSuggestion: 'Fashionable sunglasses that enhance the face shape and style, could be cat-eye, oversized, round frames, or aviators, adds mystery and editorial edge',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'accessories',
    label: 'Scarf',
    value: 'scarf',
    description: 'Scarf accessory',
    keywords: ['scarf', 'shawl', 'neck scarf', 'accessory'],
    technicalDetails: {
      type: 'scarf',
      placement: 'neck or shoulders',
      style: 'decorative functional'
    },
    promptSuggestion: 'Silk or luxury fabric scarf draped elegantly around neck or shoulders, could be patterned or solid, adds color accent and refined texture to the overall look',
    isActive: true,
    sortOrder: 6
  },
  {
    category: 'accessories',
    label: 'Belt',
    value: 'belt',
    description: 'Waist belt accessory',
    keywords: ['belt', 'waist belt', 'accessory', 'waist'],
    technicalDetails: {
      type: 'belt',
      placement: 'waist',
      style: 'functional decorative'
    },
    promptSuggestion: 'Statement belt defining the waist, could be leather, chain, or fabric with metallic buckle, creates silhouette and adds polished finishing touch',
    isActive: true,
    sortOrder: 7
  },
  {
    category: 'accessories',
    label: 'Hat',
    value: 'hat',
    description: 'Hat accessory',
    keywords: ['hat', 'cap', 'headwear', 'accessory'],
    technicalDetails: {
      type: 'hat',
      placement: 'head',
      style: 'protective fashionable'
    },
    promptSuggestion: 'Fashionable hat style like beret, fedora, baseball cap, or wide-brim hat, complements face shape and overall aesthetic, adds personality and editorial flair',
    isActive: true,
    sortOrder: 8
  },

  // ============ Outerwear options ============
  {
    category: 'outerwear',
    label: 'Jacket',
    value: 'jacket',
    description: 'Casual jacket',
    keywords: ['jacket', 'casual', 'outerwear', 'light'],
    technicalDetails: {
      type: 'jacket',
      weight: 'light to medium',
      style: 'casual versatile'
    },
    promptSuggestion: 'Casual lightweight jacket in various styles like denim, bomber, or leather, adds layer and personality, perfect for completing streetwear or casual looks',
    isActive: true,
    sortOrder: 1
  },
  {
    category: 'outerwear',
    label: 'Coat',
    value: 'coat',
    description: 'Formal coat',
    keywords: ['coat', 'formal', 'outerwear', 'winter'],
    technicalDetails: {
      type: 'coat',
      weight: 'heavy',
      style: 'formal elegant'
    },
    promptSuggestion: 'Formal elegant coat in wool or premium fabric, sophisticated and protective silhouette, adds luxury and polish to professional or formal fashion looks',
    isActive: true,
    sortOrder: 2
  },
  {
    category: 'outerwear',
    label: 'Blazer',
    value: 'blazer',
    description: 'Blazer jacket',
    keywords: ['blazer', 'structured', 'formal', 'professional'],
    technicalDetails: {
      type: 'blazer',
      weight: 'light to medium',
      style: 'formal professional'
    },
    promptSuggestion: 'Tailored structured blazer, instantly elevates any outfit to professional level, defines silhouette and adds polish, essential for business and editorial looks',
    isActive: true,
    sortOrder: 3
  },
  {
    category: 'outerwear',
    label: 'Cardigan',
    value: 'cardigan',
    description: 'Knitted cardigan',
    keywords: ['cardigan', 'knitted', 'sweater', 'casual'],
    technicalDetails: {
      type: 'cardigan',
      weight: 'medium',
      style: 'casual comfortable'
    },
    promptSuggestion: 'Cozy knitted cardigan, soft and layerable, adds comfort and dimension to casual outfits, perfect for relaxed fashion or layering over dresses',
    isActive: true,
    sortOrder: 4
  },
  {
    category: 'outerwear',
    label: 'Hoodie',
    value: 'hoodie',
    description: 'Hooded sweatshirt',
    keywords: ['hoodie', 'hooded', 'casual', 'sporty'],
    technicalDetails: {
      type: 'hoodie',
      weight: 'medium',
      style: 'casual sporty'
    },
    promptSuggestion: 'Sporty hooded sweatshirt, ultimate casual comfort, adds contemporary streetwear vibe to the look, perfect for athletic or urban fashion styling',
    isActive: true,
    sortOrder: 5
  },
  {
    category: 'outerwear',
    label: 'Vest',
    value: 'vest',
    description: 'Vest garment',
    keywords: ['vest', 'waistcoat', 'layering', 'formal'],
    technicalDetails: {
      type: 'vest',
      weight: 'light',
      style: 'layering formal'
    },
    promptSuggestion: 'Structured vest perfect for layering, adds dimension and interest without overwhelming, creates visual separation and formal sophistication',
    isActive: true,
    sortOrder: 6
  }
];

async function seedPromptOptions() {
  try {
    console.log('🌱 Seeding prompt options...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe');
    console.log('✅ Connected to MongoDB');

    // Clear existing prompt options
    await PromptOption.deleteMany({});
    console.log('🗑️  Cleared existing prompt options');

    // Insert new prompt options
    const result = await PromptOption.insertMany(promptOptions);
    console.log(`✅ Seeded ${result.length} prompt options`);

    console.log('🎉 Prompt options seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding prompt options:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
seedPromptOptions();