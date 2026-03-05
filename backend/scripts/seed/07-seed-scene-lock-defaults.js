import mongoose from 'mongoose';
import 'dotenv/config';
import PromptOption from '../../models/PromptOption.js';

const DEFAULT_FOCUS_SCENES = [
  {
    value: 'studio',
    label: 'Studio (Linh Pháp Soft Pink)',
    labelVi: 'Studio (Linh Pháp Hồng Nhẹ)',
    description: 'Minimal fashion studio boutique with blush pink wall, central white island and Linh Pháp signage',
    descriptionVi: 'Studio thời trang tối giản với tường hồng nhạt, đảo trưng bày trắng ở giữa và bảng hiệu Linh Pháp',
    keywords: ['studio', 'soft pink boutique', 'linh phap sign', 'minimal retail', 'fashion showroom'],
    technicalDetails: {
      environment: 'minimal boutique studio interior with blush pink wall',
      lighting: 'soft warm track lights and clean ambient fill, low contrast shadows',
      elements: 'single clothing rack, right-side floating shelves, handbags and heels, central white display island',
      branding: 'backlit script sign reading Linh Pháp on rear wall',
      camera: 'eye-level, symmetrical frontal composition, medium-wide lens',
      usage: 'scene lock for fashion try-on and product overlay'
    },
    promptSuggestion: 'Minimal feminine fashion studio with soft pink wall, glowing "Linh Pháp" script sign, one rack of neutral-pink garments, white display island in center, and right-side shelves with handbags and shoes.',
    promptSuggestionVi: 'Studio thời trang nữ tính tối giản với tường hồng phấn nhẹ, bảng chữ "Linh Pháp" phát sáng, một rack đồ tông nude-hồng, đảo trưng bày trắng ở giữa và kệ phải trưng bày túi/giày.',
    sceneLockedPrompt: `A minimal fashion boutique studio interior, soft blush-pink back wall with smooth matte texture, a warm white backlit script sign reading "Linh Pháp" centered on the wall, clean white floor tiles with subtle reflections, one long horizontal clothing rack positioned under the sign, rack filled with women's garments in dusty pink, nude, beige, cream, and taupe tones, realistic mix of dresses, blouses, knitwear, and sets on wooden hangers, natural fabric drape and wrinkles, a large rectangular matte-white display island centered in foreground, right side built-in arched niche with floating white shelves, shelves displaying small handbags, heels, sandals, and ankle boots in neutral tones, a few handbags resting above the rack line, minimalist luxury-retail styling, tidy but not sterile, realistic depth and soft shadows, ceiling track lights visible and switched on, eye-level frontal camera, symmetrical composition, empty store scene, no people, no mannequin, no mirrors showing humans, background only, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Không gian studio boutique thời trang tối giản, tường sau màu hồng phấn nhạt bề mặt mịn, bảng chữ viết tay "Linh Pháp" phát sáng trắng ấm đặt chính giữa tường, sàn gạch trắng sạch có phản xạ nhẹ, một thanh treo đồ ngang dài đặt dưới bảng hiệu, quần áo nữ tông dusty pink, nude, beige, cream và taupe, gồm váy, áo, đồ len và set bộ trên móc gỗ, nếp rũ vải tự nhiên và chân thật, khối đảo trưng bày chữ nhật màu trắng mờ đặt giữa tiền cảnh, bên phải có hốc vòm âm tường với các kệ trắng nổi, trên kệ bày túi xách nhỏ, giày cao gót, sandal và ankle boots tông trung tính, một vài túi đặt phía trên đường rack, phong cách retail tối giản cao cấp, gọn gàng nhưng không vô hồn, chiều sâu và bóng đổ mềm thực tế, đèn ray trần nhìn thấy rõ và đang bật, góc máy ngang tầm mắt, bố cục chính diện cân đối, cảnh cửa hàng trống, không người, không mannequin, không gương phản chiếu người, chỉ background, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, human, model, mannequin, face, body parts, reflection of person, crowded store, colorful neon signs, dark moody nightclub lighting, messy clutter, street scene, outdoor environment, CGI render, cartoon, anime, fisheye distortion, tilted camera, extreme close-up',
    sceneNegativePromptVi: 'người, mẫu, mannequin, khuôn mặt, bộ phận cơ thể, phản chiếu người, cửa hàng đông đúc, biển neon nhiều màu, ánh sáng nightclub tối, bừa bộn quá mức, cảnh đường phố, môi trường ngoài trời, CGI, hoạt hình, anime, méo fisheye, góc máy nghiêng, cận cảnh quá mức',
    previewImage: '/images/options/scene-studio-linhphap-pink.jpg',
    sortOrder: 0
  },
  {
    value: 'linhphap-tryon-room',
    label: 'Try-On Room (Linh Pháp)',
    labelVi: 'Phòng Thử Đồ (Linh Pháp)',
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
    sceneLockedPrompt: `A realistic home try-on room for women's fashion, neutral walls and natural materials, wooden floor with visible texture, light curtains softly diffusing daylight, a full-length mirror leaning against the wall, a chair and bed with various fashion items casually placed, women's clothing including tops, dresses, matching sets, loungewear, sleepwear, and sexy outfits, different fabrics such as cotton, silk, lace, satin, a mix of colors, patterns, and tones, not uniform, women's accessories visible around the room, handbags, shoes, sandals, heels placed naturally on the floor, a small shelf with makeup items, cosmetics, and beauty products, a few hats and fashion accessories casually arranged, natural folds, real fabric texture, soft daylight with realistic shadows, slightly messy lived-in feeling, a small fabric tag reading "Linh Pháp" attached to a clothing hanger, empty scene, no people, no human, no mannequin, no reflection of people, background only, realistic apartment environment, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Phòng thay đồ tại nhà chân thực cho thời trang nữ, tường trung tính và chất liệu tự nhiên, sàn gỗ có vân rõ, rèm sáng khuếch tán ánh sáng ban ngày, gương đứng tựa tường, ghế và giường có nhiều món đồ thời trang đặt tự nhiên, gồm áo, váy, set bộ, đồ mặc nhà, đồ ngủ và đồ sexy, đa dạng chất liệu cotton/silk/lace/satin, màu sắc và họa tiết phong phú không đồng nhất, phụ kiện nữ xuất hiện quanh phòng, túi xách/giày/sandal/giày cao gót đặt tự nhiên trên sàn, kệ nhỏ có đồ makeup và mỹ phẩm, mũ và phụ kiện sắp xếp ngẫu nhiên, nếp vải tự nhiên và texture thật, ánh sáng ban ngày mềm với bóng đổ thực tế, cảm giác có người ở, hơi bừa nhưng hợp lý, có tag vải chữ "Linh Pháp" trên móc treo, cảnh trống không người, không mannequin, không phản chiếu người, chỉ background, môi trường căn hộ chân thực, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, human, model, mannequin, face, body, hands, reflection of people, menswear, masculine style, single color palette, pastel only, monochrome, perfect studio setup, luxury showroom, cgi, unreal, artificial, camera POV, selfie, portrait',
    sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, cơ thể, tay, phản chiếu người, đồ nam, phong cách nam tính, bảng màu đơn sắc, chỉ pastel, setup studio hoàn hảo, showroom xa xỉ, CGI, giả, góc nhìn POV, selfie, chân dung',
    previewImage: '/images/options/scene-linhphap-tryon.jpg',
    sortOrder: 1
  },
  {
    value: 'linhphap-boutique',
    label: 'Small Boutique (Linh Pháp)',
    labelVi: 'Boutique Nhỏ (Linh Pháp)',
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
    sceneLockedPrompt: `A small local women's fashion boutique interior, neutral base colors with warm wooden elements, clothing racks filled with women's fashion items, a wide variety of apparel including tops, dresses, matching sets, loungewear, sexy outfits, diverse colors, patterns, and fabrics, shoes, sandals, heels displayed near the racks, handbags hanging or placed on shelves, hats and fashion accessories integrated naturally, a small display table with makeup and beauty products, natural arrangement, not perfectly styled, no single dominant color palette, warm ambient lighting mixed with daylight, authentic small business atmosphere, a subtle handwritten sign reading "Linh Pháp" placed on a shelf, empty store, no people, no mannequin, background only, realistic retail environment, ultra realistic`,
    sceneLockedPromptVi: `Không gian boutique thời trang nữ địa phương quy mô nhỏ, tông nền trung tính với điểm nhấn gỗ ấm, rack quần áo đầy đủ sản phẩm nữ, đa dạng áo, váy, set bộ, đồ mặc nhà, đồ sexy, màu sắc/họa tiết/chất liệu phong phú, giày/sandal/giày cao gót trưng gần kệ, túi xách treo hoặc đặt trên shelf, mũ và phụ kiện sắp xếp tự nhiên, bàn trưng bày nhỏ có mỹ phẩm và đồ làm đẹp, bố cục tự nhiên không quá hoàn hảo, không có bảng màu đơn điệu, ánh sáng đèn ấm pha daylight, bầu không khí cửa hàng nhỏ chân thực, có bảng viết tay "Linh Pháp" đặt trên kệ, cửa hàng trống không người, không mannequin, chỉ background, môi trường bán lẻ chân thực, siêu thực`,
    sceneNegativePrompt: 'people, human, model, mannequin, face, body, hands, menswear, luxury fashion house, perfect showroom, single color theme, cgi, artificial lighting, camera POV, portrait',
    sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, cơ thể, tay, đồ nam, cửa hàng thời trang xa xỉ, showroom hoàn hảo, tông màu đơn điệu, CGI, ánh sáng giả, POV, chân dung',
    previewImage: '/images/options/scene-linhphap-boutique.jpg',
    sortOrder: 2
  },
  {
    value: 'linhphap-bedroom-lifestyle',
    label: 'Bedroom Lifestyle (Linh Pháp)',
    labelVi: 'Phòng Ngủ Lifestyle (Linh Pháp)',
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
    sceneLockedPrompt: `A realistic feminine bedroom lifestyle background, neutral wall tones and wooden furniture, bed, chair, and small table with women's fashion items, a mix of tops, dresses, sets, sleepwear, and sexy outfits, clothes casually placed with natural folds, variety of colors and textures, handbags resting on a chair, shoes and sandals placed near the bed, hats and accessories casually arranged, a vanity or small table with makeup and cosmetics, soft daylight coming through a window, realistic shadows and depth, lived-in everyday atmosphere, a small fabric tag reading "Linh Pháp" placed on folded clothing, empty scene, no people, background only, realistic home environment, ultra realistic photography`,
    sceneLockedPromptVi: `Background phòng ngủ nữ tính chân thực cho lifestyle, tường trung tính và nội thất gỗ, giường/ghế/bàn nhỏ có các món thời trang nữ, gồm áo, váy, set bộ, đồ ngủ, đồ sexy, quần áo đặt tự nhiên với nếp gấp thật, đa dạng màu sắc và texture, túi xách đặt trên ghế, giày và sandal gần giường, mũ và phụ kiện sắp xếp ngẫu nhiên, bàn trang điểm nhỏ có mỹ phẩm, ánh sáng cửa sổ mềm, bóng đổ và chiều sâu thực tế, không khí đời thường có người ở, có tag vải chữ "Linh Pháp" trên đồ gấp, cảnh trống không người, chỉ background, môi trường nhà ở chân thực, ảnh siêu thực`,
    sceneNegativePrompt: 'people, human, model, mannequin, face, hands, reflection of people, menswear, hotel room, luxury suite, single color palette, cgi, artificial, camera POV',
    sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, tay, phản chiếu người, đồ nam, phòng khách sạn, luxury suite, bảng màu đơn điệu, CGI, giả, góc POV',
    previewImage: '/images/options/scene-linhphap-bedroom.jpg',
    sortOrder: 3
  },
  {
    value: 'linhphap-workroom-livestream',
    label: 'Workroom & Livestream (Linh Pháp)',
    labelVi: 'Phòng Làm Việc & Livestream (Linh Pháp)',
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
    sceneLockedPrompt: `A realistic home workroom of a female fashion shop owner, used for daily work and livestream selling, natural materials, wooden desk and shelves, a clothing rack filled with women's fashion items, including tops, dresses, matching sets, loungewear, and sexy outfits, diverse colors, patterns, and fabric types, no uniform color palette, shoes, handbags, and fashion accessories placed naturally around the room, cosmetics and beauty products on a side table, livestream tools integrated naturally into the space, a smartphone mounted on a tripod positioned for livestream, a ring light visible near the desk, a small desk microphone or clip-on mic, charging cables, power strips, and adapters slightly visible, a laptop or tablet open on the desk, a soft LED neon sign on the wall reading "Linh Pháp", warm white or soft pink LED glow not overpowering, open boxes with fashion items and packaging materials nearby, fabric samples, tags, ribbons, notebooks scattered naturally, natural daylight mixed with soft indoor lighting and LED glow, realistic shadows and depth, slightly messy but organized workspace, empty room, no people, no human, background only, authentic lived-in working and livestream selling environment, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Phòng làm việc tại nhà chân thực của nữ chủ shop thời trang, dùng cho công việc hàng ngày và livestream bán hàng, vật liệu tự nhiên, bàn và kệ gỗ, rack đồ chứa nhiều sản phẩm nữ gồm áo, váy, set bộ, đồ mặc nhà, đồ sexy, màu sắc/họa tiết/chất liệu đa dạng, không đồng nhất bảng màu, giày/túi/phụ kiện đặt tự nhiên quanh phòng, mỹ phẩm và đồ làm đẹp trên bàn phụ, thiết bị livestream tích hợp tự nhiên trong không gian, điện thoại gắn tripod để livestream, ring light gần bàn, micro bàn hoặc micro cài áo, dây sạc/ổ cắm/adapter hơi lộ, laptop hoặc tablet mở trên bàn, đèn LED chữ "Linh Pháp" trên tường, ánh LED trắng ấm hoặc hồng nhẹ không quá gắt, có thùng hàng mở và vật liệu đóng gói, mẫu vải/tag/ribbon/sổ ghi chú đặt tự nhiên, ánh sáng ban ngày pha đèn trong nhà và LED, bóng đổ có chiều sâu, không gian hơi bừa nhưng có tổ chức, phòng trống không người, chỉ background, môi trường làm việc và livestream chân thực, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, human, model, mannequin, face, body, hands, reflection of people, menswear, masculine style, professional TV studio, perfect influencer room, luxury showroom, single color palette, pastel only, overly bright neon, cgi, unreal, artificial, camera POV, selfie, portrait',
    sceneNegativePromptVi: 'người, mẫu, mannequin, mặt, cơ thể, tay, phản chiếu người, đồ nam, phong cách nam tính, studio TV chuyên nghiệp, phòng influencer quá hoàn hảo, showroom xa xỉ, bảng màu đơn điệu, chỉ pastel, đèn neon quá gắt, CGI, giả, POV, selfie, chân dung',
    previewImage: '/images/options/scene-linhphap-workroom.jpg',
    sortOrder: 4
  }
];

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ai';
  await mongoose.connect(uri);
  console.log('✅ Connected MongoDB');

  for (const scene of DEFAULT_FOCUS_SCENES) {
    const updated = await PromptOption.findOneAndUpdate(
      { category: 'scene', value: scene.value },
      {
        $set: {
          ...scene,
          category: 'scene',
          useSceneLock: true,
          isActive: true,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
          sceneLockSamples: [],
          sceneLockedImageUrl: null
        }
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Upserted scene ${updated.value}`);
  }

  await mongoose.disconnect();
  console.log('🎉 Done');
}

run().catch(async (e) => {
  console.error('❌ Seed failed:', e.message);
  await mongoose.disconnect();
  process.exit(1);
});
