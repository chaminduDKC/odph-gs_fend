import { apiClient } from './client'
import type { InventoryItem, CreateInventoryItemRequest, PaginatedResponse } from '@shared/types'

export const inventoryApi = {
  listItems: async (search?: string, category?: string, page = 1, pageSize = 12, showDeleted = false): Promise<PaginatedResponse<InventoryItem>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (search) params.search = search
    if (category) params.category = category
    if (showDeleted) params.showDeleted = 'true'

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

  deleteItem: async (id: string): Promise<{ message?: string; item?: unknown } | void> => {
    const response = await apiClient.delete(`/inventory/${id}`)
    return response.data 
  },

  restoreItem: async (id: string): Promise<{ message: string; item: InventoryItem }> => {
    const response = await apiClient.patch<{ message: string; item: InventoryItem }>(`/inventory/${id}/restore`)
    return response.data
  },

  permanentDeleteItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory/${id}/permanent`)
  }
}
