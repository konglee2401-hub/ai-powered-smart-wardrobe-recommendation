/**
 * Scenario-Based Image Upload Component
 * 💫 NEW: Handles adaptive image upload based on scenario requirements
 * Shows required vs optional image fields dynamically
 */

import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { VIDEO_SCENARIOS } from '../constants/videoGeneration';

export default function ScenarioImageUploadComponent({
  scenario = 'product-intro',
  onImagesChange = () => {},
  imagePreviewUrls = {},
  disabled = false
}) {
  const { t } = useTranslation();
  // 💫 Get scenario config with image requirements
  const scenarioConfig = useMemo(() => {
    return VIDEO_SCENARIOS.find(s => s.value === scenario);
  }, [scenario]);

  const imageSchema = useMemo(() => {
    return scenarioConfig?.imageSchema || {
      characterWearing: { required: true, label: t('scenarioUpload.characterInOutfit'), description: t('scenarioUpload.personWearingOutfit') },
      characterHolding: { required: false, label: t('scenarioUpload.characterHoldingProduct'), description: t('common.optional') },
      productReference: { required: false, label: t('scenarioUpload.productReference'), description: t('common.optional') }
    };
  }, [scenarioConfig, t]);

  // File input refs
  const fileInputRefs = {
    characterWearing: useRef(null),
    characterHolding: useRef(null),
    productReference: useRef(null)
  };

  const [uploadedFiles, setUploadedFiles] = useState({
    characterWearing: null,
    characterHolding: null,
    productReference: null
  });

  const [errors, setErrors] = useState({});

  /**
   * Handle file selection
   */
  const handleFileSelect = (imageType, file) => {
    if (!file) return;

    // 💫 Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({
        ...prev,
        [imageType]: t('scenarioUpload.onlyImagesAllowed')
      }));
      return;
    }

    // 💫 Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        [imageType]: t('scenarioUpload.fileSizeTooLarge')
      }));
      return;
    }

    // 💫 Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[imageType];
      return newErrors;
    });

    // 💫 Read file and create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      
      // Update parent component with new image
      onImagesChange({
        ...uploadedFiles,
        [imageType]: {
          file,
          preview: dataUrl
        }
      });

      // Update local state
      setUploadedFiles(prev => ({
        ...prev,
        [imageType]: {
          file,
          preview: dataUrl
        }
      }));
    };

    reader.readAsDataURL(file);
  };

  /**
   * Remove uploaded image
   */
  const handleRemoveImage = (imageType) => {
    setUploadedFiles(prev => ({
      ...prev,
      [imageType]: null
    }));

    onImagesChange({
      ...uploadedFiles,
      [imageType]: null
    });

    // Reset file input
    if (fileInputRefs[imageType].current) {
      fileInputRefs[imageType].current.value = '';
    }

    // Clear error
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[imageType];
      return newErrors;
    });
  };

  /**
   * Trigger hidden file input click
   */
  const triggerFileInput = (imageType) => {
    fileInputRefs[imageType].current?.click();
  };

  // 💫 Calculate how many images are shown for this scenario
  const imageCount = Object.values(imageSchema).filter(img => img).length;
  const requiredCount = Object.values(imageSchema).filter(img => img.required).length;
  const uploadedCount = Object.keys(uploadedFiles).filter(key => uploadedFiles[key]?.file).length;

  return (
    <div className="space-y-4">
      {/* 💫 Scenario Info */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-700/50">
        <p className="text-xs text-blue-300 font-medium flex items-center gap-2 mb-2">
          <ImageIcon className="w-4 h-4" />
          {t('scenarioUpload.imageUploadFor')} <strong>{scenarioConfig?.label}</strong>
        </p>
        <p className="text-xs text-blue-300">
          {imageCount === 1 
            ? t('scenarioUpload.needsOneImage')
            : t('scenarioUpload.needsImagesCount', { required: requiredCount, optional: imageCount - requiredCount })}
        </p>
        {uploadedCount > 0 && (
          <p className="text-xs text-green-300 mt-2 flex items-center gap-1">
            <Check className="w-3 h-3" />
            {t('scenarioUpload.uploadedCount', { current: uploadedCount, total: imageCount })}
          </p>
        )}
      </div>

      {/* 💫 Image Upload Fields - Grid Layout */}
      <div className={`grid gap-4 ${
        imageCount === 3 ? 'grid-cols-3' : 
        imageCount === 2 ? 'grid-cols-2' : 
        'grid-cols-1'
      }`}>
        {/* CHARACTER WEARING OUTFIT - Required */}
        {imageSchema.characterWearing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-300">
                {imageSchema.characterWearing.label}
              </label>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-700">
                {imageSchema.characterWearing.required ? t('common.required') : t('common.optional')}
              </span>
            </div>
            <p className="text-xs text-gray-400">{imageSchema.characterWearing.description}</p>

            {/* Image Preview or Upload Area */}
            {uploadedFiles.characterWearing?.preview ? (
              <div className="relative group">
                <img
                  src={uploadedFiles.characterWearing.preview}
                  alt="Character wearing outfit"
                  className="w-full h-32 object-cover rounded-lg border-2 border-green-700 bg-gray-800"
                />
                <button
                  onClick={() => handleRemoveImage('characterWearing')}
                  disabled={disabled}
                  className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-green-600 rounded text-xs text-white font-medium">
                  <Check className="w-3 h-3" />
                  {t('common.uploaded')}
                </div>
              </div>
            ) : (
              <button
                onClick={() => triggerFileInput('characterWearing')}
                disabled={disabled}
                className="w-full p-4 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg bg-gray-900/50 hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">{t('scenarioUpload.clickToUpload')}</span>
                  <span className="text-xs text-gray-500">PNG, JPG, GIF (max 10MB)</span>
                </div>
              </button>
            )}
            {errors.characterWearing && (
              <div className="flex items-center gap-2 p-2 bg-red-900/20 rounded border border-red-700/50 text-xs text-red-300">
                <AlertCircle className="w-3 h-3" />
                {errors.characterWearing}
              </div>
            )}
            <input
              ref={fileInputRefs.characterWearing}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect('characterWearing', e.target.files?.[0])}
              disabled={disabled}
            />
          </div>
        )}

        {/* CHARACTER HOLDING PRODUCT - Optional */}
        {imageSchema.characterHolding && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-300">
                {imageSchema.characterHolding.label}
              </label>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                {imageSchema.characterHolding.required ? t('common.required') : t('common.optional')}
              </span>
            </div>
            <p className="text-xs text-gray-400">{imageSchema.characterHolding.description}</p>

            {uploadedFiles.characterHolding?.preview ? (
              <div className="relative group">
                <img
                  src={uploadedFiles.characterHolding.preview}
                  alt="Character holding product"
                  className="w-full h-32 object-cover rounded-lg border-2 border-green-700 bg-gray-800"
                />
                <button
                  onClick={() => handleRemoveImage('characterHolding')}
                  disabled={disabled}
                  className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-green-600 rounded text-xs text-white font-medium">
                  <Check className="w-3 h-3" />
                  {t('common.uploaded')}
                </div>
              </div>
            ) : (
              <button
                onClick={() => triggerFileInput('characterHolding')}
                disabled={disabled}
                className="w-full p-4 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg bg-gray-900/50 hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">{t('scenarioUpload.clickToUploadOptional')}</span>
                  <span className="text-xs text-gray-500">{t('scenarioUpload.helpsUnderstandProduct')}</span>
                </div>
              </button>
            )}
            {errors.characterHolding && (
              <div className="flex items-center gap-2 p-2 bg-red-900/20 rounded border border-red-700/50 text-xs text-red-300">
                <AlertCircle className="w-3 h-3" />
                {errors.characterHolding}
              </div>
            )}
            <input
              ref={fileInputRefs.characterHolding}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect('characterHolding', e.target.files?.[0])}
              disabled={disabled}
            />
          </div>
        )}

        {/* PRODUCT REFERENCE - Optional */}
        {imageSchema.productReference && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-300">
                {imageSchema.productReference.label}
              </label>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                {imageSchema.productReference.required ? t('common.required') : t('common.optional')}
              </span>
            </div>
            <p className="text-xs text-gray-400">{imageSchema.productReference.description}</p>

            {uploadedFiles.productReference?.preview ? (
              <div className="relative group">
                <img
                  src={uploadedFiles.productReference.preview}
                  alt="Product reference"
                  className="w-full h-32 object-cover rounded-lg border-2 border-green-700 bg-gray-800"
                />
                <button
                  onClick={() => handleRemoveImage('productReference')}
                  disabled={disabled}
                  className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-green-600 rounded text-xs text-white font-medium">
                  <Check className="w-3 h-3" />
                  {t('common.uploaded')}
                </div>
              </div>
            ) : (
              <button
                onClick={() => triggerFileInput('productReference')}
                disabled={disabled}
                className="w-full p-4 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg bg-gray-900/50 hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">{t('scenarioUpload.clickToUploadOptional')}</span>
                  <span className="text-xs text-gray-500">{t('scenarioUpload.closeUpProductDetails')}</span>
                </div>
              </button>
            )}
            {errors.productReference && (
              <div className="flex items-center gap-2 p-2 bg-red-900/20 rounded border border-red-700/50 text-xs text-red-300">
                <AlertCircle className="w-3 h-3" />
                {errors.productReference}
              </div>
            )}
            <input
              ref={fileInputRefs.productReference}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect('productReference', e.target.files?.[0])}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* 💫 Validation Status */}
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
        <p className="text-xs text-gray-400">
          {requiredCount > uploadedCount
            ? t('scenarioUpload.missingImages', { count: requiredCount - uploadedCount })
            : t('scenarioUpload.allImagesUploaded')}
        </p>
      </div>
    </div>
  );
}
