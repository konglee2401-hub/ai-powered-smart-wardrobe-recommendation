# Google Lab Flow Authentication Guide

## Problem Analysis

When logging into Google Lab Flow using Chrome profile, you encounter:
1. **"Browser Not Secure"** warning
2. Chrome opens a **new window** for Google authentication
3. Must **manually navigate back** to labs.google/fx/vi/tools/flow to complete login
4. Playwright cannot track the new window reliably

## Solution Overview

We have implemented a **3-tier approach**:

### 1. Manual Login Flow (Current)
Run the test script to manually authenticate:
```bash
cd backend
node test-lab-flow-integration.js
```

**What happens:**
- Chrome opens with your profile
- You login to Google (new window may open - that's normal)
- After 2 minutes, script navigates back to labs.google
- Captures all cookies from browser context (including google.com)
- Saves to: `temp/lab-flow-tests/captured-storage.json`

### 2. Pre-load Google Authentication (Optional)
Use the setup script to pre-load your Google credentials:

```bash
node setup-google-auth.js
```

This creates `.sessions/google-auth.json` with your Google account cookies.
- Helps avoid "browser not secure" warnings
- Can be loaded on subsequent runs
- Edit `setup-google-auth.js` if your credentials expire

### 3. SessionManager Auto-Persistence
GoogleFlowService automatically saves sessions to `.sessions/google-flow-session.json` after login.
- First login: Manual input
- Subsequent runs: Loads from session file
- Session persists across script runs

## Technical Details

### Why New Window Opens
When Playwright launches Chrome with `--user-data-dir` and you attempt Google login:
1. Chrome security detects Playwright automation
2. Opens a **new window** for secure authentication
3. Playwright's main page loses connection to auth flow

### How We Capture Sessions
```javascript
// After 120s login wait, we:
1. Use browser.pages() to find all open pages
2. Locate the one with labs.google domain
3. Navigate to /flow URL if needed
4. Capture from page.context().cookies() (includes ALL domains)
```

### Cookie Domains Captured
- `.google.com` - Google auth cookies (SID, APISID, SAPISID, etc.)
- `labs.google` - Lab Flow specific cookies (session tokens)
- Other related domains

## File Locations

```
backend/
├── setup-google-auth.js              # One-time setup for google.com credentials
├── test-lab-flow-integration.js       # Main test script
├── services/browser/
│   ├── googleFlowService.js          # Service for Lab Flow automation
│   ├── browserService.js             # Base browser service
│   └── sessionManager.js             # Session persistence
├── .sessions/
│   ├── google-auth.json              # (Optional) Pre-loaded Google credentials
│   └── google-flow-session.json       # (Auto-created) Lab Flow session
└── temp/
    └── lab-flow-tests/
        └── captured-storage.json      # Output: All captured auth data
```

## Workflow

### First Time Setup
```bash
# 1. Setup Google credentials (optional)
node setup-google-auth.js

# 2. Run test - manual login required
node test-lab-flow-integration.js
# → Wait 2 min, complete Google login
# → Captures credentials to temp/lab-flow-tests/captured-storage.json
# → Also saves to .sessions/google-flow-session.json

# 3. Review captured data
cat temp/lab-flow-tests/captured-storage.json
cat .sessions/google-flow-session.json
```

### Subsequent Runs
```bash
# Session auto-loads from .sessions/google-flow-session.json
node test-lab-flow-integration.js
# → Should skip login if session valid
```

## Troubleshooting

### "No files created in temp/lab-flow-tests"
**Solution:** Script now ensures directory creation. Check:
```bash
ls -la temp/lab-flow-tests/
cat temp/lab-flow-tests/captured-storage.json
```

### "New window keeps appearing"
**This is normal!** Chrome security feature. Our solution:
- Waits for you to complete login in new window
- Tracks all open pages after wait
- Navigates back to labs.google if needed
- Captures cookies from browser context

### "Login still shows 'Not Secure'"
**Solution:** Pre-load Google credentials:
1. Run `setup-google-auth.js` 
2. Edit with your fresh credentials if expired
3. GoogleFlowService will inject them on next run

### "Can't capture data from new window"
**How we fixed it:**
```javascript
// Instead of using main page only:
const allPages = await browser.pages();
const flowPage = allPages.find(p => p.url().includes('labs.google'));

// Capture from context (includes all pages/windows):
const cookies = await page.context().cookies(); // Gets ALL cookies
```

## Implementation Details

### GoogleFlowService
```javascript
// Masks automation detection
await this._maskAutomation();  // Hides navigator.webdriver, etc.

// Waits for manual login
for (let i = 120; i > 0; i--) {
  console.log(`⏳ ${i}s remaining...`);
  await page.waitForTimeout(1000);
}

// Saves session automatically
await saveSession();  // → .sessions/google-flow-session.json
```

### Test Script Enhancement
```javascript
// Find labs.google page among all windows
const allPages = await browser.pages();
let flowPage = allPages.find(p => p.url().includes('labs.google'));

// Navigate to capture post-login state
if (!flowPage) {
  flowPage = currentPage;
  await flowPage.goto('https://labs.google/fx/vi/tools/flow');
}

// Capture from context (all domains)
const allCookies = await page.context().cookies();
// Includes: google.com, labs.google, etc.
```

## Next Steps

After capturing credentials:

1. **Use in Production:**
   - SessionManager loads `.sessions/google-flow-session.json` automatically
   - GoogleFlowService skips login if session valid

2. **For Batch Operations:**
   - Run once manually to capture session
   - Subsequent runs use saved session

3. **Refresh Periodically:**
   - Google auth tokens expire (set in cookie).expires
   - When expired, re-run manual login flow
   - Script will update .sessions files

## Additional Resources

- SessionManager: `services/browser/sessionManager.js`
- Chrome profile setup: `services/browser/browserService.js`
- Lab Flow service: `services/browser/googleFlowService.js`
- Test implementation: `test-lab-flow-integration.js`
