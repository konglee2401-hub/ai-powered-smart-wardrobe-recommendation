import React, { useState } from 'react';
import GalleryManagement from '../components/GalleryManagement';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Grid3x3, List } from 'lucide-react';

const GalleryPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('grid');
  const [selectedImages, setSelectedImages] = useState([]);

  const handleImageSelect = (image) => {
    console.log('Image selected:', image);
  };

  const handleBatchSelect = (images) => {
    setSelectedImages(images);
    console.log('Batch selected:', images);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#f1f5f9'
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '2.2rem',
              fontWeight: '700',
              color: '#f1f5f9'
            }}>
              🖼️ {t('gallery.title')}
            </h1>
            <p style={{
              margin: '0',
              color: '#cbd5e1',
              fontSize: '1rem'
            }}>
              {t('gallery.subtitle')}
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.75rem 1.5rem',
                border: viewMode === 'grid' ? 'none' : '1px solid #475569',
                background: viewMode === 'grid' 
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                  : '#1e293b',
                color: '#f1f5f9',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: viewMode === 'grid' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'grid') {
                  e.target.style.background = '#334155';
                  e.target.style.borderColor = '#64748b';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'grid') {
                  e.target.style.background = '#1e293b';
                  e.target.style.borderColor = '#475569';
                }
              }}
            >
              <Grid3x3 size={18} /> {t('gallery.grid')}
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.75rem 1.5rem',
                border: viewMode === 'list' ? 'none' : '1px solid #475569',
                background: viewMode === 'list' 
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                  : '#1e293b',
                color: '#f1f5f9',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: viewMode === 'list' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'list') {
                  e.target.style.background = '#334155';
                  e.target.style.borderColor = '#64748b';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'list') {
                  e.target.style.background = '#1e293b';
                  e.target.style.borderColor = '#475569';
                }
              }}
            >
              <List size={18} /> {t('gallery.list')}
            </button>
          </div>
        </div>

        {/* Gallery Component */}
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          border: '1px solid #334155',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          minHeight: '600px'
        }}>
          <GalleryManagement 
            onImageSelect={handleImageSelect}
            onBatchSelect={handleBatchSelect}
            selectedImages={selectedImages}
            viewMode={viewMode}
          />
        </div>

        {/* Info Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          {[
            { 
              icon: '✨', 
              title: t('gallery.generatedMedia'), 
              desc: t('gallery.generatedMediaDesc')
            },
            { 
              icon: '📤', 
              title: t('gallery.uploadedFiles'), 
              desc: t('gallery.uploadedFilesDesc')
            },
            { 
              icon: '☁️', 
              title: t('gallery.cloudDrive'), 
              desc: t('gallery.cloudDriveDesc')
            }
          ].map((card, idx) => (
            <div
              key={idx}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '1.5rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{card.icon}</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#f1f5f9', fontSize: '1.1rem', fontWeight: '600' }}>
                {card.title}
              </h3>
              <p style={{ margin: '0', color: '#cbd5e1', fontSize: '0.95rem' }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryPage;
