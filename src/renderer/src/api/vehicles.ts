import { apiClient } from './client'
import type { Vehicle, CreateVehicleRequest, Job, PaginatedResponse } from '@shared/types'

export const vehiclesApi = {
  listVehicles: async (search?: string, page = 1, pageSize = 12, showDeleted = false): Promise<PaginatedResponse<Vehicle>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (search) params.search = search
    if (showDeleted) params.showDeleted = 'true'
    const response = await apiClient.get<PaginatedResponse<Vehicle>>('/vehicles', { params })
    return response.data
  },

  getVehicle: async (id: string): Promise<Vehicle> => {
    const response = await apiClient.get<Vehicle>(`/vehicles/${id}`)
    return response.data
  },

  createVehicle: async (data: CreateVehicleRequest): Promise<Vehicle> => {
    const response = await apiClient.post<Vehicle>('/vehicles', data)
    return response.data
  },

  updateVehicle: async (id: string, data: Partial<CreateVehicleRequest>): Promise<Vehicle> => {
    const response = await apiClient.put<Vehicle>(`/vehicles/${id}`, data)
    return response.data
  },

  deleteVehicle: async (id: string): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}`)
  },

  restoreVehicle: async (id: string): Promise<{ message: string; vehicle: Vehicle }> => {
    const response = await apiClient.patch<{ message: string; vehicle: Vehicle }>(`/vehicles/${id}/restore`)
    return response.data
  },

  permanentDeleteVehicle: async (id: string): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}/permanent`)
  },

  getVehicleJobs: async (id: string): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>(`/vehicles/${id}/jobs`)
    return response.data
  }
}
