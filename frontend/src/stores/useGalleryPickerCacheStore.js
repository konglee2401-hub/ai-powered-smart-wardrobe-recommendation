import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const CACHE_VERSION = 1;
const QUERY_TTL_MS = 6 * 60 * 60 * 1000;
const PREVIEW_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_QUERY_ENTRIES = 24;
const MAX_PREVIEW_ENTRIES = 400;

const storage = createJSONStorage(() => localStorage);

const pruneCache = (entries, maxEntries) => {
  const sortedEntries = Object.entries(entries || {}).sort(
    (a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0)
  );

  return Object.fromEntries(sortedEntries.slice(0, maxEntries));
};

const isFresh = (entry, ttlMs) => {
  if (!entry?.updatedAt) return false;
  return Date.now() - entry.updatedAt < ttlMs;
};

const useGalleryPickerCacheStore = create(
  persist(
    (set, get) => ({
      queryCache: {},
      previewCache: {},

      getQuery: (queryKey) => {
        const entry = get().queryCache[queryKey];
        if (!isFresh(entry, QUERY_TTL_MS)) {
          if (entry) {
            get().deleteQuery(queryKey);
          }
          return null;
        }
        return entry.payload;
      },

      setQuery: (queryKey, payload) => {
        set((state) => ({
          queryCache: pruneCache(
            {
              ...state.queryCache,
              [queryKey]: {
                payload,
                updatedAt: Date.now(),
              },
            },
            MAX_QUERY_ENTRIES
          ),
        }));
      },

      deleteQuery: (queryKey) => {
        set((state) => {
          const next = { ...state.queryCache };
          delete next[queryKey];
          return { queryCache: next };
        });
      },

      getPreview: (assetId, signature = null) => {
        const entry = get().previewCache[assetId];
        if (!isFresh(entry, PREVIEW_TTL_MS)) {
          if (entry) {
            get().deletePreview(assetId);
          }
          return null;
        }
        if (signature && entry.signature && entry.signature !== signature) {
          get().deletePreview(assetId);
          return null;
        }
        return entry.payload;
      },

      setPreview: (assetId, payload, signature = null) => {
        if (!assetId) return;

        set((state) => ({
          previewCache: pruneCache(
            {
              ...state.previewCache,
              [assetId]: {
                payload,
                signature,
                updatedAt: Date.now(),
              },
            },
            MAX_PREVIEW_ENTRIES
          ),
        }));
      },

      deletePreview: (assetId) => {
        set((state) => {
          const next = { ...state.previewCache };
          delete next[assetId];
          return { previewCache: next };
        });
      },

      clearAll: () => set({ queryCache: {}, previewCache: {} }),
    }),
    {
      name: 'gallery-picker-cache',
      version: CACHE_VERSION,
      storage,
      partialize: (state) => ({
        queryCache: state.queryCache,
        previewCache: state.previewCache,
      }),
    }
  )
);

export default useGalleryPickerCacheStore;
