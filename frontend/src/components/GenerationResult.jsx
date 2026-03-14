import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ModalPortal from './ModalPortal';
import AIImage from './AIImage';
import {
  Copy,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Rocket,
  Video,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function toImageItem(image, index) {
  if (typeof image === 'string') {
    return {
      id: `generated-${index}`,
      url: image,
      filename: `generated-${index + 1}.png`,
    };
  }

  return {
    id: image.assetId || image.id || `generated-${index}`,
    url: image.url,
    filename: image.filename || `generated-${index + 1}.png`,
    ...image,
  };
}

function formatLabel(key = '') {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function GenerationLoadingSkeleton({ expectedCount = 2 }) {
  const safeCount = Math.max(1, Math.min(4, Number(expectedCount) || 2));
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr),minmax(420px,1.3fr)]">
      <section className="rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_16px_36px_rgba(2,6,23,0.2)]">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="mt-3 h-6 w-40 animate-pulse rounded-2xl bg-white/[0.08]" />
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-white/[0.08]" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-white/[0.08]" />
        </div>
        <div className="mt-4 h-10 animate-pulse rounded-2xl bg-white/[0.06]" />
      </section>

      <section className="rounded-[1.7rem] bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.12),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.014))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_22px_56px_rgba(2,6,23,0.24)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="h-3 w-16 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="mt-2 h-6 w-36 animate-pulse rounded-2xl bg-white/[0.08]" />
          </div>
          <div className="h-8 w-20 animate-pulse rounded-full bg-white/[0.08]" />
        </div>
        <div className="overflow-hidden rounded-[1.25rem] bg-slate-950/60">
          <div className="aspect-[4/5] w-full">
            <AIImage className="h-full w-full rounded-[1rem]" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: safeCount }).map((_, index) => (
            <div key={index} className="rounded-[1.1rem] bg-white/[0.03] p-2">
              <div className="overflow-hidden rounded-[0.9rem] bg-slate-950/60">
                <div className="aspect-[4/5] w-full">
                  <AIImage className="h-full w-full rounded-[0.9rem]" />
                </div>
              </div>
              <div className="mt-2 h-8 animate-pulse rounded-2xl bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function GenerationResult({
  images = [],
  isGenerating = false,
  onRegenerate,
  generationPrompt,
  aspectRatio,
  styleOptions,
  isRegenerating = false,
  characterImage = null,
  productImage = null,
  useCase = null,
  productFocus = null,
  generationProvider = null,
  uploadToDrive = false,
  driveUploadStatus = null,
  expectedCount = 2,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [downloadingIndex, setDownloadingIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [promptExpanded, setPromptExpanded] = useState(false);

  const normalizedImages = useMemo(
    () => images.map((image, index) => toImageItem(image, index)).filter((image) => !!image.url),
    [images]
  );

  const currentImage = normalizedImages[selectedImageIndex] || normalizedImages[0] || null;
  const activeStyleOptions = Object.entries(styleOptions || {}).filter(([, value]) => !!value);

  const promptPreview = useMemo(() => {
    if (!generationPrompt) return '';
    return generationPrompt.length > 180 ? `${generationPrompt.slice(0, 180)}...` : generationPrompt;
  }, [generationPrompt]);

  const slugify = (value = '') =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24);

  const getDownloadFilename = (image, index) => {
    const extMatch = image?.url?.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    const ext = extMatch?.[1] ? `.${extMatch[1].toLowerCase()}` : '.png';
    const date = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const useCaseSlug = slugify(useCase || 'image');
    const focusSlug = slugify(productFocus || 'focus');
    const providerSlug = slugify(generationProvider || 'browser');
    return `sw-${useCaseSlug}-${focusSlug}-${providerSlug}-${index + 1}-${date}${ext}`;
  };

  const downloadImage = async (imageUrl, index) => {
    setDownloadingIndex(index);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = getDownloadFilename(normalizedImages[index], index);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingIndex(null);
    }
  };

  const copyImageUrl = async (imageUrl) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleStartVideoGeneration = (image) => {
    if (!image?.url) return;

    navigate('/video-generation', {
      state: {
        image: image.url,
        imageAsset: image,
        characterImage,
        productImage,
      },
    });
  };

  if (isGenerating) {
    return <GenerationLoadingSkeleton expectedCount={expectedCount} />;
  }

  if (normalizedImages.length === 0) {
    return null;
  }

  return (
    <ModalPortal>
    <div className="grid gap-5 xl:grid-cols-[minmax(240px,0.58fr),minmax(620px,1.42fr)]">
      <div className="space-y-4">
        <section className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_40px_rgba(2,6,23,0.2)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Generation Summary</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Outputs ready for review</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-slate-200">
              {normalizedImages.length} image{normalizedImages.length > 1 ? 's' : ''}
            </span>
            {generationProvider && (
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                Provider: {formatLabel(generationProvider)}
              </span>
            )}
            {aspectRatio && (
              <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs text-violet-100">
                Ratio: {aspectRatio}
              </span>
            )}
            {useCase && (
              <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                {formatLabel(useCase)}
              </span>
            )}
            {productFocus && (
              <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs text-sky-100">
                Focus: {formatLabel(productFocus)}
              </span>
            )}
          </div>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => currentImage && downloadImage(currentImage.url, selectedImageIndex)}
              disabled={downloadingIndex !== null || !currentImage}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/14 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {downloadingIndex !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>{t('imageGeneration.downloadSelected')}</span>
            </button>
            <button
              type="button"
              onClick={() => currentImage && copyImageUrl(currentImage.url)}
              disabled={!currentImage}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              <span>{t('imageGeneration.copyImageUrl')}</span>
            </button>
          </div>
        </section>

        {(characterImage || productImage) && (
          <section className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_16px_32px_rgba(2,6,23,0.16)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Source Inputs</p>
            <div className="mt-3 grid gap-2">
              {characterImage && (
                <div className="rounded-[1.2rem] bg-white/[0.03] p-2">
                  <p className="mb-2 text-xs font-medium text-slate-300">Character</p>
                  <div className="aspect-[4/5] overflow-hidden rounded-[1rem] bg-slate-950/60">
                    <img src={characterImage} alt="Character input" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
              {productImage && (
                <div className="rounded-[1.2rem] bg-white/[0.03] p-2">
                  <p className="mb-2 text-xs font-medium text-slate-300">Product</p>
                  <div className="aspect-[4/5] overflow-hidden rounded-[1rem] bg-slate-950/60">
                    <img src={productImage} alt="Product input" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeStyleOptions.length > 0 && (
          <section className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_16px_32px_rgba(2,6,23,0.16)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Style Choices</p>
            <div className="mt-3 grid gap-2">
              {activeStyleOptions.map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-white/[0.04] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{formatLabel(key)}</p>
                  <p className="mt-1 text-sm font-medium text-white">{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {generationPrompt && (
          <section className="rounded-[1.6rem] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_16px_32px_rgba(2,6,23,0.16)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Prompt Snapshot</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyImageUrl(generationPrompt)}
                  className="rounded-full bg-white/[0.05] p-2 text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  title={t('imageGeneration.copyPrompt')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPromptExpanded((value) => !value)}
                  className="rounded-full bg-white/[0.05] p-2 text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  title={promptExpanded ? 'Collapse prompt' : 'Expand prompt'}
                >
                  {promptExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {promptExpanded ? generationPrompt : promptPreview}
            </p>
          </section>
        )}

        <section className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_16px_32px_rgba(2,6,23,0.16)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Output Handling</p>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
              <span className="font-medium text-white">Drive upload:</span> {uploadToDrive ? 'Enabled' : 'Disabled'}
            </div>
            {driveUploadStatus && (
              <div className="rounded-2xl bg-cyan-400/10 px-3 py-2.5 text-cyan-100">
                {driveUploadStatus}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <section className="rounded-[1.85rem] bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.12),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.014))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_24px_64px_rgba(2,6,23,0.28)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Selected output</h3>
            </div>
            <button
              type="button"
              onClick={() => currentImage && window.open(currentImage.url, '_blank')}
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/[0.08]"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Open full</span>
            </button>
          </div>

          {currentImage && (
            <>
              <button
                type="button"
                onClick={() => {
                  setModalImageIndex(selectedImageIndex);
                  setShowModal(true);
                }}
                className="group block w-full overflow-hidden rounded-[1.4rem] bg-slate-950/60"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={currentImage.url}
                    alt={currentImage.filename}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
              </button>

              <div className="mt-3 rounded-[1.25rem] bg-white/[0.04] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{currentImage.filename}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Preview {selectedImageIndex + 1} of {normalizedImages.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartVideoGeneration(currentImage)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-500/18 px-3 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-500/24"
                  >
                    <Video className="h-4 w-4" />
                    <span>Create video</span>
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {normalizedImages.map((image, index) => (
              <div
                key={image.id}
                className={`rounded-[1.2rem] p-2 transition ${
                  selectedImageIndex === index
                    ? 'bg-violet-500/12 shadow-[0_12px_28px_rgba(76,29,149,0.22)]'
                    : 'bg-white/[0.03]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className="block w-full overflow-hidden rounded-[1rem] bg-slate-950/60"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img src={image.url} alt={image.filename} className="h-full w-full object-cover" />
                  </div>
                </button>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-200">{image.filename}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setModalImageIndex(index);
                      setShowModal(true);
                    }}
                    className="rounded-full bg-white/[0.05] p-1.5 text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                    title="Preview"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartVideoGeneration(image)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500/16 px-3 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/22"
                >
                  <Video className="h-4 w-4" />
                  <span>Create video</span>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>Regenerate with same settings</span>
            </button>
          </div>
        </section>
      </div>

      {showModal && normalizedImages.length > 0 && (
        <div className="fixed inset-0 app-layer-modal z-[10000] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="relative flex h-full max-h-[90vh] w-full max-w-[1100px] flex-col rounded-[1.6rem] bg-slate-950/95 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.6)]">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/45 p-2 text-slate-300 transition hover:bg-black/70 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex min-h-0 flex-1 items-center justify-center">
              <img
                src={normalizedImages[modalImageIndex]?.url}
                alt={normalizedImages[modalImageIndex]?.filename}
                className="max-h-[72vh] w-full max-w-full rounded-[1.2rem] bg-black/40 object-contain p-3"
              />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[1.25rem] bg-white/[0.04] px-4 py-3">
              <button
                type="button"
                onClick={() => setModalImageIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length)}
                className="rounded-full bg-white/[0.05] p-2 text-slate-200 transition hover:bg-white/[0.08]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  {modalImageIndex + 1} / {normalizedImages.length}
                </p>
                <p className="mt-1 text-xs text-slate-400">{normalizedImages[modalImageIndex]?.filename}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalImageIndex((prev) => (prev + 1) % normalizedImages.length)}
                className="rounded-full bg-white/[0.05] p-2 text-slate-200 transition hover:bg-white/[0.08]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => downloadImage(normalizedImages[modalImageIndex].url, modalImageIndex)}
                disabled={downloadingIndex === modalImageIndex}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/18 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/24 disabled:opacity-50"
              >
                {downloadingIndex === modalImageIndex ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span>{t('imageGeneration.downloadImage')}</span>
              </button>
              <button
                type="button"
                onClick={() => copyImageUrl(normalizedImages[modalImageIndex].url)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08]"
              >
                <Copy className="h-4 w-4" />
                <span>{t('imageGeneration.copyImageUrl')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartVideoGeneration(normalizedImages[modalImageIndex])}
                className="flex items-center justify-center gap-2 rounded-2xl bg-violet-500/20 px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-500/26"
              >
                <Rocket className="h-4 w-4" />
                <span>Create video</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModalPortal>
  );
}





