import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { characterAPI } from '../services/api';
import { RefreshCw, X, ArrowLeft } from 'lucide-react';

const defaultOptions = {
  identity: { gender: '', ageRange: '', ethnicity: '', height: '', bust: '', waist: '', bodyType: '', bodyProportions: '', skinTone: '', distinctiveMarks: '', tattoos: '' },
  face: { faceShape: '', eyeShape: '', eyeColor: '', eyebrowStyle: '', noseType: '', lipShape: '', jawline: '', smileStyle: '' },
  hair: { color: '', length: '', texture: '', style: '', parting: '', fringe: '' },
  styling: { makeupStyle: '', accessories: '', jewelry: '', nails: '', footwearPreference: '', outfitVibe: '' },
  capturePlan: { imageCount: 6, aspectRatio: '9:16', backgroundStyle: 'clean studio', lightingStyle: 'soft beauty light', cameraLens: '85mm portrait', expressionRange: 'neutral to warm smile', poseDirection: 'close-up + 3/4 + full body' },
  extraPromptNotes: ''
};

export default function CharacterCreatorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [portrait, setPortrait] = useState(null);
  const [options, setOptions] = useState(defaultOptions);
  const [preview, setPreview] = useState([]);
  const [portraitTempPath, setPortraitTempPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [generationSeed, setGenerationSeed] = useState(null);
  const [fullSizeImage, setFullSizeImage] = useState(null);
  const [editingId, setEditingId] = useState(id || null);
  const [editingData, setEditingData] = useState(null);

  const imageCount = useMemo(() => Number(options.capturePlan.imageCount || 6), [options.capturePlan.imageCount]);

  const setNested = (group, key, value) => setOptions(prev => ({ ...prev, [group]: { ...prev[group], [key]: value } }));

  // Load character data if editing
  useEffect(() => {
    if (editingId) {
      loadCharacterData();
    }
  }, [editingId]);

  const loadCharacterData = async () => {
    try {
      const response = await characterAPI.getById(editingId);
      const character = response?.data;
      if (character) {
        setName(character.name);
        setAlias(character.alias);
        setPortraitTempPath(character.portraitUrl);
        setOptions(character.options || defaultOptions);
        setPreview(character.referenceImages || []);
        setEditingData(character);
      }
    } catch (err) {
      console.error('Error loading character:', err);
    }
  };

  const generate = async () => {
    if (!portrait || !name) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('portraitImage', portrait);
    fd.append('name', name);
    fd.append('alias', alias || name);
    fd.append('imageCount', imageCount);
    fd.append('aspectRatio', options.capturePlan.aspectRatio || '9:16');
    fd.append('options', JSON.stringify(options));
    if (generationSeed !== null && generationSeed !== undefined) fd.append('seed', String(generationSeed));
    const res = await characterAPI.generatePreview(fd);
    setPreview(res?.data?.generatedImages || []);
    setPortraitTempPath(res?.data?.portraitTempPath || '');
    if (typeof res?.data?.seed !== 'undefined') setGenerationSeed(res.data.seed);
    setLoading(false);
  };

  const saveCharacter = async () => {
    const isPortraitUrl = portraitTempPath?.startsWith('http');
    const payload = {
      ...(editingId && { _id: editingId }),
      name,
      alias: alias || name,
      ...(portraitTempPath && !isPortraitUrl && { portraitTempPath }),
      options,
      generatedImages: preview,
      analysisProfile: {
        characterName: name,
        primaryLook: options.styling.outfitVibe,
        lockRules: 'same face, same body, same hairline'
      }
    };
    try {
      await characterAPI.save(payload);
      alert(`Character ${editingId ? 'updated' : 'saved'} successfully`);
      navigate('/characters');
    } catch (err) {
      alert(`Error ${editingId ? 'updating' : 'saving'} character: ` + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050609] text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 bg-[#0a0e18]">
        <div className="flex items-center gap-3 mb-2">
          {editingId && (
            <button
              onClick={() => navigate('/characters')}
              className="p-1 hover:bg-slate-700 rounded transition"
              title="Back to character list"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-3xl font-bold">{editingId ? 'Edit Character' : 'Create Character'}</h1>
        </div>
        <p className="text-slate-400 text-sm">
          {editingId 
            ? 'Update character details, reference images, and options. Regenerate any images as needed.'
            : 'Upload portrait + fill detailed options, generate 4-8 reference images via Google Flow, preview, regenerate, then save.'
          }
        </p>
        {generationSeed !== null && <div className="text-xs text-emerald-400 mt-2">Seed lock: {generationSeed}</div>}
      </div>

      {/* Main layout: 50-50 split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Options Panel */}
        <div className="w-1/2 overflow-y-auto border-r border-slate-700 bg-[#0a0e18] p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Character name" className="bg-[#0b0f1a] border border-slate-600 rounded px-3 py-2 text-sm"/>
              <input value={alias} onChange={e=>setAlias(e.target.value)} placeholder="Alias (ex: LinhPhap)" className="bg-[#0b0f1a] border border-slate-600 rounded px-3 py-2 text-sm"/>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 block mb-2 font-semibold">Portrait image</label>
              <div className="grid grid-cols-3 gap-4">
                {/* Left: Upload Area (1/3) */}
                <div>
                  <input 
                    id="portrait-input"
                    type="file" 
                    accept="image/*" 
                    onChange={e=>setPortrait(e.target.files?.[0] || null)} 
                    className="hidden"
                  />
                  
                  <label 
                    htmlFor="portrait-input"
                    className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-600 rounded-lg bg-slate-900/40 hover:border-emerald-500/50 hover:bg-slate-900/60 transition-all cursor-pointer"
                  >
                    <div className="text-center">
                      <p className="text-slate-400 text-xs font-medium mb-1">
                        {portraitTempPath ? 'Change' : 'Upload'}
                      </p>
                      <p className="text-slate-500 text-xs">PNG, JPG</p>
                    </div>
                  </label>
                </div>
                
                {/* Right: Preview (2/3) */}
                <div className="col-span-2 h-32 border border-slate-600 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden">
                  {portraitTempPath ? (
                    <img 
                      src={portraitTempPath} 
                      alt="Portrait preview" 
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-500 text-xs">No image</span>
                  )}
                </div>
              </div>
            </div>

            {/* Identity section */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">Identity</h3>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Gender" value={options.identity.gender} onChange={e=>setNested('identity','gender',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Age range" value={options.identity.ageRange} onChange={e=>setNested('identity','ageRange',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Height" value={options.identity.height} onChange={e=>setNested('identity','height',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Bust" value={options.identity.bust} onChange={e=>setNested('identity','bust',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Waist" value={options.identity.waist} onChange={e=>setNested('identity','waist',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Body type" value={options.identity.bodyType} onChange={e=>setNested('identity','bodyType',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Skin tone" value={options.identity.skinTone} onChange={e=>setNested('identity','skinTone',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Tattoos" value={options.identity.tattoos} onChange={e=>setNested('identity','tattoos',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
              </div>
            </div>

            {/* Face section */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">Face</h3>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Face shape" value={options.face.faceShape} onChange={e=>setNested('face','faceShape',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Eye shape/color" value={options.face.eyeShape} onChange={e=>setNested('face','eyeShape',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Eye color" value={options.face.eyeColor} onChange={e=>setNested('face','eyeColor',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Eyebrow style" value={options.face.eyebrowStyle} onChange={e=>setNested('face','eyebrowStyle',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Nose type" value={options.face.noseType} onChange={e=>setNested('face','noseType',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Lip shape" value={options.face.lipShape} onChange={e=>setNested('face','lipShape',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
              </div>
            </div>

            {/* Hair section */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">Hair</h3>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Hair color" value={options.hair.color} onChange={e=>setNested('hair','color',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Hair length" value={options.hair.length} onChange={e=>setNested('hair','length',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Hair texture" value={options.hair.texture} onChange={e=>setNested('hair','texture',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Hair style" value={options.hair.style} onChange={e=>setNested('hair','style',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
              </div>
            </div>

            {/* Styling section */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">Styling</h3>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Makeup" value={options.styling.makeupStyle} onChange={e=>setNested('styling','makeupStyle',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Accessories" value={options.styling.accessories} onChange={e=>setNested('styling','accessories',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Jewelry" value={options.styling.jewelry} onChange={e=>setNested('styling','jewelry',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Outfit vibe" value={options.styling.outfitVibe} onChange={e=>setNested('styling','outfitVibe',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
              </div>
            </div>

            {/* Capture plan section */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">Capture Plan</h3>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min="4" max="8" value={options.capturePlan.imageCount} onChange={e=>setNested('capturePlan','imageCount',e.target.value)} placeholder="Count" className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Aspect" value={options.capturePlan.aspectRatio} onChange={e=>setNested('capturePlan','aspectRatio',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
                <input placeholder="Lighting" value={options.capturePlan.lightingStyle} onChange={e=>setNested('capturePlan','lightingStyle',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1 text-xs"/>
              </div>
            </div>

            {/* Extra notes */}
            <textarea placeholder="Extra prompt notes" value={options.extraPromptNotes} onChange={e=>setOptions(prev=>({ ...prev, extraPromptNotes: e.target.value }))} className="w-full bg-[#0b0f1a] border border-slate-600 rounded px-3 py-2 text-xs" rows={3}/>

            {/* Buttons */}
            <div className="flex gap-2 sticky bottom-0 bg-[#0a0e18] p-4 -mx-6 mb-0">
              <button onClick={generate} disabled={loading} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-slate-700 rounded px-4 py-2 text-sm font-medium">{loading ? 'Generating...' : 'Create Preview'}</button>
              <button onClick={generate} disabled={loading || !preview.length} className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 rounded px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/> Regenerate</button>
              <button onClick={saveCharacter} disabled={editingId ? false : (!preview.length || !portraitTempPath)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 rounded px-4 py-2 text-sm font-medium">{editingId ? 'Update Character' : 'Save Character'}</button>
            </div>
          </div>
        </div>

        {/* Right: Preview Panel */}
        <div className="w-1/2 overflow-y-auto bg-[#050609] p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Preview ({preview.length})</h3>
          <div className="grid grid-cols-2 gap-4 auto-rows-max">
            {preview.map((img, idx) => (
              <div 
                key={idx} 
                className="cursor-pointer overflow-hidden rounded-lg border border-slate-700 hover:border-emerald-500 transition-all group"
              >
                <div 
                  className="relative h-64 overflow-hidden bg-slate-900 flex items-center justify-center"
                  onClick={() => setFullSizeImage(img.url)}
                >
                  <img 
                    src={img.url} 
                    alt={`Preview ${idx + 1}`} 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Click for full size</span>
                  </div>
                </div>
                
                {/* Image description and angle */}
                <div className="bg-[#0a0e18] p-2 border-t border-slate-700">
                  <p className="text-xs font-medium text-emerald-400 mb-1">
                    {img.description || img.angle || `Image ${idx + 1}`}
                  </p>
                  {img.prompt && (
                    <p className="text-xs text-slate-400 line-clamp-2">{img.prompt.substring(0, 80)}...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full-size image modal */}
      {fullSizeImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setFullSizeImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setFullSizeImage(null)}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 rounded-full p-2 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={fullSizeImage} 
              alt="Full size preview" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
