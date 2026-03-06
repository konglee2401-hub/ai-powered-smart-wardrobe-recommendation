import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { characterAPI } from '../services/api';
import { RefreshCw, ArrowLeft } from 'lucide-react';

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
    tattoos: '' 
  },
  face: { 
    faceShape: 'match reference', 
    eyeShape: 'match reference', 
    eyeColor: 'match reference', 
    eyebrowStyle: 'match reference', 
    noseType: 'match reference', 
    lipShape: 'match reference', 
    jawline: 'match reference', 
    smileStyle: 'match reference' 
  },
  hair: { 
    color: 'match reference', 
    length: 'match reference', 
    texture: 'match reference', 
    style: 'match reference', 
    parting: 'match reference', 
    fringe: 'match reference' 
  },
  styling: { 
    makeupStyle: 'match reference', 
    accessories: 'match reference', 
    jewelry: 'match reference', 
    nails: 'match reference', 
    footwearPreference: 'match reference', 
    outfitVibe: 'match reference' 
  },
  capturePlan: { 
    imageCount: 6, 
    aspectRatio: '9:16', 
    backgroundStyle: 'clean neutral', 
    lightingStyle: 'soft studio', 
    cameraLens: '85mm portrait', 
    expressionRange: 'match reference', 
    poseDirection: 'close-up + 3/4 + full body' 
  },
  extraPromptNotes: 'STRICT IDENTITY LOCK: Match reference portrait exactly. Same face, same body, same hairline, same age. Zero deviation. Keep all distinctive features identical.'
};

export default function CharacterCreatorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [portrait, setPortrait] = useState(null);
  const [options, setOptions] = useState(defaultOptions);
  const [preview, setPreview] = useState([]);
  const [portraitTempPath, setPortraitTempPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [generationSeed, setGenerationSeed] = useState(null);

  const imageCount = useMemo(() => Number(options.capturePlan.imageCount || 6), [options.capturePlan.imageCount]);

  // Load character data if in edit mode
  useEffect(() => {
    if (isEditMode) {
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
            if (char.generationSeed) setGenerationSeed(char.generationSeed);
          }
        } catch (err) {
          console.error('Error loading character:', err);
          alert('Failed to load character: ' + (err.message || 'Unknown error'));
          navigate('/characters');
        } finally {
          setPageLoading(false);
        }
      };
      
      loadCharacter();
    }
  }, [id, isEditMode, navigate]);

  const setNested = (group, key, value) => setOptions(prev => ({ ...prev, [group]: { ...prev[group], [key]: value } }));

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
    try {
      // 💫 FIX: Validate preview is a proper array of objects
      if (!Array.isArray(preview)) {
        alert('Error: Preview is not an array. Please regenerate images.');
        return;
      }
      
      if (preview.length === 0) {
        alert('Error: No preview images. Please generate preview images first.');
        return;
      }
      
      // Ensure each preview item is an object, not a string
      for (let i = 0; i < preview.length; i++) {
        if (typeof preview[i] === 'string') {
          console.warn(`[Character Save] ⚠️  Preview[${i}] is a string, skipping it`);
          preview[i] = null;
        }
      }
      
      // Filter out null items
      const cleanedPreview = preview.filter(img => img !== null && typeof img === 'object');
      if (cleanedPreview.length === 0) {
        alert('Error: No valid preview images found.');
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
          lockRules: 'same face, same body, same hairline'
        }
      };
      
      console.log('[Character Save] Payload keys:', Object.keys(payload));
      console.log('[Character Save] generatedImages type:', typeof payload.generatedImages);
      console.log('[Character Save] generatedImages is array:', Array.isArray(payload.generatedImages));
      console.log('[Character Save] generatedImages length:', payload.generatedImages?.length);
      
      // Ensure generatedImages is NOT a string
      if (typeof payload.generatedImages === 'string') {
        console.warn('[Character Save] ⚠️ generatedImages is a string! Converting to array...');
        try {
          payload.generatedImages = JSON.parse(payload.generatedImages);
        } catch (e) {
          alert('Error: Could not parse preview data.');
          return;
        }
      }
      
      setLoading(true);
      let result;
      
      if (isEditMode) {
        // Update existing character
        result = await characterAPI.update(id, payload);
        console.log('[Character Update] ✅ Success:', result);
        alert('Character updated successfully!');
      } else {
        // Create new character
        result = await characterAPI.save(payload);
        console.log('[Character Save] ✅ Success:', result);
        alert('Character saved successfully!');
      }
      
      setLoading(false);
      navigate('/characters');
    } catch (error) {
      console.error('[Character Save] ❌ Error:', error);
      setLoading(false);
      alert(`Error saving character: ${error.message || JSON.stringify(error)}`);
    }
  };

  return (
    <div className="p-6 space-y-4 text-white">
      <div className="flex items-center gap-3 mb-4">
        <button 
          onClick={() => navigate('/characters')}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          title="Back to characters"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditMode ? `Edit ${name || 'Character'}` : 'Create New Character'}
          </h1>
          <p className="text-slate-400 text-sm">
            {isEditMode 
              ? 'Update character profile, regenerate images, or modify details' 
              : 'Upload portrait + fill detailed options, generate 4-8 reference images via Google Flow, preview, regenerate, then save.'}
          </p>
        </div>
      </div>

      {pageLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
            <span className="text-slate-400">Loading character...</span>
          </div>
        </div>
      )}

      {!pageLoading && (
        <>
          {generationSeed !== null && <div className="text-xs text-emerald-400">Seed lock: {generationSeed}</div>}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-3 lg:col-span-1 bg-[#111522] border border-slate-700 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Character name" className="bg-[#0b0f1a] border border-slate-600 rounded px-3 py-2"/>
                <input value={alias} onChange={e=>setAlias(e.target.value)} placeholder="Alias (ex: LinhPhap)" className="bg-[#0b0f1a] border border-slate-600 rounded px-3 py-2"/>
              </div>
              <input type="file" accept="image/*" onChange={e=>setPortrait(e.target.files?.[0] || null)} className="text-sm" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <input placeholder="Gender" value={options.identity.gender} onChange={e=>setNested('identity','gender',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Age range" value={options.identity.ageRange} onChange={e=>setNested('identity','ageRange',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Height" value={options.identity.height} onChange={e=>setNested('identity','height',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Bust" value={options.identity.bust} onChange={e=>setNested('identity','bust',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Waist" value={options.identity.waist} onChange={e=>setNested('identity','waist',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Body type" value={options.identity.bodyType} onChange={e=>setNested('identity','bodyType',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Skin tone" value={options.identity.skinTone} onChange={e=>setNested('identity','skinTone',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Face shape" value={options.face.faceShape} onChange={e=>setNested('face','faceShape',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Eye shape/color" value={options.face.eyeShape} onChange={e=>setNested('face','eyeShape',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Hair color" value={options.hair.color} onChange={e=>setNested('hair','color',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Hair style" value={options.hair.style} onChange={e=>setNested('hair','style',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Makeup" value={options.styling.makeupStyle} onChange={e=>setNested('styling','makeupStyle',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Accessories" value={options.styling.accessories} onChange={e=>setNested('styling','accessories',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Jewelry" value={options.styling.jewelry} onChange={e=>setNested('styling','jewelry',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Tattoos" value={options.identity.tattoos} onChange={e=>setNested('identity','tattoos',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input type="number" min="4" max="8" value={options.capturePlan.imageCount} onChange={e=>setNested('capturePlan','imageCount', parseInt(e.target.value) || 4)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
                <input placeholder="Aspect 9:16" value={options.capturePlan.aspectRatio} onChange={e=>setNested('capturePlan','aspectRatio',e.target.value)} className="bg-[#0b0f1a] border border-slate-600 rounded px-2 py-1"/>
              </div>
              <textarea placeholder="Extra prompt notes" value={options.extraPromptNotes} onChange={e=>setOptions(prev=>({ ...prev, extraPromptNotes: e.target.value }))} className="w-full bg-[#0b0f1a] border border-slate-600 rounded px-3 py-2" rows={3}/>
              <div className="flex gap-2">
                <button onClick={generate} disabled={loading} className="bg-fuchsia-600 rounded px-4 py-2">{loading ? 'Generating...' : 'Create Preview'}</button>
                <button onClick={generate} disabled={loading || !preview.length} className="bg-slate-700 rounded px-4 py-2 inline-flex items-center gap-2"><RefreshCw className="w-4 h-4"/> Regenerate</button>
                <button onClick={saveCharacter} disabled={!preview.length || !portraitTempPath || loading} className="bg-emerald-600 rounded px-4 py-2">{loading ? 'Saving...' : (isEditMode ? 'Update Character' : 'Save Character')}</button>
              </div>
            </div>
            <div className="bg-[#111522] border border-slate-700 rounded-xl p-4 lg:col-span-2">
              <h3 className="font-semibold mb-3">Preview ({preview.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {preview.map((img) => <img key={img.url} src={img.url} alt={img.filename || img.angle} className="w-full h-28 object-cover rounded border border-slate-700" />)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
