import { apiClient } from './client'
import type { Customer, CreateCustomerRequest, Vehicle, PaginatedResponse } from '@shared/types'

export const customersApi = {
  listCustomers: async (search?: string, page = 1, pageSize = 12): Promise<PaginatedResponse<Customer>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (search) params.search = search
    const response = await apiClient.get<PaginatedResponse<Customer>>('/customers', { params })
    return response.data
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<Customer>(`/customers/${id}`)
    return response.data
  },

  createCustomer: async (data: CreateCustomerRequest): Promise<Customer> => {
    const response = await apiClient.post<Customer>('/customers', data)
    return response.data
  },

  updateCustomer: async (id: string, data: Partial<CreateCustomerRequest>): Promise<Customer> => {
    const response = await apiClient.put<Customer>(`/customers/${id}`, data)
    return response.data
  },

  deleteCustomer: async (id: string): Promise<void> => {
    const response = await apiClient.delete(`/customers/${id}`)
    return response.data;
  },

  getCustomerVehicles: async (id: string): Promise<Vehicle[]> => {
    const response = await apiClient.get<Vehicle[]>(`/customers/${id}/vehicles`)
    return response.data
  }
}
