# 📊 Smart Wardrobe – Project Summary (Hiện tại)

## Kiến trúc

- **Backend**: `backend/`
  - Express server (`server.js`)
  - Kết nối MongoDB (`config/db.js`)
  - Models: `User`, `ClothingItem`
  - Controllers: `authController`, `clothingController`
  - Routes: `/api/auth`, `/api/clothes`, `/api/outfits` (stub đơn giản)
  - Seed script: `utils/seedData.js`

- **Frontend**: `frontend/`
  - React 18 + Vite
  - Routing cơ bản (`App.jsx`)
  - Pages: `Login`, `Dashboard`
  - State: `useAuthStore` (Zustand)

## Tính năng chính (đã có)

- Đăng nhập (JWT + MongoDB).  
- Dashboard và login UI cơ bản với Tailwind.  
- Tạo cấu trúc fullstack (backend + frontend) sẵn sàng mở rộng.  
- Script seed dữ liệu mẫu trong backend.  
- Script dev chạy song song backend + frontend (`npm run dev`).  

## Hướng mở rộng (phù hợp với vision bạn mô tả)

- Thêm module quản lý tủ đồ chi tiết (tops/bottoms/shoes/accessories).  
- Thêm AI recommendation service (phối đồ theo thời tiết / occasion / màu sắc).  
- Thêm module phân tích ảnh (upload outfit / sản phẩm → AI nhận diện items).  
- Xây prompt builder UI (web) cho ảnh + video (Flow / Grok / v.v.).  
- Tích hợp thêm backend Python/ FastAPI riêng cho pipeline phức tạp (nếu cần).  

Các file `QUICKSTART.md`, `CURSOR_SETUP.md`, `GITHUB_PUSH.md`, `CHECKLIST.md` được thêm để bạn dễ:

- Khởi động lại project trên bất kỳ máy nào.  
- Push lên GitHub.  
- Sử dụng Cursor/Claude Code để tiếp tục mở rộng kiến trúc AI phức tạp mà bạn đã lên ý tưởng.  

