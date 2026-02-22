/**
 * Google Drive API Service (Frontend)
 * Handles file uploads to Google Drive and gallery operations
 */

const API_BASE = '/api/drive';

export const driveAPI = {
  /**
   * Check authentication status
   */
  getAuthStatus: async () => {
    try {
      const response = await fetch(`${API_BASE}/auth`);
      return await response.json();
    } catch (error) {
      console.error('Error checking auth status:', error);
      throw error;
    }
  },

  /**
   * Handle OAuth callback
   */
  handleAuthCallback: async (code) => {
    try {
      const response = await fetch(`${API_BASE}/auth-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error handling auth callback:', error);
      throw error;
    }
  },

  /**
   * Initialize folder structure
   */
  initializeFolders: async () => {
    try {
      const response = await fetch(`${API_BASE}/init-folders`, {
        method: 'POST',
      });
      return await response.json();
    } catch (error) {
      console.error('Error initializing folders:', error);
      throw error;
    }
  },

  /**
   * Upload file to Google Drive
   */
  uploadFile: async (file, options = {}) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options.description) {
        formData.append('description', options.description);
      }
      
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      return data.file;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  /**
   * Get list of uploaded files
   */
  listFiles: async () => {
    try {
      const response = await fetch(`${API_BASE}/files`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to list files');
      }

      return data.files || [];
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  },

  /**
   * Get file details
   */
  getFile: async (fileId) => {
    try {
      const response = await fetch(`${API_BASE}/file/${fileId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get file');
      }

      return data.file;
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  },

  /**
   * Delete file from Google Drive
   */
  deleteFile: async (fileId) => {
    try {
      const response = await fetch(`${API_BASE}/file/${fileId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete file');
      }

      return data;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  /**
   * Get download URL
   */
  getDownloadUrl: (fileId) => {
    return `/api/drive/download-url/${fileId}`;
  },
};

export default driveAPI;
