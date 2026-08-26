import { apiClient } from './client'
import type {
  LedgerEntry,
  LedgerSummary,
  CreateLedgerEntryRequest,
  UpdateLedgerEntryRequest,
  PaginatedResponse,
} from '@shared/types'

interface LedgerListParams {
  page?: number
  pageSize?: number
  account?: string
  type?: string
  flow?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export const ledgerApi = {
  getSummary: async (): Promise<LedgerSummary> => {
    const response = await apiClient.get<LedgerSummary>('/ledger/summary')
    return response.data
  },

  listEntries: async (params: LedgerListParams = {}): Promise<PaginatedResponse<LedgerEntry>> => {
    const response = await apiClient.get<PaginatedResponse<LedgerEntry>>('/ledger', { params })
    return response.data
  },

  getEntry: async (id: string): Promise<LedgerEntry> => {
    const response = await apiClient.get<LedgerEntry>(`/ledger/${id}`)
    return response.data
  },

  createEntry: async (data: CreateLedgerEntryRequest): Promise<LedgerEntry> => {
    const response = await apiClient.post<LedgerEntry>('/ledger', data)
    return response.data
  },

  updateEntry: async (id: string, data: UpdateLedgerEntryRequest): Promise<LedgerEntry> => {
    const response = await apiClient.patch<LedgerEntry>(`/ledger/${id}`, data)
    return response.data
  },

  deleteEntry: async (id: string): Promise<void> => {
    await apiClient.delete(`/ledger/${id}`)
  },
}
