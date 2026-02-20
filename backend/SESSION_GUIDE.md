# Session Management Guide for Z.AI Browser Automation

## Overview

Hệ thống session mới cho phép bạn lưu cookie đăng nhập Z.AI để sử dụng cho các lần chạy sau, tránh phải đăng nhập lại mỗi lần.

## How It Works

1. **Session Storage**: Cookies được lưu trữ trong file `backend/.sessions/zai-session.json`
2. **Auto Loading**: Session được tự động tải khi khởi động browser nếu file tồn tại
3. **Full HD Viewport**: Browser sử dụng viewport 1920x1080 để hiển thị đầy đủ website

## Steps to Save a Session

### Step 1: Login Manually
```bash
cd backend
node -e "
import ZAIChatService from './services/browser/zaiChatService.js';

const service = new ZAIChatService({
  headless: false,  // Chạy browser hiển thị
  timeout: 120000
});

await service.launch();
await service.goto('https://chat.z.ai');

console.log('💡 Vui lòng đăng nhập thủ công vào Z.AI trong cửa sổ browser');
console.log('⏳ Đợi 60 giây để hoàn tất đăng nhập...');

// Đợi bạn đăng nhập thủ công
await new Promise(resolve => setTimeout(resolve, 60000));

// Kiểm tra đăng nhập
const isLoggedIn = await service.checkIfLoggedIn();
if (isLoggedIn) {
  console.log('✅ Bạn đã đăng nhập thành công!');
  
  // Lưu session
  const saveSuccess = await service.saveSession();
  if (saveSuccess) {
    console.log('✅ Session đã được lưu thành công!');
    console.log('📁 File session: backend/.sessions/zai-session.json');
  } else {
    console.log('❌ Lưu session thất bại');
  }
} else {
  console.log('⚠️  Bạn chưa đăng nhập. Vui lòng thử lại.');
}

await service.close();
"
```

### Step 2: Verify Session
```bash
cd backend
node test-session.js
```

## Using Saved Session

Sau khi đã lưu session, các lần chạy sau sẽ tự động sử dụng session:

```javascript
import ZAIChatService from './services/browser/zaiChatService.js';

const service = new ZAIChatService({
  headless: true,  // Có thể chạy ẩn vì đã có session
  timeout: 60000
});

await service.launch();  // Session sẽ tự động được tải
await service.goto('https://chat.z.ai');

// Kiểm tra đăng nhập
const isLoggedIn = await service.checkIfLoggedIn();
if (isLoggedIn) {
  console.log('✅ Đã đăng nhập bằng session lưu sẵn!');
  // Có thể sử dụng bình thường
  const result = await service.analyzeImage('path/to/image.jpg', 'Your prompt');
} else {
  console.log('⚠️  Session hết hạn hoặc không hợp lệ. Cần đăng nhập lại.');
}
```

## Session Management Commands

### Check Session Status
```bash
cd backend
node test-session.js
```

### Delete Session (Force Re-login)
```bash
cd backend
node -e "
import ZAIChatService from './services/browser/zaiChatService.js';
const service = new ZAIChatService();
const deleted = service.sessionManager.deleteSession();
console.log(deleted ? '✅ Session deleted' : '❌ No session to delete');
"
```

### View Session Info
```bash
cd backend
node -e "
import ZAIChatService from './services/browser/zaiChatService.js';
const service = new ZAIChatService();
const info = service.sessionManager.getSessionInfo();
if (info) {
  console.log('Session Info:');
  console.log('- Cookie count:', info.cookieCount);
  console.log('- Last modified:', info.modified.toLocaleString());
  console.log('- File size:', info.size, 'bytes');
} else {
  console.log('No session found');
}
"
```

## Troubleshooting

### Session Not Working
1. **Check file exists**: `backend/.sessions/zai-session.json`
2. **Check cookies**: Session cần có ít nhất 1 cookie hợp lệ
3. **Check Z.AI changes**: Website có thể thay đổi, cần đăng nhập lại

### Manual Re-login Required
Nếu session hết hạn:
1. Chạy browser ở chế độ `headless: false`
2. Đăng nhập thủ công vào Z.AI
3. Gọi `service.saveSession()` để lưu lại

### Viewport Issues
Viewport đã được thiết lập là 1920x1080 (Full HD) để hiển thị đầy đủ website. Nếu cần thay đổi:
```javascript
const service = new ZAIChatService({
  viewport: { width: 1920, height: 1080 }  // Có thể thay đổi kích thước
});
```

## Benefits

1. **No Re-login**: Không cần đăng nhập lại mỗi lần chạy
2. **Full Website Display**: Viewport 1920x1080 hiển thị đầy đủ nội dung
3. **Automatic Loading**: Session tự động được tải khi khởi động
4. **Easy Management**: Dễ dàng kiểm tra, xóa, và quản lý session

## File Structure
```
backend/
├── .sessions/
│   └── zai-session.json    # File lưu session cookies
├── services/
│   └── browser/
│       ├── sessionManager.js    # Quản lý session
│       ├── zaiChatService.js    # Service sử dụng session
│       └── browserService.js     # Base service với viewport mới
└── test-session.js              # Test session