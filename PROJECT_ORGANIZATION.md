# Project Organization Guide

**Last Updated:** February 25, 2026  
**Status:** ✅ Reorganized and cleaned

## 📊 Project Structure

```
smart-wardrobe/
├── backend/
│   ├── server.js                 # Main Express server (PORT 5000)
│   ├── scripts/                  # Utility scripts organized by type
│   │   ├── setup/               # Initial setup & configuration
│   │   ├── seed/                # Database initialization
│   │   ├── maintenance/         # Data maintenance & repairs
│   │   ├── migration/           # Data migration & synchronization
│   │   ├── debug/               # Debug & diagnostic utilities
│   │   └── README.md            # Scripts usage guide
│   ├── tests/                    # Test suite
│   │   ├── jest.config.js       # Jest configuration
│   │   ├── *.js                 # Individual test files (01-10)
│   │   └── README.md            # Tests documentation
│   ├── services/                # Business logic services
│   ├── routes/                  # API endpoints
│   ├── models/                  # Database models
│   ├── config/                  # Configuration files
│   ├── middleware/              # Express middleware
│   ├── controllers/             # Route controllers
│   ├── media/                   # Media files & downloads
│   │   └── downloads/           # Downloaded/synced images
│   ├── uploads/                 # User uploads
│   ├── temp/                    # Temporary files
│   └── package.json             # Backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   └── config/              # Frontend configuration
│   ├── vite.config.js           # Vite build config
│   ├── package.json             # Frontend dependencies
│   └── index.html               # Entry point
│
├── docs/                         # Documentation (organized by date)
│   ├── 2026-02-25/             # Documentation from Feb 25, 2026
│   │   ├── AFFILIATE_VIDEO_TIKTOK_GUIDE.md
│   │   ├── GOOGLE_DRIVE_*.md    # Drive integration docs
│   │   ├── VIRTUAL_TRYON_*.md   # VTO feature docs
│   │   └── ... (28 total docs)
│   └── README.md                # Docs index
│
├── docker-compose.yml           # Docker configuration
├── package.json                 # Root project metadata
└── README.md                    # Main project README
```

## 🗂️ Key Directories & Their Purpose

### `/backend/scripts`
**Purpose:** Utility and maintenance scripts  
**Structure:** Organized by function with numeric prefixes for execution order

```
scripts/
├── setup/           # Run once during initial setup
├── seed/            # Database initialization (run after setup)
├── maintenance/     # Ongoing maintenance tasks
├── migration/       # One-time data migrations
└── debug/           # Development & troubleshooting utilities
```

**Quick Commands:**
```bash
# Initial setup
npm run setup:drive

# Seed all data
npm run seed:all

# Maintenance
npm run maintenance:clean

# Run specific script
node backend/scripts/setup/02-setup-drive-auth.js
```

### `/backend/tests`
**Purpose:** Comprehensive test suite  
**Type:** Jest tests with 10+ test files

```
tests/
├── 01-10 test files    # Numbered for execution order
└── jest.config.js      # Jest configuration
```

**Quick Commands:**
```bash
npm test                    # Run all tests
npm test -- --watch       # Run in watch mode
npm test -- --coverage    # Generate coverage report
```

### `/docs`
**Purpose:** All project documentation  
**Organization:** By date of creation (2026-02-25/)

```
docs/
├── 2026-02-25/         # Feb 25, 2026 documentation
│   ├── Architecture reviews
│   ├── Feature guides
│   ├── API documentation
│   └── Implementation details
└── Future dates...      # As project evolves
```

## 🔄 Recent Reorganization (2026-02-25)

### What Changed
✅ **Scripts:** Moved 29 root JS files into organized subdirectories  
✅ **Tests:** Consolidated 10 test files into `backend/tests/`  
✅ **Docs:** Moved 28 documentation files into `docs/2026-02-25/`  
✅ **Naming:** Added numeric prefixes for execution order  
✅ **Documentation:** Created README files for each section  

### Files Organized

**Before:** 29 JS files cluttering backend root  
**After:** Clean organization in subdirectories

| Category | Count | Location |
|----------|-------|----------|
| Setup Scripts | 3 | `/scripts/setup/` |
| Seed Scripts | 4 | `/scripts/seed/` |
| Maintenance | 5 | `/scripts/maintenance/` |
| Migration | 4 | `/scripts/migration/` |
| Debug Tools | 8 | `/scripts/debug/` |
| Test Files | 10 | `/tests/` |
| Documentation | 28 | `/docs/2026-02-25/` |

## 🚀 Quick Start

### First Time Setup
```bash
cd smart-wardrobe

# 1. Setup
npm run setup:drive

# 2. Verify setup
node backend/scripts/debug/test-api-keys.js

# 3. Seed database
npm run seed:all

# 4. Start development
npm run dev:backend &
npm run dev:frontend
```

### Running Tests
```bash
npm test                              # All tests
npm test -- tests/02-test-*.js        # Specific category
npm test -- --coverage               # With coverage
```

### Maintenance Tasks
```bash
# Regular cleanup
npm run maintenance:clean

# Sync models
npm run maintenance:sync

# Repair assets
npm run migrate:assets
```

## 📚 Documentation Files

### Most Important
- **`docs/2026-02-25/AFFILIATE_VIDEO_TIKTOK_GUIDE.md`** - TikTok workflow (START HERE)
- **`docs/2026-02-25/5_USE_CASES_QUICK_REFERENCE.md`** - Feature overview

### Google Drive Integration
- `docs/2026-02-25/GOOGLE_DRIVE_*.md` (3 files)
- `backend/scripts/setup/01-check-drive-setup.js`

### Features
- **Virtual Try-On:** `docs/2026-02-25/VIRTUAL_TRYON_*`
- **Voice-Over:** `docs/2026-02-25/VOICEOVER_*`
- **Image Generation:** `docs/2026-02-25/IMAGE_*`
- **Video Generation:** `docs/2026-02-25/VIDEO_GENERATION_*`

## 🎯 Navigation Tips

1. **Need to fix something?** → Check `/backend/scripts/maintenance/`
2. **Setting up for first time?** → Check `/backend/scripts/setup/`
3. **Want to initialize data?** → Check `/backend/scripts/seed/`
4. **Running tests?** → Check `/backend/tests/README.md`
5. **Feature documentation?** → Check `/docs/2026-02-25/`

## 🔧 Maintenance Notes

- Scripts should be run in numeric order within each category
- Tests are independent and can be run individually
- Documentation is date-organized for easy versioning
- New scripts should follow the naming convention: `##-description.js`

## ✨ Recent Improvements (2026-02-25)

- ✅ 4 critical bugs fixed (ERR_EMPTY_RESPONSE, database loading, image count, Veo aspect ratio)
- ✅ Gallery UI improved (4-column grid with infinite scroll)
- ✅ 86 images synchronized locally + cloud
- ✅ Complete asset sync system implemented
- ✅ Project scripts & docs reorganized
