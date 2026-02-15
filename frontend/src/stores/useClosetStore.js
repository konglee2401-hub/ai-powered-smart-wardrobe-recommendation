import { create } from 'zustand';
import api from '../services/api';

const useClosetStore = create((set, get) => ({
  clothes: [],
  filteredClothes: [],
  isLoading: false,
  error: null,
  filters: {
    category: 'all',
    color: 'all',
    season: 'all',
    search: '',
  },

  fetchClothes: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/clothes');
      const clothes = res.data;
      set({ clothes, filteredClothes: clothes, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  addClothing: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/clothes', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const item = res.data;
      set((state) => ({
        clothes: [item, ...state.clothes],
        filteredClothes: [item, ...state.filteredClothes],
        isLoading: false,
      }));
      return { success: true, data: item };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  updateClothing: async (id, data) => {
    try {
      const res = await api.put(`/clothes/${id}`, data);
      const item = res.data;
      set((state) => ({
        clothes: state.clothes.map((c) => (c._id === id ? item : c)),
        filteredClothes: state.filteredClothes.map((c) => (c._id === id ? item : c)),
      }));
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteClothing: async (id) => {
    try {
      await api.delete(`/clothes/${id}`);
      set((state) => ({
        clothes: state.clothes.filter((c) => c._id !== id),
        filteredClothes: state.filteredClothes.filter((c) => c._id !== id),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  setFilter: (key, value) => {
    const filters = { ...get().filters, [key]: value };
    set({ filters });
    get().applyFilters();
  },

  applyFilters: () => {
    const { clothes, filters } = get();
    let data = [...clothes];

    if (filters.category !== 'all') {
      data = data.filter((c) => c.category === filters.category);
    }
    if (filters.color !== 'all') {
      data = data.filter((c) => c.color === filters.color);
    }
    if (filters.season !== 'all') {
      data = data.filter(
        (c) =>
          !c.season ||
          c.season.includes(filters.season) ||
          c.season.includes('all')
      );
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.brand?.toLowerCase().includes(q)
      );
    }

    set({ filteredClothes: data });
  },

  getStats: () => {
    const { clothes } = get();
    return {
      total: clothes.length,
      favorites: clothes.filter((c) => c.isFavorite).length,
      byCategory: clothes.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {}),
    };
  },
}));

export default useClosetStore;

