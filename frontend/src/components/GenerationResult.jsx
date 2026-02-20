/**
 * Generation Result Component
 * Display generated images with preview and actions
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Copy, Share2, Loader2, RefreshCw, Eye, Video } from 'lucide-react';

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
  const navigate = useNavigate();

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
      {/* Main Preview */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300">Preview ({selectedImage + 1}/{images.length})</h3>
        <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
          <div className="aspect-square flex items-center justify-center bg-gray-950">
            {currentImage?.url && (
              <img
                src={currentImage.url}
                alt={`Generated ${selectedImage + 1}`}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Image Info Overlay */}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-xs text-gray-300">
            <span>{aspectRatio}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => downloadImage(currentImage.url, selectedImage)}
            disabled={downloadingIndex === selectedImage}
            className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
          >
            {downloadingIndex === selectedImage ? (
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
            onClick={() => copyImageUrl(currentImage.url)}
            className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span>Copy URL</span>
          </button>
          <button
            onClick={() => window.open(currentImage.url, '_blank')}
            className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>View Full</span>
          </button>
        </div>

        {/* Start Video Generation Button */}
        <button
          onClick={handleStartVideoGeneration}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors font-medium text-white"
        >
          <Video className="w-3 h-3" />
          <span>🎬 Start Create Video</span>
        </button>
      </div>

      {/* Thumbnail Grid */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">All Generated Images</h3>
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={`aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                selectedImage === idx
                  ? 'border-purple-500 ring-2 ring-purple-500/50'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <img
                src={image.url}
                alt={`Generated ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

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
