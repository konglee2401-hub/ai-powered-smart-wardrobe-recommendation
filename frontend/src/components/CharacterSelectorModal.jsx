import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserRound } from 'lucide-react';
import { characterAPI } from '../services/api';

export default function CharacterSelectorModal({ open, onClose, onSelect }) {
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    if (!open) return;
    characterAPI.list().then(res => setCharacters(res?.data || [])).catch(() => setCharacters([]));
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#1a1e2a] border border-slate-700 rounded-2xl max-h-[85vh] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-white">Select Character</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-300" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4 grid grid-cols-2 gap-4 md:grid-cols-4 items-start">
          {characters.map((c) => (
            <button key={c._id} onClick={() => onSelect(c)} className="overflow-hidden rounded-xl border border-slate-700 bg-[#10131c] text-left align-top transition-colors hover:border-fuchsia-500">
              <div className="bg-slate-800">
                {c.portraitUrl ? (
                  <img
                    src={c.portraitUrl}
                    alt={c.name}
                    className="block w-full h-auto max-h-[42vh] object-contain bg-slate-900"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center">
                    <UserRound />
                  </div>
                )}
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
    </div>,
    document.body
  );
}
