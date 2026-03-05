# 📚 Smart Wardrobe Documentation

Complete documentation for the Smart Wardrobe AI Fashion Video Generator.

## 🗂️ Directory Structure

```
docs/
├── setup/                   # Setup & Configuration
│   ├── api-keys.md          # API keys setup for all providers
│   ├── multi-key-setup.md   # Multi-key rotation setup
│   └── browser-session.md   # Browser session management
│
├── providers/               # AI Provider Documentation
│   ├── google/              # Google Gemini / Imagen
│   ├── grok/                # Grok / X.AI
│   ├── chatgpt/             # ChatGPT / OpenAI
│   ├── openrouter/          # OpenRouter API
│   └── image-providers.md   # All image providers overview
│
├── features/                # Feature Documentation
│   ├── image-generation/    # Image generation features
│   ├── video-generation/    # Video generation features
│   ├── voiceover/           # Voice-over TTS features
│   └── scene-lock/          # Scene lock workflow
│
├── integrations/            # External Integrations
│   ├── google-drive/        # Google Drive integration
│   ├── tiktok/              # TikTok workflow
│   ├── youtube/             # YouTube automation
│   └── browser-automation/  # Browser automation (Z.AI, Grok)
│
├── guides/                  # User Guides
│   ├── quick-reference.md   # Quick reference guide
│   ├── options-management.md
│   ├── customize-options.md
│   ├── testing.md
│   └── use-cases-reference.md
│
├── architecture/            # System Architecture
│   ├── plans/               # Design plans
│   └── technical/           # Technical details
│
└── archive/                 # Completed/Outdated Docs
```

---

## 🚀 Quick Start

### 1. Setup API Keys
```bash
# Read the API keys setup guide
docs/setup/api-keys.md
```

### 2. Configure Environment
```bash
# Copy .env.example to .env and fill in your keys
cp backend/.env.example backend/.env
```

### 3. Run Setup Scripts
```bash
npm run setup:drive    # Google Drive setup
npm run seed:all       # Seed database
```

---

## 📖 Documentation by Topic

### Setup & Configuration
| Document | Description |
|----------|-------------|
| [API Keys Setup](setup/api-keys.md) | Get API keys for all providers |
| [Multi-Key Setup](setup/multi-key-setup.md) | Key rotation for high volume |
| [Browser Session](setup/browser-session.md) | Browser automation sessions |

### AI Providers
| Document | Description |
|----------|-------------|
| [Image Providers](providers/image-providers.md) | All 26 image generation models |
| [Grok Automation](providers/grok/automation-guide.md) | Grok full automation guide |
| [ChatGPT Integration](providers/chatgpt/script-integration-guide.md) | ChatGPT script generation |

### Features
| Document | Description |
|----------|-------------|
| [VoiceOver Implementation](features/voiceover/implementation-guide.md) | TTS integration guide |
| [Character Holding Product](features/image-generation/character-holding-product-guide.md) | Product showcase feature |
| [Video Generation](features/video-generation/flow-fixes.md) | Video generation workflow |

### Integrations
| Document | Description |
|----------|-------------|
| [Google Drive Setup](integrations/google-drive/setup.md) | Drive OAuth setup |
| [TikTok Affiliate](integrations/tiktok/affiliate-video-guide.md) | TikTok workflow |
| [Browser Automation](integrations/browser-automation/guide.md) | Z.AI & Grok automation |

### User Guides
| Document | Description |
|----------|-------------|
| [Quick Reference](guides/quick-reference.md) | Complete quick reference |
| [Options Management](guides/options-management.md) | Manage prompt options |
| [Use Cases](guides/use-cases-reference.md) | 5 use cases guide |

---

## 🔧 Backend Scripts Documentation

See: [backend/scripts/README.md](../backend/scripts/README.md)

### Quick Commands
```bash
# Authentication
npm run auth:grok          # Grok login
npm run auth:google-flow   # Google Flow session

# Maintenance
npm run maintenance:clean  # Clean corrupted data
npm run debug:check        # Validate API keys

# Setup
npm run setup:drive        # Setup Google Drive
npm run seed:all           # Seed database
```

---

## 🧪 Testing Documentation

See: [backend/tests/README.md](../backend/tests/README.md)

```bash
npm test                   # Run all tests
npm run test:coverage      # Run with coverage
```

---

## 📁 Other Documentation

| Location | Description |
|----------|-------------|
| [frontend/README.md](../frontend/README.md) | Frontend documentation |
| [scraper_service/README.md](../scraper_service/README.md) | Scraper service docs |
| [n8n/README.md](../n8n/README.md) | n8n workflow docs |

---

## 🔄 Recent Updates

- ✅ Reorganized documentation by topic (March 2026)
- ✅ Consolidated scripts and tests (March 2026)
- ✅ Added voiceover documentation (February 2026)
- ✅ Added TikTok affiliate workflow (February 2026)

---

## 📝 Contributing

When adding new documentation:
1. Place in the appropriate category folder
2. Use lowercase-with-dashes.md naming
3. Update this README index
4. Include a clear title and purpose
