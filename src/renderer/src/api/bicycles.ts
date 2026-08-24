import { apiClient } from './client'
import type { Bicycle, CreateBicycleRequest, AddBicycleExpenseRequest, SellBicycleRequest, BicycleStatus, PaginatedResponse } from '@shared/types'

export const bicyclesApi = {
  listBicycles: async (status?: BicycleStatus, page = 1, pageSize = 12): Promise<PaginatedResponse<Bicycle>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (status) params.status = status
    const response = await apiClient.get<PaginatedResponse<Bicycle>>('/bicycles', { params })
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
  addBicyclePart: async (id: string, data: AddBicycleExpenseRequest): Promise<Bicycle> => {
    console.log(id)
    console.log(data)
    const response = await apiClient.post<Bicycle>(`/bicycles/${id}/parts`, data)
    return response.data
  },
  removeBicyclePart: async (id: string, partId:string): Promise<Bicycle> => {
    const response = await apiClient.delete<Bicycle>(`/bicycles/${id}/parts/${partId}`)
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
