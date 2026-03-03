/**
 * ImageUploadManager - Handles image upload, conversion, and clipboard operations
 * 
 * Consolidated from:
 * - uploadImages() - Upload one or more images to Google Flow
 * - convertImageToPNG() - Convert any image format to PNG for clipboard
 * - storeUploadedImage() - Store uploaded image reference
 * - addImageToCommand() - Add image to prompt via context menu
 * - getHrefsFromVirtuosoList() - Get all image hrefs from list
 * - findNewHref() - Find newly added image href
 * 
 * Uses: ClipboardHelper, VirtuosoQueryHelper, MouseInteractionHelper
 * 
 * @example
 * const manager = new ImageUploadManager(page);
 * const images = await manager.uploadImages(['./image1.jpg', './image2.jpg']);
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ClipboardHelper, VirtuosoQueryHelper, MouseInteractionHelper } from '../index.js';

class ImageUploadManager {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.uploadedImageRefs = {}; // Store refs of uploaded images
    
    // Bind utilities to this page instance
    ClipboardHelper.page = page;
    VirtuosoQueryHelper.page = page;
    MouseInteractionHelper.page = page;
  }

  /**
   * Upload one or more images to Google Flow
   * Steps:
   * 1. Capture current hrefs
   * 2. For each image file:
   *    a. Convert to PNG if needed
   *    b. Copy to clipboard
   *    c. Paste to textbox via Ctrl+V
   *    d. Wait for upload confirmation
   *    e. Track uploaded image reference
   * 
   * @param {string|Array<string>} imagePaths - Image file path(s)
   * @returns {Array} - Uploaded image elements
   */
  async uploadImages(imagePaths) {
    console.log('📸 UPLOADING IMAGES\n');

    const imagesToUpload = Array.isArray(imagePaths) ? imagePaths : [imagePaths];
    const uploadedImages = [];

    try {
      // Capture initial state
      const initialHrefs = await VirtuosoQueryHelper.getHrefsFromVirtuosoList();
      console.log(`   ℹ️  Initial items in gallery: ${initialHrefs.length}`);

      // Upload each image
      let currentHrefs = [...initialHrefs]; // Track hrefs for detecting new items after each upload
      
      for (let idx = 0; idx < imagesToUpload.length; idx++) {
        const imagePath = imagesToUpload[idx];
        const filename = path.basename(imagePath);

        try {
          console.log(`\n   📝 Image ${idx + 1}/${imagesToUpload.length}: ${filename}`);

          // Check file exists
          if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
          }

          // Convert to PNG
          console.log('   🔄 Converting to PNG...');
          const pngBuffer = await this.convertImageToPNG(imagePath);

          // Copy to clipboard
          console.log('   📋 Copying to clipboard...');
          await ClipboardHelper.copyImageToClipboard(pngBuffer);

          // Find textbox and paste
          console.log('   📌 Finding prompt textbox...');
          const textbox = await this.page.$('.iTYalL[role="textbox"][data-slate-editor="true"]');
          
          if (textbox) {
            console.log('   🖱️  Focusing and pasting...');
            await this.page.evaluate(() => {
              const box = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
              if (box) box.focus();
            });
            await this.page.waitForTimeout(300);

            // Paste via Ctrl+V
            await this.page.keyboard.down('Control');
            await this.page.waitForTimeout(50);
            await this.page.keyboard.press('v');
            await this.page.waitForTimeout(50);
            await this.page.keyboard.up('Control');

            console.log('   ⏳ Waiting for upload confirmation...');
            await this.page.waitForTimeout(3000);
          }

          // Check if new image was added
          const newHref = await VirtuosoQueryHelper.findNewHrefs(currentHrefs);
          
          if (newHref && newHref.length > 0) {
            console.log(`   ✓ Image uploaded successfully`);
            
            // Store reference
            const uploadKey = `img_${idx + 1}_${filename}`;
            this.uploadedImageRefs[uploadKey] = {
              href: newHref[0].href,
              filename: filename,
              uploadedAt: new Date()
            };

            uploadedImages.push(newHref[0].href);
            
            // Update currentHrefs to include this newly uploaded image for the next iteration
            // This ensures the next image detection compares against the updated baseline
            currentHrefs.push(newHref[0].href);
            console.log(`   📎 Updated baseline for next image detection\n`);
          } else {
            console.warn(`   ⚠️  Upload may have failed (no new image detected)\n`);
          }

        } catch (error) {
          console.error(`   ❌ Error uploading image: ${error.message}`);
        }
      }

      console.log(`\n   ✅ Upload complete: ${uploadedImages.length}/${imagesToUpload.length} images uploaded\n`);
      return uploadedImages;

    } catch (error) {
      console.error(`   ❌ Error in uploadImages: ${error.message}`);
      return uploadedImages;
    }
  }

  /**
   * Convert image to PNG format
   * Handles JPEG, PNG, WebP, and other formats
   * Returns PNG buffer for clipboard.write()
   * 
   * @param {string} imagePath - Path to image file
   * @returns {Buffer} - PNG image buffer
   */
  async convertImageToPNG(imagePath) {
    try {
      const ext = path.extname(imagePath).toLowerCase();
      
      // If already PNG, just read it
      if (ext === '.png') {
        return fs.readFileSync(imagePath);
      }

      // Convert to PNG using sharp
      const imageBuffer = fs.readFileSync(imagePath);
      const pngBuffer = await sharp(imageBuffer)
        .png({ quality: 90 })
        .toBuffer();

      return pngBuffer;

    } catch (error) {
      console.error(`Error converting image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store uploaded image reference
   * Creates temp folder and stores copy of image
   * 
   * @param {string} imagePath - Original image path
   * @returns {string} - Path to stored image
   */
  async storeUploadedImage(imagePath) {
    try {
      const uploadStorageDir = path.join(path.dirname(this.options.outputDir || '.'), 'uploaded-images');
      
      if (!fs.existsSync(uploadStorageDir)) {
        fs.mkdirSync(uploadStorageDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const originalName = path.basename(imagePath);
      const storedImagePath = path.join(uploadStorageDir, `${timestamp}-${originalName}`);
      
      fs.copyFileSync(imagePath, storedImagePath);
      
      console.log(`   📁 Image stored: ${storedImagePath}`);
      return storedImagePath;

    } catch (error) {
      console.error(`Error storing image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all uploaded image references
   */
  getUploadedImageRefs() {
    return this.uploadedImageRefs;
  }

  /**
   * Clear uploaded image references
   * Call this after generation completes
   */
  clearUploadedImageRefs() {
    this.uploadedImageRefs = {};
  }

  /**
   * Check if image was already uploaded
   */
  isImageUploaded(filename) {
    return Object.values(this.uploadedImageRefs).some(ref => ref.filename === filename);
  }
}

export default ImageUploadManager;
