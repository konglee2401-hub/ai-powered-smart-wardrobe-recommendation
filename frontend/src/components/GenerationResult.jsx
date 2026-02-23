/**
 * Generation Result Component
 * Display generated images with preview and actions
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Copy, Share2, Loader2, RefreshCw, Eye, Video, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GenerationResult({
  images = [],
  isGenerating = false,
  onRegenerate,
  generationPrompt,
  aspectRatio,
  styleOptions,
  isRegenerating = false,
  characterImage = null,
  productImage = null
}) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [downloadingIndex, setDownloadingIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const navigate = useNavigate();

  console.log('🎨 GenerationResult rendered with images:', images.length, images);

  const currentImage = images[selectedImage];

  const downloadImage = async (imageUrl, index) => {
    setDownloadingIndex(index);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-${index + 1}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingIndex(null);
    }
  };

  const copyImageUrl = (imageUrl) => {
    navigator.clipboard.writeText(imageUrl);
    alert('Image URL copied!');
  };

  const handleStartVideoGeneration = () => {
    navigate('/video-generation', {
      state: {
        image: currentImage?.url,
        characterImage,
        productImage
      }
    });
  };

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Generating {images.length > 0 ? 'more ' : ''}images...</p>
          <p className="text-gray-600 text-xs mt-1">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 💫 NEW: Thumbnail Grid - Click to View Full */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300">Generated Images ({images.length})</h3>
          <span className="text-xs text-gray-500">(Click to view full size)</span>
        </div>
        
        {/* Responsive Grid - 2-4 columns based on count */}
        <div className={`grid gap-2 ${
          images.length === 1 ? 'grid-cols-1' :
          images.length === 2 ? 'grid-cols-2' :
          images.length <= 4 ? 'grid-cols-4' :
          'grid-cols-4'
        }`}>
          {images.map((image, idx) => (
            <div
              key={idx}
              onClick={() => {
                setModalImageIndex(idx);
                setShowModal(true);
              }}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-700 hover:border-purple-500 cursor-pointer bg-gray-900 group transition-all"
            >
              <img
                src={image.url}
                alt={`Generated ${idx + 1}`}
                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Image Counter */}
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
                {idx + 1}/{images.length}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => downloadImage(images[modalImageIndex || 0].url, modalImageIndex || 0)}
          disabled={downloadingIndex !== null}
          className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 font-medium text-white"
        >
          {downloadingIndex !== null ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <Download className="w-3 h-3" />
              <span>Download All</span>
            </>
          )}
        </button>
        <button
          onClick={handleStartVideoGeneration}
          className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors font-medium text-white"
        >
          <Video className="w-3 h-3" />
          <span>Generate Video</span>
        </button>
      </div>

      {/* ✨ Modal for Full-Size Image Viewing */}
      {showModal && images.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          {/* Modal Container */}
          <div className="relative w-full h-full max-w-4xl max-h-screen flex flex-col p-4">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-gray-300 hover:text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Main Image */}
            <div className="flex-1 flex items-center justify-center">
              <img
                src={images[modalImageIndex]?.url}
                alt={`Generated ${modalImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Navigation & Info */}
            <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-900/80 rounded-lg border border-gray-700">
              {/* Left Navigation */}
              <button
                onClick={() => setModalImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                className="p-2 hover:bg-gray-800 rounded transition-colors text-gray-300 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Image Counter & Info */}
              <div className="flex-1 text-center">
                <p className="text-sm font-semibold text-gray-300">
                  {modalImageIndex + 1} / {images.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {images[modalImageIndex]?.filename || `Image ${modalImageIndex + 1}`}
                </p>
              </div>

              {/* Right Navigation */}
              <button
                onClick={() => setModalImageIndex((prev) => (prev + 1) % images.length)}
                className="p-2 hover:bg-gray-800 rounded transition-colors text-gray-300 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => downloadImage(images[modalImageIndex].url, modalImageIndex)}
                disabled={downloadingIndex === modalImageIndex}
                className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 font-medium text-white"
              >
                {downloadingIndex === modalImageIndex ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </>
                )}
              </button>
              <button
                onClick={() => copyImageUrl(images[modalImageIndex].url)}
                className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors font-medium text-white"
              >
                <Copy className="w-3 h-3" />
                <span>Copy URL</span>
              </button>
              <button
                onClick={() => window.open(images[modalImageIndex].url, '_blank')}
                className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors font-medium text-white"
              >
                <Eye className="w-3 h-3" />
                <span>View Full</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Button */}
      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors"
      >
        {isRegenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Regenerating...</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Regenerate with Same Settings</span>
          </>
        )}
      </button>

      {/* Generation Info */}
      {generationPrompt && (
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">📝 Used Prompt</h4>
          <p className="text-xs text-gray-400 line-clamp-3">{generationPrompt}</p>
        </div>
      )}

      {/* Style Info */}
      {styleOptions && Object.keys(styleOptions).length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 space-y-1 max-h-32 overflow-y-auto">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">🎨 Style Options Used</h4>
          <div className="space-y-1">
            {Object.entries(styleOptions).map(([key, value]) => (
              value && (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-500">{key}:</span>
                  <span className="text-purple-400">{value}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
