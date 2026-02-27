/**
 * Test settings buttons with mock DOM
 * Simulates the actual HTML structure from Google Flow
 */

// Mock HTML từ screenshot bạn post
const mockHTML = `
<div data-side="top" data-align="end" role="menu" aria-orientation="vertical" data-state="open">
  <div role="tablist" aria-orientation="horizontal" class="tab-group">
    <button type="button" role="tab" aria-selected="true" id="radix-IMAGE-trigger" data-state="active">
      <i>image</i>Image
    </button>
    <button type="button" role="tab" aria-selected="false" id="radix-VIDEO-trigger" data-state="inactive">
      <i>videocam</i>Video
    </button>
  </div>

  <div role="tablist" aria-orientation="horizontal" class="tab-group">
    <button type="button" role="tab" aria-selected="false" id="radix-LANDSCAPE-trigger" data-state="inactive">
      <i>crop_16_9</i>Ngang
    </button>
    <button type="button" role="tab" aria-selected="true" id="radix-PORTRAIT-trigger" data-state="active">
      <i>crop_9_16</i>Dọc
    </button>
  </div>

  <div role="tablist" aria-orientation="horizontal" class="tab-group">
    <button type="button" role="tab" aria-selected="true" id="radix-1-trigger" data-state="active">x1</button>
    <button type="button" role="tab" aria-selected="false" id="radix-2-trigger" data-state="inactive">x2</button>
    <button type="button" role="tab" aria-selected="false" id="radix-3-trigger" data-state="inactive">x3</button>
    <button type="button" role="tab" aria-selected="false" id="radix-4-trigger" data-state="inactive">x4</button>
  </div>

  <button type="button" id="model-dropdown" aria-haspopup="menu" aria-expanded="false" data-state="closed">
    🍌 Nano Banana Pro
    <i>arrow_drop_down</i>
  </button>
</div>
`;

// Setup DOM
document.body.innerHTML = mockHTML;

console.log('📋 MOCK DOM SETUP COMPLETE\n');

// Test 1: Find and click IMAGE tab
console.log('🧪 TEST 1: Click IMAGE tab');
const imageBtn = document.querySelector('button[role="tab"]');
console.log(`   Found button: "${imageBtn?.textContent.trim()}"`);
console.log(`   aria-selected: ${imageBtn?.getAttribute('aria-selected')}`);
console.log(`   Can click: ${!!imageBtn}`);
if (imageBtn) {
  console.log(`   ✓ Button is clickable\n`);
}

// Test 2: Find tabs by text content
console.log('🧪 TEST 2: Find tabs by text matching');
const buttons = document.querySelectorAll('button[role="tab"]');
const targetTexts = ['Image', 'Video', 'Ngang', 'Dọc', 'x1', 'x2', 'x3', 'x4'];

for (const target of targetTexts) {
  const found = Array.from(buttons).find(btn => 
    btn.textContent.includes(target)
  );
  console.log(`   "${target}": ${found ? '✓ Found' : '❌ Not found'}`);
}

// Test 3: Simulate click behavior
console.log('\n🧪 TEST 3: Simulate tab click');
const videoBtn = Array.from(buttons).find(btn => btn.textContent.includes('Video'));
if (videoBtn) {
  console.log(`   Before: aria-selected="${videoBtn.getAttribute('aria-selected')}"`);
  
  // Simulate using the method logic
  console.log(`   Simulating click on "Video" button...`);
  videoBtn.click();
  
  console.log(`   After: aria-selected="${videoBtn.getAttribute('aria-selected')}"`);
  console.log(`   ✓ Click executed\n`);
}

// Test 4: Find model dropdown
console.log('🧪 TEST 4: Find model dropdown');
const modelBtn = document.querySelector('button[aria-haspopup="menu"]');
if (modelBtn) {
  console.log(`   Found model button: "${modelBtn.textContent.trim()}"`);
  console.log(`   aria-expanded: ${modelBtn.getAttribute('aria-expanded')}`);
  console.log(`   ✓ Model button is clickable\n`);
}

// Test 5: Check actual selectTab logic
console.log('🧪 TEST 5: Test selectTab logic from service');
async function selectTab(label) {
  return new Promise(resolve => {
    const buttons = document.querySelectorAll('button[role="tab"]');
    console.log(`   Looking for tab with label: "${label}"`);
    console.log(`   Total tabs found: ${buttons.length}`);
    
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      console.log(`     Checking button: "${text}"`);
      
      if (text.includes(label)) {
        console.log(`       ✓ Match found!`);
        btn.click();
        resolve(true);
        return;
      }
    }
    
    console.log(`   ❌ No matching tab found for "${label}"`);
    resolve(false);
  });
}

(async () => {
  const result = await selectTab('Video');
  console.log(`   Result: ${result ? '✓ Success' : '❌ Failed'}\n`);

  // Test 6: Test with count selection
  console.log('🧪 TEST 6: Test count selection (x2)');
  const countResult = await selectTab('x2');
  console.log(`   Result: ${countResult ? '✓ Success' : '❌ Failed'}`);
  
  const x2Btn = Array.from(document.querySelectorAll('button[role="tab"]')).find(btn => 
    btn.textContent.includes('x2')
  );
  if (x2Btn) {
    console.log(`   x2 button new state: aria-selected="${x2Btn.getAttribute('aria-selected')}"\n`);
  }

  console.log('✅ All tests completed');
})();
