import { create } from 'zustand';
import api from '../services/api';

const useOutfitStore = create((set, get) => ({
  recommendations: [],
  savedOutfits: [],
  weather: null,
  isLoading: false,
  error: null,
  selectedOccasion: 'casual',

  fetchRecommendations: async (options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({
        occasion: options.occasion || get().selectedOccasion,
      });
      if (options.lat) params.append('lat', options.lat);
      if (options.lon) params.append('lon', options.lon);

      const res = await api.get(`/outfits/recommendations?${params.toString()}`);
      set({
        recommendations: res.data.outfits || [],
        weather: res.data.weather || null,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchWeather: async (lat, lon) => {
    try {
      const res = await api.get(`/outfits/weather?lat=${lat}&lon=${lon}`);
      set({ weather: res.data });
      return res.data;
    } catch (error) {
      console.error('Weather fetch error:', error);
      return null;
    }
  },

  saveOutfit: async (payload) => {
    try {
      const res = await api.post('/outfits', payload);
      set((state) => ({
        savedOutfits: [res.data, ...state.savedOutfits],
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  fetchSavedOutfits: async () => {
    try {
      const res = await api.get('/outfits');
      set({ savedOutfits: res.data });
    } catch (error) {
      set({ error: error.message });
    }
  },

  setOccasion: (occasion) => set({ selectedOccasion: occasion }),
}));

export default useOutfitStore;

