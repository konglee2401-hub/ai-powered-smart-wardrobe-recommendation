# ✅ Smart Wardrobe – Checklist trước khi push / dùng tiếp với Cursor

## Code & Chức năng

- [ ] `npm run dev` chạy OK (backend 5000, frontend 5173).  
- [ ] Đã tạo `backend/.env` từ `.env.example` và cấu hình đúng `MONGODB_URI`, `JWT_SECRET`.  
- [ ] Đã tạo `frontend/.env` từ `.env.example` và giữ đúng `VITE_API_URL`.  
- [ ] MongoDB đang chạy và kết nối thành công.  
- [ ] Đăng nhập / đăng ký hoạt động bình thường (hoặc đăng nhập bằng user seed).  
- [ ] Các API chính (`/api/auth`, `/api/clothes`, `/api/outfits` nếu có) trả về kết quả đúng.  

## Bảo mật

- [ ] Không có file `.env` nào được add vào git.  
- [ ] `.gitignore` đang ignore `node_modules`, `.env`, `dist`, `build`, `uploads`…  
- [ ] Không có API key / mật khẩu hard-code trong source code.  

## Dành cho GitHub

- [ ] Đã commit với message rõ ràng.  
- [ ] Repo trên GitHub không chứa secrets.  
- [ ] `README.md`, `QUICKSTART.md`, `CURSOR_SETUP.md`, `GITHUB_PUSH.md` hiển thị đúng.  

## Dành cho Cursor

- [ ] `.cursorrules` đã có trong root `smart-wardrobe`.  
- [ ] Mở project trong Cursor được, không lỗi path.  
- [ ] Chạy thử `npm run dev` từ terminal của Cursor OK.  

