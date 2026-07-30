import { apiClient } from './client'
import type { Bicycle, CreateBicycleRequest, AddBicycleExpenseRequest, SellBicycleRequest, BicycleStatus } from '@shared/types'

export const bicyclesApi = {
  listBicycles: async (status?: BicycleStatus): Promise<Bicycle[]> => {
    const params = status ? { status } : undefined
    const response = await apiClient.get<Bicycle[]>('/bicycles', { params })
    return response.data
  },

  getBicycle: async (id: string): Promise<Bicycle> => {
    const response = await apiClient.get<Bicycle>(`/bicycles/${id}`)
    return response.data
  },

  createBicycle: async (data: CreateBicycleRequest): Promise<Bicycle> => {
    const response = await apiClient.post<Bicycle>('/bicycles', data)
    return response.data
  },

  updateBicycle: async (id: string, data: Partial<CreateBicycleRequest>): Promise<Bicycle> => {
    const response = await apiClient.put<Bicycle>(`/bicycles/${id}`, data)
    return response.data
  },

  deleteBicycle: async (id: string): Promise<void> => {
    await apiClient.delete(`/bicycles/${id}`)
  },

  addExpense: async (id: string, data: AddBicycleExpenseRequest): Promise<Bicycle> => {
    const response = await apiClient.post<Bicycle>(`/bicycles/${id}/expenses`, data)
    return response.data
  },

  sellBicycle: async (id: string, data: SellBicycleRequest): Promise<Bicycle> => {
    const response = await apiClient.patch<Bicycle>(`/bicycles/${id}/sell`, data)
    return response.data
  },
  
  updateStatus: async (id: string, status: BicycleStatus): Promise<Bicycle> => {
    const response = await apiClient.put<Bicycle>(`/bicycles/${id}`, { status })
    return response.data
  }
}
