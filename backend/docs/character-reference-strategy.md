# Character Reference Strategy (Face + Body Consistency)

## Mục tiêu
Giữ **đúng 1 nhân vật** (khuôn mặt + thân hình) xuyên suốt nhiều ảnh sinh ra, thay đổi trang phục/bối cảnh mà không drift identity.

## Phương án tối ưu (khuyến nghị)
### 1) Character Profile + Multi-reference
- Tạo một `Character Profile` cố định gồm:
  - 3-8 ảnh chuẩn (front/3-4 angle/full body/close-up face)
  - metadata ổn định: giới tính, tầm tuổi, body type, skin tone, tóc, facial features.
- Khi generate ảnh mới, luôn truyền:
  - ảnh reference chính + (nếu model hỗ trợ) ảnh bổ sung,
  - prompt identity lock rõ ràng.
- Ưu điểm:
  - bền vững hơn so với 1 ảnh đơn,
  - giảm lỗi thay đổi khuôn mặt/tỷ lệ cơ thể.

### 2) Scene lock tách riêng identity lock
- Scene/background nên khóa bằng scene-lock prompt/reference khác.
- Identity của nhân vật khóa bằng character reference riêng.
- Tránh trộn scene constraint và identity constraint vào cùng 1 điều kiện duy nhất.

### 3) Prompt identity lock chuẩn hóa
- Luôn có các cụm:
  - `Use the EXACT SAME character from Image 1`
  - `Strict identity lock`
  - `Do not alter face, body, pose, gaze, hair`
- Dùng negative prompt để cấm: merged identities, body deformation, face swap.

## Phương án fallback: đổi character thành tên/token
Nếu provider không ổn định khi bám ảnh, dùng thêm **character alias token** để neo identity trong prompt.

### Quy ước token
- Ví dụ: `Linh Pháp` -> `LinhPhap`
- Token nên:
  - không dấu,
  - không khoảng trắng,
  - ngắn và duy nhất.

### Cách dùng trong prompt builder
- Chèn dòng anchor:
  - `Identity anchor token: LinhPhap`
  - `Always treat "LinhPhap" as this exact same person from Image 1 only.`
- Khi tái sử dụng prompt, match thẳng token này để tránh ambiguity.

## Thực thi đã bổ sung trong code
- `smartPromptBuilder` đã hỗ trợ đọc alias từ:
  - `characterAlias`, `characterToken`, `characterName` (ưu tiên trực tiếp),
  - hoặc auto-convert từ `characterDisplayName` / `characterLabel` (bỏ dấu + bỏ ký tự đặc biệt).
- Alias được chèn vào block `IDENTITY LOCK` của:
  - `change-clothes`,
  - `character-holding-product`.

## API gợi ý (bước tiếp theo)
1. Tạo Character Registry (DB):
   - `id`, `displayName`, `alias`, `referenceImages[]`, `analysisProfile`, `createdBy`.
2. Prompt request chỉ cần `characterId`:
   - backend resolve ra alias + references + profile.
3. Thêm guardrail:
   - nếu alias trùng thì reject,
   - nếu thiếu reference tối thiểu thì cảnh báo chất lượng.

## Kết luận
- **Best practice:** vẫn là multi-reference + identity lock + (nếu có) model/adaptor chuyên identity.
- **Fallback practical:** alias token (`LinhPhap`) trong prompt builder giúp workflow đơn giản, dễ scale, và ổn định hơn khi provider chưa giữ identity tốt.
