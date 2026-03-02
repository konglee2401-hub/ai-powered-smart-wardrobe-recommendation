import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Lock, RefreshCw, Wand2, Sparkles, Image, Save, Check,
  Settings, Loader2, AlertCircle, ImagePlus, Layers, ChevronRight
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Convert local file path to API URL for image serving
 */
function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const tempMatch = url.match(/[\/\\]temp[\/\\](.+)/i);
  if (tempMatch) {
    return `${API_BASE_URL.replace('/api', '')}/temp/${tempMatch[1].replace(/\\/g, '/')}`;
  }
  return url;
}

const SCENE_LOCK_ASPECTS = ['16:9', '9:16'];

function normalizeSceneLockedImageUrls(scene = {}) {
  const fromScene = scene?.sceneLockedImageUrls || {};
  return {
    '16:9': fromScene['16:9'] || null,
    '9:16': fromScene['9:16'] || scene.sceneLockedImageUrl || null
  };
}

/**
 * Compact Scene Card for Sidebar
 */
function SceneSidebarCard({ scene, isSelected, onClick }) {
  const { t } = useTranslation();
  const lockedImageUrls = normalizeSceneLockedImageUrls(scene);
  const lockedImageUrl = getImageUrl(lockedImageUrls['9:16'] || lockedImageUrls['16:9']);
  const hasPrompt = scene.sceneLockedPrompt || scene.promptSuggestion;
  const sampleCount = (scene.sceneLockSamples || []).length;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.75rem',
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15))'
          : 'rgba(30, 41, 59, 0.5)',
        borderRadius: '10px',
        border: isSelected ? '1px solid #6366f1' : '1px solid #334155',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '0.5rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* Thumbnail */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
          background: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {lockedImageUrl ? (
            <img 
              src={lockedImageUrl} 
              alt={scene.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <Layers size={20} style={{ color: '#475569' }} />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: isSelected ? '#c7d2fe' : '#e2e8f0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {scene.label}
            </span>
            {scene.useSceneLock !== false && (
              <Lock size={10} style={{ color: '#22c55e', flexShrink: 0 }} />
            )}
          </div>
          <span style={{
            fontSize: '0.7rem',
            color: '#64748b',
            fontFamily: 'monospace'
          }}>
            {scene.value}
          </span>

          {/* Status indicators */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
            {hasPrompt && (
              <span style={{
                padding: '0.1rem 0.4rem',
                background: 'rgba(99, 102, 241, 0.2)',
                borderRadius: '4px',
                fontSize: '0.65rem',
                color: '#a5b4fc'
              }}>
                {t('optionsManagement.hasPrompt', 'Prompt')}
              </span>
            )}
            {sampleCount > 0 && (
              <span style={{
                padding: '0.1rem 0.4rem',
                background: 'rgba(34, 197, 94, 0.15)',
                borderRadius: '4px',
                fontSize: '0.65rem',
                color: '#86efac'
              }}>
                {sampleCount} {t('optionsManagement.images', sampleCount === 1 ? 'image' : 'images')}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight 
          size={16} 
          style={{ 
            color: isSelected ? '#6366f1' : '#475569',
            flexShrink: 0,
            marginTop: '0.25rem'
          }} 
        />
      </div>
    </div>
  );
}

/**
 * Full Scene Detail Editor
 */
function SceneDetailEditor({ scene, onRefresh }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [promptSuggestion, setPromptSuggestion] = useState(scene.promptSuggestion || '');
  const [sceneLockedPrompt, setSceneLockedPrompt] = useState(scene.sceneLockedPrompt || '');
  const [useSceneLock, setUseSceneLock] = useState(scene.useSceneLock !== false);
  const [styleDirection, setStyleDirection] = useState('');
  const [improvementNotes, setImprovementNotes] = useState('');
  const [imageCount, setImageCount] = useState(2);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [technicalDetails, setTechnicalDetails] = useState(JSON.stringify(scene.technicalDetails || {}, null, 2));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sync local state when scene changes
  useEffect(() => {
    setPromptSuggestion(scene.promptSuggestion || '');
    setSceneLockedPrompt(scene.sceneLockedPrompt || '');
    setUseSceneLock(scene.useSceneLock !== false);
    setTechnicalDetails(JSON.stringify(scene.technicalDetails || {}, null, 2));
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, styleDirection, improvementNotes })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to generate scene lock prompt');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageCount,
          aspectRatio,
          prompt: sceneLockedPrompt || promptSuggestion
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to generate images');
      showSuccess(t('optionsManagement.imagesGenerated', 'Images generated successfully'));
      await onRefresh();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptSuggestion,
          sceneLockedPrompt,
          useSceneLock,
          technicalDetails: technical
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Save failed');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, aspectRatio })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to lock image');
      showSuccess(t('optionsManagement.imageLocked', 'Image locked as default'));
      await onRefresh();
    } catch (err) {
      showError(err.message);
    }
  };

  const samples = scene.sceneLockSamples || [];
  const lockedImageUrls = normalizeSceneLockedImageUrls(scene);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '12px',
      border: '1px solid #334155',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '600', color: '#f1f5f9' }}>
            {scene.label}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
            {scene.value}
          </span>
          {scene.description && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              {scene.description}
            </p>
          )}
        </div>
        
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: useSceneLock ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}>
          <input 
            type="checkbox" 
            checked={useSceneLock} 
            onChange={(e) => setUseSceneLock(e.target.checked)}
            style={{ accentColor: '#22c55e', width: '16px', height: '16px' }}
          />
          <Lock size={16} style={{ color: useSceneLock ? '#22c55e' : '#64748b' }} />
          <span style={{ fontSize: '0.85rem', color: useSceneLock ? '#22c55e' : '#94a3b8', fontWeight: '500' }}>
            {t('optionsManagement.useSceneLock', 'Use Scene Lock')}
          </span>
        </label>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{ 
          padding: '0.75rem 1.5rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#fca5a5',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          padding: '0.75rem 1.5rem', 
          background: 'rgba(34, 197, 94, 0.1)', 
          borderBottom: '1px solid rgba(34, 197, 94, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#86efac',
          fontSize: '0.85rem'
        }}>
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '1.5rem' }}>
        {/* Prompt Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500', color: '#94a3b8' }}>
              {t('optionsManagement.promptSuggestion', 'Prompt Suggestion (fallback)')}
            </label>
            <textarea 
              style={{
                width: '100%',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                resize: 'vertical',
                minHeight: '80px'
              }}
              rows={3} 
              value={promptSuggestion} 
              onChange={(e) => setPromptSuggestion(e.target.value)}
              placeholder={t('optionsManagement.promptPlaceholder', 'Enter fallback prompt...')}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500', color: '#94a3b8' }}>
              {t('optionsManagement.sceneLockedPrompt', 'Scene Locked Prompt (canonical)')}
            </label>
            <textarea 
              style={{
                width: '100%',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                resize: 'vertical',
                minHeight: '120px'
              }}
              rows={5} 
              value={sceneLockedPrompt} 
              onChange={(e) => setSceneLockedPrompt(e.target.value)}
              placeholder={t('optionsManagement.lockedPromptPlaceholder', 'Enter canonical scene prompt...')}
            />
          </div>
        </div>

        {/* Technical Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500', color: '#94a3b8' }}>
            {t('optionsManagement.technicalDetails', 'Technical Details (JSON)')}
          </label>
          <textarea 
            style={{
              width: '100%',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '0.75rem',
              color: '#a5b4fc',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              resize: 'vertical',
              minHeight: '100px'
            }}
            rows={6} 
            value={technicalDetails} 
            onChange={(e) => setTechnicalDetails(e.target.value)}
          />
        </div>

        {/* Enhancement Options */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '8px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
              {t('optionsManagement.styleDirection', 'Style Direction')}
            </label>
            <input 
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '0.6rem 0.75rem',
                color: '#e2e8f0',
                fontSize: '0.85rem'
              }}
              placeholder={t('optionsManagement.stylePlaceholder', 'e.g., cinematic, realistic...')}
              value={styleDirection} 
              onChange={(e) => setStyleDirection(e.target.value)} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
              {t('optionsManagement.improvementNotes', 'Improvement Notes')}
            </label>
            <input 
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '0.6rem 0.75rem',
                color: '#e2e8f0',
                fontSize: '0.85rem'
              }}
              placeholder={t('optionsManagement.notesPlaceholder', 'e.g., add more lighting...')}
              value={improvementNotes} 
              onChange={(e) => setImprovementNotes(e.target.value)} 
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button 
            disabled={generatingPrompt} 
            onClick={() => callGeneratePrompt('create')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              background: generatingPrompt ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: generatingPrompt ? 'not-allowed' : 'pointer',
              opacity: generatingPrompt ? 0.7 : 1
            }}
          >
            {generatingPrompt ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {generatingPrompt 
              ? t('optionsManagement.generating', 'Generating...') 
              : t('optionsManagement.generatePrompt', 'Generate Prompt (ChatGPT)')
            }
          </button>
          
          <button 
            disabled={generatingPrompt} 
            onClick={() => callGeneratePrompt('enhance')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              background: generatingPrompt ? '#374151' : 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: generatingPrompt ? 'not-allowed' : 'pointer',
              opacity: generatingPrompt ? 0.7 : 1
            }}
          >
            {generatingPrompt ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generatingPrompt 
              ? t('optionsManagement.enhancing', 'Enhancing...') 
              : t('optionsManagement.enhancePrompt', 'Enhance / Change')
            }
          </button>
          
          <button 
            disabled={saving} 
            onClick={saveAssets} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              background: saving ? '#374151' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving 
              ? t('optionsManagement.saving', 'Saving...') 
              : t('optionsManagement.saveSettings', 'Save Settings')
            }
          </button>
        </div>

        {/* Image Generation Section */}
        <div style={{ 
          padding: '1rem',
          background: 'rgba(99, 102, 241, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            gap: '0.75rem' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Image size={18} style={{ color: '#a5b4fc' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#c7d2fe' }}>
                {t('optionsManagement.generatePreviews', 'Generate Previews')}
              </span>
            </div>
            
            <select 
              value={imageCount} 
              onChange={(e) => setImageCount(Number(e.target.value))} 
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                color: '#e2e8f0',
                fontSize: '0.85rem'
              }}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} {t('optionsManagement.images', n === 1 ? 'image' : 'images')}</option>
              ))}
            </select>
            
            <select 
              value={aspectRatio} 
              onChange={(e) => setAspectRatio(e.target.value)} 
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                color: '#e2e8f0',
                fontSize: '0.85rem'
              }}
            >
              <option value="1:1">1:1</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
              <option value="3:4">3:4</option>
            </select>
            
            <button 
              disabled={generatingImages} 
              onClick={callGenerateImages} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: generatingImages ? '#374151' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: '500',
                cursor: generatingImages ? 'not-allowed' : 'pointer',
                opacity: generatingImages ? 0.7 : 1
              }}
            >
              {generatingImages ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {generatingImages 
                ? t('optionsManagement.generatingImages', 'Generating...') 
                : t('optionsManagement.generate', 'Generate')
              }
            </button>
          </div>
        </div>

        {/* Locked Image Preview by Aspect */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '500', color: '#94a3b8' }}>
            <Lock size={14} style={{ marginRight: '0.5rem', color: '#22c55e' }} />
            {t('optionsManagement.currentLockedImage', 'Current Locked Image')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {SCENE_LOCK_ASPECTS.map((ratio) => {
              const ratioImageUrl = getImageUrl(lockedImageUrls[ratio]);
              return (
                <div key={ratio} style={{ padding: '0.75rem', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>
                    {t('optionsManagement.aspectRatio', 'Aspect Ratio')}: {ratio}
                  </p>
                  {ratioImageUrl ? (
                    <img
                      src={ratioImageUrl}
                      alt={`Locked scene ${ratio}`}
                      style={{ width: '100%', height: ratio === '16:9' ? '100px' : '160px', objectFit: 'cover', borderRadius: '6px', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: ratio === '16:9' ? '100px' : '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem', background: '#1e293b', borderRadius: '6px' }}>
                      {t('optionsManagement.noLockedImage', 'No locked image')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview Candidates */}
        {samples.length > 0 && (
          <div>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '500', color: '#94a3b8' }}>
              {t('optionsManagement.previewCandidates', 'Preview Candidates')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {SCENE_LOCK_ASPECTS.map((ratio) => {
                const ratioSamples = sampleGroups[ratio] || [];
                return (
                  <div key={ratio} style={{ padding: '0.75rem', background: '#0b1220', borderRadius: '10px', border: '1px solid #334155' }}>
                    <p style={{ margin: '0 0 0.6rem 0', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}>
                      {t('optionsManagement.aspectRatio', 'Aspect Ratio')}: {ratio}
                    </p>
                    {ratioSamples.length === 0 ? (
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>{t('optionsManagement.noSamplesForAspect', 'No preview samples for this aspect yet')}</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                        {ratioSamples.map((sample, idx) => {
                          const sampleUrl = getImageUrl(sample.url);
                          const isAspectLocked = lockedImageUrls[ratio] === sample.url;
                          return (
                            <div key={`${ratio}-${idx}`} style={{ padding: '0.5rem', background: '#0f172a', borderRadius: '10px', border: isAspectLocked ? '2px solid #22c55e' : '1px solid #334155' }}>
                              <img src={sampleUrl} alt={`Scene sample ${ratio} ${idx + 1}`} style={{ width: '100%', height: ratio === '16:9' ? '84px' : '120px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
                              <button
                                onClick={() => chooseDefaultImage(sample.url, ratio)}
                                style={{ marginTop: '0.5rem', width: '100%', padding: '0.4rem 0.5rem', background: isAspectLocked ? '#22c55e' : '#374151', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer' }}
                              >
                                {isAspectLocked ? t('optionsManagement.locked', '✓ Locked') : t('optionsManagement.selectAsDefault', 'Select')}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OptionsManagement() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [scenes, setScenes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSceneValue, setSelectedSceneValue] = useState(null);

  const loadScenes = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-options/scenes/lock-manager`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to load scenes');
      const loadedScenes = data.data || [];
      setScenes(loadedScenes);
      // Auto-select first scene if none selected
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
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} className="animate-spin" style={{ color: '#6366f1', marginBottom: '1rem' }} />
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
            {t('optionsManagement.loading', 'Loading Scene Lock Manager...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#f1f5f9'
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '2rem',
              fontWeight: '700',
              color: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <Settings size={28} style={{ color: '#8b5cf6' }} />
              {t('optionsManagement.title', 'Scene Lock Manager')}
            </h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
              {t('optionsManagement.subtitle', 'Manage scene prompts and lock previews for consistent image generation')}
            </p>
          </div>
          
          <button 
            onClick={loadScenes}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              color: '#a5b4fc',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {t('optionsManagement.refresh', 'Refresh')}
          </button>
        </div>

        {/* Workflow Guide */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'rgba(99, 102, 241, 0.08)',
          borderRadius: '10px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          marginBottom: '1.5rem'
        }}>
          <p style={{ margin: 0, color: '#c7d2fe', fontSize: '0.9rem' }}>
            <strong style={{ color: '#a5b4fc' }}>{t('optionsManagement.workflow', 'Workflow')}:</strong>{' '}
            {t('optionsManagement.workflowDesc', 'Load scenes → Generate canonical prompt via ChatGPT browser → Generate 1-4 previews via Google Flow → Pick default image and lock')}
          </p>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {/* Left Sidebar */}
          <div style={{
            width: '280px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '0.75rem',
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '12px',
              border: '1px solid #334155',
              maxHeight: 'calc(100vh - 280px)',
              overflowY: 'auto'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #334155'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#94a3b8' }}>
                  {t('optionsManagement.sceneList', 'Scenes')} ({scenes.length})
                </span>
              </div>

              {scenes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                  {t('optionsManagement.noScenes', 'No scenes found')}
                </div>
              ) : (
                scenes.map((scene) => (
                  <SceneSidebarCard
                    key={scene._id || scene.value}
                    scene={scene}
                    isSelected={selectedSceneValue === scene.value}
                    onClick={() => setSelectedSceneValue(scene.value)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedScene ? (
              <SceneDetailEditor 
                scene={selectedScene} 
                onRefresh={loadScenes}
              />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                background: 'rgba(30, 41, 59, 0.3)',
                borderRadius: '12px',
                border: '1px dashed #334155'
              }}>
                <Layers size={48} style={{ color: '#475569', marginBottom: '1rem' }} />
                <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>
                  {t('optionsManagement.selectScene', 'Select a scene from the list')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
