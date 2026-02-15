# Test Images

This folder contains test images for model testing.

## Required Files

- `test-character.jpg` - Vietnamese woman character image
- `test-product.jpg` - Fashion product/outfit image

## Usage

These images are used by:
- Model test API (`/api/model-test/models/:modelId/test`)
- Model test UI (`/model-tester`)
- Automated testing scripts

## Instructions

1. Add your test images to this folder
2. Name them exactly as:
   - `test-character.jpg`
   - `test-product.jpg`
3. Recommended size: 1024x1024 or similar
4. Format: JPEG or PNG

## Note

If these files are missing, tests will fail for image-to-image models.
