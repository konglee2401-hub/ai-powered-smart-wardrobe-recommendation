import React, { useState } from 'react';
import GalleryManagement from '../components/GalleryManagement';
import { useNavigate } from 'react-router-dom';

const GalleryPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid');
  const [selectedImages, setSelectedImages] = useState([]);

  const handleImageSelect = (image) => {
    // Navigate to image detail or open modal
    console.log('Image selected:', image);
    // Could navigate to detail page or open modal
  };

  const handleBatchSelect = (images) => {
    setSelectedImages(images);
    // Could navigate to batch processing or show a modal
    console.log('Batch selected:', images);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1>🖼️ Image Gallery</h1>
          <p>Browse and manage your generated images</p>
        </div>
        
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        <GalleryManagement 
          onImageSelect={handleImageSelect}
          onBatchSelect={handleBatchSelect}
          selectedImages={selectedImages}
          viewMode={viewMode}
        />
      </div>

      <style>{`
        .page-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .header-content h1 {
          margin: 0 0 0.25rem 0;
          color: #2c3e50;
        }
        
        .header-content p {
          margin: 0;
          color: #7f8c8d;
        }
        
        .view-toggle {
          display: flex;
          background: white;
          border-radius: 6px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        
        .view-toggle button {
          padding: 0.5rem 1rem;
          border: none;
          background: white;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s;
        }
        
        .view-toggle button:hover {
          background: #f8f9fa;
        }
        
        .view-toggle button.active {
          background: #3498db;
          color: white;
        }
        
        .page-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          padding: 2rem;
          min-height: 600px;
        }
      `}</style>
    </div>
  );
};

export default GalleryPage;
