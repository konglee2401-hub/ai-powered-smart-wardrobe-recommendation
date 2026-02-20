/**
 * Generation Options Component
 * Image count, aspect ratio, watermark, reference image
 */

import React, { useState } from 'react';
import { Upload, X, Info } from 'lucide-react';
import AdvancedGenerationSettings from './AdvancedGenerationSettings';

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square', icon: '⬜' },
  { value: '16:9', label: 'Landscape', icon: '📺' },
  { value: '9:16', label: 'Portrait', icon: '📱' },
  { value: '4:3', label: 'Classic', icon: '🖼️' },
  { value: '3:2', label: 'Photo', icon: '📷' },
];

const IMAGE_COUNTS = [1, 2, 3, 4, 6];

function Tooltip({ children, content }) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:flex w-56">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-normal">
          {content}
          <div className="absolute top-full left-4 border-8 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  );
}

export default function GenerationOptions({
  imageCount = 2,
  onImageCountChange,
  aspectRatio = '1:1',
  onAspectRatioChange,
  hasWatermark = false,
  onWatermarkChange,
  referenceImage = null,
  onReferenceImageChange,
  steps = 30,
  onStepsChange,
  cfgScale = 7.5,
  onCfgScaleChange,
  samplingMethod = 'euler',
  onSamplingMethodChange,
  seed = null,
  onSeedChange,
  randomSeed = true,
  onRandomSeedChange
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onReferenceImageChange?.({
        file,
        preview: URL.createObjectURL(file)
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onReferenceImageChange?.({
        file,
        preview: URL.createObjectURL(file)
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Count */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-2">
          <Tooltip content="Số lượng ảnh sẽ được tạo trong một lần generation">
            <span>🖼️ Image Count</span>
          </Tooltip>
        </label>
        <div className="grid grid-cols-5 gap-1">
          {IMAGE_COUNTS.map(count => (
            <button
              key={count}
              onClick={() => onImageCountChange?.(count)}
              className={`py-2 px-1 rounded text-xs font-medium transition-all ${
                imageCount === count
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Tạo {imageCount} ảnh, thời gian gen sẽ tăng tương ứng
        </p>
      </div>

      {/* Aspect Ratio */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-2">
          <Tooltip content="Tỷ lệ khung hình của ảnh được tạo">
            <span>📐 Aspect Ratio</span>
          </Tooltip>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ASPECT_RATIOS.map(ratio => (
            <button
              key={ratio.value}
              onClick={() => onAspectRatioChange?.(ratio.value)}
              className={`p-2 rounded-lg text-xs font-medium transition-all border ${
                aspectRatio === ratio.value
                  ? 'bg-purple-600/20 text-purple-400 border-purple-600/50'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-purple-600/30'
              }`}
            >
              <div className="text-lg mb-1">{ratio.icon}</div>
              <div>{ratio.label}</div>
              <div className="text-xs opacity-75">{ratio.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Watermark Toggle */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-2">
          <Tooltip content="Thêm watermark vào ảnh được tạo (mặc định là không)">
            <span>🔏 Watermark</span>
          </Tooltip>
        </label>
        <button
          onClick={() => onWatermarkChange?.(!hasWatermark)}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            hasWatermark
              ? 'bg-red-600/20 text-red-400 border-red-600/50'
              : 'bg-green-600/20 text-green-400 border-green-600/50'
          }`}
        >
          <span className="text-xs font-medium">
            {hasWatermark ? '有 Watermark' : '無 Watermark (Default)'}
          </span>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
            hasWatermark
              ? 'bg-red-600 border-red-700'
              : 'bg-green-600 border-green-700'
          }`}>
            {hasWatermark ? '✓' : ''}
          </div>
        </button>
      </div>

      {/* Reference Image Upload */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-2">
          <Tooltip content="Tải lên ảnh tham khảo (optional). Ảnh này sẽ được gửi cho provider cùng với prompt để hỗ trợ gen ảnh chính xác hơn">
            <span>📸 Reference Image (Optional)</span>
          </Tooltip>
        </label>

        {referenceImage?.preview ? (
          <div className="relative">
            <div className="aspect-square bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
              <img
                src={referenceImage.preview}
                alt="Reference"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => onReferenceImageChange?.(null)}
              className="absolute top-1 right-1 p-1 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`block aspect-square bg-gray-900 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
              dragOver
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-700 hover:border-purple-600/50'
            }`}
          >
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <Upload className="w-6 h-6 text-gray-600 mb-2" />
              <span className="text-xs text-gray-500 mb-1">
                Drag & drop hoặc click
              </span>
              <span className="text-xs text-gray-600">để chọn ảnh tham khảo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </label>
        )}

        <div className="flex items-start gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400 mt-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Ảnh tham khảo sẽ được gửi cùng prompt để cải thiện độ chính xác gen ảnh.
          </span>
        </div>
      </div>

      {/* Advanced Settings */}
      <AdvancedGenerationSettings
        steps={steps}
        onStepsChange={onStepsChange}
        cfgScale={cfgScale}
        onCfgScaleChange={onCfgScaleChange}
        samplingMethod={samplingMethod}
        onSamplingMethodChange={onSamplingMethodChange}
        seed={seed}
        onSeedChange={onSeedChange}
        randomSeed={randomSeed}
        onRandomSeedChange={onRandomSeedChange}
      />
    </div>
  );
}
