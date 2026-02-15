# 🎯 Setup Cursor IDE cho Smart Wardrobe

## 1. Mở project trong Cursor

```bash
cd c:\Work\Affiliate-AI\smart-wardrobe
cursor .
```

Nếu bạn đã push lên GitHub:

```bash
git clone https://github.com/<your-username>/smart-wardrobe.git
cd smart-wardrobe
cursor .
```

## 2. Cài dependencies (trong Cursor Terminal)

```bash
npm run install:all
```

## 3. Tạo file `.env`

Trong `backend`:

```bash
cd backend
copy .env.example .env   # Windows
```

Trong `frontend`:

```bash
cd ../frontend
copy .env.example .env   # Windows
```

Chỉnh sửa theo hướng dẫn trong `QUICKSTART.md`.

## 4. Extensions nên cài (nếu dùng VS Code + Cursor)

- Tailwind CSS IntelliSense  
- ESLint / Prettier (nếu bạn muốn lint/format)  
- Thunder Client hoặc REST Client (test API)  
- MongoDB for VS Code (xem dữ liệu MongoDB)

## 5. Thiết lập cơ bản (settings gợi ý)

Trong Cursor, mở Settings (JSON) và thêm:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## 6. Cách dùng Cursor AI với project này

- **Giải thích code**: chọn đoạn code → `Ctrl/Cmd + I` (Explain)  
- **Sửa nhanh**: chọn đoạn code → `Ctrl/Cmd + K` → mô tả bạn muốn sửa gì  
- **Chat theo context project**: `Ctrl/Cmd + L` và hỏi:

Ví dụ:

- “Giải thích luồng đăng nhập từ frontend tới backend trong project này.”  
- “Thêm filter quần áo theo brand ở cả backend và frontend.”  
- “Refactor lại `clothingController` để thêm pagination.”

## 7. Lệnh thường dùng

```bash
# Chạy cả backend + frontend
npm run dev

# Chỉ backend
npm run dev:backend

# Chỉ frontend
npm run dev:frontend

# Seed dữ liệu demo
npm run seed
```

## 8. Best practices khi dùng AI trong Cursor

- Mô tả rõ yêu cầu (backend/frontend/file nào).  
- Để AI sửa code nhưng **luôn review diff** trước khi commit.  
- Không dán API key / mật khẩu thật vào chat.  
- Khi thêm feature mới: để AI đề xuất kiến trúc, sau đó bạn điều chỉnh dần.  

