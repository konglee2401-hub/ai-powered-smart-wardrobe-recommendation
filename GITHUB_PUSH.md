# 📤 Hướng dẫn push Smart Wardrobe lên GitHub

## 1. Tạo repository trên GitHub

1. Vào `https://github.com/new`  
2. `Repository name`: `smart-wardrobe`  
3. Chọn **Public** hoặc **Private**  
4. Không cần tick “Initialize this repository with a README” (vì project đã có README)  
5. Bấm **Create repository**

## 2. Khởi tạo git trong thư mục project

Trong terminal (tại `c:\Work\Affiliate-AI\smart-wardrobe`):

```bash
cd c:\Work\Affiliate-AI\smart-wardrobe

git init
git add .
git commit -m "Initial commit: Smart Wardrobe"
```

## 3. Kết nối tới GitHub remote

Thay `<your-username>` bằng GitHub username của bạn:

```bash
git remote add origin https://github.com/<your-username>/smart-wardrobe.git
git branch -M main
git push -u origin main
```

Nếu dùng SSH:

```bash
git remote add origin git@github.com:<your-username>/smart-wardrobe.git
git branch -M main
git push -u origin main
```

## 4. Kiểm tra trên GitHub

- Refresh trang repo trên GitHub.  
- Kiểm tra `README.md`, `backend`, `frontend` đã lên đầy đủ.  

## 5. Clone về máy khác / môi trường khác

```bash
git clone https://github.com/<your-username>/smart-wardrobe.git
cd smart-wardrobe
npm run install:all
```

Tạo `.env` như hướng dẫn trong `QUICKSTART.md`, rồi:

```bash
npm run dev
```

## 6. Workflow gợi ý

- Mỗi tính năng mới → tạo branch:

```bash
git checkout -b feature/new-feature
```

- Làm việc, commit:

```bash
git add .
git commit -m "feat: add outfit recommendation UI"
git push origin feature/new-feature
```

- Tạo Pull Request trên GitHub nếu làm việc nhóm.  

