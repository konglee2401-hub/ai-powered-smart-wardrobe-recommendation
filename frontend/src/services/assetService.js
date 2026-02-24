/**
 * Asset Management Service
 * Handles creation and tracking of media assets in the gallery
 */

const ASSET_API_BASE = 'http://localhost:5000/api/assets';

export const assetService = {
  /**
   * Create an asset record for an uploaded file
   */
  async createAsset(file, category, sessionId, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('sessionId', sessionId);
      formData.append('metadata', JSON.stringify(metadata));

      // Will be called by backend to save asset record
      return {
        assetId: `${category}_${Date.now()}`,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        assetType: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
        assetCategory: category,
        storage: {
          location: 'local',
          url: URL.createObjectURL(file)
        },
        metadata,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
  },

  /**
   * Save base64 image as asset in gallery
   */
  async saveBase64AsAsset(base64Data, filename, category, sessionId, metadata = {}) {
    try {
      const response = await fetch(`${ASSET_API_BASE}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename,
          mimeType: 'image/png', // Most generated images are PNG
          fileSize: base64Data.length,
          assetType: 'image',
          assetCategory: category,
          userId: 'anonymous',
          sessionId,
          storage: {
            location: 'local',
            localPath: `temp/gallery-assets/${filename}`,
            url: `http://localhost:5000/temp/${filename}`
          },
          metadata,
          tags: ['sessionId:' + sessionId, category]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create asset record');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving base64 as asset:', error);
      throw error;
    }
  },

  /**
   * Save uploaded file as asset record in gallery (for character/product images)
   */
  async saveUploadedFileAsAsset(file, category, sessionId, analysisData = {}) {
    try {
      // Create blob preview
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const base64 = e.target.result.split(',')[1];
            
            const response = await fetch(`${ASSET_API_BASE}/create`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                filename: file.name,
                mimeType: file.type,
                fileSize: file.size,
                assetType: 'image',
                assetCategory: category,
                userId: 'anonymous',
                sessionId,
                storage: {
                  location: 'local',
                  localPath: `uploads/${sessionId}/${file.name}`,
                  url: URL.createObjectURL(file)
                },
                metadata: {
                  format: file.name.split('.').pop(),
                  width: analysisData.width,
                  height: analysisData.height,
                  ...analysisData
                },
                tags: ['uploaded', category, 'sessionId:' + sessionId],
                status: 'active'
              })
            });

            if (!response.ok) {
              throw new Error('Failed to create asset record');
            }

            const asset = await response.json();
            resolve(asset.asset);
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error saving uploaded file as asset:', error);
      throw error;
    }
  },

  /**
   * Save generated image as asset
   */
  async saveGeneratedImageAsAsset(imageUrl, filename, sessionId, generationParams = {}) {
    try {
      const response = await fetch(`${ASSET_API_BASE}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename,
          mimeType: 'image/png',
          fileSize: 0, // Will be updated later
          assetType: 'image',
          assetCategory: 'generated-image',
          userId: 'anonymous',
          sessionId,
          storage: {
            location: 'local',
            url: imageUrl
          },
          metadata: {
            format: 'png',
            generatedFrom: 'google-flow',
            ...generationParams
          },
          generation: {
            prompt: generationParams.prompt,
            model: generationParams.model || 'google-flow',
            seed: generationParams.seed,
            parameters: generationParams
          },
          tags: ['generated', 'google-flow', 'sessionId:' + sessionId],
          status: 'active'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create generated image asset');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving generated image as asset:', error);
      throw error;
    }
  },

  /**
   * Get assets by category (character, product, generated)
   */
  async getAssetsByCategory(category, sessionId = null) {
    try {
      const params = new URLSearchParams({ category, assetType: 'image' });
      if (sessionId) params.append('sessionId', sessionId);

      const response = await fetch(`${ASSET_API_BASE}/by-category/${category}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching assets by category:', error);
      return { assets: [], total: 0 };
    }
  },

  /**
   * Get all gallery assets with filters
   */
  async getGalleryAssets(filters = {}) {
    try {
      const params = new URLSearchParams({
        assetType: filters.assetType || 'all',
        category: filters.assetCategory || 'all',
        page: filters.page || 1,
        limit: filters.limit || 30
      });

      if (filters.search) {
        params.append('query', filters.search);
      }

      const response = await fetch(`${ASSET_API_BASE}/gallery?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch gallery');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching gallery:', error);
      return { assets: [], pagination: { total: 0, pages: 0 } };
    }
  },

  /**
   * Update asset metadata
   */
  async updateAsset(assetId, updates) {
    try {
      const response = await fetch(`${ASSET_API_BASE}/${assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update asset');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(assetId) {
    try {
      const response = await fetch(`${ASSET_API_BASE}/${assetId}/toggle-favorite`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  /**
   * Delete asset
   */
  async deleteAsset(assetId, deleteFile = false) {
    try {
      const response = await fetch(`${ASSET_API_BASE}/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteFile })
      });

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  }
};

export default assetService;
