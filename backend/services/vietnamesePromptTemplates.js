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
Thời lượng Video: {videoDuration} giây
Giọng nói: {voiceGender} (tốc độ {voicePace})

===== NHIỆM VỤ =====
1. TẠO 3-4 PHÂN đoạn KỊCH BẢN VIDEO:
   - Phân đoạn 1: Hook (3s) - Thu hút sự chú ý ngay lập tức
   - Phân đoạn 2: Giới thiệu (4-5s) - Giới thiệu trang phục
   - Phân đoạn 3: Giới thiệu tính năng (5-6s) - Làm nổi bật chi tiết chính
   - Phân đoạn 4: Gọi hành động (2-3s) - Kết luận hấp dẫn

2. TẠO KỊCH BẢN VOICEOVER (Toàn bộ):
   - Giọng nói: {voiceGender} native speaker
   - Tốc độ: {voicePace} paced, energetic
   - Khoảng cách giọng: Thân thiện, quyến rũ, chuyên nghiệp
   - Độ dài: Phù hợp với {videoDuration}s video

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
      "duration": 3,
      "image": "wearing",
      "script": "Mở đầu hấp dẫn tại đây..."
    },
    {
      "segment": "Introduction",
      "duration": 5,
      "image": "wearing",
      "script": "Giới thiệu trang phục tại đây..."
    },
    {
      "segment": "Features",
      "duration": 6,
      "image": "holding",
      "script": "Làm nổi bật chi tiết tại đây..."
    },
    {
      "segment": "CTA",
      "duration": 3,
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
    'full-outfit-Hook': `Video TikTok 9:16 là bắt đầu hấp dẫn với trang phục hoàn chỉnh. 
- Cảm ứng bắt đầu: Nhân vật quay ngoặt, nhìn vào camera, mỉm cười tự tin
- Cảm ứng ngoạn mục: {garmentDetails} làm cho nhân vật trông tuyệt vời
- Hiệu ứng: Nhẹ nhàng zoom in, chuyển đổi mượt mà
- Cảm giác: Năng động, thú vị, người xem phải tiếp tục xem
- Nét mặt: Tự tin, vui vẻ, lan tỏa sự quyến rũ
- Tạo dáng: Tương tác với camera, tay chỉ đến chi tiết đặc biệt`,

    'full-outfit-Introduction': `Video TikTok 9:16 giới thiệu trang phục với chi tiết.
- Cảm ứng: Xoay quanh để hiển thị bộ trang phục hoàn chỉnh
- Tiêu điểm: Cổ, tay áo, chiều dài, màu sắc, hoa văn
- Tương tác: Chạm vào các chi tiết, kéo áo, tôn dáng với cử chỉ
- Cảm giác: Chuyên nghiệp, phong cách, muốn sở hữu
- Nét mặt: Tự hào, tự tin về sự lựa chọn trang phục
- Chuyển đổi: Mượt mà giữa các chi tiết`,

    'full-outfit-Features': `Video TikTok 9:16 làm nổi bật tính năng chính.
- Cảm ứng: Làm nổi bật cách sánh trang phục với cơ thể
- Vấn đề: Vừa vặn tuyệt vời, tôn dáng, thoải mái
- Chi tiết: Chất vải không nhăn, khí bay lượn, giãn, bền
- Tương tác: Kéo, uốn, chuyển động để hiển thị cách hoạt động
- Cảm giác: Kỹ thuật, thuyết phục, khiến người xem muốn mua
- Examples: Mặc cùng với khác nhau shoe styles, phụ kiện`,

    'full-outfit-CTA': `Video TikTok 9:16 kết luận hấp dẫn và hành động được gọi.
- Cảm ứng: Nhân vật tạo dáng cuối cùng, nhìn trực tiếp camera
- Thông điệp: "Cảm thấy tuyệt vời", "Kiểu dáng hoàn hảo", "Mặc ngay"
- CTA: Rõ ràng và hóa hiểu - "Đặt hàng", "Link trong bio", "Mua ngay"
- Cảm giác: Khuyến khích, FOMO (sợ bỏ lỡ), năng động
- Hiệu ứng: Nhẹ nhàng zoom out, fade hoặc cut để CTA
- Nét mặt: Tươi cười, hài lòng, khuyến khích người xem tham gia`,
  },
};

export default VIETNAM_PROMPTS;
