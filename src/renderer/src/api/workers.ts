import { apiClient } from './client'
import type { Worker, CreateWorkerRequest, PaginatedResponse } from '@shared/types'

export const workersApi = {
  listWorkers: async (search?: string, page = 1, pageSize = 12, showDeleted = false): Promise<PaginatedResponse<Worker>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (search) params.search = search
    if (showDeleted) params.showDeleted = 'true'
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
  },

  restoreWorker: async (id: string): Promise<{ message: string; worker: Worker }> => {
    const response = await apiClient.patch<{ message: string; worker: Worker }>(`/workers/${id}/restore`)
    return response.data
  },

  permanentDeleteWorker: async (id: string): Promise<void> => {
    await apiClient.delete(`/workers/${id}/permanent`)
  }
}
