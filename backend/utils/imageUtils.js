import fs from 'fs/promises';

/**
 * Encodes an image file to a base64 string.
 * This is required for multimodal AI models that accept images directly in the API payload.
 * @param {string} filePath - The absolute path to the image file.
 * @returns {Promise<string>} A promise that resolves to the base64-encoded image string.
 */
export async function encodeImage(filePath) {
  try {
    const imageBuffer = await fs.readFile(filePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`Error encoding image at path: ${filePath}`, error);
    throw new Error('Failed to encode image for AI analysis.');
  }
}
