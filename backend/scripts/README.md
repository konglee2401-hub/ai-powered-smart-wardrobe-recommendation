# Backend Scripts Organization

This directory contains all backend utility scripts organized by purpose.

## Directory Structure

### `/setup`
**Purpose:** Initial setup and configuration scripts

Run these scripts in order during first-time setup:
- `00-detect-drive-folder-structure.js` - Scans and maps Google Drive folder structure
- `01-check-drive-setup.js` - Validates Google Drive OAuth and folder access
- `02-setup-drive-auth.js` - Initializes Google Drive authentication
- `03-setup-test-videos.js` - Prepares test video files

```bash
# Setup flow:
node scripts/setup/00-detect-drive-folder-structure.js
node scripts/setup/01-check-drive-setup.js
node scripts/setup/02-setup-drive-auth.js
node scripts/setup/03-setup-test-videos.js
```

### `/seed`
**Purpose:** Database initialization and seeding scripts

Populate database with initial data:
- `01-seed-comprehensive-options.js` - Seeds style/clothing categories
- `02-seed-image-gen-models.js` - Loads AI image generation models
- `03-seed-image-providers.js` - Configures image provider services
- `04-seed-options.js` - Seeds prompt options

```bash
# Seed all databases:
node scripts/seed/01-seed-comprehensive-options.js
node scripts/seed/02-seed-image-gen-models.js
node scripts/seed/03-seed-image-providers.js
node scripts/seed/04-seed-options.js
```

### `/maintenance`
**Purpose:** Database maintenance and repair scripts

Use for ongoing maintenance and issue resolution:
- `00-model-sync.js` - Synchronizes AI models with database
- `01-clean-corrupted-options.js` - Removes corrupted option records
- `02-cleanup-options.js` - Removes duplicate/outdated options
- `03-enhance-options.js` - Improves option metadata
- `04-fix-corrupted-options.js` - Repairs damaged option data
- `05-restore-essential-options.js` - Restores deleted essential options

```bash
# Run maintenance routine:
node scripts/maintenance/00-model-sync.js
node scripts/maintenance/01-clean-corrupted-options.js
node scripts/maintenance/02-cleanup-options.js
```

### `/migration`
**Purpose:** Data migration and transformation scripts

Use for migrating data between systems or formats:
- `00-migrate-to-hybrid-storage.js` - Converts legacy storage format to hybrid (local+cloud)
- `01-migrate-capabilities.js` - Updates AI model capabilities format
- `02-migrate-tests.js` - Migrates test configurations
- `03-migrate-images-from-drive.js` - Downloads images from Google Drive to local storage
- `04-complete-asset-sync.js` - Synchronizes all assets between local and cloud storage

```bash
# Run migration flow:
node scripts/migration/00-migrate-to-hybrid-storage.js
node scripts/migration/03-migrate-images-from-drive.js
node scripts/migration/04-complete-asset-sync.js
```

### `/debug`
**Purpose:** Debug and diagnostic utilities

For troubleshooting and development:
- `debugProvider.js` - Debug AI provider configurations
- `list-all-models.js` - Lists all available AI models
- `vto-example.js` - Virtual try-on testing example
- `grok-auto-login.js` - Automated Grok service login
- `login-services.js` - Login credential management
- `save-grok-session.js` - Saves Grok session state
- `session-manager.js` - Manages user sessions
- `test-api-keys.js` - Validates API keys for all services
- `zai-login.js` - Zai service authentication

```bash
# Debug commands:
node scripts/debug/test-api-keys.js          # Validate all API keys
node scripts/debug/list-all-models.js        # Show available models
node scripts/debug/debugProvider.js          # Debug provider config
```

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
# Check API keys
node scripts/debug/test-api-keys.js

# Clean up old data
node scripts/maintenance/02-cleanup-options.js

# Sync models
node scripts/maintenance/00-model-sync.js
```

### Troubleshooting
```bash
# List all models to verify they're loaded
node scripts/debug/list-all-models.js

# Clean corrupted options if database issues occur
node scripts/maintenance/01-clean-corrupted-options.js

# Resync all assets if storage issues occur
node scripts/migration/04-complete-asset-sync.js
```

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
    "debug:models": "node scripts/debug/list-all-models.js"
  }
}
```
