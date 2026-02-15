import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,

  isAuthenticated: () => !!get().token,

  login: async (email, password) => {
    try {
      // Try test login first (no registration required)
      let res;
      try {
        res = await api.post('/test/login', { email, password });
      } catch (e) {
        // Fallback to regular auth login
        res = await api.post('/auth/login', { email, password });
      }
      
      const payload = res.data.success ? res.data.data : res.data;
      localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(payload.user || payload));
      set({ user: payload.user || payload, token: payload.token });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
}));

export default useAuthStore;

