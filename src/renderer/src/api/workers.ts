import { apiClient } from './client'
import type { Worker, CreateWorkerRequest, PaginatedResponse } from '@shared/types'

export const workersApi = {
  listWorkers: async (search?: string, page = 1, pageSize = 12): Promise<PaginatedResponse<Worker>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (search) params.search = search
    const response = await apiClient.get<PaginatedResponse<Worker>>('/workers', { params })
    return response.data
  },

  getWorker: async (id: string): Promise<Worker> => {
    const response = await apiClient.get<Worker>(`/workers/${id}`)
    return response.data
  },

  createWorker: async (data: CreateWorkerRequest): Promise<Worker> => {
    const response = await apiClient.post<Worker>('/workers', data)
    return response.data
  },

  updateWorker: async (id: string, data: Partial<CreateWorkerRequest>): Promise<Worker> => {
    const response = await apiClient.put<Worker>(`/workers/${id}`, data)
    return response.data
  },

  deleteWorker: async (id: string): Promise<void> => {
    await apiClient.delete(`/workers/${id}`)
  }
}
