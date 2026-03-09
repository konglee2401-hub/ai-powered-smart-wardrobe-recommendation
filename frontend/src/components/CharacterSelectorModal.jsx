import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserRound } from 'lucide-react';
import { characterAPI } from '../services/api';

export default function CharacterSelectorModal({ open, onClose, onSelect }) {
  const [characters, setCharacters] = useState([]);
  const isLightTheme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';

  useEffect(() => {
    if (!open) return;
    characterAPI.list().then(res => setCharacters(res?.data || [])).catch(() => setCharacters([]));
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={`apple-typography fixed inset-0 z-50 flex items-center justify-center p-4 ${isLightTheme ? 'bg-[rgba(145,167,193,0.28)] backdrop-blur-md' : 'bg-black/70'}`}>
      <div className={`w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl ${isLightTheme ? 'studio-card-shell border border-white/50' : 'bg-[#1a1e2a] border border-slate-700'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isLightTheme ? 'border-white/45 bg-white/10' : 'border-slate-700'}`}>
          <h3 className={`font-semibold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Select Character</h3>
          <button onClick={onClose} className={`rounded-lg p-1.5 transition ${isLightTheme ? 'text-slate-500 hover:bg-white/50 hover:text-slate-900' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}><X className="w-5 h-5" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4 grid grid-cols-2 gap-4 md:grid-cols-4 items-start">
          {characters.map((c) => (
            <button key={c._id} onClick={() => onSelect(c)} className={`overflow-hidden rounded-xl border text-left align-top transition-colors ${isLightTheme ? 'studio-card-shell border-white/50 hover:border-sky-300' : 'border-slate-700 bg-[#10131c] hover:border-fuchsia-500'}`}>
              <div className={isLightTheme ? 'bg-white/15' : 'bg-slate-800'}>
                {c.portraitUrl ? (
                  <img
                    src={c.portraitUrl}
                    alt={c.name}
                    className={`block w-full h-auto max-h-[42vh] object-contain ${isLightTheme ? 'bg-white/15' : 'bg-slate-900'}`}
                  />
                ) : (
                  <div className={`flex h-40 items-center justify-center ${isLightTheme ? 'text-slate-500' : 'text-slate-300'}`}>
                    <UserRound />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className={`text-sm font-semibold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{c.name}</div>
                <div className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>@{c.alias}</div>
                <div className={`text-xs mt-1 ${isLightTheme ? 'text-slate-400' : 'text-slate-500'}`}>{c.referenceImages?.length || 0} refs</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
