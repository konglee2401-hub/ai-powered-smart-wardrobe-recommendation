import React, { useState, useEffect } from 'react';
import GalleryManagement from '../components/GalleryManagement';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Grid3x3, List, Upload, Folder, Image, Film, Music,
  MoreVertical, ChevronRight, Home, Clock, Star, Zap,
  Search, Filter, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

const GalleryPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('grid');
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    character: 0,
    product: 0,
    generated: 0,
    source: 0
  });
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Category sidebar items
  const categories = [
    { id: 'all', label: 'All Media', icon: Home, count: stats.total },
    { id: 'character-image', label: 'Character Images', icon: Image, count: stats.character },
    { id: 'product-image', label: 'Product Images', icon: Image, count: stats.product },
    { id: 'generated-image', label: 'Generated Images', icon: Zap, count: stats.generated },
    { id: 'source-video', label: 'Source Videos', icon: Film, count: stats.source },
  ];

  const otherFilters = [
    { id: 'recent', label: 'Recent Files', icon: Clock },
    { id: 'favorites', label: 'Favorites', icon: Star },
  ];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/stats/assets`);
      const data = await res.json();
      
      if (data.success) {
        const { stats: statsData } = data;
        setStats({
          total: statsData.active || 0,
          character: statsData.byCategory?.['character-image'] || 0,
          product: statsData.byCategory?.['product-image'] || 0,
          generated: statsData.byCategory?.['generated-image'] || 0,
          source: statsData.byCategory?.['source-video'] || 0,
        });

        // Load recent files
        if (data.stats.recent) {
          setRecentFiles(data.stats.recent.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (image) => {
    console.log('Image selected:', image);
  };

  const handleBatchSelect = (images) => {
    setSelectedImages(images);
  };

  const handleCategoryClick = (categoryId) => {
    setCurrentCategory(categoryId);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0f172a',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* LEFT SIDEBAR */}
      <div style={{
        width: '240px',
        background: '#1e293b',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        marginTop: '80px',
        height: 'calc(100vh - 80px)',
        padding: '1.5rem 1rem',
        gap: '2rem'
      }}>
        {/* Main Menu */}
        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1rem',
            paddingLeft: '0.5rem'
          }}>
            📁 MAIN MENU
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map(cat => {
              const IconComponent = cat.icon;
              const isActive = currentCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem',
                    background: isActive ? '#3b82f6' : 'transparent',
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? '600' : '500',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#334155';
                      e.currentTarget.style.color = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#cbd5e1';
                    }
                  }}
                >
                  <IconComponent size={18} />
                  <span style={{ flex: 1 }}>{cat.label}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    background: '#334155',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    minWidth: '28px',
                    textAlign: 'center'
                  }}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Other Filters */}
        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1rem',
            paddingLeft: '0.5rem'
          }}>
            🎯 FILTERS
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {otherFilters.map(filter => {
              const IconComponent = filter.icon;
              return (
                <button
                  key={filter.id}
                  onClick={() => handleCategoryClick(filter.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem',
                    background: 'transparent',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#334155';
                    e.currentTarget.style.color = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  <IconComponent size={18} />
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Storage Info */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '1.5rem',
          borderTop: '1px solid #334155'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#64748b',
            marginBottom: '0.75rem'
          }}>
            📦 STORAGE
          </div>
          <div style={{
            background: '#0f172a',
            padding: '1rem',
            borderRadius: '6px',
            fontSize: '0.85rem'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: '#94a3b8' }}>78.5 GB of 100 GB used</span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              background: '#334155',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                width: '78.5%',
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
              }}></div>
            </div>
            <button style={{
              width: '100%',
              padding: '0.5rem',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginTop: '80px',
        height: 'calc(100vh - 80px)',
        overflowY: 'auto'
      }}>
        {/* TOP TOOLBAR */}
        <div style={{
          borderBottom: '1px solid #334155',
          padding: '1.5rem 2rem',
          background: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Title & Breadcrumb */}
          <div>
            <h2 style={{
              margin: '0',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              Project Files
            </h2>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              <Upload size={18} />
              Upload File
            </button>

            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              background: '#334155',
              padding: '0.5rem',
              borderRadius: '6px'
            }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: viewMode === 'grid' ? '#3b82f6' : 'transparent',
                  color: viewMode === 'grid' ? '#ffffff' : '#cbd5e1',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: viewMode === 'list' ? '#3b82f6' : 'transparent',
                  color: viewMode === 'list' ? '#ffffff' : '#cbd5e1',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <List size={18} />
              </button>
            </div>

            {/* Filter */}
            <button style={{
              padding: '0.75rem',
              background: 'transparent',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#334155';
              e.currentTarget.style.color = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#cbd5e1';
            }}
            >
              <Filter size={18} />
            </button>

            {/* More Options */}
            <button style={{
              padding: '0.75rem',
              background: 'transparent',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#334155';
              e.currentTarget.style.color = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#cbd5e1';
            }}
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '2rem'
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            padding: '2rem',
            minHeight: '600px'
          }}>
            <GalleryManagement 
              onImageSelect={handleImageSelect}
              onBatchSelect={handleBatchSelect}
              selectedImages={selectedImages}
              viewMode={viewMode}
              currentCategory={currentCategory}
              searchQuery={searchQuery}
            />
          </div>

          {/* Recent Files Section */}
          {recentFiles.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#f1f5f9'
              }}>
                Recent Files
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                {recentFiles.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#334155',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '1px solid #475569'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#475569';
                      e.currentTarget.style.borderColor = '#64748b';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#334155';
                      e.currentTarget.style.borderColor = '#475569';
                    }}
                  >
                    <div style={{
                      width: '100%',
                      aspectRatio: '1',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      borderRadius: '4px',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '2rem'
                    }}>
                      📄
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      color: '#f1f5f9',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {file?.filename || 'File ' + (idx + 1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryPage;
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
