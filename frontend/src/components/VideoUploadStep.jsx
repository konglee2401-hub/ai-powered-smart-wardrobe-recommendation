/**
 * Step 1: Video Upload Component
 * Allows users to upload multiple videos and optionally upload a product image
 */

import React, { useState, useRef } from 'react';
import { Plus, X, Upload, Image as ImageIcon, Video as VideoIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { UPLOAD_SETTINGS } from '../constants/voiceOverOptions';

export default function VideoUploadStep({
  videos = [],
  onVideosChange,
  productImage,
  onProductImageChange,
  onNext,
  isLoading = false,
}) {
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const videoInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files || []);

    // Check file count
    if (videos.length + files.length > UPLOAD_SETTINGS.maxVideoFiles) {
      toast.error(
        `Maximum ${UPLOAD_SETTINGS.maxVideoFiles} videos allowed. You have ${videos.length} uploaded.`
      );
      return;
    }

    // Validate each file
    for (const file of files) {
      // Check format
      const extension = file.name.split('.').pop().toLowerCase();
      if (!UPLOAD_SETTINGS.supportedVideoFormats.includes(extension)) {
        toast.error(
          `Unsupported video format: ${extension}. Supported: ${UPLOAD_SETTINGS.supportedVideoFormats.join(', ')}`
        );
        continue;
      }

      // Check size
      if (file.size > UPLOAD_SETTINGS.maxVideoSize) {
        toast.error(
          `Video "${file.name}" is too large. Max: ${Math.floor(UPLOAD_SETTINGS.maxVideoSize / 1024 / 1024)}MB`
        );
        continue;
      }

      // Add video
      const videoObj = {
        id: Date.now() + Math.random(),
        file,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      };

      onVideosChange([...videos, videoObj]);
      toast.success(`Video "${file.name}" added`);
    }

    // Reset input
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Check format
    const extension = file.name.split('.').pop().toLowerCase();
    if (!UPLOAD_SETTINGS.supportedImageFormats.includes(extension)) {
      toast.error(
        `Unsupported image format: ${extension}. Supported: ${UPLOAD_SETTINGS.supportedImageFormats.join(', ')}`
      );
      return;
    }

    // Check size
    if (file.size > UPLOAD_SETTINGS.maxProductImageSize) {
      toast.error(
        `Image is too large. Max: ${Math.floor(UPLOAD_SETTINGS.maxProductImageSize / 1024 / 1024)}MB`
      );
      return;
    }

    const imageObj = {
      id: Date.now(),
      file,
      name: file.name,
      url: URL.createObjectURL(file),
    };

    onProductImageChange(imageObj);
    toast.success(`Product image "${file.name}" added`);

    // Reset input
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeVideo = (id) => {
    const videoToRemove = videos.find((v) => v.id === id);
    if (videoToRemove) {
      URL.revokeObjectURL(videoToRemove.url);
      onVideosChange(videos.filter((v) => v.id !== id));
      toast.success('Video removed');
    }
  };

  const removeProductImage = () => {
    if (productImage) {
      URL.revokeObjectURL(productImage.url);
      onProductImageChange(null);
      toast.success('Product image removed');
    }
  };

  const isStepComplete = videos.length > 0;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <VideoIcon className="w-5 h-5 text-blue-400" />
          Step 1: Upload Videos
        </h3>
        <p className="text-sm text-gray-400">
          Upload the videos you want to add voiceover to. You can upload up to {UPLOAD_SETTINGS.maxVideoFiles} videos.
          Optionally add a product image for context.
        </p>
      </div>

      {/* Video Upload Area */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-300">Videos *</label>

        {videos.length === 0 ? (
          <div
            onClick={() => videoInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 hover:border-blue-500 hover:bg-blue-900/10 transition-all cursor-pointer text-center"
          >
            <VideoIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Click to upload videos</p>
            <p className="text-sm text-gray-400">
              Or drag and drop. Max {UPLOAD_SETTINGS.maxVideoFiles} files, {Math.floor(UPLOAD_SETTINGS.maxVideoSize / 1024 / 1024)}MB each
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supported: {UPLOAD_SETTINGS.supportedVideoFormats.join(', ').toUpperCase()}
            </p>
          </div>
        ) : (
          <button
            onClick={() => videos.length < UPLOAD_SETTINGS.maxVideoFiles && videoInputRef.current?.click()}
            className="w-full p-3 rounded-lg border border-dashed border-blue-500/50 hover:border-blue-500 hover:bg-blue-900/10 transition-all text-blue-300 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add More Videos ({videos.length}/{UPLOAD_SETTINGS.maxVideoFiles})
          </button>
        )}

        <input
          ref={videoInputRef}
          type="file"
          multiple
          accept=".mp4,.mov,.avi,.mkv,.webm"
          onChange={handleVideoUpload}
          className="hidden"
        />

        {/* Video List */}
        {videos.length > 0 && (
          <div className="space-y-2">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30 border border-gray-600 group hover:border-blue-500/50"
              >
                <div className="flex-shrink-0 w-16 h-12 rounded bg-gray-800 flex items-center justify-center">
                  <VideoIcon className="w-6 h-6 text-gray-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{video.name}</p>
                  <p className="text-xs text-gray-400">
                    {(video.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                    Video {index + 1}
                  </span>
                  <button
                    onClick={() => removeVideo(video.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Image Upload */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-300">Product Image (Optional)</label>
        <p className="text-xs text-gray-400">
          Upload a product image to help generate more contextual voiceover scripts
        </p>

        {!productImage ? (
          <div
            onClick={() => imageInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-6 hover:border-amber-500 hover:bg-amber-900/10 transition-all cursor-pointer text-center"
          >
            <ImageIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-white font-medium text-sm mb-1">Click to upload product image</p>
            <p className="text-xs text-gray-400">
              Max {Math.floor(UPLOAD_SETTINGS.maxProductImageSize / 1024 / 1024)}MB
            </p>
          </div>
        ) : (
          <div className="relative group">
            <div className="rounded-lg overflow-hidden h-40 bg-gray-900 border border-gray-700">
              <img
                src={productImage.url}
                alt="Product"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <button
                onClick={() => removeProductImage()}
                className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 truncate">{productImage.name}</p>
          </div>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!isStepComplete || isLoading}
          className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
            isStepComplete && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue
            </>
          )}
        </button>
      </div>
    </div>
  );
}
