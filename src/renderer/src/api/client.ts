import axios from 'axios'
import { API_BASE_URL } from '../config/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: add auth token
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await window.electronAPI.getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.error('Failed to get token for request:', error)
  }
  return config
})

// Response Interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await window.electronAPI.clearToken()
        window.dispatchEvent(new CustomEvent('auth:logout'))
      } catch (e) {
        console.error('Failed to clear token on 401:', e)
      }
    }
    return Promise.reject(error)
  }
)
