# Chiến lược xây dựng tool tự động scrape + download YouTube Shorts & Facebook Reels (2026)

## 1) Mục tiêu
- Tự động phát hiện video Shorts/Reels theo chủ đề (`hài`, `dance`, `cooking`).
- Tự động lưu metadata + kênh/page vào MongoDB.
- Tự động đưa video vào hàng đợi tải xuống (retry, priority, concurrent control).
- Cung cấp dashboard vận hành/giám sát bằng Next.js.

## 2) Kiến trúc tổng thể (Node.js + Next.js + MongoDB)

### Backend (khuyến nghị)
- **NestJS + TypeScript** (adapter Express/Fastify).
- **Mongoose** cho MongoDB.
- **BullMQ + Redis** cho queue download.
- **@nestjs/schedule** cho cron jobs.
- **Playwright** cho scraping động (YouTube/Facebook).
- **yt-dlp-exec** để tải video.
- **Winston + Telegram/Discord webhook** cho logging/alert.

### Frontend
- **Next.js 15 (App Router)** + TypeScript.
- **Tailwind + shadcn/ui** cho UI.
- **TanStack Query** cho data fetching/realtime polling.
- **Recharts** cho biểu đồ thống kê.

### Storage
- Local: `./downloads/{platform}/{topic}/{date}/{videoId}.mp4`.
- Optional scale-out: upload S3 sau khi tải thành công.

---

## 3) Module backend theo domain

1. **Discover Module**
   - Job `DiscoverNewTrends` chạy 07:00 hằng ngày.
   - Nguồn: Playboard (YouTube), YouTube Search Shorts, Facebook Reels Search.
   - Lọc theo keyword + `minViewsFilter`.

2. **Channel Scan Module**
   - Job `ScanSavedChannels` chạy 08:30 hằng ngày.
   - Quét từ danh sách Channel/Page đã lưu (ưu tiên theo priority).

3. **Download Module**
   - Worker BullMQ `video-download`.
   - Retry tối đa 3 lần, cập nhật trạng thái đầy đủ.

4. **Settings Module**
   - Lưu cấu hình động: keywords, cron, concurrency, proxy, thông báo.

5. **Stats/Logs Module**
   - Dashboard metrics, log job, tỷ lệ thành công/thất bại.

---

## 4) Data model MongoDB (Mongoose)

### `channels`
- `platform`: `'youtube' | 'facebook'`
- `channelId`: string unique (`@handle`, `pageId`)
- `name`, `avatar`
- `topic`: string[]
- `priority`: number (1-10)
- `totalVideos`: number
- `lastScanned`: Date
- `isActive`: boolean
- `metadata`: object

### `videos`
- `platform`, `videoId` (unique)
- `title`, `views`, `likes`
- `url`, `thumbnail`, `topic`
- `uploadedAt`, `discoveredAt`
- `localPath`
- `downloadStatus`: `pending | downloading | done | failed`
- `failReason`
- `channel`: ObjectId ref `Channel`

### `job_logs`
- `jobType`: `discover | scan-channel | download`
- `topic`, `platform`
- `status`: `success | failed | partial`
- `itemsFound`, `itemsDownloaded`, `duration`
- `error`, `ranAt`

### `settings`
- `keywords`: object theo topic
- `cronTimes`: object (`discover`, `scan`)
- `maxConcurrentDownload`
- `minViewsFilter`
- `proxyList`
- `telegramBotToken`
- `isEnabled`

---

## 5) Job #1 – DiscoverNewTrends (07:00)

### Luồng xử lý
1. Load `settings` từ DB.
2. Lặp qua `platform x topic`.
3. Scrape dữ liệu từ 3 nguồn.
4. Parse views (`1.2M`, `300K`), chuẩn hóa URL/videoId.
5. Upsert `channel`, upsert `video` với trạng thái `pending`.
6. Push queue `download-video` với priority cao nếu view > 1M.

### Best practice chống block
- Rotate User-Agent + viewport.
- Delay ngẫu nhiên giữa các thao tác.
- Scroll theo nhịp người dùng.
- Thêm backoff khi gặp 429/timeout.

---

## 6) Job #2 – ScanSavedChannels (08:30)

### Luồng xử lý
1. Lấy tất cả channels `isActive = true`, sort `priority DESC`.
2. Truy cập:
   - YouTube: `/@handle/shorts`
   - Facebook: `/pageId/reels`
3. Scroll và lấy video mới (`uploadedAt > lastScanned`).
4. Upsert video mới + queue download.
5. Cập nhật `lastScanned`.

---

## 7) Download queue với BullMQ

### Cấu hình
- Queue name: `video-download`.
- `attempts: 3`, `backoff: exponential`, `removeOnComplete` có giới hạn.
- Worker concurrency đọc từ `settings.maxConcurrentDownload`.

### Worker flow
1. Lấy video theo `videoId`.
2. Set status `downloading`.
3. Chạy `yt-dlp` với output path chuẩn.
4. Thành công -> `done` + `localPath`.
5. Thất bại -> `failed` + `failReason`; throw để retry nếu chưa quá số lần.

---

## 8) API contracts (NestJS Controllers)
- `GET /stats/overview`
- `GET /channels?search=&page=&limit=`
- `POST /channels/:id/manual-scan`
- `GET /videos?platform=&topic=&status=&minViews=&from=&to=`
- `POST /videos/:id/re-download`
- `GET /logs`
- `POST /settings`
- `POST /jobs/trigger?type=discover|scan`

---

## 9) Frontend dashboard (Next.js)

### `/dashboard`
- 4 stat cards (total channels/videos/pending/failed).
- Line chart views theo topic 7 ngày.
- Bảng 10 video mới nhất.

### `/channels`
- Table: platform, name, topic badges, priority, last scanned, actions.
- Actions: manual scan, edit, delete, bulk operations.

### `/videos`
- Filters: platform/topic/status/views/date range.
- Columns: thumbnail, title, views, status, localPath.
- Actions: mở URL gốc, re-download.

### `/logs`
- Filter theo loại job/ngày/trạng thái.
- Export CSV.

### `/settings`
- Tabs: keywords, schedule, download, notifications, proxies.
- Nút `Run now` trigger trực tiếp backend.

---

## 10) Lộ trình triển khai đề xuất

### Phase 1 (2-3 ngày)
- Setup NestJS core modules + Mongo + Redis + BullMQ.
- Tạo schema, repository, queue infra.

### Phase 2 (3-5 ngày)
- Implement Discover + Scan jobs với Playwright.
- Hoàn thiện parser/normalizer/anti-duplicate.

### Phase 3 (2-3 ngày)
- Implement Download worker + retry + logging + alert.

### Phase 4 (3-5 ngày)
- Build dashboard pages + filters + charts + settings UI.

### Phase 5 (1-2 ngày)
- Hardening: rate limit, auth, monitoring, Docker production.

---

## 11) Rủi ro và cách giảm thiểu
- **Selector thay đổi liên tục**: đóng gói extractor theo adapter từng platform + fallback selector.
- **Bị chặn/IP limit**: proxy pool, random delay, retry with backoff.
- **Video private/deleted**: đánh dấu failReason rõ ràng, không retry vô hạn.
- **Queue tồn đọng lớn**: phân lớp priority + autoscale worker.

---

## 12) Gợi ý tích hợp vào codebase hiện tại
- Giữ nguyên frontend hiện tại, tạo nhóm route/dashboard mới cho chức năng scraper-download.
- Backend hiện tại có thể tách dần sang NestJS theo dạng side-by-side:
  1. Dựng service NestJS mới cho discover/scan/download.
  2. Frontend gọi API NestJS cho dashboard mới.
  3. Khi ổn định, chuyển dần các module cũ sang NestJS.

Cách này giảm rủi ro migration lớn và cho phép release từng phần.
