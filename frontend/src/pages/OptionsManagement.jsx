import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Lock, RefreshCw, Wand2, Sparkles, Image, Save, Check,
  Settings, Loader2, AlertCircle, ImagePlus, Layers, ChevronRight, ChevronLeft, X, Trash2
} from 'lucide-react';
import PageHeaderBar from '../components/PageHeaderBar';
import ModalPortal from '../components/ModalPortal';
import { getAuthHeaders } from '../services/authHeaders';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getImageUrl(url) {
  if (!url) return null;
  const appHost = API_BASE_URL.replace('/api', '');
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('/api/v1/browser-automation/generated-image/')) {
      const filename = decodeURIComponent(url.split('/api/v1/browser-automation/generated-image/').pop() || '');
      return `${appHost}/api/v1/browser-automation/generated-image/${encodeURIComponent(filename)}`;
    }
    return url;
  }
  if (url.startsWith('/api/')) {
    return `${appHost}${url}`;
  }
  const tempMatch = url.match(/[\/\\]temp[\/\\](.+)/i);
  if (tempMatch) {
    return `${appHost}/temp/${tempMatch[1].replace(/\\/g, '/')}`;
  }
  if (/[.](png|jpe?g|webp|gif)$/i.test(url) && !url.includes('/')) {
    return `${appHost}/api/v1/browser-automation/generated-image/${encodeURIComponent(url)}`;
  }
  return url;
}

const SCENE_LOCK_ASPECTS = ['16:9', '9:16'];

function normalizeSceneLockedImageUrls(scene = {}) {
  const fromScene = scene?.sceneLockedImageUrls || {};
  const history = Array.isArray(scene?.sceneLockedImageHistory) ? scene.sceneLockedImageHistory : [];
  const first16 = history.find((item) => item && item.aspectRatio === '16:9');
  const first9 = history.find((item) => item && item.aspectRatio === '9:16');
  return {
    '16:9': fromScene['16:9'] || first16?.url || null,
    '9:16': fromScene['9:16'] || scene.sceneLockedImageUrl || first9?.url || null
  };
}

function normalizeSceneLockedImageHistory(scene = {}) {
  const history = Array.isArray(scene?.sceneLockedImageHistory) ? scene.sceneLockedImageHistory : [];
  return history
    .filter((item) => item && item.url)
    .map((item) => ({
      url: item.url,
      aspectRatio: SCENE_LOCK_ASPECTS.includes(item.aspectRatio) ? item.aspectRatio : '9:16',
      createdAt: item.createdAt || null
    }));
}

/**
 * Scene Card for Sidebar
 */
function SceneSidebarCard({ scene, isSelected, onClick }) {
  const { t } = useTranslation();
  const lockedImageUrls = normalizeSceneLockedImageUrls(scene);
  const latestHistoryUrl = Array.isArray(scene?.sceneLockedImageHistory)
    ? (scene.sceneLockedImageHistory[0]?.url || null) : null;
  const lockedImageUrl = getImageUrl(lockedImageUrls['9:16'] || lockedImageUrls['16:9'] || latestHistoryUrl);
  const lockedThumbUrl = lockedImageUrl
    ? `${lockedImageUrl}${lockedImageUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(scene.updatedAt || '')}`
    : null;
  const hasPrompt = scene.sceneLockedPrompt || scene.promptSuggestion;
  const sampleCount = (scene.sceneLockSamples || []).length;

  return (
    <button
      onClick={onClick}
      className={`group flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
        isSelected 
          ? 'bg-indigo-500/20 ring-1 ring-indigo-400/40' 
          : 'bg-white/[0.03] hover:bg-white/[0.05]'
      }`}
    >
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
        {lockedThumbUrl ? (
          <img 
            src={lockedThumbUrl} 
            alt={scene.label}
            className="h-full w-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900">
            <Layers size={20} className="text-slate-500" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-100' : 'text-slate-300'}`}>
            {scene.label}
          </span>
          {scene.useSceneLock !== false && (
            <Lock size={11} className="flex-shrink-0 text-emerald-400" />
          )}
        </div>
        <span className="text-[0.7rem] text-slate-500 font-mono block truncate">
          {scene.value}
        </span>
        <div className="flex gap-1 mt-1.5">
          {hasPrompt && (
            <span className="inline-block rounded px-1.5 py-0.5 bg-indigo-500/20 text-[0.65rem] text-indigo-200 font-medium">
              {t('optionsManagement.hasPrompt', 'Prompt')}
            </span>
          )}
          {sampleCount > 0 && (
            <span className="inline-block rounded px-1.5 py-0.5 bg-emerald-500/15 text-[0.65rem] text-emerald-200 font-medium">
              {sampleCount} {t('optionsManagement.images', sampleCount === 1 ? 'image' : 'images')}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={16} className={`flex-shrink-0 mt-0.5 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
    </button>
  );
}

/**
 * Scene Detail Editor
 */
function SceneDetailEditor({ scene, onRefresh }) {
  const { t, i18n } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [promptSuggestion, setPromptSuggestion] = useState(scene.promptSuggestion || '');
  const [sceneLockedPrompt, setSceneLockedPrompt] = useState(scene.sceneLockedPrompt || '');
  const [useSceneLock, setUseSceneLock] = useState(scene.useSceneLock !== false);
  const [styleDirection, setStyleDirection] = useState('');
  const [improvementNotes, setImprovementNotes] = useState('');
  const [imageCount, setImageCount] = useState(2);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [technicalDetails, setTechnicalDetails] = useState(JSON.stringify(scene.technicalDetails || {}, null, 2));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewIndexByAspect, setPreviewIndexByAspect] = useState({ '16:9': 0, '9:16': 0 });
  const [lockedHistoryIndexByAspect, setLockedHistoryIndexByAspect] = useState({ '16:9': 0, '9:16': 0 });
  const [previewRenderKey, setPreviewRenderKey] = useState(0);
  const [modalImageUrl, setModalImageUrl] = useState(null);

  useEffect(() => {
    setPromptSuggestion(scene.promptSuggestion || '');
    setSceneLockedPrompt(scene.sceneLockedPrompt || '');
    setUseSceneLock(scene.useSceneLock !== false);
    setTechnicalDetails(JSON.stringify(scene.technicalDetails || {}, null, 2));
    setPreviewIndexByAspect({ '16:9': 0, '9:16': 0 });
    setLockedHistoryIndexByAspect({ '16:9': 0, '9:16': 0 });
    setPreviewRenderKey((prev) => prev + 1);
    setModalImageUrl(null);
  }, [scene._id || scene.value]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const callGeneratePrompt = async (mode) => {
    setGeneratingPrompt(true);
    clearMessages();
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-options/scenes/${scene.value}/generate-lock-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ mode, styleDirection, improvementNotes })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || t('optionsManagement.promptGenerateFailed', 'Failed to generate prompt'));
      setPromptSuggestion(data.data.promptSuggestion || '');
      setSceneLockedPrompt(data.data.sceneLockedPrompt || '');
      setTechnicalDetails(JSON.stringify(data.data.technicalDetails || {}, null, 2));
      showSuccess(t('optionsManagement.promptGenerated', 'Prompt generated successfully'));
      await onRefresh();
    } catch (err) {
      showError(err.message);
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const callGenerateImages = async () => {
    setGeneratingImages(true);
    clearMessages();
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-options/scenes/${scene.value}/generate-lock-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          imageCount,
          aspectRatio,
          prompt: sceneLockedPrompt || promptSuggestion,
          language: i18n.language || 'en'
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || t('optionsManagement.imageGenerateFailed', 'Failed to generate images'));
      showSuccess(t('optionsManagement.imagesGenerated', 'Images generated successfully'));
      setPreviewIndexByAspect((prev) => ({ ...prev, [aspectRatio]: 0 }));
      await onRefresh();
      setPreviewRenderKey((prev) => prev + 1);
    } catch (err) {
      showError(err.message);
    } finally {
      setGeneratingImages(false);
    }
  };

  const saveAssets = async () => {
    setSaving(true);
    clearMessages();
    try {
      let technical = {};
      try {
        technical = technicalDetails ? JSON.parse(technicalDetails) : {};
      } catch {
        throw new Error(t('optionsManagement.invalidJson', 'Technical Details must be valid JSON'));
      }
      const response = await fetch(`${API_BASE_URL}/prompt-options/${scene.category}/${scene.value}/prompt-assets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          promptSuggestion,
          sceneLockedPrompt,
          useSceneLock,
          technicalDetails: technical
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || t('optionsManagement.saveFailed', 'Failed to save settings'));
      showSuccess(t('optionsManagement.saved', 'Saved successfully'));
      await onRefresh();
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const chooseDefaultImage = async (imageUrl, aspectRatio) => {
    clearMessages();
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-options/scenes/${scene.value}/select-lock-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ imageUrl, aspectRatio })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || t('optionsManagement.lockFailed', 'Failed to lock image'));
      showSuccess(t('optionsManagement.imageLocked', 'Image locked as default'));
      await onRefresh();
    } catch (err) {
      showError(err.message);
    }
  };

  const deleteLockedImage = async (imageUrl) => {
    clearMessages();
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-options/scenes/${scene.value}/locked-images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ imageUrl })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || t('optionsManagement.deleteLockedFailed', 'Failed to delete locked image'));
      showSuccess(t('optionsManagement.imageDeleted', 'Deleted locked image'));
      await onRefresh();
    } catch (err) {
      showError(err.message);
    }
  };

  const moveSlider = (setter, aspect, total, direction) => {
    if (total <= 1) return;
    setter((prev) => {
      const current = prev[aspect] || 0;
      const next = (current + direction + total) % total;
      return { ...prev, [aspect]: next };
    });
  };

  const samples = scene.sceneLockSamples || [];
  const lockedImageUrls = normalizeSceneLockedImageUrls(scene);
  const lockedHistory = normalizeSceneLockedImageHistory(scene);
  const sampleGroups = {
    '16:9': samples.filter((sample) => (sample.aspectRatio || '1:1') === '16:9'),
    '9:16': samples.filter((sample) => (sample.aspectRatio || '1:1') === '9:16')
  };
  const historyGroups = {
    '16:9': lockedHistory.filter((item) => item.aspectRatio === '16:9'),
    '9:16': lockedHistory.filter((item) => item.aspectRatio === '9:16')
  };
  const activeAspect = SCENE_LOCK_ASPECTS.includes(aspectRatio) ? aspectRatio : '9:16';

  return (
    <div className="studio-card-shell flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-white/10 p-5 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/10">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white mb-1">{scene.label}</h2>
          <p className="text-xs text-slate-400 font-mono mb-2">{scene.value}</p>
          {scene.description && (
            <p className="text-sm text-slate-400">{scene.description}</p>
          )}
        </div>
        <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${
          useSceneLock ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30' : 'bg-slate-500/15 text-slate-300'
        }`}>
          <input 
            type="checkbox" 
            checked={useSceneLock} 
            onChange={(e) => setUseSceneLock(e.target.checked)}
            className="accent-emerald-500"
          />
          <Lock size={16} />
          {t('optionsManagement.useSceneLock', 'Use Scene Lock')}
        </label>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={18} className="flex-shrink-0 text-red-400 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 flex items-start gap-3">
          <Check size={18} className="flex-shrink-0 text-emerald-400 mt-0.5" />
          <p className="text-sm text-emerald-200">{success}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-2">
        {/* Prompt Section */}
        <div className="studio-accent-panel rounded-xl border border-white/10 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">{t('optionsManagement.prompts', 'Prompts')}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                {t('optionsManagement.promptSuggestion', 'Fallback')}
              </label>
              <textarea 
                className="w-full h-24 bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-400/50 focus:outline-none resize-none"
                value={promptSuggestion} 
                onChange={(e) => setPromptSuggestion(e.target.value)}
                placeholder={t('optionsManagement.promptPlaceholder', 'Enter fallback prompt...')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                {t('optionsManagement.sceneLockedPrompt', 'Canonical')}
              </label>
              <textarea 
                className="w-full h-24 bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-400/50 focus:outline-none resize-none"
                value={sceneLockedPrompt} 
                onChange={(e) => setSceneLockedPrompt(e.target.value)}
                placeholder={t('optionsManagement.lockedPromptPlaceholder', 'Enter canonical scene prompt...')}
              />
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="studio-accent-panel rounded-xl border border-white/10 p-4 space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
            {t('optionsManagement.technicalDetails', 'Technical Details')}
          </label>
          <textarea 
            className="w-full h-24 bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-indigo-200 font-mono placeholder-slate-600 focus:border-indigo-400/50 focus:outline-none resize-none"
            value={technicalDetails} 
            onChange={(e) => setTechnicalDetails(e.target.value)}
          />
        </div>

        {/* Enhancement */}
        <div className="studio-accent-panel rounded-xl border border-white/10 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">{t('optionsManagement.enhancement', 'Enhancement')}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            <input 
              className="bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-400/50 focus:outline-none"
              placeholder={t('optionsManagement.stylePlaceholder', 'Style direction...')}
              value={styleDirection} 
              onChange={(e) => setStyleDirection(e.target.value)} 
            />
            <input 
              className="bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-400/50 focus:outline-none"
              placeholder={t('optionsManagement.notesPlaceholder', 'Improvement notes...')}
              value={improvementNotes} 
              onChange={(e) => setImprovementNotes(e.target.value)} 
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button 
            disabled={generatingPrompt} 
            onClick={() => callGeneratePrompt('create')} 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm disabled:opacity-50 transition"
          >
            {generatingPrompt ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {generatingPrompt ? t('optionsManagement.generating', 'Generating...') : t('optionsManagement.generatePrompt', 'Generate')}
          </button>
          <button 
            disabled={generatingPrompt} 
            onClick={() => callGeneratePrompt('enhance')} 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm disabled:opacity-50 transition"
          >
            {generatingPrompt ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generatingPrompt ? t('optionsManagement.enhancing', 'Enhancing...') : t('optionsManagement.enhancePrompt', 'Enhance')}
          </button>
          <button 
            disabled={saving} 
            onClick={saveAssets} 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm disabled:opacity-50 transition ml-auto"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? t('optionsManagement.saving', 'Saving...') : t('optionsManagement.saveSettings', 'Save')}
          </button>
        </div>

        {/* Image Generation */}
        <div className="studio-accent-panel rounded-xl border border-white/10 p-4 space-y-3">
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-sm font-semibold text-white">{t('optionsManagement.generatePreviews', 'Generate Previews')}</span>
            <select 
              value={imageCount} 
              onChange={(e) => setImageCount(Number(e.target.value))} 
              className="bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} {t('optionsManagement.images', n === 1 ? 'image' : 'images')}</option>
              ))}
            </select>
            <select 
              value={aspectRatio} 
              onChange={(e) => setAspectRatio(e.target.value)} 
              className="bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300"
            >
              {SCENE_LOCK_ASPECTS.map((ratio) => (
                <option key={ratio} value={ratio}>{ratio}</option>
              ))}
            </select>
            <button 
              disabled={generatingImages} 
              onClick={callGenerateImages} 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs disabled:opacity-50 transition ml-auto"
            >
              {generatingImages ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {generatingImages ? t('optionsManagement.generating', 'Generating...') : t('optionsManagement.generate', 'Generate')}
            </button>
          </div>
        </div>

        {/* Locked Images Preview */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Lock size={14} className="text-emerald-400" />
            {t('optionsManagement.currentLockedImage', 'Locked Images')}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {SCENE_LOCK_ASPECTS.map((ratio) => {
              const ratioImageUrl = getImageUrl(lockedImageUrls[ratio]);
              return (
                <div key={ratio} className="studio-accent-panel rounded-lg border border-white/10 p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-300">{ratio}</p>
                  {ratioImageUrl ? (
                    <img
                      src={ratioImageUrl}
                      alt={t('optionsManagement.lockedAlt', `Locked ${ratio}`)}
                      onClick={() => setModalImageUrl(ratioImageUrl)}
                      className="w-full h-40 object-contain rounded-lg cursor-zoom-in bg-slate-950"
                    />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center bg-slate-950/50 rounded-lg text-xs text-slate-500">
                      {t('optionsManagement.noLockedImage', 'No locked image')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Saved History */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">
            {t('optionsManagement.savedLockedImages', 'History')}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {SCENE_LOCK_ASPECTS.map((ratio) => {
              const ratioHistory = historyGroups[ratio] || [];
              const idx = Math.min(lockedHistoryIndexByAspect[ratio] || 0, Math.max(ratioHistory.length - 1, 0));
              const current = ratioHistory[idx];
              const currentUrl = current ? getImageUrl(current.url) : null;
              return (
                <div key={`saved-${ratio}`} className="studio-accent-panel rounded-lg border border-white/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-300">{ratio}</p>
                    <span className="text-xs text-slate-500">{ratioHistory.length}</span>
                  </div>
                  {currentUrl ? (
                    <div className="space-y-2">
                      <img
                        src={currentUrl}
                        alt={`Saved ${ratio}`}
                        onClick={() => setModalImageUrl(currentUrl)}
                        className="w-full h-40 object-contain rounded-lg cursor-zoom-in bg-slate-950"
                      />
                      <div className="flex items-center justify-between gap-1">
                        <button
                          onClick={() => moveSlider(setLockedHistoryIndexByAspect, ratio, ratioHistory.length, -1)}
                          disabled={ratioHistory.length <= 1}
                          className="p-1 rounded bg-slate-700/50 hover:bg-slate-600 disabled:opacity-50 text-slate-300"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs text-slate-400 flex-1 text-center">{idx + 1}/{ratioHistory.length}</span>
                        <button
                          onClick={() => moveSlider(setLockedHistoryIndexByAspect, ratio, ratioHistory.length, 1)}
                          disabled={ratioHistory.length <= 1}
                          className="p-1 rounded bg-slate-700/50 hover:bg-slate-600 disabled:opacity-50 text-slate-300"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <button
                          onClick={() => deleteLockedImage(current.url)}
                          className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">{t('optionsManagement.noLockedHistoryForAspect', 'No history')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview Candidates */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">
            {t('optionsManagement.previewCandidates', 'Preview Candidates')}
          </h3>
          <div key={`preview-${activeAspect}-${previewRenderKey}`} className="studio-accent-panel rounded-lg border border-white/10 p-3 space-y-2">
            {(() => {
              const ratio = activeAspect;
              const ratioSamples = sampleGroups[ratio] || [];
              const idx = Math.min(previewIndexByAspect[ratio] || 0, Math.max(ratioSamples.length - 1, 0));
              const sample = ratioSamples[idx];
              const sampleUrl = sample ? getImageUrl(sample.url) : null;
              const isAspectLocked = sample ? lockedImageUrls[ratio] === sample.url : false;
              return (
                <>
                  <p className="text-xs font-semibold text-slate-300">{ratio}</p>
                  {!sampleUrl ? (
                    <p className="text-xs text-slate-500 text-center py-4">{t('optionsManagement.noSamplesForAspect', 'No samples')}</p>
                  ) : (
                    <div className="space-y-2">
                      <img
                        src={sampleUrl}
                        alt={`Preview ${ratio}`}
                        onClick={() => setModalImageUrl(sampleUrl)}
                        className="w-full h-40 object-contain rounded-lg cursor-zoom-in bg-slate-950"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => moveSlider(setPreviewIndexByAspect, ratio, ratioSamples.length, -1)}
                          disabled={ratioSamples.length <= 1}
                          className="p-1 rounded bg-slate-700/50 hover:bg-slate-600 disabled:opacity-50 text-slate-300"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs text-slate-400">{idx + 1}/{ratioSamples.length}</span>
                        <button
                          onClick={() => moveSlider(setPreviewIndexByAspect, ratio, ratioSamples.length, 1)}
                          disabled={ratioSamples.length <= 1}
                          className="p-1 rounded bg-slate-700/50 hover:bg-slate-600 disabled:opacity-50 text-slate-300"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <button
                          onClick={() => chooseDefaultImage(sample.url, ratio)}
                          className={`ml-auto px-3 py-1 rounded text-xs font-medium transition ${
                            isAspectLocked 
                              ? 'bg-emerald-500/20 text-emerald-200' 
                              : 'bg-slate-700/50 hover:bg-slate-600 text-slate-300'
                          }`}
                        >
                          {isAspectLocked ? 'âœ“ Locked' : 'Select'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {modalImageUrl && (
        <ModalPortal>
          <div
          onClick={() => setModalImageUrl(null)}
          className="fixed inset-0 app-layer-modal flex items-center justify-center bg-black/80 p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setModalImageUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-900/75 hover:bg-slate-800 text-white"
            >
              <X size={20} />
            </button>
            <img src={modalImageUrl} alt={t('optionsManagement.previewFullscreen', 'Preview fullscreen')} className="max-w-full max-h-[90vh] rounded-lg" onClick={(e) => e.stopPropagation()} />
          </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

/**
 * Main Export
 */
export default function OptionsManagement() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [scenes, setScenes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSceneValue, setSelectedSceneValue] = useState(null);

  const loadScenes = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-options/scenes/lock-manager`, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || t('optionsManagement.loadScenesFailed', 'Failed to load scenes'));
      const loadedScenes = data.data || [];
      setScenes(loadedScenes);
      if (!selectedSceneValue && loadedScenes.length > 0) {
        setSelectedSceneValue(loadedScenes[0].value);
      }
    } catch (error) {
      console.error('Error loading scenes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  const selectedScene = scenes.find(s => s.value === selectedSceneValue);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto mb-4 animate-spin text-indigo-500" />
          <p className="text-slate-300 text-lg">
            {t('optionsManagement.loading', 'Loading Scene Lock Manager...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="options-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden lg:-mx-6 lg:-mb-6 lg:-mt-6">
      {/* ==================== HEADER ==================== */}
      <PageHeaderBar
        icon={<Settings className="h-5 w-5 text-indigo-400" />}
        title={t('optionsManagement.title', 'Scene Lock Manager')}
        subtitle={t('optionsManagement.subtitle', 'Manage scene prompts and lock previews for consistent image generation')}
        className="h-16"
        contentClassName="px-5 lg:px-6"
        actions={
          <button 
            onClick={loadScenes}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/15 disabled:opacity-50"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {t('optionsManagement.refresh', 'Refresh')}
          </button>
        }
      />

      {/* ==================== MAIN BODY ==================== */}
      <div className="flex min-h-0 flex-1 overflow-hidden px-5 py-3 gap-4">
        {/* ==================== LEFT SIDEBAR ==================== */}
        <div className="w-80 min-h-0 flex-shrink-0 overflow-hidden rounded-[1.75rem]">
          <div className="studio-accent-panel rounded-2xl border border-white/10 px-3 py-3 shadow-lg h-full overflow-y-auto">
            <div className="mb-3 border-b border-white/10 pb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-sky-300">
                {t('optionsManagement.sceneList', 'Scenes')} ({scenes.length})
              </span>
            </div>
            {scenes.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                {t('optionsManagement.noScenes', 'No scenes found')}
              </div>
            ) : (
              <div className="space-y-1.5">
                {scenes.map((scene) => (
                  <SceneSidebarCard
                    key={scene._id || scene.value}
                    scene={scene}
                    isSelected={selectedSceneValue === scene.value}
                    onClick={() => setSelectedSceneValue(scene.value)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ==================== CENTER + RIGHT CONTENT ==================== */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {selectedScene ? (
            <SceneDetailEditor 
              scene={selectedScene} 
              onRefresh={loadScenes}
            />
          ) : (
            <div className="studio-card-shell rounded-2xl border border-white/10 flex flex-col items-center justify-center px-6 py-20 text-center shadow-lg">
              <Layers size={56} className="mb-4 text-slate-500" />
              <p className="text-lg text-slate-400">
                {t('optionsManagement.selectScene', 'Select a scene from the list')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





