# Chrome Profile Setup Guide - Google Lab Flow Authentication

## Problem
When using Puppeteer to automate Google Labs Flow, you need to be authenticated. Currently, we wait 120 seconds for manual login, which is not ideal for:
- Automated testing
- CI/CD pipelines  
- Headless environments
- Repeated testing sessions

## Solution: Use Chrome User Profile

Google Chrome stores authenticated sessions in user profiles. By pointing Puppeteer to an existing Chrome profile, you can:
- ✅ Auto-load authentication tokens
- ✅ Bypass login pages
- ✅ Use saved credentials and preferences
- ✅ Avoid 120-second manual wait time

## How to Find Your Chrome Profile Name

Chrome profiles are stored in: `C:\Users\[YourUsername]\AppData\Local\Google\Chrome\User Data\`

### Step 1: Open Chrome Profile Directory
```bash
explorer "C:\Users\%USERNAME%\AppData\Local\Google\Chrome\User Data"
```

### Step 2: Identify Your Profile Folder
You'll see folders like:
- `Default` - Main profile
- `Profile 1`, `Profile 2`, etc. - Additional profiles  
- `Cong`, `Cris Lee`, etc. - **Named profiles** (these are custom names)

Look for the profile that matches your use case:
- Each folder name corresponds to a Chrome profile
- Check `Local State` JSON file to see profile associations

### Step 3: Find Your Email Association
Inside the profile folder, check for files that indicate which email is used:
- Look in `.sessions/google-flow-session.json` if already saved
- Check Chrome's profile manager (Chrome Menu → Settings → You and Google → Manage profiles)
- Profile with "modluffy90@gmail.com" would be the one we want

## Using Chrome Profile with GoogleFlowService

### Option 1: Pass Profile Name to initialize()

```javascript
import GoogleFlowService from './services/browser/googleFlowService.js';

// Use full path for clarity (Windows example)
const service = new GoogleFlowService({ headless: false });

await service.initialize({ 
  chromeProfile: 'Cong'  // Profile name for modluffy90@gmail.com
});
```

### Option 2: Pass Profile Name to Constructor

```javascript
const service = new GoogleFlowService({ 
  headless: false,
  chromeProfile: 'Cong'  // Use this profile from start
});

await service.initialize();
```

## Profile Mapping (Examples)

| Profile Folder | Email | Use Case |
|---|---|---|
| `Default` | First Google account | General browsing |
| `Profile 1` | Second account | Testing other logins |
| `Cong` | modluffy90@gmail.com | 🎯 **Lab Flow automation** |
| `Cris Lee` | Other account | Development only |

## Setting Up a New Chrome Profile (Optional)

If you don't have a profile for your target email:

### Step 1: Create New Profile in Chrome
1. Open Chrome
2. Click Profile icon (top right)
3. Click "Add" button
4. Enter name: `Cong` (or your preferred name)
5. Click "Create"

### Step 2: Login to That Profile
1. Chrome will open the new profile automatically
2. Click "Sign in to Chrome"
3. Enter: `modluffy90@gmail.com`
4. Complete the login flow
5. Close the browser

### Step 3: Use in GoogleFlowService

```javascript
const service = new GoogleFlowService();
await service.initialize({ chromeProfile: 'Cong' });
```

## How It Works Internally

When you specify a Chrome profile, Puppeteer uses the `userDataDir` option:

```javascript
this.browserOptions = {
  userDataDir: 'C:\\Users\\YourUser\\AppData\\Local\\Google\\Chrome\\User Data\\Cong'
};
```

This makes Puppeteer:
1. Load cookies from that profile
2. Load localStorage data from that profile
3. Load preferences from that profile
4. Bypass Google's login page (user already authenticated)
5. Access Lab Flow directly with full permissions

## Testing the Setup

### Quick Test: Check if Profile Works

```bash
cd backend
node -e "
import GoogleFlowService from './services/browser/googleFlowService.js';
const service = new GoogleFlowService();
service.initialize({ chromeProfile: 'Cong' }).then(() => {
  console.log('✅ Profile loaded successfully');
  service.close();
});
"
```

### Run Full Test Suite

```bash
# Test 1: Check service initialization with profile
npm run test-lab-flow 

# Test 2: Test image generation workflow
npm run test-lab-flow -- test-simple-image

# Test 3: Test VTO integration
npm run test-lab-flow -- test-vto-workflow
```

## Fallback: Session File Method

If Chrome profile setup doesn't work, we use session files (`.sessions/google-flow-session.json`):

```javascript
// This automatically loads cookies and localStorage
const service = new GoogleFlowService();
await service.initialize();  // No profile needed - uses saved session
```

Session files are created after successful manual login:
- Saves all cookies (authentication tokens)
- Saves localStorage (settings, preferences)
- File location: `.sessions/google-flow-session.json`

## Troubleshooting

### Problem: "Profile not found" error
**Solution**: 
- Verify profile folder exists in `C:\Users\YourUser\AppData\Local\Google\Chrome\User Data\`
- Check folder name spelling exactly
- Try using `Default` profile first to test

### Problem: "Still shows login page"
**Solution**:
- Make sure you're logged in to that Chrome profile with `modluffy90@gmail.com`
- Try logging out and back in to the profile in regular Chrome
- Delete Chrome cache and try again

### Problem: "Cookies expired"
**Solution**:
- Chrome cookies expire after 30 days by default
- Login to the Chrome profile in regular Chrome to refresh
- Regenerate `.sessions/google-flow-session.json`

### Problem: "Can't access profile - port in use"
**Solution**:
- Chrome is already running in that profile
- Close all Chrome windows
- Try with a different profile
- Use `--no-sandbox` flag if needed

## Security Considerations

⚠️ **Important**: 

1. **Profile Isolation**: Chrome profiles are per-user. Keep them private.
2. **Cookie Expiry**: Cookies expire. Refresh periodically.
3. **API Keys**: Never commit `.sessions/google-flow-session.json` to Git
4. **Profile Access**: Profile must be on same machine. Can't share between devices.

## Advanced: Multiple Profiles for Different Accounts

```javascript
// Test account 1
const service1 = new GoogleFlowService();
await service1.initialize({ chromeProfile: 'Cong' });  // modluffy90@gmail.com

// Test account 2  
const service2 = new GoogleFlowService();
await service2.initialize({ chromeProfile: 'Default' });  // Another account

// Run tests in parallel
await Promise.all([
  service1.generateImage('test prompt 1'),
  service2.generateImage('test prompt 2')
]);
```

## Integration with CI/CD

For automated testing in CI/CD:

1. **Setup**: Create Chrome profile once on the test machine
2. **Use**: Reference the profile in your tests
3. **Maintenance**: Update session file monthly as cookies expire

```bash
# In GitHub Actions / Jenkins / etc.
# Before tests run:
- name: Setup Chrome Profile
  run: |
    # Create profile if doesn't exist
    # Or update session credentials
    npm run setup-chrome-profile

- name: Run Tests
  run: npm test  # Tests use chromeProfile: 'Cong'
```

## References

- [Puppeteer userDataDir](https://pptr.dev/api/puppeteer.puppeteeroptions.userdatadir)
- [Chrome User Data Directory](https://chromium.googlesource.com/chromium/src/+/master/docs/user_data_dir.md)
- [Chrome Profiles Help](https://support.google.com/chrome/answer/2364824)

## Next Steps

1. ✅ Identify your Chrome profile folder name (e.g., `Cong`)
2. ✅ Ensure the profile is logged in with `modluffy90@gmail.com`
3. ✅ Update test script to use: `chromeProfile: 'Cong'`
4. ✅ Run tests - they should skip the 120-second manual wait!
5. ✅ For CI/CD, add profile setup to your pipeline

---

**Questions?** Check the comments in `services/browser/googleFlowService.js` or test using:
```bash
npm run test-lab-flow
```
