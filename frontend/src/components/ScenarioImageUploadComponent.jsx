import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Upload, X } from 'lucide-react';
import { VIDEO_SCENARIOS } from '../constants/videoGeneration';

const FIELD_ORDER = ['characterWearing', 'characterHolding', 'productReference'];

const EMPTY_UPLOADS = {
  characterWearing: null,
  characterHolding: null,
  productReference: null
};

function buildUploadsFromPreviewUrls(imagePreviewUrls = {}) {
  const nextState = { ...EMPTY_UPLOADS };

  FIELD_ORDER.forEach((key) => {
    const value = imagePreviewUrls?.[key];
    if (!value) return;

    if (typeof value === 'string') {
      nextState[key] = { file: null, preview: value };
      return;
    }

    if (value.preview || value.file) {
      nextState[key] = {
        file: value.file || null,
        preview: value.preview || null
      };
    }
  });

  return nextState;
}

function UploadCard({
  imageType,
  field,
  upload,
  error,
  disabled,
  onSelect,
  onRemove,
  inputRef,
  t
}) {
  const badgeClass = field.required
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    : 'border-slate-600/70 bg-slate-800/80 text-slate-300';

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100">{field.label}</h3>
          {field.description ? (
            <p className="mt-1 text-xs leading-5 text-slate-400">{field.description}</p>
          ) : null}
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeClass}`}>
          {field.required ? t('common.required') : t('common.optional')}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onSelect()}
        disabled={disabled}
        className="group relative flex min-h-[232px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-600/80 bg-slate-950/40 transition hover:border-slate-400 hover:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {upload?.preview ? (
          <>
            <img
              src={upload.preview}
              alt={field.label}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/0 transition group-hover:bg-slate-950/30" />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              disabled={disabled}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
              aria-label={`Remove ${imageType}`}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
              <Check className="h-3.5 w-3.5" />
              {t('common.uploaded')}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/70 bg-slate-800/80 text-slate-300">
              <Upload className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-slate-200">{t('scenarioUpload.clickToUpload')}</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </button>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-950/20 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="mt-3 h-[38px]" />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onSelect(e.target.files?.[0])}
        disabled={disabled}
      />
    </div>
  );
}

export default function ScenarioImageUploadComponent({
  scenario = 'product-intro',
  onImagesChange = () => {},
  imagePreviewUrls = {},
  disabled = false
}) {
  const { t } = useTranslation();

  const scenarioConfig = useMemo(
    () => VIDEO_SCENARIOS.find((item) => item.value === scenario),
    [scenario]
  );

  const imageSchema = useMemo(() => (
    scenarioConfig?.imageSchema || {
      characterWearing: {
        required: true,
        label: t('scenarioUpload.characterInOutfit'),
        description: t('scenarioUpload.personWearingOutfit')
      },
      characterHolding: {
        required: false,
        label: t('scenarioUpload.characterHoldingProduct'),
        description: t('common.optional')
      },
      productReference: {
        required: false,
        label: t('scenarioUpload.productReference'),
        description: t('common.optional')
      }
    }
  ), [scenarioConfig, t]);

  const fileInputRefs = {
    characterWearing: useRef(null),
    characterHolding: useRef(null),
    productReference: useRef(null)
  };

  const [uploadedFiles, setUploadedFiles] = useState(() => buildUploadsFromPreviewUrls(imagePreviewUrls));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setUploadedFiles(buildUploadsFromPreviewUrls(imagePreviewUrls));
  }, [imagePreviewUrls]);

  const visibleFields = useMemo(
    () => FIELD_ORDER.filter((key) => imageSchema[key]).map((key) => ({ key, ...imageSchema[key] })),
    [imageSchema]
  );

  const requiredCount = visibleFields.filter((field) => field.required).length;
  const uploadedCount = visibleFields.filter((field) => uploadedFiles[field.key]?.preview).length;

  const emitNextImages = (updater) => {
    setUploadedFiles((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onImagesChange(next);
      return next;
    });
  };

  const handleFileSelect = (imageType, file) => {
    if (!file) {
      fileInputRefs[imageType].current?.click();
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, [imageType]: t('scenarioUpload.onlyImagesAllowed') }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [imageType]: t('scenarioUpload.fileSizeTooLarge') }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next[imageType];
      return next;
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      emitNextImages((prev) => ({
        ...prev,
        [imageType]: {
          file,
          preview: dataUrl
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (imageType) => {
    emitNextImages((prev) => ({
      ...prev,
      [imageType]: null
    }));

    if (fileInputRefs[imageType].current) {
      fileInputRefs[imageType].current.value = '';
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next[imageType];
      return next;
    });
  };

  const gridClass = visibleFields.length >= 3
    ? 'grid gap-4 xl:grid-cols-3'
    : visibleFields.length === 2
      ? 'grid gap-4 md:grid-cols-2'
      : 'grid gap-4';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/35 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{scenarioConfig?.label || scenario}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {requiredCount > uploadedCount
                ? t('scenarioUpload.missingImages', { count: requiredCount - uploadedCount })
                : t('scenarioUpload.allImagesUploaded')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-medium">
            <span className="rounded-full border border-slate-600/70 bg-slate-800/80 px-3 py-1 text-slate-300">
              {uploadedCount}/{visibleFields.length} uploaded
            </span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-amber-200">
              {requiredCount} required
            </span>
          </div>
        </div>
      </div>

      <div className={gridClass}>
        {visibleFields.map((field) => (
          <UploadCard
            key={field.key}
            imageType={field.key}
            field={field}
            upload={uploadedFiles[field.key]}
            error={errors[field.key]}
            disabled={disabled}
            onSelect={(file) => handleFileSelect(field.key, file)}
            onRemove={() => handleRemoveImage(field.key)}
            inputRef={fileInputRefs[field.key]}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
