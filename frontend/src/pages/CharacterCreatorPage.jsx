import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Image, RefreshCw, Upload, X } from 'lucide-react';
import PhotoAlbum from 'react-photo-album';
import 'react-photo-album/rows.css';
import GalleryPicker from '../components/GalleryPicker';
import PageHeaderBar from '../components/PageHeaderBar';
import { SkeletonBlock } from '../components/ui/Skeleton';
import { characterAPI } from '../services/api';

const defaultOptions = {
  identity: {
    gender: 'female',
    ageRange: '20-22',
    ethnicity: 'match reference',
    height: 'match reference',
    bust: 'match reference',
    waist: 'match reference',
    bodyType: 'match reference',
    bodyProportions: 'match reference',
    skinTone: 'match reference',
    distinctiveMarks: 'match reference',
    tattoos: '',
  },
  face: {
    faceShape: 'match reference',
    eyeShape: 'match reference',
    eyeColor: 'match reference',
    eyebrowStyle: 'match reference',
    noseType: 'match reference',
    lipShape: 'match reference',
    jawline: 'match reference',
    smileStyle: 'match reference',
  },
  hair: {
    color: 'match reference',
    length: 'match reference',
    texture: 'match reference',
    style: 'match reference',
    parting: 'match reference',
    fringe: 'match reference',
  },
  styling: {
    makeupStyle: 'match reference',
    accessories: 'match reference',
    jewelry: 'match reference',
    nails: 'match reference',
    footwearPreference: 'match reference',
    outfitVibe: 'match reference',
  },
  capturePlan: {
    imageCount: 6,
    aspectRatio: '9:16',
    backgroundStyle: 'clean neutral',
    lightingStyle: 'soft studio',
    cameraLens: '85mm portrait',
    expressionRange: 'match reference',
    poseDirection: 'close-up + 3/4 + full body',
  },
  extraPromptNotes:
    'STRICT IDENTITY LOCK: Match reference portrait exactly. Same face, same body, same hairline, same age. Zero deviation. Keep all distinctive features identical.',
};

const fieldGroups = [
  {
    title: 'Identity Settings',
    description: 'Tune the physical anchors used to keep the character identity stable.',
    fields: [
      { placeholder: 'Gender', group: 'identity', key: 'gender' },
      { placeholder: 'Age range', group: 'identity', key: 'ageRange' },
      { placeholder: 'Height', group: 'identity', key: 'height' },
      { placeholder: 'Bust', group: 'identity', key: 'bust' },
      { placeholder: 'Waist', group: 'identity', key: 'waist' },
      { placeholder: 'Body type', group: 'identity', key: 'bodyType' },
      { placeholder: 'Skin tone', group: 'identity', key: 'skinTone' },
      { placeholder: 'Face shape', group: 'face', key: 'faceShape' },
      { placeholder: 'Eye shape/color', group: 'face', key: 'eyeShape' },
      { placeholder: 'Hair color', group: 'hair', key: 'color' },
      { placeholder: 'Hair style', group: 'hair', key: 'style' },
      { placeholder: 'Makeup', group: 'styling', key: 'makeupStyle' },
      { placeholder: 'Accessories', group: 'styling', key: 'accessories' },
      { placeholder: 'Jewelry', group: 'styling', key: 'jewelry' },
      { placeholder: 'Tattoos', group: 'identity', key: 'tattoos' },
      { placeholder: 'Aspect 9:16', group: 'capturePlan', key: 'aspectRatio' },
    ],
  },
];

function PreviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="studio-card-shell rounded-[22px] p-3">
          <SkeletonBlock className="h-[220px] w-full rounded-[18px]" />
          <SkeletonBlock className="mt-3 h-3 w-28 rounded-full" />
          <SkeletonBlock className="mt-2 h-3 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function CharacterCreatorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [portrait, setPortrait] = useState(null);
  const [portraitPreview, setPortraitPreview] = useState('');
  const [options, setOptions] = useState(defaultOptions);
  const [preview, setPreview] = useState([]);
  const [portraitTempPath, setPortraitTempPath] = useState('');
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationSeed, setGenerationSeed] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const previewContainerRef = useRef(null);
  const portraitInputRef = useRef(null);

  const imageCount = useMemo(() => Number(options.capturePlan.imageCount || 6), [options.capturePlan.imageCount]);
  const isBusy = isGeneratingPreview || isSaving;

  const uploadCardClass = 'studio-card-shell flex flex-col rounded-[24px] p-4';
  const settingsCardClass = 'studio-card-shell flex min-h-0 flex-col rounded-[24px] p-5';
  const previewPanelClass = 'studio-card-shell flex min-h-0 flex-1 flex-col rounded-[24px] p-5';
  const inputClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100';
  const sectionTitleClassName = 'text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500';
  const primaryButtonClassName =
    'apple-cta-primary inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-50';
  const secondaryButtonClassName =
    'apple-option-chip inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40';
  const successButtonClassName =
    'inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold leading-none text-white shadow-[0_12px_30px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none';

  useEffect(() => {
    const updateWidth = () => {
      if (previewContainerRef.current) {
        setContainerWidth(previewContainerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (!isEditMode) return;

    const loadCharacter = async () => {
      try {
        const response = await characterAPI.getById(id);
        const char = response?.data;

        if (char) {
          setName(char.name || '');
          setAlias(char.alias || '');
          setOptions(char.options || defaultOptions);
          setPreview(char.referenceImages || []);
          setPortraitTempPath(char.portraitTempPath || '');
          setPortraitPreview(char.portraitUrl || char.referenceImages?.[0]?.url || char.referenceImages?.[0]?.src || '');
          if (char.generationSeed) setGenerationSeed(char.generationSeed);
        }
      } catch (err) {
        console.error('Error loading character:', err);
        alert(`Failed to load character: ${err.message || 'Unknown error'}`);
        navigate('/characters');
      } finally {
        setPageLoading(false);
      }
    };

    loadCharacter();
  }, [id, isEditMode, navigate]);

  const setNested = (group, key, value) => {
    setOptions((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: value,
      },
    }));
  };

  const setPortraitFile = (file) => {
    setPortrait(file);
    setPortraitPreview(file ? URL.createObjectURL(file) : '');
  };

  const clearPortrait = () => {
    setPortrait(null);
    setPortraitPreview('');
    if (portraitInputRef.current) {
      portraitInputRef.current.value = '';
    }
  };

  const ensurePortraitFile = async () => {
    if (portrait instanceof File) return portrait;
    if (!portraitPreview) return null;

    const response = await fetch(portraitPreview, { headers: { Accept: 'image/*' } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch portrait`);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Portrait source returned an empty file');
    }

    return new File([blob], `${alias || name || 'character'}-portrait.jpg`, {
      type: blob.type || 'image/jpeg',
    });
  };

  const generate = async () => {
    if (!name) {
      alert('Please enter a character name first.');
      return;
    }

    try {
      const portraitFile = await ensurePortraitFile();
      if (!portraitFile) {
        alert('Please upload or select a portrait first.');
        return;
      }

      setIsGeneratingPreview(true);
      const fd = new FormData();
      fd.append('portraitImage', portraitFile);
      fd.append('name', name);
      fd.append('alias', alias || name);
      fd.append('imageCount', imageCount);
      fd.append('aspectRatio', options.capturePlan.aspectRatio || '9:16');
      fd.append('options', JSON.stringify(options));
      if (generationSeed !== null && generationSeed !== undefined) {
        fd.append('seed', String(generationSeed));
      }

      const res = await characterAPI.generatePreview(fd);
      setPreview(res?.data?.generatedImages || []);
      setPortraitTempPath(res?.data?.portraitTempPath || '');
      if (typeof res?.data?.seed !== 'undefined') setGenerationSeed(res.data.seed);

      if (!(portrait instanceof File)) {
        setPortrait(portraitFile);
      }
    } catch (error) {
      console.error('[Character Preview] Error:', error);
      alert(`Error generating preview: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const saveCharacter = async () => {
    try {
      if (!Array.isArray(preview) || preview.length === 0) {
        alert('Please generate preview images first.');
        return;
      }

      const cleanedPreview = preview
        .map((item, index) => {
          if (typeof item === 'string') {
            console.warn(`[Character Save] Preview[${index}] is a string, skipping it`);
            return null;
          }
          return item;
        })
        .filter((item) => item && typeof item === 'object');

      if (cleanedPreview.length === 0) {
        alert('No valid preview images found.');
        return;
      }

      const payload = {
        name,
        alias: alias || name,
        portraitTempPath,
        options,
        generatedImages: cleanedPreview,
        analysisProfile: {
          characterName: name,
          primaryLook: options.styling.outfitVibe,
          lockRules: 'same face, same body, same hairline',
        },
      };

      setIsSaving(true);
      if (isEditMode) {
        await characterAPI.update(id, payload);
        alert('Character updated successfully!');
      } else {
        await characterAPI.save(payload);
        alert('Character saved successfully!');
      }

      navigate('/characters');
    } catch (error) {
      console.error('[Character Save] Error:', error);
      alert(`Error saving character: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGallerySelect = async (item) => {
    try {
      const selectedItem = Array.isArray(item) ? item[0] : item;
      const selectedUrl =
        selectedItem?.resolvedUrl || selectedItem?.selectUrl || selectedItem?.thumbnail || selectedItem?.url;

      if (!selectedItem || !selectedUrl) {
        throw new Error('Selected gallery item is missing an image URL');
      }

      const response = await fetch(selectedUrl, { headers: { Accept: 'image/*' } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch image`);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Received empty image from gallery');
      }

      const file = new File([blob], selectedItem.name || 'character-from-gallery.jpg', {
        type: blob.type || 'image/jpeg',
      });

      setPortraitFile(file);
      setShowGalleryPicker(false);
    } catch (error) {
      console.error('[Character Portrait] Gallery select failed:', error);
      alert(`Failed to use gallery image: ${error.message}`);
    }
  };

  return (
    <>
      <div
        className="character-creator-shell image-generation-shell relative -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden text-[13px] text-slate-900 lg:-mx-6 lg:-mb-6 lg:-mt-6"
        data-main-body
      >
        <PageHeaderBar
          contentClassName="px-4 lg:px-4"
          iconClassName="border border-sky-100 bg-sky-50 text-sky-600"
          titleClassName="text-slate-900"
          subtitleClassName="text-slate-500"
          metaClassName="text-slate-400"
          icon={<ArrowLeft className="h-4 w-4 text-sky-600" />}
          title={isEditMode ? `Edit ${name || 'Character'}` : 'Create New Character'}
          subtitle="Character profile workspace"
          meta={
            isEditMode
              ? 'Update character profile, regenerate references, and refine saved attributes.'
              : 'Upload portrait, tune identity options, generate references, then save.'
          }
          actions={
            <button
              onClick={() => navigate('/characters')}
              className="apple-option-chip inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold text-slate-700 transition hover:text-slate-900"
              title="Back to characters"
            >
              Back to Characters
            </button>
          }
          className="h-16"
        />

        <div className="min-h-0 overflow-hidden px-4 py-3 lg:px-4">
          {pageLoading ? (
            <div className="flex h-full min-h-0 flex-col gap-4 min-[968px]:flex-row">
              <div className="flex min-h-0 flex-col gap-4 min-[968px]:w-[392px] min-[968px]:shrink-0">
                <div className={`${uploadCardClass} gap-4`}>
                  <SkeletonBlock className="h-4 w-28 rounded-full" />
                  <SkeletonBlock className="h-[240px] w-full rounded-[20px]" />
                  <div className="grid grid-cols-2 gap-2">
                    <SkeletonBlock className="h-11 rounded-xl" />
                    <SkeletonBlock className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className={`${settingsCardClass} gap-4 overflow-hidden`}>
                  <SkeletonBlock className="h-4 w-32 rounded-full" />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <SkeletonBlock key={index} className="h-11 rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`min-h-0 min-w-0 flex-1 ${previewPanelClass}`}>
                <PreviewSkeleton />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-4 min-[968px]:flex-row">
              <aside className="grid min-h-0 gap-4 overflow-hidden min-[968px]:w-[392px] min-[968px]:shrink-0">
                <section className={`${uploadCardClass} group relative`}>
                  {portraitPreview ? (
                    <button
                      type="button"
                      onClick={clearPortrait}
                      className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 ring-1 ring-white/15 shadow-[0_10px_18px_rgba(15,23,42,0.22)] transition group-hover:opacity-100 hover:bg-red-500/85"
                      title="Clear portrait"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}

                  <div className="mb-3 flex items-start justify-between gap-3 pr-12">
                    <div>
                      <p className={sectionTitleClassName}>Portrait Source</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">Upload reference</h3>
                    </div>
                    {generationSeed !== null ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Seed {generationSeed}
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => portraitInputRef.current?.click()}
                    className="relative flex h-[240px] w-full items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(241,245,249,0.9))] transition hover:border-sky-300 hover:bg-sky-50/70"
                  >
                    {portraitPreview ? (
                      <>
                        <img src={portraitPreview} alt="Portrait reference" className="h-full w-full object-contain p-3" />
                        <div className="studio-media-overlay absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white/85 px-4 py-3 text-left backdrop-blur">
                          <p className="text-sm font-medium text-slate-900">Portrait ready for generation</p>
                          <p className="text-xs text-slate-500">Click to replace with another upload.</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <Upload className="mb-3 h-8 w-8 text-slate-400 transition group-hover:text-sky-500" />
                        <p className="text-[15px] font-medium text-slate-900">Add character portrait</p>
                        <p className="mt-1 text-xs text-slate-500">Use a clean portrait or choose an image from gallery.</p>
                      </div>
                    )}
                  </button>

                  <input
                    ref={portraitInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setPortraitFile(file);
                      }
                    }}
                  />

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => portraitInputRef.current?.click()}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[13px] font-medium text-sky-700 transition hover:bg-sky-100"
                    >
                      <Upload className="h-4 w-4" />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGalleryPicker(true)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[13px] font-medium text-sky-700 transition hover:bg-sky-100"
                    >
                      <Image className="h-4 w-4" />
                      Gallery
                    </button>
                  </div>
                </section>

                <section className={`${settingsCardClass} min-h-0 overflow-y-auto`}>
                  <div className="space-y-1.5">
                    <p className={sectionTitleClassName}>Core Profile</p>
                    <p className="text-sm text-slate-500">
                      Configure identity lock, styling cues, and output framing before generating references.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Character name"
                      className={inputClassName}
                    />
                    <input
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      placeholder="Alias (ex: LinhPhap)"
                      className={inputClassName}
                    />
                  </div>

                  {fieldGroups.map((section) => (
                    <section key={section.title} className="mt-5 space-y-3">
                      <div className="space-y-1">
                        <p className={sectionTitleClassName}>{section.title}</p>
                        <p className="text-sm text-slate-500">{section.description}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {section.fields.map((field) => (
                          <input
                            key={`${field.group}.${field.key}`}
                            placeholder={field.placeholder}
                            value={options[field.group]?.[field.key] ?? ''}
                            onChange={(e) => setNested(field.group, field.key, e.target.value)}
                            className={inputClassName}
                          />
                        ))}

                        <input
                          type="number"
                          min="4"
                          max="8"
                          value={options.capturePlan.imageCount}
                          onChange={(e) =>
                            setNested('capturePlan', 'imageCount', Number.parseInt(e.target.value, 10) || 4)
                          }
                          className={inputClassName}
                          placeholder="Image count"
                        />
                      </div>
                    </section>
                  ))}

                  <section className="mt-5 space-y-3">
                    <p className={sectionTitleClassName}>Prompt Notes</p>
                    <textarea
                      placeholder="Extra prompt notes"
                      value={options.extraPromptNotes}
                      onChange={(e) => setOptions((prev) => ({ ...prev, extraPromptNotes: e.target.value }))}
                      className={`${inputClassName} min-h-[140px] resize-y`}
                      rows={6}
                    />
                  </section>
                </section>
              </aside>

              <main className="generation-content-plain min-h-0 min-w-0 flex-1 overflow-hidden">
                <div className={previewPanelClass} ref={previewContainerRef}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className={sectionTitleClassName}>Preview Gallery</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">Preview ({preview.length})</h3>
                    </div>
                    <p className="text-sm text-slate-500">Generated references appear here in a responsive grid.</p>
                  </div>

                  <style>{`
                    .photo-album-container img {
                      border-radius: 16px;
                      border: 1px solid #dbe5f0;
                      background: #ffffff;
                      box-shadow: 0 16px 36px rgba(148, 163, 184, 0.18);
                    }
                  `}</style>

                  {isGeneratingPreview ? (
                    <div className="min-h-0 flex-1 overflow-auto">
                      <PreviewSkeleton />
                    </div>
                  ) : preview.length > 0 ? (
                    <div className="photo-album-container min-h-0 w-full flex-1 overflow-auto">
                      {containerWidth > 0 && (
                        <PhotoAlbum
                          layout="rows"
                          photos={preview.map((img) => ({
                            src: img.url || img.src,
                            alt: img.filename || img.alt || 'Character preview',
                            width: img.width || 1080,
                            height: img.height || 1440,
                          }))}
                          targetRowHeight={180}
                          spacing={10}
                          containerWidth={containerWidth}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-slate-50/80 py-8 text-center text-slate-500">
                      <p>Generate preview images to see them here.</p>
                    </div>
                  )}
                </div>
              </main>
            </div>
          )}
        </div>

        <div className="apple-footer-bar sticky bottom-0 z-20 flex h-[60px] flex-shrink-0 items-center px-4">
          <div className="flex h-full w-full items-center justify-between gap-3">
            <div className="min-w-0 text-xs text-slate-500">
              {isGeneratingPreview
                ? 'Generating preview references...'
                : preview.length > 0
                  ? `${preview.length} preview images ready`
                  : 'Generate previews before saving'}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={generate} disabled={isBusy || !preview.length} className={secondaryButtonClassName}>
                <RefreshCw className={`h-4 w-4 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
              <button onClick={generate} disabled={isBusy} className={primaryButtonClassName}>
                {isGeneratingPreview ? 'Generating...' : 'Create Preview'}
              </button>
              <button
                onClick={saveCharacter}
                disabled={!preview.length || !portraitTempPath || isBusy}
                className={successButtonClassName}
              >
                {isSaving ? 'Saving...' : isEditMode ? 'Update Character' : 'Save Character'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <GalleryPicker
        isOpen={showGalleryPicker}
        onClose={() => setShowGalleryPicker(false)}
        onSelect={handleGallerySelect}
        assetType="image"
        assetCategory="character-image"
        title="Select Character Portrait"
      />
    </>
  );
}

