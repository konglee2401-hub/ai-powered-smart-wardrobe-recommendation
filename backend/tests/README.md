# Backend Tests Organization

This directory contains all automated tests organized by type.

## Directory Structure

```
tests/
├── unit/                    # Unit tests (future)
├── integration/             # Integration tests
│   ├── image-generation/    # Image generation tests
│   ├── browser-automation/  # Browser automation tests
│   ├── setup-verification/  # Setup & verification tests
│   └── promptRoutes.test.js # API endpoint tests
├── helpers/                 # Test helpers & utilities
│   ├── create-mock-token.js # Create mock Google Drive token
│   └── oauth-authorize.js   # OAuth authorization helper
└── jest.config.js           # Jest configuration
```

---

## Integration Tests

### Image Generation
```bash
npx jest tests/integration/image-generation/
```
- `01-basic-image-generation-test.js` - Basic image generation
- `02-realworld-image-generation-test.js` - Real-world scenarios
- `03-image-setup-verification-test.js` - Setup verification
- `04-image-providers-config-test.js` - Provider configuration
- `05-image-upload-test.js` - Upload functionality

### Browser Automation
```bash
npx jest tests/integration/browser-automation/
```
- `02-browser-services-comparison-test.js` - Compare services
- `03-session-management-test.js` - Session handling
- `08-remote-chrome-debugging-test.js` - Remote debugging

### Setup Verification
```bash
npx jest tests/integration/setup-verification/
```
- `setup-google-auth.js` - Google auth setup
- `setup-byteplus.js` - BytePlus setup
- `setup-zai.js` - Z.AI setup
- `verify-browser-automation-suite.js` - Full suite verification
- `verify-chatgpt-integration.js` - ChatGPT integration
- `verify-grok-session.js` - Grok session verification
- `verify-providers-availability.js` - Provider availability

### API Tests
```bash
npx jest tests/integration/promptRoutes.test.js
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific category
npx jest tests/integration/image-generation/
npx jest tests/integration/browser-automation/
npx jest tests/integration/setup-verification/

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## Test Helpers

The `helpers/` directory contains utility scripts for testing:

- `create-mock-token.js` - Creates mock Google Drive token for testing
- `oauth-authorize.js` - Completes OAuth flow and saves token

```bash
# Create mock token for testing
node tests/helpers/create-mock-token.js

# Complete OAuth authorization
node tests/helpers/oauth-authorize.js
```
