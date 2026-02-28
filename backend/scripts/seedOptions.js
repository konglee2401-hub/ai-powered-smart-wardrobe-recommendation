/**
 * Enhanced Seed Options Script
 * 
 * Seeds the database with comprehensive prompt options for Phase 1.
 * 
 * NEW FEATURES:
 * - Keywords for each option
 * - Technical details for detailed prompts
 * - Preview images
 * - Validation functions
 * - Better defaults
 */

import mongoose from 'mongoose';
import PromptOption from '../models/PromptOption.js';
import 'dotenv/config';

// ============================================================
// COMPREHENSIVE OPTIONS DATA
// ============================================================

const OPTIONS_DATA = {
  scene: [
    {
      value: 'linhphap-tryon-room',
      label: 'Try-On Room (Linh Pháp)',
      description: 'Realistic home try-on room for women fashion, lived-in and natural',
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
      previewImage: '/images/options/scene-linhphap-tryon.jpg',
      sortOrder: 1
    },
    {
      value: 'linhphap-boutique',
      label: 'Small Boutique (Linh Pháp)',
      description: 'Authentic small women fashion boutique with diverse products',
      keywords: ['boutique', 'small shop', 'women fashion store', 'real retail', 'local business'],
      technicalDetails: {
        environment: 'small local fashion boutique',
        lighting: 'mixed daylight and warm ambient',
        elements: 'clothing racks, shoes, bags, cosmetics',
        usage: 'selling visuals, product showcase'
      },
      promptSuggestion: 'Authentic small women fashion boutique interior with mixed daylight and warm ambient light, diverse fashion racks and accessories, natural local retail atmosphere.',
      sceneLockedPrompt: 'A small local women\'s fashion boutique interior, neutral base colors with warm wooden elements, clothing racks filled with women\'s fashion items, a wide variety of apparel including tops, dresses, matching sets, loungewear, sexy outfits, diverse colors, patterns, and fabrics, shoes, sandals, heels displayed near the racks, handbags hanging or placed on shelves, hats and fashion accessories integrated naturally, a small display table with makeup and beauty products, natural arrangement, not perfectly styled, no single dominant color palette, warm ambient lighting mixed with daylight, authentic small business atmosphere, a subtle handwritten sign reading "Linh Pháp" placed on a shelf, empty store, no people, no mannequin, background only, realistic retail environment, ultra realistic',
      previewImage: '/images/options/scene-linhphap-boutique.jpg',
      sortOrder: 2
    },
    {
      value: 'linhphap-bedroom-lifestyle',
      label: 'Bedroom Lifestyle (Linh Pháp)',
      description: 'Realistic feminine bedroom for lifestyle fashion content',
      keywords: ['bedroom', 'lifestyle', 'women fashion', 'home wear', 'daily life'],
      technicalDetails: {
        environment: 'real lived-in bedroom',
        lighting: 'natural window light',
        elements: 'bed, clothes, shoes, bags, vanity',
        usage: 'lifestyle fashion, home wear, sexy wear'
      },
      promptSuggestion: 'Feminine lived-in bedroom with natural daylight, mixed women fashion items and accessories, authentic everyday lifestyle mood for homewear content.',
      sceneLockedPrompt: 'A realistic feminine bedroom lifestyle background, neutral wall tones and wooden furniture, bed, chair, and small table with women\'s fashion items, a mix of tops, dresses, sets, sleepwear, and sexy outfits, clothes casually placed with natural folds, variety of colors and textures, handbags resting on a chair, shoes and sandals placed near the bed, hats and accessories casually arranged, a vanity or small table with makeup and cosmetics, soft daylight coming through a window, realistic shadows and depth, lived-in everyday atmosphere, a small fabric tag reading "Linh Pháp" placed on folded clothing, empty scene, no people, background only, realistic home environment, ultra realistic photography',
      previewImage: '/images/options/scene-linhphap-bedroom.jpg',
      sortOrder: 3
    },
    {
      value: 'linhphap-workroom-livestream',
      label: 'Workroom & Livestream (Linh Pháp)',
      description: 'Home workroom with livestream setup and Linh Pháp LED sign',
      keywords: ['livestream', 'workroom', 'fashion seller', 'home business', 'behind the scenes'],
      technicalDetails: {
        environment: 'home workroom used for selling',
        lighting: 'daylight + soft indoor + LED sign',
        elements: 'tripod, ring light, mic, desk, clothes',
        branding: 'LED sign reading Linh Pháp',
        usage: 'livestream background, selling video'
      },
      promptSuggestion: 'Realistic home workroom for women fashion seller with livestream tools, mixed lighting and visible Linh Pháp LED sign, slightly messy but organized.',
      sceneLockedPrompt: 'A realistic home workroom of a female fashion shop owner, used for daily work and livestream selling, natural materials, wooden desk and shelves, a clothing rack filled with women\'s fashion items, including tops, dresses, matching sets, loungewear, and sexy outfits, diverse colors, patterns, and fabric types, no uniform color palette, shoes, handbags, and fashion accessories placed naturally around the room, cosmetics and beauty products on a side table, livestream tools integrated naturally into the space, a smartphone mounted on a tripod positioned for livestream, a ring light visible near the desk, a small desk microphone or clip-on mic, charging cables, power strips, and adapters slightly visible, a laptop or tablet open on the desk, a soft LED neon sign on the wall reading "Linh Pháp", warm white or soft pink LED glow not overpowering, open boxes with fashion items and packaging materials nearby, fabric samples, tags, ribbons, notebooks scattered naturally, natural daylight mixed with soft indoor lighting and LED glow, realistic shadows and depth, slightly messy but organized workspace, empty room, no people, no human, background only, authentic lived-in working and livestream selling environment, ultra realistic high detail photography',
      previewImage: '/images/options/scene-linhphap-workroom.jpg',
      sortOrder: 4
    },

    {
      value: 'studio',
      label: 'Professional Studio',
      description: 'Clean studio with seamless backdrop',
      keywords: ['studio', 'professional', 'clean', 'seamless', 'backdrop'],
      technicalDetails: {
        background: 'white seamless paper',
        floor: 'reflective',
        space: '10x10 feet'
      },
      sceneLockedPrompt: 'A professional fashion studio background with a seamless neutral backdrop, clean floor with subtle texture, controlled soft diffused lighting, balanced highlights and shadows, minimal props, realistic depth and natural material rendering, no clutter, no distraction, empty scene, no people, no mannequin, no human reflection, background only, production-ready commercial photography environment, ultra realistic, high detail.',
      sceneLockedPromptVi: 'Background studio thời trang chuyên nghiệp với phông liền mạch tông trung tính, sàn sạch có texture nhẹ, ánh sáng mềm khuếch tán được kiểm soát, vùng sáng tối cân bằng, ít đạo cụ, chiều sâu thực tế và chất liệu tự nhiên, không lộn xộn, không gây xao nhãng, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, phù hợp ảnh thương mại, siêu thực, chi tiết cao.',
      sceneNegativePrompt: 'people, human, model, mannequin, face, body, hands, reflection of people, selfie, portrait, camera POV, busy cluttered props, messy cables, oversaturated lighting, cgi, artificial render, low detail, blur, text watermark',
      sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, cơ thể, tay, phản chiếu người, selfie, chân dung, góc nhìn POV, đạo cụ lộn xộn, dây nhợ bừa bộn, ánh sáng quá gắt, CGI, render giả, ít chi tiết, mờ, watermark chữ',
      previewImage: '/images/options/scene-studio.jpg',
      sortOrder: 1
    },
    {
      value: 'white-background',
      label: 'White Background',
      description: 'Pure white for product focus',
      keywords: ['white', 'clean', 'minimal', 'product', 'focus'],
      technicalDetails: {
        background: 'pure white #FFFFFF',
        lighting: 'even, no shadows',
        post: 'white balance critical'
      },
      sceneLockedPrompt: 'A pure white seamless commercial background with smooth floor-to-wall transition, even high-key lighting, soft contact shadows only, clean and minimal environment, neutral white balance, no dominant color cast, empty scene, no people, no mannequin, no human reflection, background only, optimized for product and fashion compositing, ultra realistic, high detail.',
      sceneLockedPromptVi: 'Background trắng tinh thương mại với chuyển tiếp mượt giữa sàn và tường, ánh sáng high-key đồng đều, chỉ có bóng chạm nhẹ tự nhiên, không gian sạch và tối giản, cân bằng trắng trung tính, không ám màu, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, tối ưu cho ghép sản phẩm/thời trang, siêu thực, chi tiết cao.',
      sceneNegativePrompt: 'people, human, model, mannequin, face, body, hands, reflection of people, gray dirty background, color cast, hard shadows, gradient banding, cgi, artificial render, clutter, props, text watermark, logo',
      sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, cơ thể, tay, phản chiếu người, nền xám bẩn, ám màu, bóng cứng, banding gradient, CGI, render giả, bừa bộn, đạo cụ, watermark chữ, logo',
      previewImage: '/images/options/scene-white.jpg',
      sortOrder: 2
    },
    {
      value: 'urban-street',
      label: 'Urban Street',
      description: 'City street environment',
      keywords: ['urban', 'street', 'city', 'architecture', 'street art'],
      technicalDetails: {
        location: 'downtown area',
        time: 'golden hour',
        elements: 'architecture, street art'
      },
      sceneLockedPrompt: 'A realistic urban street fashion background with mixed modern architecture, textured walls and storefront details, natural city material surfaces, layered depth with foreground and background separation, balanced daylight with realistic shadows, subtle street elements arranged naturally, empty scene, no people, no mannequin, no human reflection, background only, authentic metropolitan atmosphere, ultra realistic, high detail.',
      sceneLockedPromptVi: 'Background đường phố đô thị chân thực cho thời trang với kiến trúc hiện đại pha trộn, tường có texture và chi tiết mặt tiền cửa hàng, bề mặt vật liệu thành phố tự nhiên, lớp chiều sâu trước-sau rõ ràng, ánh sáng ban ngày cân bằng với bóng đổ thực tế, các yếu tố đường phố bố trí tự nhiên, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, không khí đô thị chân thật, siêu thực, chi tiết cao.',
      sceneNegativePrompt: 'people, human, crowd, traffic jam, cars blocking view, mannequin, face, hands, reflection of people, night neon overexposed, dystopian cyberpunk, cgi render, blurry details, text watermark',
      sceneNegativePromptVi: 'người, đám đông, kẹt xe, xe che khung cảnh, mannequin, mặt, tay, phản chiếu người, đèn neon cháy sáng, cyberpunk quá đà, render CGI, mờ chi tiết, watermark chữ',
      previewImage: '/images/options/scene-urban.jpg',
      sortOrder: 3
    },
    {
      value: 'minimalist-indoor',
      label: 'Minimalist Indoor',
      description: 'Simple indoor setting',
      keywords: ['minimalist', 'indoor', 'simple', 'modern', 'clean'],
      technicalDetails: {
        background: 'neutral gray',
        furniture: 'minimal',
        lighting: 'soft, diffused'
      },
      sceneLockedPrompt: 'A minimalist indoor fashion background with neutral tones, clean geometry, natural materials, sparse furniture and intentional negative space, soft ambient daylight, subtle realistic shadows, tidy but lived-in atmosphere, no visual noise, empty scene, no people, no mannequin, no human reflection, background only, elegant contemporary interior style, ultra realistic, high detail.',
      sceneLockedPromptVi: 'Background indoor tối giản cho thời trang với tông trung tính, hình khối gọn gàng, vật liệu tự nhiên, nội thất ít nhưng có chủ đích và nhiều khoảng trống thị giác, ánh sáng ban ngày mềm, bóng đổ thực tế nhẹ, cảm giác ngăn nắp nhưng vẫn đời thường, không nhiễu thị giác, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, phong cách nội thất hiện đại tinh gọn, siêu thực, chi tiết cao.',
      sceneNegativePrompt: 'people, human, mannequin, face, body, hands, reflection of people, overly decorated room, maximalist clutter, heavy color cast, hard flash shadows, cgi render, blurry details, watermark',
      sceneNegativePromptVi: 'người, mannequin, mặt, cơ thể, tay, phản chiếu người, phòng trang trí quá dày, bừa bộn maximalist, ám màu nặng, bóng đèn flash cứng, render CGI, mờ chi tiết, watermark',
      previewImage: '/images/options/scene-minimalist.jpg',
      sortOrder: 4
    },
    {
      value: 'cafe',
      label: 'Cafe',
      description: 'Coffee shop environment',
      keywords: ['cafe', 'coffee shop', 'cozy', 'warm', 'inviting'],
      technicalDetails: {
        setting: 'cozy coffee shop',
        props: 'wooden table, coffee cup',
        ambiance: 'warm, inviting'
      },
      sceneLockedPrompt: 'A cozy café fashion background with warm wood textures, natural tabletop elements, soft mixed daylight and ambient interior light, layered depth around seating and display surfaces, naturally arranged lifestyle props, realistic material detail and shadows, welcoming lived-in atmosphere, empty scene, no people, no mannequin, no human reflection, background only, authentic coffee-shop environment, ultra realistic, high detail.',
      sceneLockedPromptVi: 'Background quán café ấm cúng cho thời trang với texture gỗ ấm, chi tiết bàn ghế tự nhiên, ánh sáng pha giữa daylight và đèn trong nhà mềm, chiều sâu không gian quanh khu ngồi và bề mặt trưng bày, đạo cụ lifestyle sắp xếp tự nhiên, chi tiết chất liệu và bóng đổ thực tế, không khí gần gũi có người dùng thường xuyên, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, môi trường quán café chân thực, siêu thực, chi tiết cao.',
      sceneNegativePrompt: 'people, human, crowd, barista, mannequin, face, hands, reflection of people, chaotic busy cafe, saturated neon, dark underexposed scene, cgi render, blurry textures, text watermark',
      sceneNegativePromptVi: 'người, đám đông, barista, mannequin, mặt, tay, phản chiếu người, quán quá đông lộn xộn, neon bão hòa, cảnh tối thiếu sáng, render CGI, texture mờ, watermark chữ',
      previewImage: '/images/options/scene-cafe.jpg',
      sortOrder: 5
    },
    {
      value: 'outdoor-park',
      label: 'Outdoor Park',
      description: 'Natural park setting',
      keywords: ['outdoor', 'park', 'nature', 'trees', 'grass'],
      technicalDetails: {
        location: 'lush green park',
        lighting: 'natural sunlight',
        elements: 'trees, grass, benches'
      },
      sceneLockedPrompt: 'A natural park fashion background with lush greenery, layered plants and open walking space, organic textures of grass, trees and pathway surfaces, soft daylight with realistic shadow falloff, balanced natural contrast, subtle environmental details placed naturally, empty scene, no people, no mannequin, no human reflection, background only, authentic outdoor lifestyle atmosphere, ultra realistic, high detail.',
      sceneLockedPromptVi: 'Background công viên tự nhiên cho thời trang với cây xanh phong phú, nhiều lớp thực vật và lối đi thoáng, texture hữu cơ của cỏ, cây và bề mặt lối đi, ánh sáng ban ngày mềm với bóng đổ tự nhiên, tương phản tự nhiên cân bằng, chi tiết môi trường sắp xếp tự nhiên, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, không khí outdoor lifestyle chân thực, siêu thực, chi tiết cao.',
      sceneNegativePrompt: 'people, human, crowd, pets, cyclists, mannequin, face, hands, reflection of people, storm weather, extreme fog, oversharpened HDR, cgi plants, low detail, watermark',
      sceneNegativePromptVi: 'người, đám đông, thú cưng, người đi xe đạp, mannequin, mặt, tay, phản chiếu người, thời tiết giông bão, sương mù dày, HDR quá gắt, cây cối CGI, ít chi tiết, watermark',
      previewImage: '/images/options/scene-park.jpg',
      sortOrder: 6
    },
    {
      value: 'office',
      label: 'Modern Office',
      description: 'Contemporary office space',
      keywords: ['office', 'corporate', 'modern', 'desk', 'professional'],
      technicalDetails: {
        setting: 'modern corporate office',
        furniture: 'desk, chair, computer',
        lighting: 'fluorescent'
      },
      sceneLockedPrompt: 'A modern office fashion background with clean professional layout, neutral corporate palette, realistic desk and shelving elements, contemporary material textures, soft balanced indoor lighting with subtle daylight influence, organized workspace details, empty scene, no people, no mannequin, no human reflection, background only, authentic business environment suitable for fashion-commercial compositing, ultra realistic, high detail.',
      sceneLockedPromptVi: 'Background văn phòng hiện đại cho thời trang với bố cục chuyên nghiệp gọn gàng, bảng màu corporate trung tính, chi tiết bàn làm việc và kệ tủ chân thực, texture vật liệu hiện đại, ánh sáng trong nhà cân bằng có ảnh hưởng nhẹ từ daylight, chi tiết không gian làm việc ngăn nắp, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, môi trường công sở thật phù hợp ghép nội dung thương mại thời trang, siêu thực, chi tiết cao.',
      sceneNegativePrompt: 'people, human, office workers, mannequin, face, body, hands, reflection of people, messy paperwork chaos, dark moody office noir, saturated neon, cgi render, blur, watermark text',
      sceneNegativePromptVi: 'người, nhân viên văn phòng, mannequin, mặt, cơ thể, tay, phản chiếu người, giấy tờ bừa bộn, văn phòng tối kiểu noir, neon bão hòa, render CGI, mờ, watermark chữ',
      previewImage: '/images/options/scene-office.jpg',
      sortOrder: 7
    },
    {
      value: 'luxury-interior',
      label: 'Luxury Interior',
      description: 'High-end interior',
      keywords: ['luxury', 'high-end', 'elegant', 'interior', 'premium'],
      technicalDetails: {
        decor: 'high-end furniture, artwork',
        materials: 'marble, wood, metal',
        lighting: 'chandelier, accent lights'
      },
      sceneLockedPrompt: 'A refined luxury interior fashion background with premium natural materials, elegant decorative accents, controlled warm ambient lighting, rich texture detail on surfaces, balanced depth and spatial layering, tasteful high-end atmosphere without visual overload, empty scene, no people, no mannequin, no human reflection, background only, upscale editorial-commercial setting, ultra realistic, high detail.',
      sceneLockedPromptVi: 'Background nội thất cao cấp tinh tế cho thời trang với vật liệu premium tự nhiên, điểm nhấn trang trí sang trọng, ánh sáng ambient ấm được kiểm soát, chi tiết texture bề mặt phong phú, chiều sâu và phân lớp không gian cân bằng, không khí cao cấp nhưng không rối mắt, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, phù hợp editorial/commercial cao cấp, siêu thực, chi tiết cao.',
      sceneNegativePrompt: 'people, human, mannequin, face, hands, reflection of people, overdecorated palace look, gaudy gold overload, blown highlights, cgi render, plastic textures, low detail, watermark',
      sceneNegativePromptVi: 'người, mannequin, mặt, tay, phản chiếu người, trang trí cung điện quá đà, vàng chóe lòe loẹt, cháy sáng, render CGI, texture nhựa giả, ít chi tiết, watermark',
      previewImage: '/images/options/scene-luxury.jpg',
      sortOrder: 8
    },
    {
      value: 'rooftop',
      label: 'Rooftop',
      description: 'Urban rooftop with skyline',
      keywords: ['rooftop', 'skyline', 'urban', 'city', 'view'],
      technicalDetails: {
        view: 'city skyline',
        surface: 'concrete or wooden deck',
        elements: 'railings, lounge chairs'
      },
      sceneLockedPrompt: 'A realistic urban rooftop fashion background with visible skyline depth, architectural edge details, natural rooftop material textures, clean open spatial composition, balanced daylight with realistic atmospheric perspective, subtle environmental objects arranged naturally, empty scene, no people, no mannequin, no human reflection, background only, authentic city rooftop mood, ultra realistic, high detail.',
      sceneLockedPromptVi: 'Background rooftop đô thị chân thực cho thời trang với chiều sâu skyline rõ ràng, chi tiết mép kiến trúc, texture vật liệu rooftop tự nhiên, bố cục không gian mở sạch sẽ, ánh sáng ban ngày cân bằng với phối cảnh khí quyển thực tế, vật thể môi trường phụ sắp xếp tự nhiên, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, mood rooftop thành phố chân thật, siêu thực, chi tiết cao.',
      sceneNegativePrompt: 'people, human, crowd, mannequin, face, body, hands, reflection of people, drone aerial POV, storm sky drama, overexposed sunset flare, cgi skyline, low detail, watermark logo',
      sceneNegativePromptVi: 'người, đám đông, mannequin, mặt, cơ thể, tay, phản chiếu người, góc drone từ trên cao, bầu trời giông quá kịch tính, flare hoàng hôn cháy sáng, skyline CGI, ít chi tiết, watermark logo',
      previewImage: '/images/options/scene-rooftop.jpg',
      sortOrder: 9
    }
  ],

  lighting: [
    {
      value: 'soft-diffused',
      label: 'Soft Diffused',
      description: 'Large softbox, flattering, even',
      keywords: ['soft', 'diffused', 'flattering', 'even', 'softbox'],
      technicalDetails: {
        key_light: '2x3 foot softbox, 45° angle, 2m high',
        fill: 'reflector opposite side',
        ratio: '1:2',
        power: '400W'
      },
      previewImage: '/images/options/lighting-soft.jpg',
      sortOrder: 1
    },
    {
      value: 'natural-window',
      label: 'Natural Window',
      description: 'Soft window light, organic',
      keywords: ['natural', 'window', 'soft', 'organic', 'daylight'],
      technicalDetails: {
        source: 'large window or open shade',
        time: 'morning or late afternoon',
        quality: 'soft, indirect'
      },
      previewImage: '/images/options/lighting-window.jpg',
      sortOrder: 2
    },
    {
      value: 'golden-hour',
      label: 'Golden Hour',
      description: 'Warm sunset/sunrise glow',
      keywords: ['golden hour', 'sunset', 'sunrise', 'warm', 'glow'],
      technicalDetails: {
        direction: 'low angle, warm',
        intensity: 'medium',
        color_temp: '3200K'
      },
      previewImage: '/images/options/lighting-golden.jpg',
      sortOrder: 3
    },
    {
      value: 'dramatic-rembrandt',
      label: 'Dramatic Rembrandt',
      description: 'Strong key light, deep shadows',
      keywords: ['dramatic', 'rembrandt', 'strong', 'shadows', 'key light'],
      technicalDetails: {
        key_light: 'strong single source, 45° high',
        fill: 'minimal',
        shadows: 'deep, defined',
        ratio: '1:4'
      },
      previewImage: '/images/options/lighting-dramatic.jpg',
      sortOrder: 4
    },
    {
      value: 'high-key',
      label: 'High Key',
      description: 'Bright, minimal shadows, clean',
      keywords: ['high key', 'bright', 'clean', 'minimal shadows'],
      technicalDetails: {
        setup: 'multiple soft sources',
        intensity: 'bright',
        shadows: 'minimal',
        ratio: '1:1'
      },
      previewImage: '/images/options/lighting-highkey.jpg',
      sortOrder: 5
    },
    {
      value: 'backlit',
      label: 'Backlit',
      description: 'Light from behind, rim glow',
      keywords: ['backlit', 'rim light', 'silhouette', 'glow'],
      technicalDetails: {
        rim_light: 'from behind subject',
        intensity: 'medium to high',
        effect: 'silhouette, rim glow'
      },
      previewImage: '/images/options/lighting-backlit.jpg',
      sortOrder: 6
    },
    {
      value: 'neon-colored',
      label: 'Neon/Colored',
      description: 'Colored gels, creative mood',
      keywords: ['neon', 'colored', 'gels', 'creative', 'RGB'],
      technicalDetails: {
        gels: 'RGB LED panels',
        colors: 'vibrant',
        intensity: 'medium',
        mood: 'creative, energetic'
      },
      previewImage: '/images/options/lighting-neon.jpg',
      sortOrder: 7
    },
    {
      value: 'overcast-outdoor',
      label: 'Overcast Outdoor',
      description: 'Even outdoor light, no harsh shadows',
      keywords: ['overcast', 'outdoor', 'even', 'cloudy', 'soft'],
      technicalDetails: {
        source: 'cloudy sky',
        quality: 'even, soft',
        direction: 'diffused',
        shadows: 'soft'
      },
      previewImage: '/images/options/lighting-overcast.jpg',
      sortOrder: 8
    }
  ],

  mood: [
    {
      value: 'confident',
      label: 'Confident & Powerful',
      description: 'Strong stance, direct gaze',
      keywords: ['confident', 'powerful', 'strong', 'direct', 'gaze'],
      technicalDetails: {
        pose: 'strong stance, weight on back leg',
        expression: 'direct eye contact',
        body_language: 'open, confident'
      },
      previewImage: '/images/options/mood-confident.jpg',
      sortOrder: 1
    },
    {
      value: 'relaxed',
      label: 'Relaxed & Casual',
      description: 'Natural, comfortable',
      keywords: ['relaxed', 'casual', 'natural', 'comfortable', 'easy'],
      technicalDetails: {
        pose: 'natural standing or sitting',
        expression: 'soft smile',
        body_language: 'relaxed shoulders'
      },
      previewImage: '/images/options/mood-relaxed.jpg',
      sortOrder: 2
    },
    {
      value: 'elegant',
      label: 'Elegant & Sophisticated',
      description: 'Refined, graceful',
      keywords: ['elegant', 'sophisticated', 'refined', 'graceful', 'poised'],
      technicalDetails: {
        pose: 'poised posture',
        expression: 'subtle smile',
        body_language: 'graceful movements'
      },
      previewImage: '/images/options/mood-elegant.jpg',
      sortOrder: 3
    },
    {
      value: 'energetic',
      label: 'Energetic & Dynamic',
      description: 'Active, movement',
      keywords: ['energetic', 'dynamic', 'active', 'movement', 'lively'],
      technicalDetails: {
        pose: 'dynamic stance',
        expression: 'bright smile',
        body_language: 'active, engaged'
      },
      previewImage: '/images/options/mood-energetic.jpg',
      sortOrder: 4
    },
    {
      value: 'playful',
      label: 'Playful & Fun',
      description: 'Lighthearted, joyful',
      keywords: ['playful', 'fun', 'lighthearted', 'joyful', 'cheerful'],
      technicalDetails: {
        pose: 'playful gesture',
        expression: 'big smile',
        body_language: 'light, fun'
      },
      previewImage: '/images/options/mood-playful.jpg',
      sortOrder: 5
    },
    {
      value: 'mysterious',
      label: 'Mysterious & Edgy',
      description: 'Dark, intriguing',
      keywords: ['mysterious', 'edgy', 'dark', 'intriguing', 'enigmatic'],
      technicalDetails: {
        pose: 'contemplative stance',
        expression: 'intense gaze',
        body_language: 'reserved, intriguing'
      },
      previewImage: '/images/options/mood-mysterious.jpg',
      sortOrder: 6
    },
    {
      value: 'romantic',
      label: 'Romantic & Dreamy',
      description: 'Soft, ethereal',
      keywords: ['romantic', 'dreamy', 'soft', 'ethereal', 'gentle'],
      technicalDetails: {
        pose: 'soft, flowing',
        expression: 'dreamy eyes',
        body_language: 'gentle, romantic'
      },
      previewImage: '/images/options/mood-romantic.jpg',
      sortOrder: 7
    },
    {
      value: 'professional',
      label: 'Professional & Corporate',
      description: 'Business-appropriate',
      keywords: ['professional', 'corporate', 'business', 'formal', 'executive'],
      technicalDetails: {
        pose: 'professional stance',
        expression: 'confident smile',
        body_language: 'business appropriate'
      },
      previewImage: '/images/options/mood-professional.jpg',
      sortOrder: 8
    }
  ],

  style: [
    {
      value: 'minimalist',
      label: 'Minimalist',
      description: 'Clean, simple, negative space',
      keywords: ['minimalist', 'clean', 'simple', 'negative space', 'modern'],
      technicalDetails: {
        composition: 'clean layout',
        colors: 'limited palette',
        focus: 'subject isolation'
      },
      previewImage: '/images/options/style-minimalist.jpg',
      sortOrder: 1
    },
    {
      value: 'editorial',
      label: 'Editorial',
      description: 'Magazine-quality, artistic',
      keywords: ['editorial', 'magazine', 'artistic', 'high fashion', 'stylish'],
      technicalDetails: {
        composition: 'artistic framing',
        lighting: 'dramatic',
        post_processing: 'retouched'
      },
      previewImage: '/images/options/style-editorial.jpg',
      sortOrder: 2
    },
    {
      value: 'commercial',
      label: 'Commercial',
      description: 'Product-focused, selling',
      keywords: ['commercial', 'product', 'selling', 'advertising', 'marketable'],
      technicalDetails: {
        composition: 'product centered',
        lighting: 'clean, professional',
        focus: 'saleable image'
      },
      previewImage: '/images/options/style-commercial.jpg',
      sortOrder: 3
    },
    {
      value: 'lifestyle',
      label: 'Lifestyle',
      description: 'Natural, candid feel',
      keywords: ['lifestyle', 'natural', 'candid', 'real', 'authentic'],
      technicalDetails: {
        composition: 'natural framing',
        lighting: 'available light',
        mood: 'authentic, real life'
      },
      previewImage: '/images/options/style-lifestyle.jpg',
      sortOrder: 4
    },
    {
      value: 'high-fashion',
      label: 'High Fashion',
      description: 'Avant-garde, dramatic',
      keywords: ['high fashion', 'avant-garde', 'dramatic', 'couture', 'elite'],
      technicalDetails: {
        composition: 'artistic, dramatic',
        lighting: 'theatrical',
        styling: 'experimental'
      },
      previewImage: '/images/options/style-highfashion.jpg',
      sortOrder: 5
    },
    {
      value: 'vintage',
      label: 'Vintage/Retro',
      description: 'Film-like, nostalgic',
      keywords: ['vintage', 'retro', 'film', 'nostalgic', 'classic'],
      technicalDetails: {
        lighting: 'warm, film-like',
        colors: 'muted, nostalgic',
        mood: 'timeless'
      },
      previewImage: '/images/options/style-vintage.jpg',
      sortOrder: 6
    },
    {
      value: 'street',
      label: 'Street Style',
      description: 'Urban, authentic',
      keywords: ['street', 'urban', 'authentic', 'city', 'real'],
      technicalDetails: {
        composition: 'street photography style',
        lighting: 'available urban light',
        mood: 'raw, authentic'
      },
      previewImage: '/images/options/style-street.jpg',
      sortOrder: 7
    },
    {
      value: 'artistic',
      label: 'Artistic',
      description: 'Creative, experimental',
      keywords: ['artistic', 'creative', 'experimental', 'abstract', 'unique'],
      technicalDetails: {
        composition: 'non-traditional',
        lighting: 'creative',
        concept: 'experimental'
      },
      previewImage: '/images/options/style-artistic.jpg',
      sortOrder: 8
    }
  ],

  colorPalette: [
    {
      value: 'neutral',
      label: 'Neutral Tones',
      description: 'Black, white, gray, beige',
      keywords: ['neutral', 'black', 'white', 'gray', 'beige'],
      technicalDetails: {
        colors: 'black, white, gray, beige',
        mood: 'timeless, professional',
        contrast: 'high contrast possible'
      },
      previewImage: '/images/options/palette-neutral.jpg',
      sortOrder: 1
    },
    {
      value: 'warm',
      label: 'Warm Tones',
      description: 'Red, orange, gold, earth',
      keywords: ['warm', 'red', 'orange', 'gold', 'earth'],
      technicalDetails: {
        colors: 'red, orange, gold, earth tones',
        mood: 'inviting, energetic',
        temperature: 'warm'
      },
      previewImage: '/images/options/palette-warm.jpg',
      sortOrder: 2
    },
    {
      value: 'cool',
      label: 'Cool Tones',
      description: 'Blue, teal, silver',
      keywords: ['cool', 'blue', 'teal', 'silver', 'icy'],
      technicalDetails: {
        colors: 'blue, teal, silver',
        mood: 'calm, professional',
        temperature: 'cool'
      },
      previewImage: '/images/options/palette-cool.jpg',
      sortOrder: 3
    },
    {
      value: 'vibrant',
      label: 'Vibrant',
      description: 'Bold, saturated colors',
      keywords: ['vibrant', 'bold', 'saturated', 'bright', 'colorful'],
      technicalDetails: {
        colors: 'bold, saturated',
        mood: 'energetic, fun',
        saturation: 'high'
      },
      previewImage: '/images/options/palette-vibrant.jpg',
      sortOrder: 4
    },
    {
      value: 'pastel',
      label: 'Pastel',
      description: 'Soft, muted, delicate',
      keywords: ['pastel', 'soft', 'muted', 'delicate', 'gentle'],
      technicalDetails: {
        colors: 'soft pastels',
        mood: 'gentle, feminine',
        saturation: 'low'
      },
      previewImage: '/images/options/palette-pastel.jpg',
      sortOrder: 5
    },
    {
      value: 'monochrome',
      label: 'Monochrome',
      description: 'Single color variations',
      keywords: ['monochrome', 'single color', 'variations', 'tonal'],
      technicalDetails: {
        colors: 'single color family',
        mood: 'sophisticated, classic',
        contrast: 'tonal variations'
      },
      previewImage: '/images/options/palette-monochrome.jpg',
      sortOrder: 6
    },
    {
      value: 'earth',
      label: 'Earth Tones',
      description: 'Brown, olive, terracotta',
      keywords: ['earth', 'brown', 'olive', 'terracotta', 'natural'],
      technicalDetails: {
        colors: 'brown, olive, terracotta',
        mood: 'natural, grounded',
        inspiration: 'nature'
      },
      previewImage: '/images/options/palette-earth.jpg',
      sortOrder: 7
    },
    {
      value: 'jewel',
      label: 'Jewel Tones',
      description: 'Deep emerald, ruby, sapphire',
      keywords: ['jewel', 'emerald', 'ruby', 'sapphire', 'deep'],
      technicalDetails: {
        colors: 'deep emerald, ruby, sapphire',
        mood: 'luxurious, rich',
        saturation: 'high, deep'
      },
      previewImage: '/images/options/palette-jewel.jpg',
      sortOrder: 8
    }
  ],

  cameraAngle: [
    {
      value: 'eye-level',
      label: 'Eye Level',
      description: 'Straight on, natural perspective',
      keywords: ['eye level', 'straight on', 'natural', 'perspective'],
      technicalDetails: {
        height: 'subject eye level',
        distance: '3-4 meters',
        lens: '85mm f/1.8',
        perspective: 'natural'
      },
      previewImage: '/images/options/angle-eyelevel.jpg',
      sortOrder: 1
    },
    {
      value: 'slightly-above',
      label: 'Slightly Above',
      description: 'Flattering, slimming',
      keywords: ['above', 'flattering', 'slimming', 'high angle'],
      technicalDetails: {
        height: '20-30cm above eye level',
        distance: '3-4 meters',
        lens: '85mm f/1.8',
        effect: 'slimming'
      },
      previewImage: '/images/options/angle-above.jpg',
      sortOrder: 2
    },
    {
      value: 'low-angle',
      label: 'Low Angle',
      description: 'Looking up, powerful',
      keywords: ['low angle', 'looking up', 'powerful', 'heroic'],
      technicalDetails: {
        height: '1 meter below eye level',
        distance: '2-3 meters',
        lens: '50mm f/1.4',
        effect: 'powerful'
      },
      previewImage: '/images/options/angle-low.jpg',
      sortOrder: 3
    },
    {
      value: 'three-quarter',
      label: 'Three-Quarter',
      description: '45-degree angle, dynamic',
      keywords: ['three quarter', '45 degree', 'dynamic', 'angled'],
      technicalDetails: {
        angle: '45° to subject',
        height: 'eye level',
        distance: '3-4 meters',
        lens: '70mm f/1.8',
        effect: 'dynamic'
      },
      previewImage: '/images/options/angle-threequarter.jpg',
      sortOrder: 4
    },
    {
      value: 'full-body-straight',
      label: 'Full Body Straight',
      description: 'Head to toe, centered',
      keywords: ['full body', 'straight', 'head to toe', 'centered'],
      technicalDetails: {
        height: 'eye level',
        distance: '4-5 meters',
        lens: '50mm f/1.8',
        perspective: 'straight on'
      },
      previewImage: '/images/options/angle-fullbody.jpg',
      sortOrder: 5
    },
    {
      value: 'close-up-detail',
      label: 'Close-Up Detail',
      description: 'Focus on product details',
      keywords: ['close up', 'detail', 'product focus', 'macro'],
      technicalDetails: {
        distance: '1-2 meters',
        lens: '100mm f/2.8',
        focus: 'product details',
        depth: 'shallow'
      },
      previewImage: '/images/options/angle-closeup.jpg',
      sortOrder: 6
    }
  ]
};

// ============================================================
// SEEDING FUNCTIONS
// ============================================================

/**
 * Seed all options into database
 */
export async function seedOptions() {
  console.log('\n🌱 SEEDING PROMPT OPTIONS...');

  let seeded = 0;
  let updated = 0;
  let errors = 0;

  for (const [category, options] of Object.entries(OPTIONS_DATA)) {
    console.log(`\n📂 Seeding category: ${category}`);

    for (const optionData of options) {
      try {
        const existing = await PromptOption.findOne({ value: optionData.value });

        if (existing) {
          // Update existing
          Object.assign(existing, optionData);
          await existing.save();
          updated++;
          console.log(`   ✅ Updated: ${optionData.value}`);
        } else {
          // Create new
          await PromptOption.create(optionData);
          seeded++;
          console.log(`   🆕 Created: ${optionData.value}`);
        }
      } catch (error) {
        errors++;
        console.log(`   ❌ Error with ${optionData.value}: ${error.message}`);
      }
    }
  }

  console.log(`\n🌱 SEEDING COMPLETE:`);
  console.log(`   🆕 Seeded: ${seeded}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);

  return { seeded, updated, errors };
}

/**
 * Validate seeded data
 */
export async function validateOptions() {
  console.log('\n🔍 VALIDATING SEED DATA...');

  const issues = [];
  let valid = true;

  // Check each category has options
  for (const category of Object.keys(OPTIONS_DATA)) {
    const count = await PromptOption.countDocuments({ category, isActive: true });
    if (count === 0) {
      issues.push(`Category '${category}' has no active options`);
      valid = false;
    } else {
      console.log(`   ✅ ${category}: ${count} active options`);
    }
  }

  // Check for duplicate values
  const duplicates = await PromptOption.aggregate([
    { $group: { _id: '$value', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (duplicates.length > 0) {
    issues.push(`Found ${duplicates.length} duplicate values`);
    valid = false;
  }

  // Check required fields
  const options = await PromptOption.find({});
  for (const option of options) {
    if (!option.keywords || option.keywords.length === 0) {
      issues.push(`Option '${option.value}' missing keywords`);
    }
    if (!option.technicalDetails || Object.keys(option.technicalDetails).length === 0) {
      issues.push(`Option '${option.value}' missing technical details`);
    }
  }

  console.log(`\n🔍 VALIDATION RESULT: ${valid ? 'PASSED' : 'FAILED'}`);
  if (issues.length > 0) {
    console.log('Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }

  return { valid, issues };
}

/**
 * Clear all options (for testing)
 */
export async function clearOptions() {
  console.log('\n🗑️  CLEARING ALL OPTIONS...');
  const result = await PromptOption.deleteMany({});
  console.log(`   Deleted ${result.deletedCount} options`);
  return result;
}

// ============================================================
// CLI EXECUTION
// ============================================================

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
  // Connect to MongoDB (you'll need to configure your connection)
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartwardrobe';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('📊 Connected to MongoDB');

    const args = process.argv.slice(2);
    
    if (args.includes('--clear')) {
      await clearOptions();
    }
    
    if (args.includes('--seed')) {
      await seedOptions();
    }
    
    if (args.includes('--validate')) {
      await validateOptions();
    }
    
    if (args.length === 0) {
      // Default: seed and validate
      await seedOptions();
      await validateOptions();
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  seedOptions,
  validateOptions,
  clearOptions,
  OPTIONS_DATA
};
