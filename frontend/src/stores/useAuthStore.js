import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('accessToken') || localStorage.getItem('token') || null,
  access: JSON.parse(localStorage.getItem('access')) || null,

  isAuthenticated: () => !!get().token,

  login: async (email, password, rememberMe = false) => {
    try {
      const res = await api.post('/auth/login', { email, password, rememberMe });
      const payload = res?.data || res;
      const accessToken = payload?.data?.tokens?.accessToken || payload?.tokens?.accessToken || payload?.token;
      const refreshToken = payload?.data?.tokens?.refreshToken || payload?.tokens?.refreshToken || payload?.refreshToken;
      const user = payload?.data?.user || payload?.user;
      const isSuccess = payload?.success === true || !!accessToken;
      if (!isSuccess) {
        return { success: false, message: payload?.message || payload?.error || 'Login failed' };
      }
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      const accessInfo = await api.get('/auth/access').catch(() => null);
      const accessPayload = accessInfo?.data || accessInfo;
      const access = accessPayload?.data || accessPayload || null;
      if (access) {
        localStorage.setItem('access', JSON.stringify(access));
      }
      set({ user, token: accessToken || null, access });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  },

  register: async (payload = {}) => {
    try {
      const res = await api.post('/auth/register', payload);
      const body = res?.data || res;
      const accessToken = body?.data?.tokens?.accessToken || body?.tokens?.accessToken || body?.token;
      const refreshToken = body?.data?.tokens?.refreshToken || body?.tokens?.refreshToken || body?.refreshToken;
      const user = body?.data?.user || body?.user;
      const isSuccess = body?.success === true || !!accessToken;
      if (!isSuccess) {
        return { success: false, message: body?.message || body?.error || 'Register failed' };
      }
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      const accessInfo = await api.get('/auth/access').catch(() => null);
      const accessPayload = accessInfo?.data || accessInfo;
      const access = accessPayload?.data || accessPayload || null;
      if (access) {
        localStorage.setItem('access', JSON.stringify(access));
      }
      set({ user, token: accessToken || null, access });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Register failed',
      };
    }
  },

  googleLogin: async (idToken, rememberMe = false) => {
    try {
      const res = await api.post('/auth/google', { idToken, rememberMe });
      const payload = res?.data || res;
      const accessToken = payload?.data?.tokens?.accessToken || payload?.tokens?.accessToken || payload?.token;
      const refreshToken = payload?.data?.tokens?.refreshToken || payload?.tokens?.refreshToken || payload?.refreshToken;
      const user = payload?.data?.user || payload?.user;
      const isSuccess = payload?.success === true || !!accessToken;
      if (!isSuccess) {
        return { success: false, message: payload?.message || payload?.error || 'Google login failed' };
      }
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      const accessInfo = await api.get('/auth/access').catch(() => null);
      const accessPayload = accessInfo?.data || accessInfo;
      const access = accessPayload?.data || accessPayload || null;
      if (access) {
        localStorage.setItem('access', JSON.stringify(access));
      }
      set({ user, token: accessToken || null, access });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Google login failed',
      };
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('access');
    set({ user: null, token: null, access: null });
  },
}));

export default useAuthStore;

