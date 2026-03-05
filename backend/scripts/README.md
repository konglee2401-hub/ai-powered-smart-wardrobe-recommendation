# Backend Scripts Organization

This directory contains all backend utility scripts organized by purpose.

## Directory Structure

```
scripts/
├── auth/                    # Login & session management
│   ├── bfl/                 # BFL Playground auth
│   ├── chatgpt/             # ChatGPT auth
│   ├── grok/                # Grok/X.AI auth
│   └── google-flow/         # Google Flow auth
├── config/                  # Configuration files
├── debug/                   # Debug & diagnostic utilities
├── diagnostic/              # System diagnostics
├── fix/                     # Fix/repair scripts
├── maintenance/             # Database maintenance
├── migration/               # Data migration scripts
├── scene-lock/              # Scene lock workflow
├── seed/                    # Database seeding
├── setup/                   # Initial setup scripts
├── test/                    # Manual test scripts
├── trend-automation/        # Trend automation tests
└── utils/                   # Utility scripts
    ├── drive/               # Google Drive utilities
    ├── youtube/             # YouTube utilities
    └── captcha/             # Captcha utilities
```

---

## `/auth` - Login & Session Management

### BFL Playground
```bash
node scripts/auth/bfl/login.js           # Manual login to BFL
node scripts/auth/bfl/test.js            # Test BFL automation
node scripts/auth/bfl/test-upload.js     # Test BFL upload
```

### ChatGPT
```bash
node scripts/auth/chatgpt/login.js       # Auto-login to ChatGPT
node scripts/auth/chatgpt/debug-auth.js  # Debug auth issues
```

### Grok (X.AI)
```bash
node scripts/auth/grok/login.js          # Auto-login to Grok
node scripts/auth/grok/capture-session.js # Capture session data
node scripts/auth/grok/verify-session.js  # Verify session validity
node scripts/auth/grok/message-sender.js  # Send message via Grok
```

### Google Flow
```bash
node scripts/auth/google-flow/capture-session.js     # Capture session
node scripts/auth/google-flow/capture-deep-session.js # Deep session capture
node scripts/auth/google-flow/refresh-session.js      # Refresh expired session
node scripts/auth/google-flow/test-generation.js      # Test image generation
```

---

## `/setup` - Initial Setup

Run these scripts in order during first-time setup:
```bash
node scripts/setup/00-detect-drive-folder-structure.js
node scripts/setup/01-check-drive-setup.js
node scripts/setup/02-setup-drive-auth.js
node scripts/setup/03-setup-test-videos.js
```

---

## `/seed` - Database Seeding

```bash
node scripts/seed/01-seed-comprehensive-options.js   # Style/clothing categories
node scripts/seed/02-seed-image-gen-models.js        # AI image generation models
node scripts/seed/03-seed-image-providers.js         # Image provider services
node scripts/seed/04-seed-options.js                 # Prompt options
node scripts/seed/07-seed-scene-lock-defaults.js     # Scene lock defaults
```

---

## `/maintenance` - Database Maintenance

```bash
node scripts/maintenance/00-model-sync.js              # Sync AI models
node scripts/maintenance/01-clean-corrupted-options.js # Clean corrupted records
node scripts/maintenance/02-cleanup-options.js         # Remove duplicates
node scripts/maintenance/03-enhance-options.js         # Enhance metadata
node scripts/maintenance/04-fix-corrupted-options.js   # Repair damaged data
node scripts/maintenance/05-restore-essential-options.js # Restore essentials
node scripts/maintenance/06-asset-integrity-cleanup.js  # Asset cleanup
node scripts/maintenance/07-scan-sensitive-words.js     # Scan sensitive words
```

---

## `/migration` - Data Migration

```bash
node scripts/migration/00-migrate-to-hybrid-storage.js   # Hybrid storage
node scripts/migration/01-migrate-capabilities.js        # Model capabilities
node scripts/migration/02-migrate-tests.js               # Test configs
node scripts/migration/03-migrate-images-from-drive.js   # Drive → Local
node scripts/migration/04-complete-asset-sync.js         # Asset sync
node scripts/migration/05-migrate-prompts-content-safety.js # Content safety
node scripts/migration/10-fix-asset-storage-fields.js    # Fix storage fields
```

---

## `/fix` - Repair Scripts

```bash
node scripts/fix/comprehensive-asset-fix.js   # Fix asset metadata
node scripts/fix/gallery-assets.js            # Fix gallery assets
```

---

## `/debug` - Debug Utilities

```bash
node scripts/debug/test-api-keys.js     # Validate all API keys
node scripts/debug/list-all-models.js   # Show available AI models
node scripts/debug/debugProvider.js     # Debug provider config
node scripts/debug/vto-example.js       # Virtual try-on test
node scripts/debug/login-services.js    # Login services helper
node scripts/debug/session-manager.js   # Session management
node scripts/debug/zai-login.js         # Z.AI authentication
```

---

## `/utils` - Utility Scripts

### Google Drive
```bash
node scripts/utils/drive/check-config.js       # Verify Drive config
node scripts/utils/drive/share-assets.js       # Share assets publicly
node scripts/utils/drive/find-youtube-folder.js # Find YouTube folder
```

### YouTube
```bash
node scripts/utils/youtube/oauth-complete.js   # Complete OAuth flow
node scripts/utils/youtube/oauth-helper.js     # OAuth helper
```

### Captcha
```bash
node scripts/utils/captcha/manual-solver.js    # Manual captcha solver
```

---

## `/diagnostic` - System Diagnostics

```bash
node scripts/diagnostic/inspect-uploaded-images.js  # Inspect uploaded images
```

---

## `/scene-lock` - Scene Lock Workflow

```bash
node scripts/scene-lock/run-scene-lock-workflow.js  # Run scene lock generation
```

---

## `/trend-automation` - Trend Automation

```bash
node scripts/trend-automation/test-dailyhaha-youtube-upload.js  # Test YouTube upload
```

---

## NPM Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "setup:drive": "node scripts/setup/00-detect-drive-folder-structure.js && node scripts/setup/02-setup-drive-auth.js",
    "setup:all": "node scripts/setup/*.js",
    "seed:all": "node scripts/seed/*.js",
    "maintenance:clean": "node scripts/maintenance/01-clean-corrupted-options.js",
    "maintenance:sync": "node scripts/maintenance/00-model-sync.js",
    "migrate:assets": "node scripts/migration/03-migrate-images-from-drive.js && node scripts/migration/04-complete-asset-sync.js",
    "debug:check": "node scripts/debug/test-api-keys.js",
    "debug:models": "node scripts/debug/list-all-models.js",
    "auth:grok": "node scripts/auth/grok/login.js",
    "auth:chatgpt": "node scripts/auth/chatgpt/login.js",
    "auth:google-flow": "node scripts/auth/google-flow/capture-session.js"
  }
}
```

---

## Recommended Usage

### Initial Setup
```bash
# 1. Configure environment variables (.env)
# 2. Start database (MongoDB)
# 3. Run setup scripts
npm run setup:drive

# 4. Verify setup
npm run debug:check

# 5. Seed initial data
npm run seed:all
```

### Daily Maintenance
```bash
node scripts/debug/test-api-keys.js
node scripts/maintenance/02-cleanup-options.js
node scripts/maintenance/00-model-sync.js
```

### Troubleshooting
```bash
node scripts/debug/list-all-models.js
node scripts/maintenance/01-clean-corrupted-options.js
node scripts/migration/04-complete-asset-sync.js
```
