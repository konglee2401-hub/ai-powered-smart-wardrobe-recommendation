# 🌐 Google Flow - Persistent Browser Method 

## Problem
- Automation (Puppeteer) gets detected by Google
- OAuth flow requires manual interaction 
- Profile 2 alone isn't enough - Google demands re-authentication
- Solutions: 1) persistent browser, 2) manual login + capture

## Solution: Persistent Browser Method ✅

Instead of trying to automate the login, **let the user login manually** and capture credentials once they're done.

### Step-by-Step:

**Step 1: Start the persistent browser**
```bash
cd backend
node test-persistent-browser.js
```

**What happens:**
- ✅ Browser opens with your Profile 2
- ✅ Lab Flow page loads at `https://labs.google/fx/vi/tools/flow`
- ⏸️ Script waits for you to login

**Step 2: Complete Google Login (if needed)**

If you see a Google login screen:
1. Click "Sign in with Google" or similar button
2. Complete any verification (email, password, 2FA if needed)
3. Grant permissions when asked
4. Click "Tạo bằng Flow" to access the editor

If you're already logged in from Profile 2, you should see the Flow landing page directly.

**Step 3: Verify You're in Editor**

Look for:
- ✓ URL shows `labs.google/fx/...` or similar (NOT accounts.google.com)
- ✓ You can see the Flow interface
- ✓ You can see a text input/textarea for prompts
- ✓ "Tạo hình ảnh" (Create Image) button visible

**Step 4: Tell the script you're ready**

Once everything looks good:
1. Go back to Terminal
2. Type: `ready`
3. Press Enter

The script will automatically:
- Capture all cookies from your authenticated browser session
- Save them to `.sessions/google-flow-session.json`
- Close the browser

### What Gets Saved? 

```
.sessions/google-flow-session.json
├── Cookies (from Google & labs.google domains)
├── localStorage (Flow settings if any)
└── Session metadata
```

These will be **reused automatically** for the next test run.

---

## FAQ

**Q: What if I'm already logged in from Chrome Profile 2?**
A: Perfect! Just click "Tạo bằng Flow" and tell the script "ready"

**Q: What if Google asks to login again?**
A: Complete the login normally in the browser window, then say "ready"

**Q: Can I take multiple logins?**
A: Yes! Each time you run the script, just complete login and say "ready"

**Q: What if the prompt/textarea doesn't appear?**
A: You might not be in the editor yet. Look for:
- Different URL (not accounts.google.com)
- Flow UI visible (not landing page)
- Then ask for update on this issue

**Q: How long will the credentials last?**
A: Usually 30-90 days depending on Google's refresh tokens

---

## Next Steps After Credential Capture

Once `.sessions/google-flow-session.json` is created:

1. **Run the normal test:**
   ```bash
   node test-lab-flow-integration.js
   ```

2. **Or test image generation directly:**
   ```bash
   node test-simple-image-gen.js
   ```

The saved credentials will be loaded automatically - **no re-login needed!**

---

## Troubleshooting

**Browser opens but closes immediately:**
- Check if you have Chrome installed
- Try: `google-chrome --version` or check Chrome in Programs

**"Sign in with different user" appears:**
- This means Profile 2's cookies expired
- Just login with Google normally
- Credentials will be captured fresh

**Says "textarea not found":**
- You're probably still on the landing page
- Click "Tạo bằng Flow" button first
- Wait for editor to load

**Script doesn't detect "ready" input:**
- Make sure you type exactly: `ready` (lowercase)
- Press Enter after typing
