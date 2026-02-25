# Google Lab Flow - Captured Storage Workflow

## Problem
After the first test run with manual 120-second login, you were able to capture credentials but couldn't easily reuse them. Every subsequent test would require waiting another 120 seconds.

## Solution: Automatic Captured Storage Reuse

Now the test script can:
1. ✅ Load captured credentials from the last test run
2. ✅ Automatically save them to `.sessions/google-flow-session.json`
3. ✅ Skip login entirely on next run (0 seconds wait!)
4. ✅ Reuse credentials from `captured-storage.json` until they expire

---

## Workflow

### First Run (Manual Login - 120 seconds)
```bash
npm run test-lab-flow
```

Flow:
1. ⏳ Opens browser
2. ⏳ Waits 120 seconds for manual Google login
3. 💾 Captures all cookies and localStorage
4. 📁 Saves to: `temp/lab-flow-tests/captured-storage.json`
5. 🖼️ Generates test images

Output:
```
Captured storage saved to temp/lab-flow-tests/captured-storage.json
✅ Cookies: 28
✅ localStorage: 0 keys
```

### Second Run (Auto Login - 0 seconds)
```bash
npm run test-lab-flow
```

Flow:
1. 📂 Finds `captured-storage.json` from previous run
2. ✅ Loads captured credentials
3. 💾 Saves to: `.sessions/google-flow-session.json`
4. 🚀 GoogleFlowService auto-loads session
5. ⏭️ **Skips login wait entirely!**
6. 🖼️ Generates test images immediately

Output:
```
✅ Loaded captured storage from temp/lab-flow-tests/captured-storage.json
   User: leecris241@gmail.com
   Cookies: 28
   Captured at: 2026-02-21T01:58:27.994Z

📝 Using captured storage from previous test...
💾 Saving captured storage as session file for future use...

✅ Saved to: .sessions/google-flow-session.json

✅ Service initialized successfully (no login wait!)
```

### Third+ Runs (Using Saved Session - 0 seconds)
```bash
npm run test-lab-flow
```

Flow:
1. 📂 Finds `.sessions/google-flow-session.json` (more reliable)
2. 🚀 GoogleFlowService auto-loads session
3. ⏭️ **Skips login wait entirely!**
4. 🖼️ Generates test images immediately

Output:
```
✅ Loaded saved session from .sessions/google-flow-session.json
   User: leecris241@gmail.com
   Saved at: 2026-02-21T02:05:33.123Z

✅ Service initialized successfully (no login wait!)
```

---

## File Locations

```
backend/
├── .sessions/
│   └── google-flow-session.json          ← Persistent session (auto-loaded)
├── temp/lab-flow-tests/
│   ├── captured-storage.json             ← Captured from manual login
│   ├── test-simple-generation.png        ← Generated images
│   └── ...
└── test-lab-flow-integration.js          ← Test script
```

---

## How It Works

### Step 1: Capture (First Run)
```javascript
// TestScript captures after manual login
const authData = {
  userEmail: "leecris241@gmail.com",
  cookies: [ /* 28 cookies */ ],
  localStorage: { /* any saved prefs */ },
  timestamp: "2026-02-21T01:58:27.994Z"
};

// Saved to
fs.writeFileSync('temp/lab-flow-tests/captured-storage.json', JSON.stringify(authData));
```

### Step 2: Reuse (Subsequent Runs)
```javascript
// TestScript detects captured storage
if (fs.existsSync(this.capturedStorageFile)) {
  this.loadCapturedStorage();           // ✅ Load captured data
  this.saveCapturedStorageAsSession();  // ✅ Save to session file
}

// GoogleFlowService auto-loads session
const sessionData = JSON.parse(fs.readFileSync('.sessions/google-flow-session.json'));
await this.page.setCookie(...sessionData.cookies);
```

### Step 3: GoogleFlowService Detects Login
```javascript
// GoogleFlowService._checkIfLoggedIn()
// Checks for "Dự án mới" button → indicates already logged in
// ✅ Skips 120-second wait!
```

---

## Usage Examples

### Run Full Test Suite with Captured Credentials
```bash
cd backend
npm run test-lab-flow
```

### Force Fresh Login (if credentials expired)
```bash
# Delete saved session, next run will prompt for manual login
rm .sessions/google-flow-session.json
npm run test-lab-flow
```

### Check Captured Credentials Status
```bash
# View captured storage
cat temp/lab-flow-tests/captured-storage.json | jq '.userEmail, .cookies | length'

# View session file
cat .sessions/google-flow-session.json | jq '.userEmail, .cookies | length'
```

### Test Only Image Generation (using credentials)
```bash
npm run test-lab-flow -- test-image
```

---

## Cookie Expiration & Refresh

### When Do Cookies Expire?
- Google cookies typically valid for 30 days
- Next-auth session tokens valid until manually logged out
- localStorage persists until cleared

### How to Refresh Expired Credentials

If you get login page after 30 days:

```bash
# Option 1: Delete session file, let it prompt for login again
rm .sessions/google-flow-session.json
npm run test-lab-flow   # Will wait 120 seconds for manual login

# Option 2: Use Chrome profile with auto-filled email
npm run test-lab-flow -- --profile "Profile 4"
```

---

## Performance Comparison

| Method | First Run | Subsequent | Improvement |
|--------|-----------|-----------|--|
| **Manual Wait** | 120s ⏳ | 120s ⏳ | - |
| **Captured → Session** | 120s + 2s 💾 | 2s ⚡ | 60x faster |
| **Chrome Profile** | 10s ⚡ | 10s ⚡ | 12x faster |

---

## Architecture

```
Test Flow with Captured Storage:

1st Run:
┌─────────────────────────┐
│ npm run test-lab-flow   │
└────────────┬────────────┘
             ↓
        ┌────────────────────┐
        │ Wait 120s for      │
        │ manual login       │
        └────────┬───────────┘
                 ↓
        ┌────────────────────┐
        │ Capture cookies    │
        │ & localStorage     │
        └────────┬───────────┘
                 ↓
        ┌────────────────────────────────┐
        │ Save to captured-storage.json   │
        └──────────────────────────┬──────┘
                                   ↓
                        ✅ Tests run successfully

─────────────────────────────────────────────────────

2nd+ Runs:
┌─────────────────────────┐
│ npm run test-lab-flow   │
└────────────┬────────────┘
             ↓
        ┌────────────────────────────────┐
        │ Load captured-storage.json      │
        └────────┬───────────────────────┘
                 ↓
        ┌───────────────────────────────────┐
        │ Save to .sessions/                │
        │ google-flow-session.json          │
        └────────┬────────────────────────┘
                 ↓
        ┌────────────────────┐
        │ GoogleFlowService  │
        │ loads session      │ ⚡ (instant!)
        │ auto-login ✅      │
        └────────┬───────────┘
                 ↓
        ✅ Tests run immediately (0s wait)
```

---

## Troubleshooting

### Issue: "still shows login page"
**Check**: Did cookies expire (>30 days)?
```bash
cat temp/lab-flow-tests/captured-storage.json | grep expires
# If all dates are in the past, credentials expired
# Solution: Delete session file, run test again for fresh login
```

### Issue: "Cookie set failed"
**Check**: Are some cookies invalid for domain?
```bash
# Test script logs which cookies failed
npm run test-lab-flow 2>&1 | grep "Could not set cookie"
```

### Issue: "Wrong user email in credentials"
**Check**: Is the email in captured storage correct?
```bash
cat temp/lab-flow-tests/captured-storage.json | jq '.userEmail'
# If wrong, delete files and login with correct account:
rm -rf .sessions/google-flow-session.json
rm temp/lab-flow-tests/captured-storage.json
npm run test-lab-flow
```

---

## Next Steps

1. **Test Captured Credentials**:
   ```bash
   npm run test-lab-flow
   ```

2. **Monitor Cookie Expiry** (reminder to refresh):
   - Add to calendar: 30 days from first manual login
   - Or check: `cat temp/lab-flow-tests/captured-storage.json | jq '.cookies[0].expires'`

3. **Set Up CI/CD**:
   - Copy `.sessions/google-flow-session.json` to CI/CD secrets
   - Restore before tests run
   - Tests will use automatically

4. **For Long-Term**:
   - Use Chrome Profile method for automated refresh
   - Or track cookie expiry and auto-refresh

---

## File Reference

- **captured-storage.json** (temp directory)
  - Auto-created after first manual login
  - Contains: all cookies, localStorage, sessionStorage
  - Used during: 2nd test run

- **google-flow-session.json** (.sessions directory)
  - Auto-created from captured storage
  - Lighter version (only essential data)
  - Used during: 3rd+ test runs
  - More reliable and persistent

---

**Key Insight**: 
The first login is manual (120s), but subsequent runs use zero-wait cached credentials! 🚀

For instant testing every time, use Chrome profiles instead.
