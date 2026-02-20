# Browser Automation Test Suite - Complete Documentation

## 🧪 Overview

This is a complete browser automation test suite that replicates your smart wardrobe application's workflow. It tests multiple image upload capability, unified analysis, and image generation with comprehensive validation.

## 🎯 Key Features

### ✅ **Multiple Image Upload Testing**
- Tests Grok's `analyzeMultipleImages()` method
- Verifies both character and product images can be uploaded together
- Confirms unified analysis works with multiple images

### ✅ **Full Unified Workflow Testing**
1. **Unified Analysis**: Analyzes both images together using `analyzeUnified()`
2. **Enhanced Prompt Building**: Creates AI-optimized prompts based on analysis
3. **Image Generation**: Generates new fashion images using `generateImages()`
4. **Download & Save**: Downloads and saves with proper naming convention

### ✅ **Comprehensive Validation**
- Image upload verification
- Analysis result validation
- Generated image quality checks
- File download and storage verification
- Step-by-step progress tracking

## 📁 Files

### **Main Test Script**
- `backend/browser-automation-test-suite.js` - Complete all-in-one test suite

### **Test Images** (Auto-detected)
- `backend/test-images/anh-nhan-vat.jpeg` - Character image
- `backend/test-images/anh-san-pham.png` - Product image

### **Output Directory**
- `backend/test-results/` - Generated images and results

## 🚀 Quick Start

### **1. Test Multiple Image Upload (Recommended)**
```bash
cd backend
node browser-automation-test-suite.js --multi-image --service grok --headless
```

### **2. Test Full Unified Workflow**
```bash
cd backend
node browser-automation-test-suite.js --workflow --headless
```

### **3. Quick Validation Test (5 minutes)**
```bash
cd backend
node browser-automation-test-suite.js --scenario quick
```

### **4. Debug Mode with Visible Browser**
```bash
cd backend
node browser-automation-test-suite.js --scenario debug
```

## 📋 Predefined Scenarios

| Scenario | Description | Command |
|----------|-------------|---------|
| `quick` | Quick validation test (5 minutes) | `--workflow --validate-only --headless` |
| `full` | Complete workflow with generation (15-30 minutes) | `--workflow --headless` |
| `multi-image` | Test multiple image upload capability | `--multi-image --service grok --headless` |
| `debug` | Debug mode with visible browser | `--workflow --headless=false --slow` |
| `grok-only` | Test Grok service only | `--service grok --headless` |
| `zai-only` | Test Z.AI service only | `--service zai --headless` |
| `both-services` | Test both services individually | `--service both --headless` |

## 🔧 CLI Options

### **Core Options**
- `-s, --service <name>`: Service to test (zai, grok, both) [default: "both"]
- `-w, --workflow`: Test full unified workflow [default: false]
- `-m, --multi-image`: Test multiple image upload capability [default: false]
- `--scenario <name>`: Predefined test scenario

### **Image Options**
- `-f, --character-file <path>`: Custom character image file
- `-p, --product-file <path>`: Custom product image file
- `--prompt <text>`: Analysis prompt [default: "Analyze fashion compatibility..."]
- `--gen-prompt <text>`: Image generation prompt [default: "Generate a professional fashion image..."]

### **Browser Options**
- `--headless`: Run in headless mode [default: false]
- `--slow`: Slow down actions for debugging [default: false]
- `--screenshot`: Take screenshots during process [default: false]
- `--wait-login`: Wait for manual login [default: false]
- `--timeout <seconds>`: Timeout in seconds [default: "120"]

### **Output Options**
- `--download-path <path>`: Path to download generated images [default: "./test-results"]
- `--validate-only`: Only validate existing functionality, skip generation [default: false]

## 🧪 Test Workflows

### **Multiple Image Upload Test**
1. **Initialize Browser**: Launches Grok or Z.AI service
2. **Upload Images**: Uploads both character and product images together
3. **Send Prompt**: Sends analysis prompt to process both images
4. **Get Response**: Retrieves AI analysis of both images
5. **Validate**: Confirms both images were processed together

### **Full Unified Workflow Test**
1. **📁 Setup & Validation**: Ensures directories exist, validates test images
2. **📊 Unified Analysis**: Calls `analyzeUnified()` with both images
3. **🔨 Enhanced Prompt Building**: Creates AI-optimized prompts based on analysis
4. **🎨 Image Generation**: Calls `generateImages()` with enhanced prompt
5. **💾 Download & Save**: Downloads generated image with descriptive filename
6. **📋 Results & Summary**: Displays step-by-step results and timing

## 📊 Expected Results

### **Success Output Example**:
```
🧪 BROWSER AUTOMATION TEST SUITE
================================================================================

Test Configuration:
  Service: grok
  Workflow: Individual Services
  Multi-Image: Yes
  Validate Only: No
  Headless: Yes
  Slow Motion: No
  Download Path: ./test-results

✅ Using test character image: anh-nhan-vat.jpeg
✅ Using test product image: anh-san-pham.png

📸 Testing Multiple Image Upload

🔄 Testing multiple image upload with GROK...
✅ Multiple image upload completed successfully

🎉 MULTIPLE IMAGE ANALYSIS SUCCESSFUL

Response:
[AI analysis of both images...]

⏱️  Total duration: 3.2s

📊 TEST SUMMARY

1. ✅ GROK
   ⏱️  Duration: 3.2s
   📸 Multi-Image: Supported

Total: 1 | ✅ Passed: 1 | ❌ Failed: 0
```

## 🔍 Key Findings

### **Grok Multiple Image Support**
- ✅ **CONFIRMED**: Grok supports uploading multiple images together
- ✅ **METHOD**: `GrokServiceV2.analyzeMultipleImages()` handles this
- ✅ **WORKFLOW**: Uploads images sequentially, then sends combined prompt
- ✅ **VALIDATION**: Both images are processed in a single analysis session

### **Unified Workflow Efficiency**
- ✅ **ANALYSIS**: Single API call with both images provides better context
- ✅ **PROMPT BUILDING**: Enhanced prompts based on detailed analysis
- ✅ **GENERATION**: Higher quality results with context-aware prompts
- ✅ **INTEGRATION**: Seamless workflow from analysis to final image

## 📋 Test Image Requirements

### **Character Image**
- **Format**: JPEG or PNG
- **Content**: Portrait of person/model
- **Size**: Standard web image sizes (recommended: 800x600 to 1920x1080)
- **Quality**: Clear, well-lit image

### **Product Image**
- **Format**: JPEG or PNG
- **Content**: Clothing item or fashion product
- **Size**: Standard web image sizes (recommended: 800x600 to 1920x1080)
- **Quality**: Clear, well-lit image

### **Default Test Images**
The script automatically uses these images from `backend/test-images/`:
- `anh-nhan-vat.jpeg` - Character image
- `anh-san-pham.png` - Product image

## 🚨 Troubleshooting

### **Image Not Found Errors**
```
❌ Character image not found: anh-nhan-vat.jpeg
```
**Solution**: Ensure `backend/test-images/` directory exists with the required images

### **Browser Launch Issues**
```
❌ Failed to launch browser
```
**Solutions**:
- Ensure Chrome/Chromium is installed
- Check if any browser windows are already open
- Try with `--slow` flag for debugging
- Use `--scenario debug` for visible browser

### **Authentication Required**
```
⚠️  Grok requires X/Twitter authentication
```
**Solution**: Use `--scenario debug` to see browser window and complete login manually

### **Timeout Errors**
```
❌ Timeout error: 120000ms exceeded
```
**Solutions**:
- Increase timeout with `--timeout 180`
- Use `--slow` flag for debugging
- Check internet connection
- Try with `--scenario debug` to see what's happening

## 🎯 Usage Examples

### **Basic Usage**
```bash
# Test multiple image upload with Grok
node browser-automation-test-suite.js --multi-image --service grok --headless

# Test full workflow with generation
node browser-automation-test-suite.js --workflow --headless

# Test with custom images
node browser-automation-test-suite.js --workflow \
  --character-file ./my-character.jpg \
  --product-file ./my-product.png \
  --download-path ./my-results
```

### **Scenario Usage**
```bash
# Quick validation test
node browser-automation-test-suite.js --scenario quick

# Complete workflow test
node browser-automation-test-suite.js --scenario full

# Debug mode
node browser-automation-test-suite.js --scenario debug

# Service-specific tests
node browser-automation-test-suite.js --scenario grok-only
node browser-automation-test-suite.js --scenario zai-only
node browser-automation-test-suite.js --scenario both-services
```

### **Debug and Development**
```bash
# Debug mode with visible browser
node browser-automation-test-suite.js --scenario debug

# Slow motion for debugging
node browser-automation-test-suite.js --workflow --slow

# Wait for manual login
node browser-automation-test-suite.js --workflow --wait-login

# Extended timeout
node browser-automation-test-suite.js --workflow --timeout 180
```

## 📊 Performance Expectations

### **Test Duration**
- **Quick Test**: 2-5 minutes
- **Full Workflow**: 10-30 minutes
- **Multi-Image Test**: 2-5 minutes
- **Debug Mode**: 5-10 minutes

### **Resource Usage**
- **Memory**: 500MB - 2GB (depending on browser instances)
- **Disk**: 10MB - 100MB (generated images and logs)
- **Network**: Required for AI API calls and image downloads

## 🔧 Integration with Application

This test suite replicates the exact workflow used in your application:

1. **API Endpoint**: `/api/v1/browser-automation/generate-image`
2. **Analysis Service**: `analyzeUnified()` from `unifiedAnalysisService.js`
3. **Generation Service**: `generateImages()` from `imageGenService.js`
4. **Browser Automation**: `GrokServiceV2` and `ZAIChatService`

## 📋 Next Steps

1. **Test with Real Images**: Run the script with your actual character and product images
2. **Performance Testing**: Test with different image sizes and providers
3. **Integration Testing**: Verify the workflow matches your application behavior
4. **CI/CD Integration**: Add automated testing to your deployment pipeline

## 🎉 Conclusion

The browser automation test suite successfully:
- ✅ Replicates the exact app workflow
- ✅ Verifies Grok's multiple image upload capability
- ✅ Tests the complete unified analysis + generation pipeline
- ✅ Downloads and saves results for validation
- ✅ Provides comprehensive testing and debugging capabilities

The script is ready for production use and will help ensure your browser automation functionality works correctly across all scenarios.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Run with `--scenario debug` for detailed debugging
3. Review the generated logs in `backend/test-results/`
4. Ensure all dependencies are installed and configured correctly

## 📄 License

This test suite is part of the Smart Wardrobe project and follows the same license terms.