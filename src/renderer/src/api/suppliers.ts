import { apiClient } from './client'
import type { Supplier, CreateSupplierRequest, PurchaseTransaction } from '@shared/types'

export const suppliersApi = {
  listSuppliers: async (search?: string): Promise<Supplier[]> => {
    const params = search ? { search } : undefined
    const response = await apiClient.get<Supplier[]>('/suppliers', { params })
    return response.data
  },

  getSupplier: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get<Supplier>(`/suppliers/${id}`)
    return response.data
  },

  createSupplier: async (data: CreateSupplierRequest): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>('/suppliers', data)
    return response.data
  },

  updateSupplier: async (id: string, data: Partial<CreateSupplierRequest>): Promise<Supplier> => {
    const response = await apiClient.put<Supplier>(`/suppliers/${id}`, data)
    return response.data
  },

  deleteSupplier: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`)
  },

  getSupplierTransactions: async (id: string): Promise<PurchaseTransaction[]> => {
    const response = await apiClient.get<PurchaseTransaction[]>(`/suppliers/${id}/transactions`)
    return response.data
  }
}
