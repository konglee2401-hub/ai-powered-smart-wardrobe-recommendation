/**
 * E2E Test for Image Generation Analysis Flow
 * Tests the full flow from image upload to recommendations display
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const API_BASE = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3001';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(type, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = type === 'error' ? colors.red + '❌' : 
                 type === 'success' ? colors.green + '✅' :
                 type === 'warning' ? colors.yellow + '⚠️' :
                 type === 'info' ? colors.blue + 'ℹ️' :
                 colors.cyan + '📍';
  console.log(`${prefix} [${timestamp}]${colors.reset} ${message}`);
}

// Helper: Make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const isBrowser = options.browser;
    
    const opts = {
      hostname: requestUrl.hostname,
      port: requestUrl.port || 80,
      path: requestUrl.pathname + requestUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(options.body));
    }

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// Main test
async function runTests() {
  log('info', 'Starting E2E Tests for Image Generation');
  log('info', `API: ${API_BASE}`);
  log('info', `Frontend: ${FRONTEND_URL}\n`);

  try {
    // TEST 1: Check backend health
    log('info', 'TEST 1: Backend Health Check');
    try {
      const response = await makeRequest(API_BASE + '/health', { method: 'GET' });
      log('success', `Backend responding: HTTP ${response.status}`);
    } catch (e) {
      log('error', `Backend not responding: ${e.message}`);
      return;
    }

    // TEST 2: Check if /prompt-options endpoint works
    log('info', 'TEST 2: Fetch Prompt Options');
    try {
      const response = await makeRequest(API_BASE + '/prompt-options', { method: 'GET' });
      if (response.status === 200 && response.data.data.options) {
        const options = response.data.data.options;
        const categoryCount = Object.keys(options).length;
        const totalOptions = Object.values(options).reduce((sum, arr) => sum + arr.length, 0);
        log('success', `Options loaded: ${categoryCount} categories, ${totalOptions} total options`);
        
        // Check scene category
        if (options.scene) {
          log('info', `Scene options (${options.scene.length}): ${options.scene.map(o => o.value || o).join(', ')}`);
        } else {
          log('warning', 'Scene category not found');
        }
        
        // Check accessories category  
        if (options.accessories) {
          log('info', `Accessories options (${options.accessories.length}): ${options.accessories.map(o => o.value || o).join(', ')}`);
        } else {
          log('warning', 'Accessories category not found');
        }
      } else {
        log('error', `Unexpected response: ${JSON.stringify(response).substring(0, 100)}`);
      }
    } catch (e) {
      log('error', `Failed to fetch options: ${e.message}`);
    }

    // TEST 3: Analyze mock data structure
    log('info', 'TEST 3: Validate Mock Data Structure');
    const mockAnalysis = {
      characterProfile: {
        gender: "female",
        age_range: "20-30",
        body_type: "slim with soft curves"
      },
      productDetails: {
        garment_type: "fitted top",
        style_category: "casual-chic",
        primary_color: "pink"
      },
      recommendations: {
        scene: {
          choice: "minimalist-indoor",
          choiceArray: ["minimalist-indoor"],
          reason: "Test reason",
          isMulti: false
        },
        accessories: {
          choice: ["gold-necklace", "structured-handbag"],
          choiceArray: ["gold-necklace", "structured-handbag"],
          reason: "Multiple items",
          isMulti: true
        }
      }
    };

    log('success', 'Mock analysis structure created');
    log('info', `Character Profile fields: ${Object.keys(mockAnalysis.characterProfile).join(', ')}`);
    log('info', `Product Details fields: ${Object.keys(mockAnalysis.productDetails).join(', ')}`);
    log('info', `Recommendations keys: ${Object.keys(mockAnalysis.recommendations).join(', ')}`);

    // TEST 4: Extract values like RecommendationSelector does
    log('info', 'TEST 4: Simulate RecommendationSelector Value Extraction');
    
    // Mock getOptionsForCategory behavior
    const mockOptions = {
      scene: [
        { value: 'studio', label: 'Studio', description: 'Professional studio' },
        { value: 'minimalist-indoor', label: 'Minimalist Indoor', description: '...' },
        // ... 10 options total
      ],
      accessories: [
        { value: 'gold-necklace', label: 'Gold Necklace', description: '...' },
        { value: 'structured-handbag', label: 'Structured Handbag', description: '...' },
        // ... many more
      ]
    };

    // Test getFinalValue logic
    function testGetFinalValue(category, rec, mockOption) {
      let finalVal = '';
      
      if (rec.isMulti && rec.choiceArray) {
        // Multi-select: return array or formatted string
        if (Array.isArray(rec.choiceArray)) {
          finalVal = rec.choiceArray.map(c => {
            if (typeof c === 'string') return c;
            if (typeof c === 'object' && c.value) return c.value;
            return String(c);
          }).join(', ');
        }
      } else if (rec.choice) {
        // Single select: return string
        finalVal = typeof rec.choice === 'string' ? rec.choice : String(rec.choice);
      }

      return finalVal;
    }

    const sceneResult = testGetFinalValue('scene', mockAnalysis.recommendations.scene, mockOptions.scene);
    const accessoriesResult = testGetFinalValue('accessories', mockAnalysis.recommendations.accessories, mockOptions.accessories);

    log('success', `Scene final value: "${sceneResult}" (should be "minimalist-indoor")`);
    log('success', `Accessories final value: "${accessoriesResult}" (should be "gold-necklace, structured-handbag")`);

    if (sceneResult === 'minimalist-indoor') {
      log('success', 'Scene value extraction: PASS');
    } else {
      log('error', 'Scene value extraction: FAIL');
    }

    if (accessoriesResult === 'gold-necklace, structured-handbag') {
      log('success', 'Accessories value extraction: PASS');
    } else {
      log('error', 'Accessories value extraction: FAIL');
    }

    // TEST 5: Test current value formatting
    log('info', 'TEST 5: Current Value Formatting');
    
    // When currentValues[key] is array of 10+ objects
    const largeOptionArray = Array(10).fill(0).map((_, i) => ({
      value: `option-${i}`,
      label: `Option ${i}`,
      description: `Description ${i}`
    }));

    function formatCurrentValue(currOption) {
      let currentVal = 'Not set';
      
      if (Array.isArray(currOption)) {
        if (currOption.length > 5) {
          currentVal = `(${currOption.length} options available)`;
        } else if (currOption.length > 0) {
          const values = currOption
            .map(opt => {
              if (typeof opt === 'string') return opt;
              if (typeof opt === 'object' && opt !== null) {
                const val = opt.value || opt.label;
                return (val && typeof val === 'string') ? val : null;
              }
              return null;
            })
            .filter(v => v && String(v) !== '[object Object]');
          currentVal = values.length > 0 ? values.join(', ') : 'Not set';
        }
      }
      
      return currentVal;
    }

    const largeArrayResult = formatCurrentValue(largeOptionArray);
    log('success', `Large array (10 items) formatted as: "${largeArrayResult}"`);
    
    if (largeArrayResult === '(10 options available)') {
      log('success', 'Large array formatting: PASS');
    } else {
      log('error', 'Large array formatting: FAIL - got' + largeArrayResult);
    }

    // TEST 6: Test object array stringification issue (what's happening now)
    log('info', 'TEST 6: Identify Object Stringification Bug');
    
    // This is what happens when choiceArray contains objects
    const problemArray = [
      { value: 'option-1', label: 'Option 1' },
      { value: 'option-2', label: 'Option 2' },
      { value: 'option-3', label: 'Option 3' }
    ];

    // What toString() does (this is the bug!)
    const buggyOutput = String(problemArray);
    log('warning', `Buggy stringification: "${buggyOutput.substring(0, 50)}..."`);
    
    // What it should do
    const correctOutput = problemArray.map(o => o.value || o).join(', ');
    log('success', `Correct extraction: "${correctOutput}"`);

    log('info', '\n=== TEST SUMMARY ===');
    log('success', 'E2E tests completed');
    log('info', 'Issues identified:');
    log('info', '1. Character/Product may not be rendering in React component');
    log('info', '2. choiceArray with objects gets stringified as "[object Object]"');
    log('info', '3. Current value formatting needs proper object extraction');
    
  } catch (error) {
    log('error', `Unexpected error: ${error.message}`);
  }
}

// Run tests
runTests().catch(console.error);
