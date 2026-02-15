/**
 * Image Upload Component
 * Reusable image upload with preview
 */

import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export default function ImageUpload({
  image,
  onUpload,
  onRemove,
  label = 'Upload Image',
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  maxSize = 10 * 1024 * 1024, // 10MB
  className = '',
}) {
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      alert(`File quá lớn. Kích thước tối đa là ${maxSize / 1024 / 1024}MB`);
      return;
    }

    // Validate file type
    const acceptedTypes = accept.split(',').map(t => t.trim());
    if (!acceptedTypes.includes(file.type)) {
      alert('Định dạng file không được hỗ trợ');
      return;
    }

    onUpload(file);
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  function handleRemove(e) {
    e.stopPropagation();
    onRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {image ? (
        // Preview with image
        <div className="relative group">
          <img
            src={image}
            alt="Preview"
            className="w-full h-64 object-cover rounded-xl border-2 border-gray-200"
          />
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-xl flex items-center justify-center">
            <button
              onClick={handleRemove}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        // Upload area
        <button
          onClick={handleClick}
          className="w-full h-64 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all flex flex-col items-center justify-center gap-3 text-gray-600 hover:text-purple-600"
        >
          <div className="p-4 bg-gray-100 rounded-full">
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-gray-500 mt-1">
              JPG, PNG, WEBP (Max {maxSize / 1024 / 1024}MB)
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
