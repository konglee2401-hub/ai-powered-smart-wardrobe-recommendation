import React, { useEffect, useState } from 'react';
import { X, UserRound } from 'lucide-react';
import { characterAPI } from '../services/api';

export default function CharacterSelectorModal({ open, onClose, onSelect }) {
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    if (!open) return;
    characterAPI.list().then(res => setCharacters(res?.data || [])).catch(() => setCharacters([]));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#1a1e2a] border border-slate-700 rounded-2xl max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-white">Select Character</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-300" /></button>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto max-h-[70vh]">
          {characters.map((c) => (
            <button key={c._id} onClick={() => onSelect(c)} className="text-left rounded-xl border border-slate-700 bg-[#10131c] hover:border-fuchsia-500 overflow-hidden">
              <div className="h-40 bg-slate-800">
                {c.portraitUrl ? <img src={c.portraitUrl} alt={c.name} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center"><UserRound /></div>}
              </div>
              <div className="p-3">
                <div className="text-white text-sm font-semibold">{c.name}</div>
                <div className="text-xs text-slate-400">@{c.alias}</div>
                <div className="text-xs text-slate-500 mt-1">{c.referenceImages?.length || 0} refs</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
