# ChatGPT Session Management Guide

This guide explains how to set up ChatGPT authentication and session management. This system automatically saves and reuses your ChatGPT session to avoid repeated logins.

## Quick Start

### Step 1: Initial Setup

Run the interactive setup wizard:

```bash
node backend/scripts/chatgpt-setup.js
```

**What happens:**
1. Menu appears with setup options
2. Select "Create new ChatGPT session"
3. Browser opens to ChatGPT login page
4. You manually authenticate (login with your credentials)
5. System detects authentication and captures the session
6. Session is saved for future use
7. Browser stays open for you to verify

### Step 2: Verify Session Works

Test that the saved session is valid:

```bash
node backend/scripts/chatgpt-auto-login.js --validate
```

### Step 3: Use in Your Code

The ChatGPTService automatically detects and loads the saved session when initialized:

```javascript
import ChatGPTService from './backend/services/browser/chatgptService.js';

const chatgpt = new ChatGPTService();
await chatgpt.initialize(); // Automatically loads saved session!

// Use ChatGPT as normal
const result = await chatgpt.analyzeImages(imageUrls, prompt);
```

## Security Note

If you see "This browser or app may not be secure" warning:

✅ **This is normal and expected**
- OpenAI shows this warning for automation scripts
- It's a security measure, not an indication of actual danger
- Your credentials and data are still secure
- The warning appears because the script uses Puppeteer automation

**How to proceed:**
1. Read the warning message
2. Click "Try again" or "Continue"
3. Enter your credentials as normal
4. The script will automatically detect the successful login

## Command Reference

### Interactive Setup
```bash
node backend/scripts/chatgpt-setup.js
```

Menu options:
- 1️⃣ Create new session (first-time setup)
- 2️⃣ Validate existing session
- 3️⃣ Refresh/renew session
- 4️⃣ View setup instructions
- 5️⃣ Exit

### Direct Script Commands
```bash
# Auto-login and save session
node backend/scripts/chatgpt-auto-login.js

# Validate existing session
node backend/scripts/chatgpt-auto-login.js --validate

# Refresh session
node backend/scripts/chatgpt-auto-login.js --refresh
```

## Session Storage Format

Sessions are stored securely at `backend/data/chatgpt-session.json`:

```json
{
  "cookies": [
    {
      "name": "cookie-name",
      "value": "cookie-value",
      "domain": "chatgpt.com",
      ...
    }
  ],
  "localStorage": {
    "key": "value",
    ...
  },
  "sessionStorage": {
    "key": "value",
    ...
  },
  "timestamp": "2026-03-03T12:00:00.000Z",
  "url": "https://chatgpt.com/",
  "authStatus": {
    "isAuthenticated": true,
    ...
  }
}
```

## How It Works

### Without Saved Session (Initial Setup)
```
Run chatgpt-setup.js
  ↓
Browser opens to ChatGPT
  ↓
You login manually
  ↓
System detects authentication
  ↓
Session is captured & saved
  ↓
✅ Ready to use
```

### With Saved Session (Subsequent Uses)
```
ChatGPTService.initialize()
  ↓
Check for saved session file
  ↓
Load cookies + localStorage
  ↓
Navigate to ChatGPT
  ↓
Apply saved authentication
  ↓
✅ Already authenticated!
  ↓
Chat interface ready
```

## Troubleshooting

### "This browser or app may not be secure"
**Solution**: This is normal - Click the "Try again" button and proceed with login.

### Session Expired/Invalid
Refresh the session:
```bash
node backend/scripts/chatgpt-setup.js
# Select option 3: Refresh/renew session
```

### Browser Won't Open
- Ensure Chrome is installed: https://www.google.com/chrome
- Check that no other ChatGPT tabs are open
- Try restarting your system
- Check file permissions on `backend/data/` directory

### Cookies Not Working
- Some corporate/school networks block certain cookies
- Try authenticating on a different network
- Contact your network administrator

### Session Path Issues
Customize the session path in your code:
```javascript
const chatgpt = new ChatGPTService({
  sessionPath: '/custom/path/to/chatgpt-session.json'
});
```

## Integration with Affiliate Flow

The ChatGPT session is automatically used in the affiliate video TikTok flow:

```
affiliateVideoTikTokService.executeAffiliateVideoTikTokFlow()
  ↓
(Step 1: Analyze images with ChatGPT)
  ↓
ChatGPTService.initialize()
  ↓
✅ Loads saved session automatically
  ↓
analyzeImages()
  ↓
✅ No login prompt needed
```

## Security & Privacy

### What's Stored
- Authentication cookies (same as your browser stores)
- localStorage items (user preferences, temp data)
- sessionStorage items (current session data)

### What's NOT Stored
- Your email address
- Your password
- Plain-text credentials
- Form data

### Safety Best Practices
- Keep `backend/data/chatgpt-session.json` secure
- Don't commit to version control (added to .gitignore)
- Run setup on trusted networks only
- Refresh session if you change your password
- Check file permissions: `chmod 600 backend/data/chatgpt-session.json`

## File Locations

```
backend/
├── scripts/
│   ├── chatgpt-setup.js              (← Interactive setup wizard)
│   └── chatgpt-auto-login.js         (← Manual authentication script)
├── services/
│   └── browser/
│       └── chatgptService.js         (← Auto-loads saved session)
└── data/
    └── chatgpt-session.json          (← Session storage)

docs/
└── CHATGPT_SESSION_MANAGEMENT.md     (← This file)
```

## Advanced: Automated Daily Refresh (Cron)

For production use, refresh sessions daily:

```javascript
// refresh-chatgpt-daily.js
import { ChatGPTSessionManager } from './scripts/chatgpt-auto-login.js';

console.log('⏰ Starting daily ChatGPT session refresh...');

const manager = new ChatGPTSessionManager();
const success = await manager.login();

if (success) {
  console.log('✅ Session refreshed successfully');
  process.exit(0);
} else {
  console.log('❌ Session refresh failed');
  process.exit(1);
}
```

Then add to crontab:
```bash
0 3 * * * cd /path/to/smart-wardrobe && node refresh-chatgpt-daily.js
```

## Performance

- **Initial setup**: 1-2 minutes (manual login required)
- **Subsequent loads**: <1 second (session loaded from disk)
- **Session lifetime**: Typically 30+ days
- **Storage size**: ~50-150KB per session

## Comparison with Google Flow Authentication

| Feature | Google Flow | ChatGPT |
|---------|-------------|---------|
| Browser Type | Real Chrome | Real Chrome |
| Authentication | Manual wait | Manual wait |
| Sandbox Mode | Disabled | Disabled |
| Security Warnings | Yes | Yes |
| Session Capture | Automatic | Automatic |
| Reuse | Automatic | Automatic |

Both systems use the same secure approach for authentication and session management.

## Next Steps

1. Run `node backend/scripts/chatgpt-setup.js`
2. Choose "Create new ChatGPT session" 
3. Follow the browser prompts
4. Session will be ready automatically
5. Use in affiliate flows without manual login!

---

**Last Updated**: March 3, 2026  
**Approach**: Manual authentication with automatic session capture and reuse (same pattern as Google Flow)

