import { create } from 'zustand'
import { User, LoginRequest } from '@shared/types'
import { authApi } from '../api/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials) => {
    try {
      const { token, user } = await authApi.login(credentials)
      await window.electronAPI.storeToken(token)
      set({ user, isAuthenticated: true })
    } catch (error) {
      throw error
    }
  },

  logout: async () => {
    try {
      await window.electronAPI.clearToken()
      set({ user: null, isAuthenticated: false })
    } catch (error) {
      console.error('Logout error:', error)
    }
  },

  initAuth: async () => {
    try {
      set({ isLoading: true })
      const token = await window.electronAPI.getToken()
      if (token) {
        const user = await authApi.getMe()
        set({ user, isAuthenticated: true })
      } else {
        set({ user: null, isAuthenticated: false })
      }
    } catch (error) {
      console.error('Auth init error:', error)
      await window.electronAPI.clearToken()
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  }
}))

// Listen for the custom logout event from the axios interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout()
  })
}
