/**
 * Seed Vietnamese Translations for PromptOptions
 * 
 * Usage: node backend/scripts/seedVietnameseTranslations.js
 * 
 * Populates labelVi and descriptionVi fields for all PromptOption documents
 */

import mongoose from 'mongoose';
import PromptOption from '../models/PromptOption.js';

const PROMPT_TRANSLATIONS_VI = {
  scene: {
    studio: { label: 'Studio chuyên nghiệp', desc: 'Cài đặt studio chuyên nghiệp với đèn kiểm soát' },
    'white-background': { label: 'Nền trắng', desc: 'Nền trắng sạch với ánh sáng trung tính' },
    'urban-street': { label: 'Đường phố thành phố', desc: 'Cảnh đường phố thành phố với kiến trúc hiện đại' },
    'minimalist-indoor': { label: 'Phòng tối giản', desc: 'Nội thất tối giản với nền sạch' },
    cafe: { label: 'Quán cà phê', desc: 'Quán cà phê ấm cúng với ánh sáng tự nhiên' },
    'outdoor-park': { label: 'Công viên ngoài trời', desc: 'Không gian xanh với ánh sáng tự nhiên' },
    office: { label: 'Văn phòng hiện đại', desc: 'Văn phòng chuyên nghiệp với nội thất hiện đại' },
    'luxury-interior': { label: 'Nội thất sang trọng', desc: 'Phòng sang trọng với trang trí cao cấp' },
    rooftop: { label: 'Sân thượng', desc: 'View từ sân thượng thành phố' },
    beach: { label: 'Bãi biển', desc: 'Bãi biển xinh đẹp với nắng vàng chiều' },
    nature: { label: 'Thiên nhiên', desc: 'Cảnh thiên nhiên hoang dã' },
    garden: { label: 'Vườn', desc: 'Vườn xanh với hoa cây' },
    home: { label: 'Nhà ở', desc: 'Căn hộ hoặc nhà ở riêng' }
  },

  lighting: {
    'soft-diffused': { label: 'Ánh sáng mềm, khuếch tán', desc: 'Ánh sáng mềm không tạo bóng quá đậm' },
    'golden-hour': { label: 'Ánh sáng vàng chiều', desc: 'Ánh sáng ấm áp lúc hoàng hôn' },
    'studio-bright': { label: 'Ánh sáng studio sáng', desc: 'Ánh sáng studio mạnh, đều' },
    'dramatic-shadow': { label: 'Ánh sáng kịch tính', desc: 'Ánh sáng tạo bóng đậm, kịch tính' },
    backlighting: { label: 'Ánh sáng từ sau', desc: 'Ánh sáng từ phía sau tạo hào quang' },
    'rim-light': { label: 'Ánh sáng viền', desc: 'Ánh sáng tạo viền sáng quanh hình' },
    'natural-window': { label: 'Ánh sáng cửa sổ tự nhiên', desc: 'Ánh sáng tự nhiên từ cửa sổ' },
    sunset: { label: 'Ánh sáng hoàng hôn', desc: 'Ánh sáng cam vàng lúc hoàng hôn' },
    'moody-dark': { label: 'Ánh sáng u ám', desc: 'Ánh sáng tối tạo không khí u ám' },
    overcast: { label: 'Ánh sáng u mưu', desc: 'Ánh sáng xám với độ phủ mây dày'  }
  },

  mood: {
    confident: { label: 'Tự tin', desc: 'Trang thái tự tin, vững chắc' },
    elegant: { label: 'Thanh lịch', desc: 'Thái độ thanh lịch, tinh tế' },
    playful: { label: 'Vui tươi', desc: 'Không khí vui nhộn, lạc quan' },
    serious: { label: 'Nghiêm túc', desc: 'Biểu cảm nghiêm túc, chuyên nghiệp' },
    romantic: { label: 'Lãng mạn', desc: 'Cảm xúc lãng mạn, nhu mục' },
    energetic: { label: 'Năng động', desc: 'Năng lượng cao, sôi động' },
    calm: { label: 'Bình tĩnh', desc: 'Yên tĩnh, thư thả' },
    mysterious: { label: 'Bí ẩn', desc: 'Không khí bí ẩn, huyền diệu' },
    sultry: { label: 'Gợi cảm', desc: 'Cuốn hút, gợi cảm' },
    joyful: { label: 'Vui vẻ', desc: 'Hạnh phúc, tươi cười' }
  },

  style: {
    minimalist: { label: 'Tối giản', desc: 'Phong cách tối giản, đơn sạch' },
    casual: { label: 'Thường ngày', desc: 'Phong cách hàng ngày, thoải mái' },
    formal: { label: 'Trang trọng', desc: 'Phong cách trang trọng, sang trọng' },
    elegant: { label: 'Thanh lịch', desc: 'Phong cách thanh lịch, tinh tế' },
    sporty: { label: 'Thể thao', desc: 'Phong cách thể thao năng động' },
    vintage: { label: 'Hoài cổ', desc: 'Phong cách hoài cổ, retro' },
    edgy: { label: 'Táo bạo', desc: 'Phong cách với cá tính mạnh' },
    bohemian: { label: 'Tự do', desc: 'Phong cách tự do, bohemian' },
    luxury: { label: 'Sang trọng', desc: 'Phong cách cao cấp, luxury' },
    avant_garde: { label: 'Tiên phong', desc: 'Phong cách độc lập, tiên phong' }
  },

  colorPalette: {
    vibrant: { label: 'Sôi động', desc: 'Màu sắc sôi động, nổi bật' },
    monochrome: { label: 'Đơn sắc', desc: 'Một tông màu chủ đạo' },
    pastel: { label: 'Pastel nhẹ nhàng', desc: 'Màu pastel mềm mại' },
    'jewel-tones': { label: 'Tông màu đá quý', desc: 'Màu tương tự đá quý sâu sắc' },
    'earth-tones': { label: 'Tông màu đất', desc: 'Màu tự nhiên như đất, cơm' },
    'white-black': { label: 'Trắng-Đen tương phản', desc: 'Tương phản cao giữa trắng và đen' },
    warm: { label: 'Ấm áp', desc: 'Các sắc ấm: cam, đỏ, vàng' },
    cool: { label: 'Mát lạnh', desc: 'Các sắc mát: xanh, tím, hồng' },
    neutral: { label: 'Trung tính', desc: 'Màu trung tính: nâu, xám, kem' }
  },

  cameraAngle: {
    'eye-level': { label: 'Góc mắt', desc: 'Chụp ở độ cao mắt bình thường' },
    'low-angle': { label: 'Góc thấp', desc: 'Chụp từ dưới hướng lên' },
    'high-angle': { label: 'Góc cao', desc: 'Chụp từ trên hướng xuống' },
    'side-profile': { label: 'Hồ sơ bên', desc: 'Chụp cạnh người mẫu' },
    'over-shoulder': { label: 'Phía trên vai', desc: 'Chụp từ phía sau qua vai' },
    'close-up': { label: 'Chụp cận cảnh', desc: 'Chụp gần chi tiết sâu' },
    'full-body': { label: 'Toàn thân', desc: 'Chụp từ đầu đến chân' }
  },

  hairstyle: {
    straight: { label: 'Thẳng', desc: 'Tóc thẳng mượt' },
    wavy: { label: 'Xoăn nhẹ', desc: 'Tóc có sóng nhẹ' },
    curly: { label: 'Xoăn', desc: 'Tóc xoăn từ từ' },
    'high-ponytail': { label: 'Đuôi ngựa cao', desc: 'Buộc tóc cao phía sau' },
    'low-ponytail': { label: 'Đuôi ngựa thấp', desc: 'Buộc tóc thấp phía sau' },
    'half-up': { label: 'Nửa tóc', desc: 'Buộc nửa trên, nửa dưới thả' },
    bun: { label: 'Tóc búi', desc: 'Tóc cuộn búi ở sau' },
    braided: { label: 'Tóc bện', desc: 'Tóc bện dạng đuôi cá' },
    tousled: { label: 'Tóc tù xù', desc: 'Tóc xù xơ, tự nhiên'  }
  },

  makeup: {
    natural: { label: 'Tự nhiên', desc: 'Trang điểm nhẹ, tự nhiên' },
    'bold-eye': { label: 'Mắt kẻ đậm', desc: 'Trang điểm mắt nổi bật' },
    'red-lips': { label: 'Môi đỏ', desc: 'Trang điểm môi đỏ đậm' },
    'smoky-eyes': { label: 'Mắt khói', desc: 'Mắt khói kịch tính' },
    'clean-girl': { label: 'Cô gái sạch', desc: 'Trang điểm sạch tươi' },
    douyin: { label: 'Style Douyin', desc: 'Phong cách makeup trendy' },
    glam: { label: 'Lộng lẫy', desc: 'Trang điểm lộng lẫy, sang trọng' }
  }
};

async function seedVietnameseTranslations() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
    await mongoose.connect(mongoUrl);
    console.log('✓ Connected to MongoDB');

    let updated = 0;
    let failed = 0;

    for (const [category, options] of Object.entries(PROMPT_TRANSLATIONS_VI)) {
      for (const [value, translations] of Object.entries(options)) {
        try {
          const result = await PromptOption.findOneAndUpdate(
            { category, value },
            {
              labelVi: translations.label,
              descriptionVi: translations.desc
            },
            { new: true }
          );

          if (result) {
            updated++;
            console.log(`✓ Updated ${category}/${value}`);
          } else {
            console.log(`⚠ Not found: ${category}/${value}`);
          }
        } catch (err) {
          failed++;
          console.error(`✗ Error updating ${category}/${value}:`, err.message);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✓ Updated: ${updated} options`);
    console.log(`✗ Failed: ${failed} options`);

    await mongoose.connection.close();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

seedVietnameseTranslations();
