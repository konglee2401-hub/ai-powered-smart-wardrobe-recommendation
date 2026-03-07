import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { characterAPI } from '../services/api';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import PageHeaderBar from '../components/PageHeaderBar';

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
    <div className="min-h-screen bg-[#050609] text-white">
      <PageHeaderBar
        icon={<Plus className="h-4 w-4 text-emerald-300" />}
        title="Characters"
        subtitle="Character workspace"
        meta="Manage your character profiles and reference images"
        className="z-10 bg-[#0a0e18]/95"
        actions={(
          <button
            onClick={() => navigate('/characters/create')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Create Character
          </button>
        )}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6 flex items-gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-red-300/80 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
              <span className="text-slate-400">Loading characters...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && characters.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-8 inline-block">
              <p className="text-slate-400 text-lg mb-4">No characters yet</p>
              <button
                onClick={() => navigate('/characters/create')}
                className="bg-emerald-600 hover:bg-emerald-700 rounded px-4 py-2 text-sm font-medium transition-colors"
              >
                Create your first character
              </button>
            </div>
          </div>
        )}

        {/* Characters Grid */}
        {!loading && characters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => (
              <div
                key={character._id}
                className="bg-[#0a0e18] border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all group"
              >
                {/* Character Portrait */}
                <div className="relative h-64 overflow-hidden bg-slate-900 flex items-center justify-center">
                  {character.portraitUrl ? (
                    <img
                      src={character.portraitUrl}
                      alt={character.name}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <span className="text-slate-500">No image</span>
                    </div>
                  )}
                </div>

                {/* Character Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1">{character.name}</h3>
                  <p className="text-sm text-slate-400 mb-2">@{character.alias}</p>

                  {/* Reference Images Count */}
                  {character.referenceImages && character.referenceImages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-2">
                        {character.referenceImages.length} reference images
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {character.referenceImages.slice(0, 4).map((img, idx) => (
                          <div key={idx} className="group relative">
                            <div className="h-20 rounded overflow-hidden bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-emerald-500/50 transition-colors">
                              {img.url ? (
                                <img
                                  src={img.url}
                                  alt={`Ref ${idx + 1}`}
                                  className="w-full h-full object-contain hover:scale-110 transition-transform cursor-pointer"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-700" />
                              )}
                            </div>
                            {/* Tooltip showing angle/description */}
                            {img.angle || img.description && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-slate-600 z-10">
                                {img.description || img.angle}
                              </div>
                            )}
                          </div>
                        ))}
                        {character.referenceImages.length > 4 && (
                          <div className="h-20 rounded bg-slate-700 flex items-center justify-center text-xs text-slate-400 border border-slate-700">
                            +{character.referenceImages.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="text-xs text-slate-500 mb-4 space-y-1">
                    <p>Created: {new Date(character.createdAt).toLocaleDateString()}</p>
                    {character.updatedAt && (
                      <p>Updated: {new Date(character.updatedAt).toLocaleDateString()}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/characters/${character._id}`)}
                      className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 text-blue-400 hover:text-blue-300 rounded px-3 py-2 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(character._id)}
                      className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 hover:text-red-300 rounded px-3 py-2 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0a0e18] border border-red-600/50 rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Delete Character?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This action cannot be undone. All associated data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 rounded px-4 py-2 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 rounded px-4 py-2 font-medium transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
