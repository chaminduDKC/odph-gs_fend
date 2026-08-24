import { apiClient } from './client'
import type { InventoryItem, CreateInventoryItemRequest, PaginatedResponse } from '@shared/types'

export const inventoryApi = {
  listItems: async (search?: string, category?: string, page = 1, pageSize = 12): Promise<PaginatedResponse<InventoryItem>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (search) params.search = search
    if (category) params.category = category

    const response = await apiClient.get<PaginatedResponse<InventoryItem>>('/inventory', { params })
    return response.data
  },

  getLowStock: async (): Promise<InventoryItem[]> => {
    const response = await apiClient.get<InventoryItem[]>('/inventory/low-stock')
    return response.data
  },

  getItem: async (id: string): Promise<InventoryItem> => {
    const response = await apiClient.get<InventoryItem>(`/inventory/${id}`)
    return response.data
  },

  createItem: async (data: CreateInventoryItemRequest): Promise<InventoryItem> => {
    const response = await apiClient.post<InventoryItem>('/inventory', data)
    return response.data
  },

  updateItem: async (id: string, data: Partial<CreateInventoryItemRequest>): Promise<InventoryItem> => {
    const response = await apiClient.put<InventoryItem>(`/inventory/${id}`, data)
    return response.data
  },

  deleteItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory/${id}`)
  }
}
