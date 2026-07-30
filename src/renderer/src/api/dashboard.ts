import { apiClient } from './client'
import type { DashboardStats } from '@shared/types'

export const dashboardApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/dashboard')
    return response.data
  }
}
