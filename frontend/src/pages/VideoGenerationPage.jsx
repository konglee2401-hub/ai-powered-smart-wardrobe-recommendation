import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Film,
  Loader2,
  RefreshCw,
  Rocket,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GalleryPicker from '../components/GalleryPicker';
import PageHeaderBar from '../components/PageHeaderBar';
import ScenePickerModal from '../components/ScenePickerModal';
import driveAPI from '../services/driveAPI';
import { browserAutomationAPI } from '../services/api';
import {
  captureGenerationSession,
  getGenerationSessionDetail,
  getGenerationSessions,
} from '../services/generationSessionsService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const DEFAULT_SCENE_VALUE = 'linhphap-tryon-room';
const PANEL_CLASS = 'studio-card-shell rounded-[0.875rem] p-3';
const SUB_PANEL_CLASS = 'studio-card-shell rounded-[0.75rem] p-2.5';
const CONTROL_CHIP_CLASS = 'apple-option-chip rounded-[0.65rem] border px-3 py-2 text-xs font-semibold transition';
const STATUS_BANNER_CLASS = 'studio-card-shell rounded-full px-3 py-1.5 text-xs font-medium';
const TEXTAREA_CLASS =
  'w-full rounded-[0.75rem] border border-white/10 bg-slate-950/55 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-sky-300/35 focus:ring-2 focus:ring-sky-300/10';

const PROVIDERS = [
  { id: 'google-flow', label: 'Google Flow', shortLabel: 'Flow', accent: 'cool', description: 'Two-frame motion workflow' },
  { id: 'grok', label: 'Grok', shortLabel: 'Grok', accent: 'violet', description: 'Fast single-prompt iteration' },
];

const DURATIONS = {
  'google-flow': [2, 4, 6, 8],
  grok: [4, 6, 8, 10],
};

const ASPECTS = [
  { id: '16:9', label: '16:9', metaKey: 'videoGeneration.aspect.landscape' },
  { id: '9:16', label: '9:16', metaKey: 'videoGeneration.aspect.vertical' },
];

const USE_CASES = [
  {
    id: 'motion-showcase',
    labelKey: 'videoGeneration.useCases.motionShowcase.label',
    summaryKey: 'videoGeneration.useCases.motionShowcase.summary',
    prompt:
      'Start from the first frame, move with controlled camera motion, preserve the subject identity, and land naturally on the end frame with a polished commercial finish.',
  },
  {
    id: 'fashion-beat',
    labelKey: 'videoGeneration.useCases.fashionBeat.label',
    summaryKey: 'videoGeneration.useCases.fashionBeat.summary',
    prompt:
      'Create a premium fashion micro-scene with subtle pose variation, elegant camera motion, and a strong visual payoff that matches the ending frame.',
  },
  {
    id: 'product-demo',
    labelKey: 'videoGeneration.useCases.productDemo.label',
    summaryKey: 'videoGeneration.useCases.productDemo.summary',
    prompt:
      'Highlight the product clearly while keeping the action believable. Emphasize interaction, readable composition, and a final frame that feels like a strong product hero shot.',
  },
  {
    id: 'scene-transition',
    labelKey: 'videoGeneration.useCases.sceneTransition.label',
    summaryKey: 'videoGeneration.useCases.sceneTransition.summary',
    prompt:
      'Keep the environment stable and production-ready. Use the scene reference as the anchor for lighting, geometry, and atmosphere while moving smoothly from start to end frame.',
  },
];

function normalizeAssetUrl(url) {
  if (!url) return null;
  const normalized = String(url).replace(/\\/g, '/');
  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('data:')) return normalized;
  if (normalized.startsWith('/')) return `${API_BASE_URL.replace('/api', '')}${normalized}`;
  return `${API_BASE_URL.replace('/api', '')}/${normalized}`;
}

function getSceneLockedPrompt(scene, language = 'en') {
  if (!scene) return '';
  const isVi = (language || 'en').toLowerCase().startsWith('vi');
  return isVi
    ? (scene.sceneLockedPromptVi || scene.sceneLockedPrompt || scene.promptSuggestionVi || scene.promptSuggestion || '')
    : (scene.sceneLockedPrompt || scene.sceneLockedPromptVi || scene.promptSuggestion || scene.promptSuggestionVi || '');
}

function getScenePreviewUrl(scene, aspectRatio = '16:9') {
  if (!scene) return null;
  if (scene.sceneLockedImageUrls && typeof scene.sceneLockedImageUrls === 'object') {
    const exact = scene.sceneLockedImageUrls[aspectRatio];
    if (exact) return normalizeAssetUrl(exact);
    if (aspectRatio === '16:9' && scene.sceneLockedImageUrls['9:16']) return normalizeAssetUrl(scene.sceneLockedImageUrls['9:16']);
    if (aspectRatio === '9:16' && scene.sceneLockedImageUrls['16:9']) return normalizeAssetUrl(scene.sceneLockedImageUrls['16:9']);
  }
  return normalizeAssetUrl(scene.sceneLockedImageUrl || scene.previewImage);
}

function formatDate(value, locale, t) {
  const unknown = t ? t('videoGeneration.unknown') : 'Unknown';
  if (!value) return unknown;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? unknown : date.toLocaleString(locale || undefined);
}

function formatRelativeTime(value, t) {
  const unknown = t ? t('videoGeneration.unknown') : 'Unknown';
  if (!value) return unknown;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return unknown;
  const diffMs = Math.max(0, Date.now() - time);
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t ? t('videoGeneration.time.just_now') : 'just now';
  if (diffMin < 60) return t ? t('videoGeneration.time.minutes_ago', { count: diffMin }) : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t ? t('videoGeneration.time.hours_ago', { count: diffHour }) : `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return t ? t('videoGeneration.time.days_ago', { count: diffDay }) : `${diffDay}d ago`;
  return formatDate(value, undefined, t);
}

function buildPreviewVideoUrl(filePath) {
  if (!filePath) return null;
  const name = filePath.split(/[\\/]/).pop();
  return `/api/v1/browser-automation/preview-video/${encodeURIComponent(name)}?path=${encodeURIComponent(filePath)}`;
}

function buildDownloadVideoUrl(filePath) {
  if (!filePath) return null;
  const name = filePath.split(/[\\/]/).pop();
  return `/api/v1/browser-automation/download-video/${encodeURIComponent(name)}?path=${encodeURIComponent(filePath)}`;
}

function mediaState(preview, name = '') {
  return preview ? { preview, name } : null;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fetchImageAsDataUrl(url) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      return response.blob();
    })
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
}

function MediaCard({
  title,
  value,
  required,
  onBrowse,
  onGallery,
  onClear,
  headerAction = null,
  galleryLabel = 'Gallery',
  emptyLabel = 'Upload',
}) {
  const { t } = useTranslation();
  return (
    <div className={`${SUB_PANEL_CLASS} video-media-card space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        {headerAction || (
          <span className={`apple-field-pill ${required ? 'apple-field-pill-required' : 'apple-field-pill-optional'}`}>
            {required ? t('common.required') : t('common.optional')}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onBrowse}
        className="video-media-preview group relative mx-auto w-full overflow-hidden rounded-[1.05rem] border border-dashed border-white/14 bg-slate-950/50 transition hover:border-sky-300/35 hover:bg-slate-900/60"
      >
        {value?.preview ? (
          <>
            <div className="absolute inset-0 p-3">
              <img src={value.preview} alt={title} className="h-full w-full rounded-[0.95rem] object-contain" />
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-white transition hover:bg-rose-500/90"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute inset-x-0 bottom-0 px-3 py-2 text-left">
              <p className="truncate text-xs font-medium text-slate-100">{value.name || title}</p>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-5 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-200">
              <Upload className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-slate-100">{emptyLabel}</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP</p>
          </div>
        )}
      </button>

      <div className="grid grid-cols-1 gap-2">
        <button type="button" onClick={onGallery} className="apple-option-chip rounded-xl px-3 py-2 text-xs font-medium transition">
          {galleryLabel}
        </button>
      </div>
    </div>
  );
}

export default function VideoGenerationPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  const [videoProvider, setVideoProvider] = useState('google-flow');
  const [selectedDuration, setSelectedDuration] = useState(8);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9');
  const [selectedUseCase, setSelectedUseCase] = useState(USE_CASES[0].id);
  const [promptDraft, setPromptDraft] = useState(USE_CASES[0].prompt);
  const [scenePrompt, setScenePrompt] = useState('');
  const [showFinalPrompt, setShowFinalPrompt] = useState(false);
  const [startFrame, setStartFrame] = useState(null);
  const [endFrame, setEndFrame] = useState(null);
  const [customSceneImage, setCustomSceneImage] = useState(null);
  const [sceneOptions, setSceneOptions] = useState([]);
  const [selectedScene, setSelectedScene] = useState(DEFAULT_SCENE_VALUE);
  const [showScenePicker, setShowScenePicker] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState('');
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadToDrive, setUploadToDrive] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState('');
  const [videoUploadStatuses, setVideoUploadStatuses] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [activeRecentSessionId, setActiveRecentSessionId] = useState('');
  const [selectedFlowId, setSelectedFlowId] = useState(null);

  const durationOptions = useMemo(() => DURATIONS[videoProvider] || DURATIONS['google-flow'], [videoProvider]);
  const currentScene = useMemo(() => sceneOptions.find((scene) => scene.value === selectedScene) || null, [sceneOptions, selectedScene]);
  const currentUseCase = useMemo(() => USE_CASES.find((item) => item.id === selectedUseCase) || USE_CASES[0], [selectedUseCase]);
  const currentUseCaseSummary = currentUseCase ? t(currentUseCase.summaryKey) : '';
  const lockedScenePreview = useMemo(() => getScenePreviewUrl(currentScene, selectedAspectRatio), [currentScene, selectedAspectRatio]);
  const effectiveScenePreview = customSceneImage?.preview || lockedScenePreview || null;
  const finalPrompt = useMemo(() => [
    `Create one ${selectedDuration}-second video in ${selectedAspectRatio}.`,
    'Use the first uploaded image as the START FRAME reference.',
    endFrame?.preview ? 'Use the second uploaded image as the END FRAME target and make the motion arrive there cleanly.' : 'No end frame is available.',
    effectiveScenePreview ? 'Treat the scene reference image as the environment anchor for lighting and composition.' : 'Keep the environment controlled and production-ready.',
    currentUseCase.prompt,
    scenePrompt ? `Scene notes: ${scenePrompt}` : '',
    promptDraft ? `User motion direction: ${promptDraft}` : '',
    videoProvider === 'google-flow'
      ? 'Optimize for Google Flow with coherent motion, stable geometry, and frame-to-frame continuity.'
      : 'Optimize for Grok with readable movement, stable identity, and a strong ending payoff.',
  ].filter(Boolean).join('\n\n'), [
    currentUseCase.prompt,
    effectiveScenePreview,
    endFrame?.preview,
    promptDraft,
    scenePrompt,
    selectedAspectRatio,
    selectedDuration,
    videoProvider,
  ]);

  const isReadyToGenerate = Boolean(startFrame?.preview && endFrame?.preview && promptDraft.trim());

  useEffect(() => {
    if (!durationOptions.includes(selectedDuration)) {
      setSelectedDuration(durationOptions[durationOptions.length - 1]);
    }
  }, [durationOptions, selectedDuration]);

  useEffect(() => {
    let ignore = false;
    const loadScenes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/prompt-options/scenes/lock-manager`);
        const payload = await response.json();
        if (ignore || !payload?.success) return;
        const scenes = payload.data || [];
        setSceneOptions(scenes);
        if (!scenes.length) return;
        const preferred = scenes.find((scene) => scene.value === DEFAULT_SCENE_VALUE) || scenes[0];
        setSelectedScene((current) => current || preferred.value);
        setScenePrompt((current) => current || getSceneLockedPrompt(preferred, i18n.language || 'en'));
      } catch (error) {
        console.warn('Failed to load scene options:', error.message);
      }
    };
    loadScenes();
    return () => { ignore = true; };
  }, [i18n.language]);

  useEffect(() => {
    let ignore = false;
    const hydrateInitialImage = async () => {
      const routeImage = location.state?.image;
      if (!routeImage) return;
      try {
        const preview = String(routeImage).startsWith('data:')
          ? routeImage
          : await fetchImageAsDataUrl(normalizeAssetUrl(routeImage));
        if (!ignore && preview) setStartFrame((current) => current || mediaState(preview, t('videoGeneration.start_frame_label')));
      } catch (error) {
        console.warn('Could not hydrate initial image:', error.message);
      }
    };
    hydrateInitialImage();
    return () => { ignore = true; };
  }, [location.state]);

  useEffect(() => {
    loadRecentSessions();
  }, []);

  const loadRecentSessions = async () => {
    setRecentLoading(true);
    try {
      const response = await getGenerationSessions({ page: 1, limit: 12, flowType: 'video-generation', status: 'completed' });
      setRecentSessions(response.data || []);
    } catch (error) {
      console.warn('Failed to load recent sessions:', error.message);
    } finally {
      setRecentLoading(false);
    }
  };

  const handleFileSelect = async (slot, file) => {
    if (!file) return;
    try {
      const preview = await readFileAsDataUrl(file);
      const payload = mediaState(preview, file.name);
      if (slot === 'start') setStartFrame(payload);
      if (slot === 'end') setEndFrame(payload);
      if (slot === 'scene') setCustomSceneImage(payload);
      setGenerated(false);
      setGeneratedVideos([]);
    } catch (error) {
      toast.error(error.message || t('videoGeneration.errors.read_file'));
    }
  };

  const handleGallerySelect = async (selectedItem) => {
    const item = Array.isArray(selectedItem) ? selectedItem[0] : selectedItem;
    const selectedUrl = item?.selectUrl || item?.url;
    if (!selectedUrl) {
      toast.error(t('videoGeneration.errors.gallery_missing_url'));
      return;
    }
    try {
      const preview = await fetchImageAsDataUrl(normalizeAssetUrl(selectedUrl));
      const payload = mediaState(preview, item?.name || t('videoGeneration.gallery_image'));
      if (galleryTarget === 'start') setStartFrame(payload);
      if (galleryTarget === 'end') setEndFrame(payload);
      if (galleryTarget === 'scene') setCustomSceneImage(payload);
      setGenerated(false);
      setGeneratedVideos([]);
      setShowGalleryPicker(false);
    } catch (error) {
      toast.error(error.message || t('videoGeneration.errors.gallery_load'));
    }
  };

  const hydrateFromSession = async (sessionId) => {
    setActiveRecentSessionId(sessionId);
    try {
      const response = await getGenerationSessionDetail(sessionId);
      const session = response.data || null;
      const request = session?.analysis?.videoRequest || {};
      if (!session) throw new Error(t('videoGeneration.errors.session_not_found'));

      setVideoProvider(request.provider || request.videoProvider || 'google-flow');
      setSelectedDuration(request.duration || 8);
      setSelectedAspectRatio(request.aspectRatio || '16:9');
      setSelectedUseCase(request.useCase || USE_CASES[0].id);
      setPromptDraft(request.promptDraft || request.prompt || USE_CASES[0].prompt);
      setScenePrompt(request.scenePrompt || request.sceneNotes || '');
      setSelectedScene(request.sceneId || DEFAULT_SCENE_VALUE);
      setStartFrame(mediaState(request.startFrame || request.sourceImage, t('videoGeneration.session_start_frame')));
      setEndFrame(mediaState(request.endFrame, t('videoGeneration.session_end_frame')));
      setCustomSceneImage(mediaState(request.sceneImage, t('videoGeneration.session_scene')));
      setSelectedFlowId(session.sessionId || sessionId);
      setVideoUploadStatuses({});
      setDriveUploadStatus('');

      const restoredVideos = (session.artifacts?.videoSegmentPaths || []).map((filePath, index) => ({
        segmentNum: index + 1,
        filename: filePath.split(/[\\/]/).pop() || `video-${index + 1}.mp4`,
        path: filePath,
        previewUrl: buildPreviewVideoUrl(filePath),
        url: buildDownloadVideoUrl(filePath),
        prompt: request.finalPrompt || request.promptDraft || '',
      }));
      setGeneratedVideos(restoredVideos);
      setGenerated(restoredVideos.length > 0);
      toast.success(t('videoGeneration.loaded_session', { id: sessionId }));
    } catch (error) {
      toast.error(error.message || t('videoGeneration.errors.load_session'));
    }
  };

  const uploadSingleVideo = async (video) => {
    setVideoUploadStatuses((current) => ({ ...current, [video.filename]: { status: 'uploading' } }));
    const videoUrl = video.url || buildDownloadVideoUrl(video.path);
    if (!videoUrl) throw new Error(t('videoGeneration.errors.missing_download_url', { filename: video.filename }));
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(t('videoGeneration.errors.fetch_failed', { filename: video.filename }));
    const blob = await response.blob();
    const file = new File([blob], video.filename, { type: 'video/mp4' });
    const uploadResponse = await driveAPI.uploadFile(file, {
      description: t('videoGeneration.drive_description'),
      metadata: { provider: videoProvider, duration: selectedDuration, sessionId: selectedFlowId || '' },
    });

    if (uploadResponse?.error?.includes('already exists') || uploadResponse?.message?.includes('duplicate')) {
      setVideoUploadStatuses((current) => ({ ...current, [video.filename]: { status: 'exists' } }));
      return;
    }

    setVideoUploadStatuses((current) => ({ ...current, [video.filename]: { status: 'success' } }));
  };

  const uploadAllVideos = async (videos = generatedVideos) => {
    if (!videos.length) return;
    setDriveUploadStatus(t('videoGeneration.drive_uploading'));
    try {
      for (const video of videos) {
        await uploadSingleVideo(video);
      }
      setDriveUploadStatus(t('videoGeneration.drive_uploaded_all'));
    } catch (error) {
      setDriveUploadStatus(error.message || t('videoGeneration.errors.upload_failed'));
      toast.error(error.message || t('videoGeneration.errors.upload_failed'));
    }
  };

  const handleGenerateVideo = async () => {
    if (!isReadyToGenerate) {
      toast.error(t('videoGeneration.errors.missing_inputs'));
      return;
    }

    setIsGenerating(true);
    setGenerated(false);
    setGeneratedVideos([]);
    setActiveRecentSessionId('');
    let flowId = null;

    try {
      const sessionResponse = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowType: 'video-generation', useCase: selectedUseCase }),
      });
      if (!sessionResponse.ok) throw new Error(`Session creation failed: ${sessionResponse.status}`);

      const sessionData = await sessionResponse.json();
      flowId = sessionData.data?.flowId || sessionData.data?.sessionId;
      setSelectedFlowId(flowId);

      const requestPayload = {
        provider: videoProvider,
        videoProvider,
        duration: selectedDuration,
        aspectRatio: selectedAspectRatio,
        useCase: selectedUseCase,
        sceneId: selectedScene,
        scenePrompt,
        promptDraft,
        finalPrompt,
        startFrame: startFrame?.preview || null,
        endFrame: endFrame?.preview || null,
        sceneImage: customSceneImage?.preview || lockedScenePreview || null,
        sourceImage: startFrame?.preview || null,
      };

      await captureGenerationSession(flowId, {
        flowType: 'video-generation',
        useCase: selectedUseCase,
        status: 'in-progress',
        analysis: { videoRequest: requestPayload },
        log: { category: 'video-generation', message: 'Video generation requested' },
      });

      const response = await browserAutomationAPI.generateVideo({
        duration: selectedDuration,
        scenario: selectedUseCase,
        aspectRatio: selectedAspectRatio,
        segments: [finalPrompt],
        sourceImage: startFrame?.preview || null,
        startFrameImage: startFrame?.preview || null,
        endFrameImage: endFrame?.preview || null,
        sceneImage: customSceneImage?.preview || lockedScenePreview || null,
        flowId,
        videoProvider,
        language: i18n.language || 'en',
      });

      const responseData = response?.data || {};
      const nextVideos = Array.isArray(responseData.generatedVideos)
        ? responseData.generatedVideos
        : Array.isArray(responseData.videoUrls)
          ? responseData.videoUrls.map((url, index) => ({
              segmentNum: index + 1,
              filename: `video-${index + 1}.mp4`,
              url,
              previewUrl: url,
              prompt: finalPrompt,
            }))
          : [];
      if (!nextVideos.length) throw new Error(t('videoGeneration.errors.no_output'));

      setGeneratedVideos(nextVideos);
      setGenerated(true);
      setActiveRecentSessionId(flowId);
      await captureGenerationSession(flowId, {
        flowType: 'video-generation',
        useCase: selectedUseCase,
        status: 'completed',
        artifacts: { videoSegmentPaths: nextVideos.map((video) => video.path || video.url).filter(Boolean) },
        analysis: { videoRequest: requestPayload },
        log: { category: 'video-generation', message: `Generated ${nextVideos.length} video output(s)` },
      });

      if (uploadToDrive) await uploadAllVideos(nextVideos);
      await loadRecentSessions();
      toast.success(t('videoGeneration.generated_count', { count: nextVideos.length }));
    } catch (error) {
      const fallbackMessage = t('videoGeneration.errors.generation_failed');
      const errorMessage = error.message || fallbackMessage;
      if (flowId) {
        await captureGenerationSession(flowId, {
          flowType: 'video-generation',
          useCase: selectedUseCase,
          error: { stage: 'video-generation', message: errorMessage },
          log: { level: 'error', category: 'video-generation', message: errorMessage },
        });
      }
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    const defaultScene = sceneOptions.find((scene) => scene.value === DEFAULT_SCENE_VALUE) || sceneOptions[0] || null;
    setSelectedUseCase(USE_CASES[0].id);
    setPromptDraft(USE_CASES[0].prompt);
    setScenePrompt(getSceneLockedPrompt(defaultScene, i18n.language || 'en'));
    setSelectedScene(DEFAULT_SCENE_VALUE);
    setStartFrame(null);
    setEndFrame(null);
    setCustomSceneImage(null);
    setGenerated(false);
    setGeneratedVideos([]);
    setVideoUploadStatuses({});
    setDriveUploadStatus('');
    setSelectedFlowId(null);
    setActiveRecentSessionId('');
    navigate('/video-generation', { replace: true });
  };

  return (
    <div className="image-generation-shell video-generation-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden text-[13px] text-white lg:-mx-6 lg:-mb-6 lg:-mt-6" data-main-body>
      <PageHeaderBar
        icon={<Film className="h-4 w-4 text-sky-300" />}
        title={t('videoGeneration.title')}
        subtitle={t('videoGeneration.subtitle')}
        meta={`${PROVIDERS.find((item) => item.id === videoProvider)?.label || videoProvider} | ${selectedDuration}s | ${selectedAspectRatio}`}
        className="h-16"
        actions={(
          <>
            <div className="video-generation-header-note hidden items-center text-xs text-slate-400 xl:flex">
              {t('videoGeneration.header_hint')}
            </div>
            <button type="button" onClick={handleReset} className="apple-option-chip rounded-xl px-3 py-1.5 text-xs font-medium transition">
              {t('videoGeneration.reset')}
            </button>
          </>
        )}
      />

      <div className="video-generation-workspace min-h-0 overflow-hidden px-3 py-3">
        <div className="video-generation-grid grid h-full min-h-0 gap-3">
          <aside className="video-generation-sidebar min-h-0 overflow-y-auto space-y-2.5">
            <section className={`${PANEL_CLASS} video-control-strip`}>
              <div className="video-control-row">
                <span className="video-control-label" title={t('videoGeneration.provider')}>AI</span>
                <div className="video-control-options video-control-options-dual">
                  {PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      title={provider.description}
                      onClick={() => setVideoProvider(provider.id)}
                      className={`${CONTROL_CHIP_CLASS} apple-option-chip-${provider.accent} ${videoProvider === provider.id ? 'apple-option-chip-selected' : 'text-slate-300'}`}
                    >
                      {provider.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="video-control-row">
                <span className="video-control-label" title={t('videoGeneration.duration')}>{t('videoGeneration.seconds_short')}</span>
                <div className="video-control-options video-control-options-dual">
                  {durationOptions.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setSelectedDuration(duration)}
                      className={`${CONTROL_CHIP_CLASS} apple-option-chip-cool ${selectedDuration === duration ? 'apple-option-chip-selected' : 'text-slate-300'}`}
                    >
                      {duration}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="video-control-row video-control-row-aspect" title={t('videoGeneration.aspect_ratio')}>
                <div className="video-control-options video-control-options-dual">
                  {ASPECTS.map((aspect) => (
                    <button
                      key={aspect.id}
                      type="button"
                      title={t(aspect.metaKey)}
                      onClick={() => setSelectedAspectRatio(aspect.id)}
                      className={`${CONTROL_CHIP_CLASS} apple-option-chip-violet ${selectedAspectRatio === aspect.id ? 'apple-option-chip-selected' : 'text-slate-300'}`}
                    >
                      {aspect.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className={`${PANEL_CLASS} space-y-2`}>
              <div className="video-panel-head">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t('videoGeneration.template')}</p>
                <span className="apple-field-pill apple-field-pill-optional">4</span>
              </div>

              <div className="space-y-2">
                {USE_CASES.map((useCase) => (
                  <button
                    key={useCase.id}
                    type="button"
                    title={t(useCase.summaryKey)}
                    onClick={() => {
                      setSelectedUseCase(useCase.id);
                      setPromptDraft(useCase.prompt);
                    }}
                    className={`video-template-chip apple-option-chip apple-option-chip-warm w-full rounded-[1.05rem] border px-3 py-3 text-left transition ${selectedUseCase === useCase.id ? 'apple-option-chip-selected' : 'text-slate-300'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">{t(useCase.labelKey)}</p>
                      <Wand2 className="h-4 w-4 text-amber-300" />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <input ref={startInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleFileSelect('start', event.target.files?.[0]); event.target.value = ''; }} />
            <input ref={endInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleFileSelect('end', event.target.files?.[0]); event.target.value = ''; }} />
          </aside>

          <main className="video-generation-center video-gen-main-panel min-h-0 overflow-hidden">
            <div className="video-generation-main-scroll flex h-full min-h-0 flex-col overflow-y-auto">
              <div className="video-generation-top-grid grid gap-3">
                <MediaCard
                  title={t('videoGeneration.start_frame')}
                  value={startFrame}
                  required
                  onBrowse={() => startInputRef.current?.click()}
                  onGallery={() => { setGalleryTarget('start'); setShowGalleryPicker(true); }}
                  onClear={() => setStartFrame(null)}
                  galleryLabel={t('videoGeneration.gallery')}
                  emptyLabel={t('videoGeneration.start')}
                />
                <MediaCard
                  title={t('videoGeneration.end_frame')}
                  value={endFrame}
                  required
                  onBrowse={() => endInputRef.current?.click()}
                  onGallery={() => { setGalleryTarget('end'); setShowGalleryPicker(true); }}
                  onClear={() => setEndFrame(null)}
                  galleryLabel={t('videoGeneration.gallery')}
                  emptyLabel={t('videoGeneration.end')}
                />
                <div className={`${SUB_PANEL_CLASS} video-media-card space-y-3`} title={getSceneLockedPrompt(currentScene, i18n.language || 'en') || t('videoGeneration.scene_optional')}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-100">{t('videoGeneration.scene')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScenePicker(true)}
                    className="video-media-preview group relative mx-auto w-full overflow-hidden rounded-[1.05rem] border border-dashed border-white/14 bg-slate-950/50 transition hover:border-sky-300/35 hover:bg-slate-900/60"
                  >
                    {effectiveScenePreview ? (
                      <div className="absolute inset-0 p-3">
                        <img src={effectiveScenePreview} alt={t('videoGeneration.scene_reference_alt')} className="h-full w-full rounded-[0.95rem] object-contain" />
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-200">
                          <Upload className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium text-slate-100">{t('videoGeneration.scene')}</p>
                        <p className="mt-1 text-xs text-slate-500">{t('common.optional')}</p>
                      </div>
                    )}
                  </button>
                  <div className="grid grid-cols-[minmax(0,1fr),minmax(0,1.35fr)] gap-2">
                    <button type="button" onClick={() => { setGalleryTarget('scene'); setShowGalleryPicker(true); }} className="apple-option-chip rounded-xl px-3 py-2 text-xs font-medium transition">
                      {t('videoGeneration.gallery')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScenePicker(true)}
                      title={currentScene?.label || t('videoGeneration.pick_scene')}
                      className="apple-option-chip rounded-xl px-3 py-2 text-xs font-medium transition"
                    >
                      <span className="block truncate">{currentScene?.label || t('videoGeneration.pick_scene')}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="video-generation-bottom-grid mt-3 grid min-h-0 gap-3">
                <div className="video-generation-prompt-stack grid min-h-0 gap-3">
                  <section className={`${PANEL_CLASS} space-y-3`}>
                    <div className="video-panel-head">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t('videoGeneration.prompt')}</p>
                      <span className="apple-field-pill apple-field-pill-required">{t('common.required')}</span>
                    </div>

                    <textarea
                      value={promptDraft}
                      onChange={(event) => setPromptDraft(event.target.value)}
                      placeholder={t('videoGeneration.prompt_placeholder')}
                      className={`${TEXTAREA_CLASS} apple-prompt-text min-h-[148px]`}
                      rows={6}
                    />
                  </section>

                  <section className={`${PANEL_CLASS} space-y-3`}>
                    <div className="video-panel-head">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t('videoGeneration.final_prompt')}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title={t('videoGeneration.copy_final_prompt')}
                          aria-label={t('videoGeneration.copy_final_prompt')}
                          onClick={async () => {
                            await navigator.clipboard.writeText(finalPrompt);
                            toast.success(t('videoGeneration.final_prompt_copied'));
                          }}
                          className="video-icon-button apple-option-chip rounded-xl px-2.5 py-2 text-xs font-medium transition"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title={showFinalPrompt ? t('videoGeneration.hide_final_prompt') : t('videoGeneration.show_final_prompt')}
                          aria-label={showFinalPrompt ? t('videoGeneration.hide_final_prompt') : t('videoGeneration.show_final_prompt')}
                          onClick={() => setShowFinalPrompt((current) => !current)}
                          className="video-icon-button apple-option-chip rounded-xl px-2.5 py-2 text-xs font-medium transition"
                        >
                          {showFinalPrompt ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {showFinalPrompt ? (
                      <pre className="apple-prompt-text overflow-x-auto whitespace-pre-wrap rounded-[1.1rem] border border-white/8 bg-slate-950/55 px-4 py-4 text-[12px] leading-6 text-slate-200">
                        {finalPrompt}
                      </pre>
                    ) : null}
                  </section>
                </div>

                <section className={`${PANEL_CLASS} space-y-3`}>
                  <div className="video-panel-head">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t('videoGeneration.output')}</p>
                    {generated ? <span className="apple-field-pill apple-field-pill-optional">{t('videoGeneration.latest_ready')}</span> : null}
                  </div>

                  {!generatedVideos.length ? (
                    <div className="studio-card-shell video-result-panel flex min-h-[220px] flex-col items-center justify-center rounded-[1.2rem] border border-dashed border-white/10 px-6 text-center">
                      <Film className="h-8 w-8 text-slate-500" />
                      <p className="mt-3 text-sm font-semibold text-slate-200">{t('videoGeneration.no_video_yet')}</p>
                      <p className="mt-1 text-xs text-slate-500">{t('videoGeneration.no_video_hint')}</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 xl:grid-cols-2">
                      {generatedVideos.map((video, index) => {
                        const previewUrl = video.previewUrl || buildPreviewVideoUrl(video.path) || video.url;
                        const downloadUrl = video.url || buildDownloadVideoUrl(video.path);
                        const uploadState = videoUploadStatuses[video.filename]?.status || '';

                        return (
                          <article key={`${video.filename}-${index}`} className="studio-card-shell video-result-card overflow-hidden rounded-[1.2rem]">
                            <div className="aspect-video overflow-hidden bg-slate-950/70">
                              {previewUrl ? (
                                <video src={previewUrl} controls className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-slate-500">{t('videoGeneration.preview_unavailable')}</div>
                              )}
                            </div>
                            <div className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-100">{video.filename || `video-${index + 1}.mp4`}</p>
                                  <p className="mt-1 text-xs text-slate-400">{video.prompt || currentUseCaseSummary}</p>
                                </div>
                                {uploadState ? (
                                  <span className={`apple-field-pill ${uploadState === 'success' || uploadState === 'exists' ? 'apple-field-pill-optional' : 'apple-field-pill-required'}`}>
                                    {uploadState}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {downloadUrl ? (
                                  <a href={downloadUrl} className="apple-option-chip rounded-xl px-3 py-2 text-xs font-medium transition">
                                    <span className="inline-flex items-center gap-2">
                                      <Download className="h-3.5 w-3.5" />
                                      {t('videoGeneration.download')}
                                    </span>
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => uploadSingleVideo({ ...video, url: downloadUrl })}
                                  className="apple-option-chip rounded-xl px-3 py-2 text-xs font-medium transition"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Upload className="h-3.5 w-3.5" />
                                    {t('videoGeneration.drive')}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </main>

          <aside className="video-generation-recent min-h-0 overflow-y-auto pr-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 pr-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t('videoGeneration.recent')}</p>
                <button type="button" onClick={loadRecentSessions} className="apple-option-chip rounded-xl px-2.5 py-2 text-xs font-medium transition" title={t('videoGeneration.refresh_recent')}>
                  <RefreshCw className={`h-3.5 w-3.5 ${recentLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {!recentSessions.length ? (
                <div className="px-1 text-[11px] text-slate-500">
                  {recentLoading ? t('videoGeneration.loading') : t('videoGeneration.no_sessions')}
                </div>
              ) : (
                recentSessions.map((session) => {
                  const sessionId = session.sessionId || session._id;
                  const request = session.analysis?.videoRequest || {};
                  const isActive = activeRecentSessionId === sessionId;
                  const previewPath = session.artifacts?.videoSegmentPaths?.[0] || '';
                  const previewUrl = previewPath ? buildPreviewVideoUrl(previewPath) : '';
                  const previewImage = request.startFrame || request.sourceImage || request.sceneImage || '';

                  return (
                    <button
                      key={sessionId}
                      type="button"
                      onClick={() => hydrateFromSession(sessionId)}
                      className={`video-recent-item w-full text-left transition ${isActive ? 'video-recent-item-active' : ''}`}
                      title={`${USE_CASES.find((item) => item.id === request.useCase) ? t(USE_CASES.find((item) => item.id === request.useCase).labelKey) : t('videoGeneration.session')} • ${formatDate(session.updatedAt || session.createdAt, i18n.language || undefined, t)}`}
                    >
                      <div className="video-recent-thumb overflow-hidden rounded-[1rem] border border-white/10 bg-slate-950/45">
                        {previewUrl ? (
                          <video src={previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        ) : previewImage ? (
                          <img src={previewImage} alt={t('videoGeneration.recent_session_alt')} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-slate-500">{t('videoGeneration.empty')}</div>
                        )}
                      </div>
                      <p className="mt-1.5 px-1 text-[11px] text-slate-400">{formatRelativeTime(session.updatedAt || session.createdAt, t)}</p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>

      <div className="video-generation-footer px-0 pb-0">
        <div className="video-generation-footer-bar px-2 py-1.5">
          <div className="grid h-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className={`${STATUS_BANNER_CLASS} video-status-banner ${isReadyToGenerate ? 'video-status-banner-success text-emerald-200' : 'video-status-banner-warning text-amber-200'}`}>
                {isReadyToGenerate ? t('videoGeneration.ready') : t('videoGeneration.frames_prompt_needed')}
              </div>
              {driveUploadStatus ? (
                <div className={`${STATUS_BANNER_CLASS} video-status-banner text-slate-200`}>
                  {driveUploadStatus}
                </div>
              ) : null}
              <label className="apple-option-chip inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition">
                <input
                  type="checkbox"
                  checked={uploadToDrive}
                  onChange={(event) => setUploadToDrive(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-transparent"
                />
                {t('videoGeneration.drive_auto_upload')}
              </label>
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={!isReadyToGenerate || isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-sky-300/28 bg-[linear-gradient(180deg,rgba(56,189,248,0.24),rgba(14,165,233,0.16))] px-4 py-3 text-sm font-semibold text-sky-50 shadow-[0_14px_30px_rgba(8,47,73,0.24)] transition hover:border-sky-200/36 hover:bg-[linear-gradient(180deg,rgba(56,189,248,0.3),rgba(14,165,233,0.2))] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {isGenerating ? t('videoGeneration.generating') : t('videoGeneration.generate')}
              </button>
            </div>
            <div />
          </div>
        </div>
      </div>

      <GalleryPicker
        isOpen={showGalleryPicker}
        onClose={() => {
          setShowGalleryPicker(false);
          setGalleryTarget('');
        }}
        onSelect={handleGallerySelect}
        assetType="image"
        title={galleryTarget === 'scene' ? t('videoGeneration.select_scene_image') : galleryTarget === 'end' ? t('videoGeneration.select_end_frame') : t('videoGeneration.select_start_frame')}
      />

      <ScenePickerModal
        isOpen={showScenePicker}
        onClose={() => setShowScenePicker(false)}
        scenes={sceneOptions}
        selectedScene={selectedScene}
        language={i18n.language || 'en'}
        aspectRatio={selectedAspectRatio}
        onSelect={(value, scene) => {
          setSelectedScene(value);
          setScenePrompt(getSceneLockedPrompt(scene, i18n.language || 'en'));
        }}
      />
    </div>
  );
}

