import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Since we are in an ES module, we need to define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Virtual Try-On Page End-to-End Test', () => {
  const CHARACTER_IMAGE_PATH = path.resolve(__dirname, '../../../backend/test-images/anh nhan vat.jpeg');
  const PRODUCT_IMAGE_PATH = path.resolve(__dirname, '../../../backend/test-images/anh-san-pham.png');

  test.beforeEach(async ({ page }) => {
    // Navigate to the page before each test
    await page.goto('http://localhost:3000/virtual-try-on');
  });

  test('should complete the entire unified flow successfully', async ({ page }) => {
    // Set a longer timeout for the entire test, as it involves multiple AI calls
    test.setTimeout(600000); // 10 minutes

    // == Step 1: Upload & Setup ==
    console.log('\n[TEST LOG] ==> Step 1: Uploading images...');

    // Use the file chooser pattern which mimics a real user clicking the upload button
    console.log('Test: Uploading character image...');
    const characterFileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload character image' }).click();
    const characterFileChooser = await characterFileChooserPromise;
    await characterFileChooser.setFiles(CHARACTER_IMAGE_PATH);

    console.log('Test: Uploading product image...');
    const productFileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload product image' }).click();
    const productFileChooser = await productFileChooserPromise;
    await productFileChooser.setFiles(PRODUCT_IMAGE_PATH);
    
    // Assert that images are visible - look for the preview images that appear after upload
    // We use a specific locator that targets the preview images based on their container structure
    // effectively waiting for the "Upload" buttons to disappear and be replaced by images
    await expect(page.locator('img[alt="Preview"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('img[alt="Preview"]').nth(1)).toBeVisible({ timeout: 10000 });
    console.log('[TEST LOG] ==> Step 1: Images uploaded and visible.');

    // == Step 2: AI Analysis ==
    console.log('\n[TEST LOG] ==> Step 2: Starting AI analysis...');
    const startAnalysisButton = page.getByRole('button', { name: 'Start AI Analysis' });
    await expect(startAnalysisButton).toBeEnabled();
    await startAnalysisButton.click();

    console.log('[TEST LOG] ==> Step 2: Waiting for analysis results to be visible...');
    
    // Race condition: Check for either success or error
    try {
        await Promise.race([
            expect(page.getByText('CHARACTER ANALYSIS')).toBeVisible({ timeout: 300000 }),
            expect(page.getByText('Analysis failed')).toBeVisible({ timeout: 300000 }),
            expect(page.getByText('Error')).toBeVisible({ timeout: 300000 })
        ]);
    } catch (e) {
        console.log('[TEST LOG] ==> Timed out waiting for analysis result.');
    }

    // Verify success specifically
    const isError = await page.getByText('Analysis failed').isVisible() || await page.getByText('Error').isVisible();
    if (isError) {
        console.error('[TEST LOG] ==> ❌ Analysis failed! Check backend logs.');
        // Fail the test explicitly
        await expect(page.getByText('Unified AI Analysis Results')).toBeVisible(); 
    }

    // Updated verification for new UI
    await expect(page.getByText('Unified AI Analysis Results')).toBeVisible();
    await expect(page.getByText('Character Profile')).toBeVisible();
    await expect(page.getByText('Product Details')).toBeVisible();
    
    // Verify that some deep analysis data is present
    await expect(page.getByText('slim athletic')).toBeVisible(); // Check for Body Type from our test
    await expect(page.getByText('Co-ord Set')).toBeVisible(); // Check for Product Category from our test

    // Verify Raw JSON toggle exists
    await expect(page.getByRole('button', { name: 'Show Raw AI Response' })).toBeVisible();
    
    // Verify Keywords section exists
    await expect(page.getByText('Extracted Keywords')).toBeVisible();
    console.log('[TEST LOG] ==> Step 2: Analysis results are visible.');

    // == Step 3: Style Customization ==
    console.log('\n[TEST LOG] ==> Step 3: Applying recommendations...');
    const applyButton = page.getByRole('button', { name: 'Apply AI Recommendations' });
    await expect(applyButton).toBeEnabled();
    await applyButton.click();
    
    await expect(page.getByText('Customize your generation style')).toBeVisible();
    // Verify that the AI recommendation is highlighted
    await expect(page.locator('button', { hasText: 'Urban Street' })).toHaveClass(/border-green-400/);
    console.log('[TEST LOG] ==> Step 3: Style customization screen is visible and AI recs are highlighted.');
    
    // == Step 4: Prompt Building ==
    console.log('\n[TEST LOG] ==> Step 4: Moving to Prompt Building...');
    await page.getByRole('button', { name: 'Next Step' }).click(); // Click the generic next step button

    await expect(page.getByText('Xây Dựng Prompt Thông Minh')).toBeVisible();
    const positivePromptTextarea = page.locator('textarea').nth(0);
    const negativePromptTextarea = page.locator('textarea').nth(1);

    await expect(positivePromptTextarea).not.toBeEmpty();
    await expect(negativePromptTextarea).toBeVisible();
    await expect(negativePromptTextarea).toBeEditable();
    await negativePromptTextarea.fill('extra arms, deformed fingers');
    await expect(negativePromptTextarea).toHaveValue('extra arms, deformed fingers');
    console.log('[TEST LOG] ==> Step 4: Prompt builder is visible, positive prompt is not empty, and negative prompt is editable.');
    
    console.log('\n[TEST LOG] ==> Step 4: Enhancing prompt with AI...');
    const initialPositivePromptValue = await positivePromptTextarea.inputValue();
    const enhanceButton = page.getByRole('button', { name: 'Enhance Prompt (AI)' });
    await expect(enhanceButton).toBeEnabled();
    await enhanceButton.click();

    await expect(async () => {
      const newPromptValue = await positivePromptTextarea.inputValue();
      expect(newPromptValue).not.toEqual(initialPositivePromptValue);
    }).toPass({ timeout: 60000 });
    console.log('[TEST LOG] ==> Step 4: Prompt enhanced successfully.');

    // == Step 5: Generation ==
    console.log('\n[TEST LOG] ==> Step 5: Starting image generation...');
    const generateButton = page.getByRole('button', { name: 'Generate Images' });
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    console.log('[TEST LOG] ==> Step 5: Waiting for generation results...');
    await expect(page.getByText('Generation Results')).toBeVisible({ timeout: 90000 });
    
    await expect(page.locator('.grid.grid-cols-2.gap-4 img').first()).toBeVisible();
    console.log('[TEST LOG] ==> Step 5: Generation successful and results are visible.');
    console.log('\n[TEST LOG] ==> ✅✅✅ E2E Test Passed! ✅✅✅');
  });
});
