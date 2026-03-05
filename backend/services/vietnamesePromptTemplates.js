/**
 * Vietnamese Prompt Templates for Image Generation, Analysis & Video Production
 * Comprehensive templates for different product focuses, use cases, and scenarios
 */

export const VIETNAM_PROMPTS = {
  // ============================================================
  // STEP 1: CHARACTER ANALYSIS PROMPT
  // ============================================================
  
  characterAnalysis: {
    DEFAULT: `Bạn là một chuyên gia stylist thời trang và chuyên gia thử đồ ảo. Phân tích hai hình ảnh dưới đây một cách chi tiết để cung cấp các khuyến nghị tạo kiểu chuyên sâu.

===== CÁCH GẮNNGÀN HÌNH ẢNH =====
Hình ảnh 1 = NHÂN VẬT (Người sẽ mặc trang phục)
Hình ảnh 2 = SẢN PHẨM (Trang phục/Bộ trang phục sẽ dùng)

===== NHIỆM VỤ =====
1. PHÂN TÍCH NHÂN VẬT (Hình ảnh 1) - Trích xuất chi tiết hồ sơ
2. PHÂN TÍCH SẢN PHẨM (Hình ảnh 2) - Trích xuất thông số trang phục
3. TẠO RA KHUYẾN NGHỊ - Cảnh phim, ánh sáng, tâm trạng, kiểu tạo dáng cho thử đồ ảo
4. TRÍCH XUẤT JSON CÓ CẤU TRÚC - Định dạng để hệ thống tạo ảnh

===== PHÂN TÍCH HỒ SỰ NHÂN VẬT =====
Từ Hình ảnh 1, hãy trích xuất và mô tả:

Độ tuổi & Nhân khẩu học:
- Khoảng độ tuổi ước tính
- Nhận diện giới tính
- Tông da/sắc da

Đặc điểm Thể chất:
- Tóc: Màu, kiểu, độ dài (ví dụ: "Tóc nâu, dài, uốn ngoòn")
- Khuôn mặt: Đặc điểm nổi bật (ví dụ: "Mặt tròn, gò má rõ ràng")
- Thể hình: Mô tả dáng người (ví dụ: "Thon gọn, mảnh khảnh, có đường cong, nhỏ nhắn")
- Chiều cao: Chiều cao biểu kiến

Tư thế & Vị trí Hiện tại:
- Tư thế cơ thể: Đứng, ngồi, đi bộ, v.v.
- Vị trí cánh tay: Tay đặt ở đâu?
- Vị trí đầu: Góc, nghiêng, hướng nhìn
- Vị trí chân: Chi tiết cơ sở
- Hướng tư thế chung: Quay mặt, chếch, hồ sơ

Phụ kiện / Tạo kiểu Hiện tại:
- Trang phục hiện tại: Đang mặc cái gì?
- Phụ kiện: Trang sức, túi xách, v.v.
- Chi tiết tóc: Mô tả chính xác
- Makeup hiển thị: Tự nhiên, tinh tế, nổi bật, không

Tư thế & Năng lượng:
- Mức độ tự tin được truyền đạt
- Năng lượng/Cảm giác: Bình thường, chuyên nghiệp, vui nhộn, trang trọng
- Hiện diện: Người đó mang lại cảm giác như thế nào?

===== PHÂN TÍCH THÔNG SỐ SẢN PHẨM =====
Từ Hình ảnh 2, hãy trích xuất và mô tả:

Cơ bản Trang phục:
- Loại: Nó là gì? (áo sơ mi, váy, áo khoác, quần, v.v.)
- Danh mục: Thường ngày, trang trọng, thể thao, buổi tối, v.v.
- Thích hợp mùa: Hè, đông, quanh năm

Thông tin Màu sắc:
- Màu chính: Màu chính của trang phục
- Màu phụ: Bất kỳ màu phụ hoặc tô điểm nào
- Hoa văn: Trơn, sọc, in, có kết cấu, v.v.
- Tâm lý màu sắc: Cảm xúc mà màu sắc truyền đạt là gì?

Vật liệu & Cấu tạo:
- Loại vải: Cotton, lụa, vải lanh, polyester, pha trộn, v.v.
- Kết cấu ngoại hình: Mịn, có kết cấu, mau, bóng, mờ
- Trọng lượng: Nặng, trung bình, nhẹ, thoáng
- Giãn: Nó có vẻ ôm sát hay rộng rãi?

Chi tiết Thiết kế:
- Cổ: Crew, V-neck, scoop, polo, turtleneck, v.v.
- Tay áo: Ngắn, dài, 3/4, không tay, tay raglan, v.v.
- Kiểu vừa: Gọn, ôm sát, thường, oversized, bạn gái, v.v.
- Độ dài: Xén ngắn, thường, dài, maxi, v.v.
- Định nghĩa eo: Có đai, thắt chặt, tự nhiên, thoảng
- Tính năng quan trọng: Túi, nút, khóa kéo, vải nhăn, in, hở, v.v.

Ngữ cảnh Kiểu dáng:
- Mức độ hình thức: Phổ biến để trang trọng
- Sử dụng mục đích: Hàng ngày, cuối tuần, công việc, buổi tối, tiệc, v.v.
- Thẩm mỹ kiểu: Tối giản, thời thượng, cổ điển, cạnh, lãng mạn, thể thao, v.v.
- Định vị giá: Cơ bản, tầm trung, sang trọng

Tương thích Trang phục:
- Thể hình tốt nhất: Ai sẽ mặc được cái này tốt?
- Thích hợp Chiều cao: Cao, nhỏ nhắn, tất cả chiều cao
- Mức độ Nhất: Dễ mặc, cần tạo kiểu, phù hợp chuyên nghiệp

===== TẠO RA KHUYẾN NGHỊ =====
Dựa trên tương thích nhân vật × sản phẩm, hãy khuyến nghị:

1. CẢNH / CẢI CẢNH (JSON):
- Môi trường tốt nhất: xưởng, ngoài trời, thành phố, thiên nhiên, sang trọng, bình thường, v.v.
- Lý do cảnh này: Xem xét kiểu sản phẩm và cảm giác của nhân vật
- Chi tiết nền: Cái gì bổ sung cho nhân vật + sản phẩm?

2. CHIẾU SÁNG (JSON):
- Loại chiếu sáng: Mềm khuếch tán, chiếu sáng cứng trực tiếp, giờ vàng, neon, kịch tính, v.v.
- Lý do chiếu sáng này: Cách tốt nhất để giới thiệu sản phẩm trên nhân vật
- Kỹ thuật: Ánh sáng tăng cường hình thể trang phục như thế nào?

3. TÂMMTRẠNG / KHÔNG KHÍ (JSON):
- Tâm trạng: Tự tin, tinh tế, vui nhộn, bình thường, năng động, tĩnh lặng, v.v.
- Lý do tâm trạng này: Kết hợp năng lượng nhân vật + kiểu sản phẩm
- Tác động cảm xúc: Khán giả sẽ cảm thấy gì?

4. GÓC CAMERA (JSON):
- Góc tốt nhất: Bằng mắt, góc thấp, góc cao, hồ sơ, 3/4, v.v.
- Lý do góc này: Hiển thị phù hợp trang phục trong sản phẩm, tỷ lệ cơ thể, chi tiết sản phẩm
- Khung hình: Đầu và vai? Toàn thân? Cận cảnh?

5. KIỂU TÓCCONTENT (JSON):
- Giữ hiện tại: Có/Không
- Lý do: Tóc hiện tại có bổ sung cho sản phẩm hay cần thay đổi?
- Thay thế: Nếu khuyến nghị thay đổi, cái nào sẽ tốt hơn?

6. MAQUILLAGE (JSON):
- Mức MAKEUP: Không, tự nhiên, tinh tế, trung bình, nổi bật
- Lý do: Makeup bổ sung cho sản phẩm và cảm giác dự định như thế nào?
- Tiêu điểm: Mắt, môi, tổng quát? Tông ấm hay mát?

7. TƯƠNG THÍCH TỔNG THỂ (JSON):
- Điểm tương thích: 1-10 sản phẩm phù hợp với nhân vật
- Lý do: Lý do cụ thể cho điểm này
- Mẹo tạo kiểu: Cách tối đa hóa khoảng trông của sản phẩm trên nhân vật này

===== ĐỊNH DẠNG ĐẦURACỦA RA =====
Chỉ trả lại JSON hợp lệ, không có văn bản khác.

Cấu trúc:
{
  "character": {
    "age": "độ tuổi ước tính hoặc phạm vi",
    "gender": "giới tính nhận dạng",
    "skinTone": "mô tả",
    "hair": {
      "color": "màu sắc",
      "style": "tên kiểu",
      "length": "độ dài"
    },
    "facialFeatures": "mô tả ngắn",
    "bodyType": "mô tả thể hình",
    "currentPose": "mô tả chi tiết tư thế",
    "currentAccessories": "những gì họ đang mặc/phụ kiện"
  },
  "product": {
    "garment_type": "nó là gì",
    "category": "danh mục",
    "primary_color": "màu chính",
    "secondary_color": "màu phụ hoặc chuỗi rỗng",
    "pattern": "mô tả hoa văn",
    "fabric_type": "vật liệu vải",
    "neckline": "loại cổ",
    "sleeves": "loại tay áo",
    "fit_type": "mô tả vừa vặn",
    "length": "độ dài trang phục",
    "key_details": "tính năng thiết kế đặc biệt"
  },
  "recommendations": {
    "scene": {
      "choice": "cảnh được khuyến nghị",
      "reason": "tại sao cảnh này phù hợp"
    },
    "lighting": {
      "choice": "loại chiếu sáng",
      "reason": "tại sao chiếu sáng này nâng cao lên trang phục"
    },
    "mood": {
      "choice": "tâm trạng/cảm giác",
      "reason": "tại sao tâm trạng này"
    },
    "cameraAngle": {
      "choice": "góc được khuyến nghị",
      "reason": "tại sao góc này giới thiệu sản phẩm tốt nhất"
    },
    "hairstyle": {
      "choice": "giữ hiện tại hoặc khuyến nghị cụ thể",
      "reason": "lý do tạo kiểu"
    },
    "makeup": {
      "choice": "mức độ makeup và kiểu",
      "reason": "tại sao makeup này bổ sung cho giao diện"
    },
    "compatibilityScore": {
      "score": 8,
      "reason": "tại sao điểm này"
    }
  },
  "characterDescription": "Mô tả sống động 2-3 câu của nhân vật để tạo ảnh"
}

Trọng tâm: toàn bộ trang phục
Trường hợp Sử dụng: Video TikTok Tiền liên kết (định dạng dọc 9:16, tạo kiểu hấp dẫn)

QUAN TRỌNG: Chỉ trả lại JSON được định dạng đúng, không có markdown, không có code block, không có văn bản bổ sung.`,
  },

  // ============================================================
  // STEP 3: DEEP ANALYSIS PROMPT (for video scripts)
  // ============================================================

  deepAnalysis: {
    'full-outfit': `Bạn là chuyên gia phát triển video TikTok và chuyên gia tiếp thị liên kết thời trang. Sử dụng ba hình ảnh (mặc trang phục, cầm trang phục, sản phẩm) và dữ liệu phân tích để tạo ra kịch bản video TikTok hấp dẫn hoàn thành.

===== DỮ LIỆU ĐẦU VÀO =====
Hình ảnh 1: Nhân vật mặc trang phục hoàn chỉnh
Hình ảnh 2: Nhân vật cầm sản phẩm trong tay
Hình ảnh 3: Sản phẩm (chi tiết)

Trọng tâm Sản phẩm: Toàn bộ trang phục
Tổng thời lượng chiến dịch: {videoDuration} giây
Provider video hiện tại: {videoProvider}
Thời lượng mỗi clip cần tạo: {clipDuration} giây
Giọng nói: {voiceGender} (tốc độ {voicePace})

===== NHIỆM VỤ =====
1. TẠO 3-4 PHÂN ĐOẠN KỊCH BẢN VIDEO CHO ĐÚNG {clipDuration} GIÂY:
   - Bắt buộc chia timeline theo từng giây, không chồng lấn, không khoảng trống
   - Segment đầu bắt đầu từ giây 0
   - Segment cuối kết thúc đúng tại giây {clipDuration}
   - Mỗi segment dùng định dạng thời gian [start-ends], ví dụ [0-2s], [2-6s]

2. TẠO KỊCH BẢN VOICEOVER (Toàn bộ):
   - Giọng nói: {voiceGender} native speaker
   - Tốc độ: {voicePace} paced, energetic
   - Khoảng cách giọng: Thân thiện, quyến rũ, chuyên nghiệp
   - Độ dài: Phù hợp chính xác với {clipDuration}s video

3. ĐỀ XUẤT HASHTAG:
   - 5-8 hashtag liên quan
   - Bao gồm: thời trang, thử đồ ảo, liên kết, top xu hướng
   - Tiếng Việt, hỗn hợp cách viết hoa thấp

===== ĐỊNH DẠNG ĐẦURAOUTPUT =====
Chỉ trả lại JSON hợp lệ:
{
  "videoScripts": [
    {
      "segment": "Hook",
      "timeRange": "0-2s",
      "duration": 2,
      "image": "wearing",
      "script": "Mở đầu hấp dẫn tại đây..."
    },
    {
      "segment": "Introduction",
      "timeRange": "2-5s",
      "duration": 3,
      "image": "wearing",
      "script": "Giới thiệu trang phục tại đây..."
    },
    {
      "segment": "Features",
      "timeRange": "5-8s",
      "duration": 3,
      "image": "holding",
      "script": "Làm nổi bật chi tiết tại đây..."
    },
    {
      "segment": "CTA",
      "timeRange": "8-{clipDuration}s",
      "duration": 2,
      "image": "wearing",
      "script": "Gọi hành động tại đây..."
    }
  ],
  "voiceoverScript": "Toàn bộ kịch bản voiceover...",
  "hashtags": ["#thời trang", "#thử đồ", ...]
}`,

    'top': `Bạn là chuyên gia phát triển video TikTok. Tạo kịch bản video TikTok trọng tâm áo/áo sơ mi.

TRỌNG TÂM: Chi tiết áo/áo sơ mi
- Hook: Tập trung vào cách áo áo tôn dáng
- Features: Chất vải, thiết kế cổ, tay áo, phối màu
- CTA: "Thêm vào giỏ hàng", "Link trong bio"

Định dạng: Giống như full-outfit nhưng điểm nổi bật trên áo.`,

    'bottom': `Bạn là chuyên gia phát triển video TikTok. Tạo kịch bản video TikTok trọng tâm dưới/quần.

TRỌNG TÂM: Chi tiết quần/chân váy
- Hook: Tập trung vào cách quần làm thon gọn chân
- Features: Kiểu vừa, chiều dài, chi tiết, mix and match
- CTA: "Đặt hàng ngay", "Link trong bio"

Định dạng: Giống như full-outfit nhưng điểm nổi bật trên quần.`,

    'accessories': `Bạn là chuyên gia phát triển video TikTok. Tạo kịch bản video TikTok trọng tâm phụ kiện.

TRỌNG TÂM: Chi tiết phụ kiện (túi, giày, trang sức)
- Hook: Phụ kiện hoàn thành bộ trang phục
- Features: Chất lượng, kiểu dáng, cách sử dụng
- Examples: Phối với các trang phục khác nhau

Định dạng: Giống như full-outfit nhưng điểm nổi bật trên phụ kiện.`,

    'shoes': `Bạn là chuyên gia phát triển video TikTok. Tạo kịch bản video TikTok trọng tâm giày.

TRỌNG TÂM: Chi tiết giày
- Hook: Giày hoàn hảo cho bất kỳ dịp nào
- Features: Kiểu dáng, độ thoải mái, chất liệu, mix and match
- Examples: Mặc với quần jeans, váy, chinos

Định dạng: Giống như full-outfit nhưng điểm nổi bật trên giày.`,
  },

  // ============================================================
  // STEP 4: VIDEO GENERATION PROMPT
  // ============================================================

  videoGeneration: {
    'full-outfit-Hook': `Video TikTok 9:16 bắt đầu hấp dẫn với trang phục hoàn chỉnh.

=== KHÓA NHÂN VẬT TUYỆT ĐỐI - LÀM VIỆC NGAY ===
CHỈ SỬ DỤNG NHÂN VẬT TỪ HÌNH ẢNH THAM CHIẾU - KHÔNG THAY ĐỔI:
- Khuôn mặt: Giữ nguyên hoàn toàn - cùng hình dáng, đường nét, biểu cảm
- Cơ thể: Giữ nguyên thể hình, dáng người, tỷ lệ - không bao giờ thay đổi
- Tóc: Cùng màu, kiểu, độ dài - GIỮ NGUYÊN hoàn toàn
- Da: Cùng tông da, sắc tố - GIỮ NGUYÊN chính xác

=== CHUYỂN ĐỘNG CHI TIẾT (SECOND-BY-SECOND) ===
Giây 0-2: Nhân vật quay ngoặt từ cạnh, bước từ từ vào khung hình, nhìn vào camera
Giây 2-4: Tay trái chỉ đến chi tiết áo (cổ, tay áo), nét mặt: mỉm cười tự tin
Giây 4-6: Xoay người hoàn toàn, show toàn bộ trang phục, tay vuốt quần, khoe dáng
Giây 6-8: Bước lại phía trước, đứng tự tin, mắt nhìn thẳng camera, nít cười tươi
Giây 8-10: Tay phải kéo thoáng áo, cử chỉ tự nhiên, gật đầu nhẹ nhàng

=== HIỆU ỨNG & TẤU CẢ ===
- Cảm ứng: Quay ngoặt mượt mà, bước chảy chứng, chuyển đổi nhẹ nhàng
- Zoom: Bắt đầu từ xa, pháp nhân từ từ khi tiếp cận
- Cảm giác: Năng động, thú vị, hấp dẫn, khiến người xem muốn tiếp tục
- Biểu cảm: Tự tin, hạnh phúc, lan tỏa sự quyến rũ và tự tại
- Tương tác: Nhìn camera, cử chỉ tay tự nhiên, mãn nguyện với trang phục`,

    'full-outfit-Introduction': `Video TikTok 9:16 giới thiệu trang phục với chi tiết chuyên sâu.

=== KHÓA NHÂN VẬT TUYỆT ĐỐI ===
NHÂN VẬT PHẢI GIỐNG HẾT trong mọi giây - không thay đổi khuôn mặt, cơ thể, tóc:
- Giữ nguyên hoàn toàn hình dáng mặt, nếp nhăn, làn da
- Giữ nguyên thể hình, dáng người, tỷ lệ vai/eo/hông
- Giữ nguyên kiểu tóc, màu, độ dài - từ đầu đến cuối video

=== CHUYỂN ĐỘNG CHI TIẾT (SECOND-BY-SECOND) ===
Giây 0-2: Đứng đối diện camera, quay chậm sang bên trái 90 độ để show hông
Giây 2-4: Tay chỉ vào cổ, khéo léo kéo áo để hiện đường cổ, nét mặt tự hảo
Giây 4-6: Xoay lại phía trước, tay chỉ vào tay áo, kéo nhẹ để show chất vải
Giây 6-8: Bước hai bước về phía trước, tay với quần, show chiều dài & rũi vải
Giây 8-10: Quay nhìn camera, mỉm cười, tay kéo mẫu tôn dáng vùng eo
Giây 10-12: Đứng yên, tay hạ xuống, nhìn thẳng camera, biểu cảm tự tin

=== HIỆU ỨNG & TẤU CẢ ===
- Cảm ứng: Quay tròn mượt mà, zoom nhẹ vào chi tiết
- Chuyển cảnh: Mượt mà giữa các chi tiết, không giật
- Cảm giác: Chuyên nghiệp, phong cách, muốn sở hữu trang phục
- Biểu cảm: Tự hào, tự tin về sự lựa chọn trang phục`,

    'full-outfit-Features': `Video TikTok 9:16 làm nổi bật tính năng và chất lượng trang phục.

=== KHÓA NHÂN VẬT NGHIÊM NGẶT ===
GIỮ NGUYÊN NHÂN VẬT 100% - Cùng khuôn mặt, cơ thể, tóc, da trong mọi frame:
- Mặt: không thay đổi hình dáng, đường nét, biểu cảm
- Cơ thể: không thay đổi thể hình hay tỷ lệ chiều cao
- Tóc: cùng kiểu, màu, độ dài xuyên suốt
- Skin: cùng tông da và sắc tố - KHÔNG THAY ĐỔI

=== CHUYỂN ĐỘNG CHI TIẾT (SECOND-BY-SECOND) ===
Giây 0-2: Đứng đối diện, tay nâng áo nhẹ để show vải không nhăn, mỉm cười
Giây 2-4: Uốn, kéo vải tôn dáng vùng eo, rồi lại bình thường - show tính rủ
Giây 4-6: Tay chỉ vào cổ tay, kéo áo để show độ giãn, biểu cảm: rất thoải mái
Giây 6-8: Xoay quanh 180 độ từ từ, show toàn bộ trang phục, tay cạnh thân
Giây 8-10: Đẩy vai về sau, kéo ngực ra, tay cạnh, show fit tôn dáng hoàn hảo
Giây 10-12: Bước 2-3 bước, nhìn xuống rồi nhìn camera, nói không lời: "hoàn hảo"
Giây 12-15: Đứng yên, tay dạo hạ thấp, nhìn thẳng camera tự tin, khoảng lặng

=== HIỆU ỨNG & TẤU CẢ ===
- Cảm ứng: Từng chuyển động mục đích, giáng lực
- Chi tiết: Close-up vào vải, cổ, tay áo để show chất lượng
- Cảm giác: Kỹ thuật, thuyết phục, tạo FOMO - muốn sở hữu ngay
- Biểu cảm: Chân thành, tin tưởng, gật đầu thỏa thuận với các tính năng`,

    'full-outfit-CTA': `Video TikTok 9:16 kết luận hấp dẫn với hành động được gọi rõ ràng.

=== KHÓA NHÂN VẬT HÀNH ===
GIỮ NGUYÊN NHÂN VẬT HOÀN TOÀN - Chuẩn như hình tham chiếu từ đầu đến cuối:
- Giữ khuôn mặt: cùng hình dáng, nếp, biểu cảm tự tin
- Giữ bộ chân: cùng thể hình, dáng người, tỷ lệ cơ thể
- Giữ tóc: cùng màu, kiểu, độ dài - từ mở video đến hết
- Giữ da: cùng tông, sắc tố - CHÍNH XÁC 100%

=== CHUYỂN ĐỘNG CHI TIẾT (SECOND-BY-SECOND) ===
Giây 0-2: Đứng thẳng, tạo dáng cuối cùng với trang phục, tay cạnh thân tự nhiên
Giây 2-4: Nâng tay, chỉ vào nhân vật, biểu cảm: "Đây là tôi với trang phục này"
Giây 4-6: Tay để cạnh, quay ngoại về bên phải 45 độ, nhìn về hướng khác
Giây 6-8: Quay lại, nhìn thẳng camera, cười rạng rỡ, nâng canh lông mày nhẹ
Giây 8-10: Bước lại gần camera, biểu cảm: thân mật, mời gọi, tay ra phía trước
Giây 10-13: Đứng yên ngay, nhìn thẳng camera với mắt hiềm thị, nở nụ cười tự tin
Giây 13-15: Lật tay, chỉ xuống (hứng chỉ), gật gừng 2 cái, biểu cảm: "Quyết định đi"
Giây 15-18: Bước ra khỏi khung từ từ, nhìn lại camera lần cuối, cười tươi sáng
Giây 18-20: Full body frame cuối cùng, đứng tự tin, tay nâng áo nhẹ, fade to black

=== HIỆU ỨNG & TẤU CẢ ===
- Cảm ứng: Quyết đoán, tự tin, mạnh mẽ
- Zoom: Zoom in từ từ vào gương mặt khi nhìn camera trực tiếp
- Cảm giác: Khuyến khích, FOMO mạnh, năng động, hố lôi
- Biểu cảm: Tươi cười, hài lòng, khuyến khích, quyết đoán - "Mua ngay!"
- CTA: Vang vọng - "Đặt hàng", "Link trong bio", "Mua ngay", "Không chần chừ"`,
  },

  // ============================================================
  // IMAGE GENERATION: Wearing Product (Virtual Try-On)
  // ============================================================
  imageGeneration: {
    wearingProduct: `[CẶP HÌNH ẢNH - IMAGE MAPPING]
Hình ảnh 1 (upload đầu tiên) = NHÂN VẬT THAM CHIẾU - Người sẽ mặc trang phục
Hình ảnh 2 (upload thứ hai) = SẢN PHẨM/BỘ TÀI LIỆU THAM CHIẾU - Trang phục cần áp dụng
QUAN TRỌNG: KHÔNG ĐỂ NHẦM LẪN các hình. Giữ nguyên nhân vật, chỉ thay đổi quần áo.

=== NHÂN VẬT PHẢI GIỮ NGUYÊN (TUYỆT ĐỐI CẦN THIẾT) ===

GIỮ CHÍNH XÁC:
- Khuôn mặt: GIỐNG HẾT nhân vật trong Hình 1 - không thay đổi khuôn, đường nét, hoặc biểu cảm
- Cơ thể: GIỐNG HẾT thể hình, dáng người, và tỷ lệ cơ thể
- Tư thế: GIỐNG HẾT vị trí cơ thể, tay, chân, và hướng đầu
- Biểu cảm & Ánh nhìn: GIỮ NGUYÊN cảm xúc và hướng nhìn
- Tóc: GIỮ NGUYÊN kiểu tóc, màu sắc, độ dài, và vị trí - KHÔNG thay đổi

Danh sách cấm:
X Không thay đổi hình dáng mặt
X Không thay đổi màu mắt hay nhìn
X Không thay đổi sắc tố da
X Không thay đổi cơ thể hay tỷ lệ
X Không thay đổi phong cách tóc
X Không thay đổi vị trí tay hoặc chân

=== THAY ĐỒ MỚI (TỪ HÌNH ẢNH 2) ===

LOẠI TÀI LIỆU: {garment_type}

MÀU SẮC & ĐẶC TRƯNG NHẬN DIỆN:
Màu chính: {primary_color}
{secondary_color_line}

CHẤT LIỆU & CẢM GIÁC:
Chất vải: {fabric_type}
Cảm giác: {fabric_texture}

KIỂU DỨA & CHI TIẾT:
Kiểu dáng: {fit_type}
{neckline_line}
{sleeves_line}
{key_details_line}

CHIỀU DÀI & ĐỘ PHỦ:
{length_coverage}

=== KIỂU TÓC & TRANG ĐIỂM ===
Kiểu tóc: GIỮ NGUYÊN kiểu tóc trong hình tham chiếu
Trang điểm: GIỮ NGUYÊN tương tự hình tham chiếu - chuyên nghiệp, tự nhiên

=== CÁC PHỤ CHỈ KỸ THUẬT ===

1. ĐỌC garment từ Hình ảnh 2
2. ĐẶT lên cơ thể nhân vật với rũi tự nhiên và nếp gấp
3. TẠO LẬP giữa vai và cơ thể
4. KHỚP hành vi vải với loại chất liệu
5. ĐẶT toàn trên cơ thể từ Hình 1
6. VỮA vị trí cổ, cổ tay, mắt cá chân thích hợp
7. KHÔNG THAY cơ thể để vừa quần áo
8. GIỮ tỷ lệ cơ thể trong vai/eo/hông

=== CẤU TRÚC KHUNG & CHIẾU SÁNG ===

{scene_directive}

{lighting_info}

Tâm trạng: {mood}

=== CHẤT LƯỢNG & STYLE ===

Phong cách: {style}
Góc camera: {camera_angle}
Bảng màu: {color_palette}
Chất lượng: Ảnh chuyên nghiệp, 8K, nét canh tốt, siêu chi tiết, thực tế tự nhiên
Chi tiết: Kết cấu vải thực tế, rũi tự nhiên, tỷ lệ giải phẫu chính xác

=== DANH SÁCH KIỂM TRA THỰC HIỆN ===
✓ Ảnh nhân vật từ Hình 1 với chi tiết nhân vật được bảo tồn
✓ Mặc trang phục từ Hình 2 với màu và chất liệu đúng
✓ Cùng khuôn mặt, cơ thể, tư thế, biểu cảm - KHÔNG THAY ĐỔI
✓ ĐẶT garment thực tế với rũi tự nhiên
✓ Chiếu sáng & sáng tác chuyên nghiệp
✓ Không bị biến dạng giải phẫu hoặc tỷ lệ xấu
`,
  },
};

export default VIETNAM_PROMPTS;
