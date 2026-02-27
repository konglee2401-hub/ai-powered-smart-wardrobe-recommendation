import React, { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function SceneCard({ scene, onRefresh }) {
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

  const callGeneratePrompt = async (mode) => {
    setGeneratingPrompt(true);
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
      await onRefresh();
    } catch (error) {
      alert(error.message);
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const callGenerateImages = async () => {
    setGeneratingImages(true);
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
      await onRefresh();
    } catch (error) {
      alert(error.message);
    } finally {
      setGeneratingImages(false);
    }
  };

  const saveAssets = async () => {
    setSaving(true);
    try {
      let technical = {};
      try {
        technical = technicalDetails ? JSON.parse(technicalDetails) : {};
      } catch {
        throw new Error('technicalDetails must be valid JSON');
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
      await onRefresh();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const chooseDefaultImage = async (imageUrl) => {
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-options/scenes/${scene.value}/select-lock-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to lock image');
      await onRefresh();
    } catch (error) {
      alert(error.message);
    }
  };

  const samples = scene.sceneLockSamples || [];

  return (
    <div className="bg-white rounded-lg p-4 shadow border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">{scene.label} ({scene.value})</h3>
          <p className="text-sm text-gray-600">{scene.description}</p>
        </div>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={useSceneLock} onChange={(e) => setUseSceneLock(e.target.checked)} />
          Use Scene Lock
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium">Prompt Suggestion (fallback)</label>
        <textarea className="w-full border rounded p-2 text-sm" rows={3} value={promptSuggestion} onChange={(e) => setPromptSuggestion(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium">Scene Locked Prompt (canonical)</label>
        <textarea className="w-full border rounded p-2 text-sm" rows={5} value={sceneLockedPrompt} onChange={(e) => setSceneLockedPrompt(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium">Technical Details (JSON)</label>
        <textarea className="w-full border rounded p-2 font-mono text-xs" rows={6} value={technicalDetails} onChange={(e) => setTechnicalDetails(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border rounded p-2 text-sm" placeholder="Style direction (optional)" value={styleDirection} onChange={(e) => setStyleDirection(e.target.value)} />
        <input className="border rounded p-2 text-sm" placeholder="Improve notes (optional)" value={improvementNotes} onChange={(e) => setImprovementNotes(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button disabled={generatingPrompt} onClick={() => callGeneratePrompt('create')} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm disabled:opacity-50">
          {generatingPrompt ? 'Generating...' : 'Generate sample prompt (ChatGPT Browser)'}
        </button>
        <button disabled={generatingPrompt} onClick={() => callGeneratePrompt('enhance')} className="px-3 py-2 bg-purple-600 text-white rounded text-sm disabled:opacity-50">
          {generatingPrompt ? 'Enhancing...' : 'Enhance / Change prompt'}
        </button>
        <button disabled={saving} onClick={saveAssets} className="px-3 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save override / lock settings'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="border rounded p-2 text-sm">
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} image{n > 1 ? 's' : ''}</option>)}
        </select>
        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="border rounded p-2 text-sm">
          <option value="1:1">1:1</option>
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
          <option value="3:4">3:4</option>
        </select>
        <button disabled={generatingImages} onClick={callGenerateImages} className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50">
          {generatingImages ? 'Generating images...' : 'Generate scene previews (Google Flow)'}
        </button>
      </div>

      {scene.sceneLockedImageUrl && (
        <div>
          <p className="text-sm font-medium mb-1">Current locked image</p>
          <img src={scene.sceneLockedImageUrl} alt="Locked scene" className="w-40 h-40 object-cover rounded border" />
        </div>
      )}

      {samples.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Generated preview candidates</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {samples.map((sample, idx) => (
              <div key={idx} className={`p-2 border rounded ${sample.isDefault ? 'border-green-500' : 'border-gray-200'}`}>
                <img src={sample.url} alt={`scene sample ${idx + 1}`} className="w-full h-28 object-cover rounded" />
                <button onClick={() => chooseDefaultImage(sample.url)} className="mt-2 w-full px-2 py-1 text-xs bg-gray-800 text-white rounded">
                  {sample.isDefault ? 'Locked default' : 'Pick as default & lock'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OptionsManagement() {
  const [loading, setLoading] = useState(true);
  const [scenes, setScenes] = useState([]);

  const loadScenes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-options/scenes/lock-manager`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to load scenes');
      setScenes(data.data || []);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  if (loading) {
    return <div className="p-8 text-white">Loading scene lock manager...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">Scene Lock Manager</h1>
      <p className="text-gray-300 text-sm">
        Workflow: load scenes → generate canonical prompt via ChatGPT browser automation → generate 1-4 previews via Google Flow → pick default image and lock.
      </p>

      <div className="space-y-4">
        {scenes.map((scene) => (
          <SceneCard key={scene._id || scene.value} scene={scene} onRefresh={loadScenes} />
        ))}
      </div>
    </div>
  );
}
