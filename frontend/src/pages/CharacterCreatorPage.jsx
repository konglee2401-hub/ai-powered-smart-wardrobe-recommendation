import React, { useMemo, useState } from 'react';
import { characterAPI } from '../services/api';
import { RefreshCw } from 'lucide-react';

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
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [portrait, setPortrait] = useState(null);
  const [options, setOptions] = useState(defaultOptions);
  const [preview, setPreview] = useState([]);
  const [portraitTempPath, setPortraitTempPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [generationSeed, setGenerationSeed] = useState(null);

  const imageCount = useMemo(() => Number(options.capturePlan.imageCount || 6), [options.capturePlan.imageCount]);

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
      const payload = {
        name,
        alias: alias || name,
        portraitTempPath,
        options,
        generatedImages: preview,
        analysisProfile: {
          characterName: name,
          primaryLook: options.styling.outfitVibe,
          lockRules: 'same face, same body, same hairline'
        }
      };
      
      console.log('[Character Save] Payload:', payload);
      console.log('[Character Save] Options type:', typeof options, 'imageCount:', options.capturePlan?.imageCount);
      
      const result = await characterAPI.save(payload);
      console.log('[Character Save] ✅ Success:', result);
      alert('Character saved successfully!');
    } catch (error) {
      console.error('[Character Save] ❌ Error:', error);
      alert(`Error saving character: ${error.message || JSON.stringify(error)}`);
    }
  };

  return (
    <div className="p-6 space-y-4 text-white">
      <h1 className="text-2xl font-bold">Character Creator</h1>
      <p className="text-slate-400 text-sm">Upload portrait + fill detailed options, generate 4-8 reference images via Google Flow, preview, regenerate, then save.</p>
      {generationSeed !== null && <div className="text-xs text-emerald-400">Seed lock: {generationSeed}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3 lg:col-span-2 bg-[#111522] border border-slate-700 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Character name" className="bg-[#0b0f1a] border border-slate-600 rounded px-3 py-2"/>
            <input value={alias} onChange={e=>setAlias(e.target.value)} placeholder="Alias (ex: LinhPhap)" className="bg-[#0b0f1a] border border-slate-600 rounded px-3 py-2"/>
          </div>
          <input type="file" accept="image/*" onChange={e=>setPortrait(e.target.files?.[0] || null)} className="text-sm" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
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
            <button onClick={saveCharacter} disabled={!preview.length || !portraitTempPath} className="bg-emerald-600 rounded px-4 py-2">Save Character</button>
          </div>
        </div>
        <div className="bg-[#111522] border border-slate-700 rounded-xl p-4">
          <h3 className="font-semibold mb-3">Preview ({preview.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {preview.map((img) => <img key={img.url} src={img.url} alt={img.filename} className="w-full h-28 object-cover rounded border border-slate-700" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
