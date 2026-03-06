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
    value: 'outdoor-natural',
    label: 'Outdoor Natural (Linh Pháp Picnic Booth)',
    labelVi: 'Ngoài Trời Tự Nhiên (Booth Dã Ngoại Linh Pháp)',
    description: 'Natural outdoor fashion booth with realistic props and subtle Linh Pháp identity',
    descriptionVi: 'Booth thời trang ngoài trời tự nhiên với đạo cụ đời thực và dấu ấn Linh Pháp tinh tế',
    keywords: ['outdoor', 'park', 'natural light', 'fashion booth', 'linh phap branding'],
    technicalDetails: {
      environment: 'urban park corner with lawn, trees, and temporary fashion booth setup',
      lighting: 'bright overcast daylight, soft shadows, natural color rendering',
      elements: 'portable rack, folding table, product baskets, accessories stand, transport crates',
      branding: 'small linen banner and paper tags with Linh Pháp text',
      camera: 'eye-level medium-wide framing with clear center standing zone',
      usage: 'casual outdoor try-on and product showcase'
    },
    promptSuggestion: 'Realistic outdoor fashion pop-up in a park with mixed women outfits, practical booth props, and subtle Linh Pháp brand elements.',
    promptSuggestionVi: 'Không gian pop-up thời trang ngoài trời trong công viên, đồ nữ đa dạng, đạo cụ bán hàng thực tế và điểm chạm thương hiệu Linh Pháp tinh tế.',
    sceneLockedPrompt: `A realistic outdoor fashion pop-up corner in a public park, trimmed grass and leafy trees in the background, portable canopy in off-white fabric, one metal clothing rack with diverse women outfits including dresses, tops, denim, sets, knitwear and light jackets, varied colors and textures not monochrome, woven baskets containing folded clothes, sandals, sneakers, and small handbags, a foldable wooden table with perfume bottles, jewelry trays, and beauty pouches, handwritten paper price tags and kraft packaging naturally scattered, a subtle linen banner reading "Linh Pháp" tied to booth frame, branded cloth tags on several hangers, delivery tote bags and reusable boxes near the table, realistic slight disorder from active usage, bright natural daylight with soft shadows, true-to-life object scale and perspective, center area left clear for model movement, empty scene, no people, background only, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Góc pop-up thời trang ngoài trời chân thực trong công viên công cộng, thảm cỏ được cắt gọn và cây xanh phía sau, mái che di động vải trắng ngà, một rack kim loại treo đa dạng đồ nữ gồm váy, áo, denim, set bộ, đồ len và áo khoác mỏng, màu sắc/chất liệu phong phú không đơn sắc, giỏ mây chứa đồ gấp, sandal, sneaker và túi xách nhỏ, bàn gỗ gấp có chai nước hoa, khay trang sức và túi mỹ phẩm, tag giá viết tay và bao bì giấy kraft đặt tự nhiên, banner vải linen nhỏ ghi "Linh Pháp" buộc vào khung booth, một số móc treo có tag vải thương hiệu, túi giao hàng và thùng tái sử dụng đặt cạnh bàn, độ bừa nhẹ như đang bán thật, ánh sáng ban ngày sáng rõ với bóng đổ mềm, tỉ lệ vật thể và phối cảnh đời thực, chừa khoảng trống giữa khung hình để người mẫu di chuyển, cảnh trống không người, chỉ background, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, human, face, mannequin, empty desert, dramatic storm sky, wedding setup, festival stage, giant logo billboard, luxury resort pool, surreal objects, CGI, anime, heavy blur, fisheye, low light night, extreme top-down angle',
    sceneNegativePromptVi: 'người, khuôn mặt, mannequin, sa mạc trống, bầu trời bão kịch tính, set cưới, sân khấu lễ hội, billboard logo khổng lồ, hồ bơi resort xa xỉ, vật thể siêu thực, CGI, anime, mờ nặng, fisheye, cảnh đêm thiếu sáng, góc từ trên cao cực đoan',
    previewImage: '/images/options/scene-outdoor-natural.jpg',
    sortOrder: 1
  },
  {
    value: 'urban-street',
    label: 'Urban Street (Linh Pháp Corner Shop)',
    labelVi: 'Đường Phố Đô Thị (Corner Shop Linh Pháp)',
    description: 'Urban street fashion corner with practical props and authentic city texture',
    descriptionVi: 'Góc thời trang đường phố có đạo cụ thực dụng và texture đô thị chân thực',
    keywords: ['urban street', 'city corner', 'street fashion', 'shopfront', 'linh phap'],
    technicalDetails: {
      environment: 'small city lane with shopfront and pavement',
      lighting: 'bright daytime reflected light from buildings',
      elements: 'storefront rack, sidewalk signboard, scooter parking, delivery parcels',
      branding: 'discreet storefront decal with Linh Pháp name',
      camera: 'street-level frontal perspective with center runway path',
      usage: 'street style fashion showcase and walking shots'
    },
    promptSuggestion: 'Authentic city street fashion corner with mixed outfits, real shopfront props and subtle Linh Pháp shop identity.',
    promptSuggestionVi: 'Góc thời trang đường phố thành thị chân thực với đồ đa dạng, đạo cụ mặt tiền cửa hàng đời thật và nhận diện Linh Pháp nhẹ nhàng.',
    sceneLockedPrompt: `A realistic urban street fashion corner in a Vietnamese city lane, textured concrete pavement, weathered pastel shopfront walls, glass door with small decal text "Linh Pháp", rolling rack near entrance carrying varied women outfits from casual tops and jeans to dresses and blazer sets, mannequin-free display table with folded apparel stacks, footwear lineup including sneakers, heels, loafers and sandals, accessory hooks with belts, scarves and mini bags, parked scooter and bicycle at one side, stacked delivery parcels and reusable shipping bags near doorway, portable sidewalk chalkboard with daily promotion handwriting, overhead tangled utility wires and balcony plants adding authentic street details, bright daytime lighting with natural reflections and realistic shadow direction, center sidewalk path intentionally clear for subject movement, empty scene, no people, no traffic crowd, background only, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Góc thời trang đường phố đô thị chân thực trong một con hẻm thành phố Việt Nam, vỉa hè bê tông có texture thật, mặt tiền tường pastel đã qua sử dụng, cửa kính có decal nhỏ chữ "Linh Pháp", rack lăn đặt gần cửa treo đa dạng đồ nữ từ áo casual, quần jeans đến váy và set blazer, bàn trưng bày không mannequin với các chồng đồ gấp, khu giày gồm sneaker, cao gót, loafer và sandal, móc phụ kiện có thắt lưng, khăn và túi mini, một xe máy và xe đạp đậu gọn một bên, chồng kiện giao hàng và túi ship tái sử dụng gần lối vào, bảng phấn di động ghi khuyến mãi trong ngày, dây điện và chậu cây ban công tạo chi tiết phố thật, ánh sáng ban ngày sáng rõ với phản xạ và hướng bóng đổ tự nhiên, chừa lối đi giữa khung hình cho chuyển động người mẫu, cảnh trống không người, không đám đông giao thông, chỉ background, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people crowd, police street block, cyberpunk neon, night rain, luxury avenue, abandoned ruin, giant ads, studio cyclorama, CGI render, cartoon, motion blur streaks, dutch angle, aerial drone view',
    sceneNegativePromptVi: 'đám đông người, chốt chặn đường phố, neon cyberpunk, mưa đêm, đại lộ xa xỉ, khu đổ nát bỏ hoang, quảng cáo khổng lồ, phông studio cyclorama, CGI, hoạt hình, vệt mờ chuyển động, góc nghiêng dutch, góc drone trên cao',
    previewImage: '/images/options/scene-urban-street.jpg',
    sortOrder: 2
  },
  {
    value: 'indoor-cozy',
    label: 'Indoor Cozy (Linh Pháp Home Corner)',
    labelVi: 'Trong Nhà Ấm Cúng (Góc Nhà Linh Pháp)',
    description: 'Cozy indoor apartment corner for realistic fashion lifestyle shots',
    descriptionVi: 'Góc căn hộ ấm cúng cho cảnh thời trang lifestyle chân thực',
    keywords: ['indoor', 'cozy', 'apartment', 'lifestyle', 'fashion corner'],
    technicalDetails: {
      environment: 'small apartment living corner with practical storage',
      lighting: 'window daylight mixed with warm lamp fill',
      elements: 'sofa, side table, rack, woven baskets, shoes and accessories',
      branding: 'small framed Linh Pháp postcard on shelf',
      camera: 'eye-level medium framing with free center floor zone',
      usage: 'home lifestyle try-on and product storytelling'
    },
    promptSuggestion: 'Warm cozy indoor fashion corner with real apartment objects, mixed outfits, and subtle Linh Pháp details.',
    promptSuggestionVi: 'Góc thời trang trong nhà ấm cúng với vật dụng căn hộ đời thật, đồ phối đa dạng và dấu ấn Linh Pháp tinh tế.',
    sceneLockedPrompt: `A realistic cozy apartment fashion corner, soft beige walls and warm wooden floor, compact two-seat fabric sofa with textured cushions, slim clothing rack carrying varied women outfits including cardigans, shirts, dresses, skirts and lounge sets, open woven baskets with folded knitwear and denim pieces, low side table with jewelry tray, perfume, hair clips and makeup pouch, floor mat with sandals, flats and ankle boots casually arranged, wall shelf holding fashion books, folded tote bags and a small framed card saying "Linh Pháp", table lamp switched on with warm glow balanced by natural window light, visible everyday details like phone charger cable and delivery pouch, tidy but lived-in arrangement with realistic depth, center standing space preserved for subject movement, empty scene, no people, no mannequins, background only, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Góc thời trang căn hộ ấm cúng chân thực, tường beige mềm và sàn gỗ ấm, sofa vải 2 chỗ nhỏ với gối có texture, rack quần áo mảnh treo đa dạng đồ nữ gồm cardigan, sơ mi, váy, chân váy và đồ mặc nhà, giỏ mây mở chứa đồ len và denim gấp, bàn phụ thấp có khay trang sức, nước hoa, kẹp tóc và túi makeup, thảm sàn với sandal, giày bệt và ankle boots đặt tự nhiên, kệ tường có sách thời trang, tote gấp và khung ảnh nhỏ ghi "Linh Pháp", đèn bàn bật ánh vàng nhẹ cân bằng với ánh sáng cửa sổ tự nhiên, chi tiết đời thực như dây sạc điện thoại và túi giao hàng, bố cục gọn nhưng có dấu hiệu sử dụng, chiều sâu chân thật, giữ khoảng trống giữa khung hình để người mẫu di chuyển, cảnh trống không người, không mannequin, chỉ background, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, child room toys overload, office cubicle, luxury penthouse, dark horror mood, monochrome beige only, empty sterile space, CGI, painting style, fisheye lens, heavy vignette',
    sceneNegativePromptVi: 'người, phòng trẻ em quá nhiều đồ chơi, văn phòng cubicle, penthouse xa xỉ, mood kinh dị tối, chỉ một màu beige đơn điệu, không gian vô trùng, CGI, phong cách tranh vẽ, fisheye, viền tối nặng',
    previewImage: '/images/options/scene-indoor-cozy.jpg',
    sortOrder: 3
  },
  {
    value: 'minimalist',
    label: 'Minimalist (Linh Pháp Clean Studio)',
    labelVi: 'Tối Giản (Studio Sạch Linh Pháp)',
    description: 'Clean minimalist fashion set with realistic product props and subtle branding',
    descriptionVi: 'Bối cảnh thời trang tối giản sạch sẽ, đạo cụ sản phẩm chân thực và nhận diện thương hiệu tinh tế',
    keywords: ['minimalist', 'clean studio', 'fashion display', 'neutral tones'],
    technicalDetails: {
      environment: 'light-gray studio corner with practical shelving',
      lighting: 'soft key + fill with realistic shadow gradient',
      elements: 'single rack, plinths, folded stacks, shoes, accessory trays',
      branding: 'small engraved plate with Linh Pháp',
      camera: 'straight-on medium-close composition',
      usage: 'clean catalog look with real-life texture'
    },
    promptSuggestion: 'Minimalist studio scene that still feels real, with diverse products and subtle Linh Pháp identity.',
    promptSuggestionVi: 'Scene studio tối giản nhưng vẫn có cảm giác đời thực, sản phẩm đa dạng và dấu ấn Linh Pháp nhẹ nhàng.',
    sceneLockedPrompt: `A realistic minimalist fashion studio corner with light gray micro-cement wall and matte off-white floor, one clean metal garment rack displaying mixed women apparel from neutral basics to printed statement pieces, two low plinths presenting handbags and shoe pairs, folded stacks of jeans, tees and knitwear on a narrow shelf, accessory trays containing sunglasses, belts, bracelets and silk scarves, small acrylic box with makeup essentials, subtle brushed-metal name plate reading "Linh Pháp" on the side shelf, practical steamer and packing tape dispenser tucked near wall to keep authenticity, balanced soft studio lighting with gentle shadow falloff and no harsh hotspots, clear central standing zone for model turns and walk-in movement, straight eye-level camera perspective, empty scene no people, no mannequin, background only, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Góc studio thời trang tối giản chân thực với tường xi măng vi mô xám nhạt và sàn trắng ngà lì, một rack kim loại gọn hiển thị đồ nữ đa dạng từ basic trung tính đến item họa tiết nổi bật, hai bục thấp đặt túi xách và các cặp giày, kệ hẹp chứa chồng jeans, áo thun và đồ len gấp, khay phụ kiện có kính mát, thắt lưng, vòng tay và khăn lụa, hộp mica nhỏ chứa đồ makeup cơ bản, bảng tên kim loại mờ khắc chữ "Linh Pháp" đặt bên hông kệ, có bàn ủi hơi nước và dụng cụ dán băng keo đặt gọn sát tường để giữ cảm giác đời thực, ánh sáng studio mềm cân bằng với chuyển độ bóng tự nhiên không cháy sáng, giữ vùng trống trung tâm cho xoay người và bước đi, góc máy ngang tầm mắt chính diện, cảnh trống không người, không mannequin, chỉ background, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, fashion runway crowd, sterile hospital room, all-white overexposed void, fantasy palace, giant logo wall, CGI, vector art, toy-like proportions, wide fisheye, camera tilt',
    sceneNegativePromptVi: 'người, khán giả sàn diễn, phòng bệnh vô trùng, không gian trắng toát cháy sáng, cung điện giả tưởng, tường logo khổng lồ, CGI, đồ họa vector, tỉ lệ đồ chơi, fisheye rộng, máy quay nghiêng',
    previewImage: '/images/options/scene-minimalist.jpg',
    sortOrder: 4
  },

  {
    value: 'luxury',
    label: 'Luxury (Linh Pháp Premium Lounge)',
    labelVi: 'Sang Trọng (Premium Lounge Linh Pháp)',
    description: 'Premium lounge-style fashion setting with realistic merchandising details',
    descriptionVi: 'Không gian thời trang premium kiểu lounge với chi tiết trưng bày chân thực',
    keywords: ['luxury', 'premium', 'lounge', 'fashion retail'],
    technicalDetails: {
      environment: 'premium lounge corner with marble and warm wood accents',
      lighting: 'bright soft key lighting with warm practical lamps',
      elements: 'display rails, seating bench, accessories table, shopping bags',
      branding: 'small embossed Linh Pháp monogram on shopping bag',
      camera: 'eye-level balanced composition, clear center movement zone',
      usage: 'premium fashion content and product close showcase'
    },
    promptSuggestion: 'Premium fashion lounge with realistic product density and subtle Linh Pháp branded details.',
    promptSuggestionVi: 'Không gian lounge thời trang cao cấp với mật độ sản phẩm hợp lý và chi tiết nhận diện Linh Pháp tinh tế.',
    sceneLockedPrompt: `A realistic premium fashion lounge interior, light marble floor with natural veins, warm walnut wall panels, brushed brass clothing rails holding diverse women outfits from satin dresses and structured blazers to knit sets and denim, varied colors and textures beyond monochrome, cushioned bench with folded garments and shopping totes, side table presenting jewelry boxes, watches, sunglasses and perfume, shoe display with heels, boots and loafers arranged naturally, quality paper shopping bags with subtle embossed "Linh Pháp" monogram, fitting-room style curtain at side, practical details like garment clips, spare hangers and tag gun on a shelf, bright upscale lighting with soft shadow gradients, true-to-life proportions and materials, center floor area kept open for model movement, empty scene with no people, background only, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Không gian lounge thời trang premium chân thực, sàn marble sáng có vân tự nhiên, mảng tường gỗ walnut ấm, thanh treo kim loại brass mờ chứa đồ nữ đa dạng từ váy satin, blazer phom cứng đến set len và denim, màu sắc/chất liệu phong phú không đơn sắc, ghế bench bọc nệm có đồ gấp và túi mua sắm, bàn phụ bày hộp trang sức, đồng hồ, kính mát và nước hoa, khu trưng giày gồm cao gót, boots và loafers đặt tự nhiên, túi giấy cao cấp có monogram dập nổi "Linh Pháp" tinh tế, rèm kiểu phòng thử đồ ở cạnh khung hình, chi tiết vận hành thật như kẹp đồ, móc dự phòng và súng bắn tag đặt trên kệ, ánh sáng cao cấp nhưng sáng rõ với chuyển độ bóng mềm, tỉ lệ vật liệu và phối cảnh đời thực, chừa vùng sàn giữa để người mẫu di chuyển, cảnh trống không người, chỉ background, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, red carpet gala, palace hall, chandelier overload, empty sterile showroom, dark club lighting, CGI, 3d render, cartoon, fisheye, dramatic dutch angle',
    sceneNegativePromptVi: 'người, thảm đỏ gala, đại sảnh cung điện, quá nhiều đèn chùm, showroom vô trùng trống rỗng, ánh sáng club tối, CGI, render 3D, hoạt hình, fisheye, góc dutch kịch tính',
    previewImage: '/images/options/scene-luxury.jpg',
    sortOrder: 5
  },
  {
    value: 'beach',
    label: 'Beach (Linh Pháp Summer Booth)',
    labelVi: 'Bãi Biển (Booth Mùa Hè Linh Pháp)',
    description: 'Coastal fashion setup with practical beach-selling props and authentic atmosphere',
    descriptionVi: 'Bối cảnh thời trang ven biển với đạo cụ bán hàng thực dụng và không khí chân thực',
    keywords: ['beach', 'coastal', 'summer', 'resortwear'],
    technicalDetails: {
      environment: 'clean public beach edge with boardwalk section',
      lighting: 'bright daylight with soft sea haze',
      elements: 'portable rack, straw baskets, sandals, beach accessories',
      branding: 'small fabric pennant reading Linh Pháp',
      camera: 'eye-level medium-wide with stable horizon',
      usage: 'summer fashion and resortwear background'
    },
    promptSuggestion: 'Realistic beach fashion booth with varied summer outfits, accessories, and subtle Linh Pháp signature.',
    promptSuggestionVi: 'Booth thời trang bãi biển chân thực với đồ mùa hè đa dạng, phụ kiện phong phú và dấu ấn Linh Pháp tinh tế.',
    sceneLockedPrompt: `A realistic coastal fashion booth near a public beach boardwalk, pale sand and calm sea in background, simple wooden pergola with light fabric shade, freestanding rack displaying women summer outfits including sundresses, linen shirts, beach sets, cover-ups and light knit tops, mixed prints and color accents, straw baskets with scarves and folded clothing, display mat with sandals, espadrilles and beach bags, sunglasses stand, shell jewelry trays and sunscreen bottles on a small table, cooler box and water bottles as practical real-life details, a small fabric pennant saying "Linh Pháp" attached to pergola post, natural sea breeze feel with slightly shifted fabrics, bright daylight with realistic reflections and shadow direction, straight horizon and clear center zone for subject movement, empty scene no people, background only, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Booth thời trang ven biển chân thực gần lối đi gỗ công cộng, nền cát sáng và mặt biển yên phía sau, khung pergola gỗ đơn giản phủ vải che nhẹ, rack độc lập treo đồ nữ mùa hè gồm váy maxi, sơ mi linen, set đi biển, áo khoác mỏng và áo len mỏng, họa tiết/màu nhấn đa dạng, giỏ cói đựng khăn và đồ gấp, thảm trưng bày sandal, espadrille và túi đi biển, kệ kính mát, khay trang sức vỏ sò và chai chống nắng trên bàn nhỏ, thùng giữ lạnh và chai nước làm chi tiết đời thực, cờ vải nhỏ ghi "Linh Pháp" gắn vào cột pergola, cảm giác gió biển làm vải dịch chuyển nhẹ, ánh sáng ban ngày sáng rõ với phản xạ và hướng bóng tự nhiên, đường chân trời thẳng và vùng giữa khung hình để di chuyển người mẫu, cảnh trống không người, chỉ background, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, crowded tourist beach, storm waves, sunset silhouette only, party stage, neon bar, plastic toy look, CGI, anime, aerial drone angle, fish-eye distortion',
    sceneNegativePromptVi: 'người, bãi biển du lịch quá đông, sóng bão, chỉ silhouette hoàng hôn, sân khấu tiệc, quán bar neon, cảm giác đồ chơi nhựa, CGI, anime, góc drone trên cao, méo fisheye',
    previewImage: '/images/options/scene-beach.jpg',
    sortOrder: 6
  },
  {
    value: 'forest',
    label: 'Forest (Linh Pháp Garden Trail)',
    labelVi: 'Rừng (Đường Mòn Vườn Linh Pháp)',
    description: 'Natural forest trail fashion setup with grounded, real-world props',
    descriptionVi: 'Bối cảnh đường mòn rừng tự nhiên với đạo cụ bám sát đời thực',
    keywords: ['forest', 'trail', 'nature', 'outdoor fashion'],
    technicalDetails: {
      environment: 'tree-lined garden trail with wooden deck patch',
      lighting: 'soft filtered daylight through foliage',
      elements: 'portable rack, bench, baskets, shoes, layered outfits',
      branding: 'small wooden tag engraved Linh Pháp',
      camera: 'human-eye perspective, centered composition',
      usage: 'nature lifestyle and outdoor collection showcase'
    },
    promptSuggestion: 'Forest-trail fashion background with realistic staging, diverse products, and subtle Linh Pháp brand cues.',
    promptSuggestionVi: 'Background đường mòn rừng với set-up chân thực, sản phẩm đa dạng và gợi nhắc thương hiệu Linh Pháp tinh tế.',
    sceneLockedPrompt: `A realistic fashion setup on a forest garden trail, dense green foliage and tree trunks creating natural depth, small wooden deck area as product zone, compact rolling rack with women outfits suitable for outdoor layering including dresses, cardigans, windbreakers and denim, mixed earthy and vivid accents, rustic bench with folded clothes and canvas totes, wicker baskets with scarves and hats, shoe arrangement featuring ankle boots, sneakers and sandals, accessory tray with belts and handmade jewelry, reusable garment covers hanging at side, small engraved wooden tag reading "Linh Pháp" tied to rack handle, filtered daylight through leaves with realistic dappled shadows, breathable open center path for subject walking movement, authentic natural environment without fantasy elements, empty scene no people, background only, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Set-up thời trang chân thực trên đường mòn rừng kiểu vườn, tán lá xanh dày và thân cây tạo chiều sâu tự nhiên, một mảng sàn gỗ nhỏ làm khu trưng bày, rack lăn gọn treo đồ nữ phù hợp layering ngoài trời gồm váy, cardigan, áo khoác gió và denim, phối màu đất xen điểm nhấn tươi, ghế bench mộc có đồ gấp và túi canvas, giỏ wicker đựng khăn và mũ, khu giày gồm ankle boots, sneaker và sandal, khay phụ kiện có thắt lưng và trang sức thủ công, túi bọc trang phục tái sử dụng treo bên cạnh, thẻ gỗ khắc chữ "Linh Pháp" buộc vào tay cầm rack, ánh sáng ban ngày lọc qua tán lá với bóng đổ loang thực tế, giữ lối đi giữa thoáng cho chuyển động bước đi, môi trường tự nhiên chân thực không yếu tố fantasy, cảnh trống không người, chỉ background, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, deep jungle danger scene, fantasy elves, fog horror, camping crowd, wildlife attack, artificial studio backdrop, CGI, painting style, over-saturated colors, dutch angle',
    sceneNegativePromptVi: 'người, rừng rậm nguy hiểm, elf fantasy, sương mù kinh dị, đám đông cắm trại, động vật tấn công, phông studio giả, CGI, phong cách tranh vẽ, màu bão hòa quá mức, góc dutch',
    previewImage: '/images/options/scene-forest.jpg',
    sortOrder: 7
  },
  {
    value: 'rooftop',
    label: 'Rooftop (Linh Pháp City Terrace)',
    labelVi: 'Sân Thượng (City Terrace Linh Pháp)',
    description: 'City rooftop terrace fashion setup with practical merchandising objects',
    descriptionVi: 'Bối cảnh thời trang sân thượng thành phố với vật dụng trưng bày thực tế',
    keywords: ['rooftop', 'terrace', 'city view', 'fashion setup'],
    technicalDetails: {
      environment: 'mid-rise rooftop terrace with railings and skyline',
      lighting: 'bright late afternoon daylight, balanced exposure',
      elements: 'rack, table, stools, shopping bags, accessories',
      branding: 'small rooftop lightbox with Linh Pháp text',
      camera: 'eye-level framing with skyline depth and center aisle',
      usage: 'city lifestyle and movement-friendly fashion scene'
    },
    promptSuggestion: 'Urban rooftop fashion terrace with realistic props, diverse apparel, and subtle Linh Pháp identity.',
    promptSuggestionVi: 'Sân thượng thời trang đô thị với đạo cụ chân thực, trang phục đa dạng và nhận diện Linh Pháp tinh tế.',
    sceneLockedPrompt: `A realistic urban rooftop terrace fashion scene, concrete floor with slight wear marks, safe metal railings and mid-rise city skyline in the distance, portable garment rack with mixed women apparel including office-casual sets, dresses, denim jackets and evening tops, variety in colors and materials, high stools and narrow table with folded garments and accessory trays, shoe lineup with heels, flats and sneakers near wall side, shopping bags, packaging tape and label stickers visible as active business details, potted plants and string lights kept subtle, compact rooftop lightbox sign showing "Linh Pháp" with soft warm glow, bright late-afternoon daylight and natural shadow direction, clear central aisle reserved for walking and turns, stable perspective and realistic object scale, empty scene no people, background only, ultra realistic high detail photography`,
    sceneLockedPromptVi: `Bối cảnh thời trang sân thượng đô thị chân thực, sàn bê tông có vết sử dụng nhẹ, lan can kim loại an toàn và skyline thành phố tầm trung phía xa, rack di động treo đồ nữ đa dạng gồm set công sở-casual, váy, áo khoác denim và áo đi tối, màu sắc/chất liệu phong phú, ghế stool cao và bàn hẹp có đồ gấp cùng khay phụ kiện, hàng giày gồm cao gót, giày bệt và sneaker đặt sát tường, túi mua sắm, băng keo đóng gói và sticker nhãn xuất hiện như hoạt động bán hàng thật, chậu cây và dây đèn trang trí tiết chế, hộp đèn nhỏ trên sân thượng ghi "Linh Pháp" với ánh vàng nhẹ, ánh sáng chiều sáng rõ với hướng bóng tự nhiên, chừa lối giữa rõ ràng cho bước đi và xoay người, phối cảnh ổn định và tỉ lệ vật thể đời thực, cảnh trống không người, chỉ background, ảnh siêu thực chi tiết cao`,
    sceneNegativePrompt: 'people, rooftop party crowd, nightclub laser, dangerous edge pose, helicopter view, cyberpunk neon city, heavy fog, CGI render, cartoon style, shaky motion blur',
    sceneNegativePromptVi: 'người, tiệc đông trên sân thượng, laser nightclub, tư thế nguy hiểm sát mép, góc trực thăng, thành phố neon cyberpunk, sương mù dày, CGI, phong cách hoạt hình, mờ rung mạnh',
    previewImage: '/images/options/scene-rooftop.jpg',
    sortOrder: 8
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
