import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { characterAPI } from '../services/api';
import { Plus, Edit, Trash2, AlertCircle, Users } from 'lucide-react';
import PageHeaderBar from '../components/PageHeaderBar';
import ModalPortal from '../components/ModalPortal';

export default function CharacterListPage() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await characterAPI.list();
      setCharacters(response?.data || []);
    } catch (err) {
      console.error('Error loading characters:', err);
      setError(err.message || 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      await characterAPI.delete(id);
      setDeleteConfirm(null);
      await loadCharacters();
    } catch (err) {
      console.error('Error deleting character:', err);
      setError(err.message || 'Failed to delete character');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="image-generation-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr)] overflow-hidden text-[13px] text-white lg:-mx-6 lg:-mb-6 lg:-mt-6" data-main-body>
      <PageHeaderBar
        icon={<Users className="h-4 w-4 text-sky-400" />}
        title="Characters"
        meta="Manage your character profiles and reference images"
        className="h-16"
        actions={(
          <button
            onClick={() => navigate('/characters/create')}
            className="apple-cta-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Character
          </button>
        )}
      />

      <div className="min-h-0 overflow-y-auto px-5 py-4 lg:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          {error && (
            <div className="studio-card-shell flex items-start gap-3 rounded-[1.05rem] p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="font-medium text-red-400">Error</p>
                <p className="text-sm text-red-300/80">{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                <span className="text-slate-400">Loading characters...</span>
              </div>
            </div>
          )}

          {!loading && characters.length === 0 && (
            <div className="py-16 text-center">
              <div className="studio-card-shell inline-block rounded-[1.2rem] p-8">
                <p className="mb-4 text-lg text-slate-400">No characters yet</p>
                <button
                  onClick={() => navigate('/characters/create')}
                  className="apple-cta-primary rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  Create your first character
                </button>
              </div>
            </div>
          )}

          {!loading && characters.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => (
                <div key={character._id} className="studio-card-shell group overflow-hidden rounded-[1.25rem] transition-all">
                  <div className="relative flex h-64 items-center justify-center overflow-hidden bg-white/5">
                    {character.portraitUrl ? (
                      <img
                        src={character.portraitUrl}
                        alt={character.name}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/5">
                        <span className="text-slate-500">No image</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="mb-1 text-lg font-semibold">{character.name}</h3>
                    <p className="mb-2 text-sm text-slate-400">@{character.alias}</p>

                    {character.referenceImages && character.referenceImages.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-2 text-xs text-slate-500">
                          {character.referenceImages.length} reference images
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {character.referenceImages.slice(0, 4).map((img, idx) => (
                            <div key={idx} className="group relative">
                              <div className="flex h-20 items-center justify-center overflow-hidden rounded-[0.85rem] bg-white/5 transition-colors">
                                {img.url ? (
                                  <img
                                    src={img.url}
                                    alt={`Ref ${idx + 1}`}
                                    className="h-full w-full cursor-pointer object-contain transition-transform hover:scale-110"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-white/5" />
                                )}
                              </div>
                              {(img.angle || img.description) && (
                                <div className="studio-card-shell absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs text-slate-700 group-hover:block">
                                  {img.description || img.angle}
                                </div>
                              )}
                            </div>
                          ))}
                          {character.referenceImages.length > 4 && (
                            <div className="flex h-20 items-center justify-center rounded-[0.85rem] bg-white/5 text-xs text-slate-400">
                              +{character.referenceImages.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mb-4 space-y-1 text-xs text-slate-500">
                      <p>Created: {new Date(character.createdAt).toLocaleDateString()}</p>
                      {character.updatedAt && <p>Updated: {new Date(character.updatedAt).toLocaleDateString()}</p>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/characters/${character._id}`)}
                        className="apple-option-chip apple-option-chip-cool inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(character._id)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 app-layer-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="studio-card-shell max-w-sm rounded-[1.2rem] p-6">
              <h3 className="mb-2 text-lg font-semibold">Delete Character?</h3>
              <p className="mb-6 text-sm text-slate-400">
                This action cannot be undone. All associated data will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="apple-option-chip flex-1 rounded-lg px-4 py-2 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-2 font-medium text-red-500 transition-colors hover:bg-red-900/30"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}


