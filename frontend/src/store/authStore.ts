import { create } from 'zustand';
import * as authApi from '../api/auth';
import type { User, RegisterData } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access'),

  login: async (email: string, password: string) => {
    await authApi.login(email, password);
    const user = await authApi.getMe();
    set({ user, isAuthenticated: true });
  },

  register: async (data: RegisterData) => {
    const response = await authApi.register(data);
    set({ user: response.user, isAuthenticated: true });
  },

  logout: () => {
    authApi.logout();
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
