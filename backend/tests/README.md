# Backend Tests

Comprehensive test suite for backend functionality including unit tests, integration tests, and end-to-end tests.

## Test Organization

### Core Functionality Tests
- `01-test-auto-upload.js` - Tests automatic file upload to Google Drive
- `02-test-bug-fixes-validation.js` - Validates all recent bug fixes (ERR_EMPTY_RESPONSE, database loading, image count, Veo aspect ratio)
- `03-test-cloud-integration.js` - Tests cloud storage integration (Google Drive, AWS, Azure)
- `04-test-cron-job.js` - Tests scheduled job execution
- `05-test-database-direct.js` - Direct database operation tests

### Integration Tests
- `06-test-integration-complete.js` - Complete end-to-end workflow integration tests
- `07-test-multi-account.js` - Tests multi-account functionality
- `08-test-prompt-templates.js` - Tests prompt generation and templating
- `09-test-video-queue.js` - Tests video generation queue processing
- `10-comprehensive-test.js` - Comprehensive test suite covering all major features

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- tests/02-test-bug-fixes-validation.js
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Single Test
```bash
npm test -- tests/02-test-bug-fixes-validation.js --testNamePattern="Backend Response"
```

## Test Configuration

**Jest Config:** `jest.config.js`
- Test timeout: 30000ms
- Test environment: Node
- Watch mode: Disabled (enable with `npm test -- --watch`)

## Recent Tests (2026-02-25)

### Bug Fixes Validation Tests
Location: `tests/02-test-bug-fixes-validation.js`

Tests for:
✅ **Bug #1:** ERR_EMPTY_RESPONSE fix - Backend response serialization
✅ **Bug #2:** Database Loading - Prompt options API format
✅ **Bug #3:** Image Count Detection - Multi-image generation counting
✅ **Bug #4:** Veo Aspect Ratio - Pop-over button finding and clicking

**Status:** 4/4 tests PASSING (100% success rate)

## Test Coverage Areas

### API Endpoints
- `/api/assets/gallery` - Gallery picker API
- `/api/assets/proxy/:assetId` - Image proxy endpoint
- `/api/ai/affiliate-video-tiktok` - TikTok video generation

### Services
- Image generation (Google Flow)
- Video generation (Veo model)
- Google Drive integration
- Database operations (MongoDB)
- Asset storage and caching

### Features
- Character image upload
- Product image upload
- Image/video generation
- Gallery display (4-column grid with infinite scroll)
- Cloud storage synchronization
- Hybrid local+cloud storage

## Key Test Results

| Feature | Status | Last Run |
|---------|--------|----------|
| Auto Upload | ✓ | 2026-02-25 |
| Bug Fixes | ✓ | 2026-02-25 |
| Cloud Integration | ✓ | 2026-02-25 |
| Video Queue | ✓ | 2026-02-25 |
| Multi-Account | ✓ | 2026-02-25 |

## Troubleshooting Tests

### Test Timeout
```bash
# Increase timeout for long-running tests
npm test -- --testTimeout=60000
```

### Failed Dependency Tests
```bash
# Clear dependencies and reinstall
npm ci
npm test
```

### Database Connection Issues
```bash
# Verify MongoDB is running
npm test -- tests/05-test-database-direct.js
```

## Adding New Tests

1. Create test file: `tests/NN-test-[feature].js`
2. Follow existing test structure
3. Use Jest testing framework
4. Include clear test descriptions
5. Add to this README

Example:
```javascript
describe('Feature Name', () => {
  test('description of what should happen', () => {
    // Test implementation
  });
});
```

## CI/CD Integration

Tests are automatically run on:
- Git push
- Pull requests
- Deployment to staging/production

To run locally before push:
```bash
npm test
npm run lint
```
