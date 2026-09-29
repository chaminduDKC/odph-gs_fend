import { apiClient } from './client'
import type { Job, CreateJobRequest, AddJobPartRequest, JobStatus, PaymentStatus, PaginatedResponse } from '@shared/types'

export const jobsApi = {
  listJobs: async (status?: JobStatus, page = 1, pageSize = 12, showDeleted = false): Promise<PaginatedResponse<Job>> => {
    const params: Record<string, unknown> = { page, pageSize }
    if (status) params.status = status
    if (showDeleted) params.showDeleted = 'true'
    const response = await apiClient.get<PaginatedResponse<Job>>('/jobs', { params })
    return response.data
  },

  getJob: async (id: string): Promise<Job> => {
    const response = await apiClient.get<Job>(`/jobs/${id}`)
    return response.data
  },

  createJob: async (data: CreateJobRequest): Promise<Job> => {
    const response = await apiClient.post<Job>('/jobs', data)
    return response.data
  },

  updateJob: async (id: string, data: Partial<CreateJobRequest>): Promise<Job> => {
    const response = await apiClient.put<Job>(`/jobs/${id}`, data)
    return response.data
  },

  updateJobStatus: async (id: string, status: JobStatus, paymentStatus?: PaymentStatus): Promise<Job> => {
    const response = await apiClient.patch<Job>(`/jobs/${id}/status`, { status, paymentStatus })
    return response.data
  },

  addJobPart: async (id: string, data: AddJobPartRequest): Promise<Job> => {
    const response = await apiClient.post<Job>(`/jobs/${id}/parts`, data)
    return response.data
  },

  removeJobPart: async (id: string, partId: string): Promise<void> => {
    await apiClient.delete(`/jobs/${id}/parts/${partId}`)
  },

  deleteJob: async (id: string): Promise<void> => {
    await apiClient.delete(`/jobs/${id}`)
  },

  restoreJob: async (id: string): Promise<{ message: string; job: Job }> => {
    const response = await apiClient.patch<{ message: string; job: Job }>(`/jobs/${id}/restore`)
    return response.data
  },

  permanentDeleteJob: async (id: string): Promise<void> => {
    await apiClient.delete(`/jobs/${id}/permanent`)
  },

  downloadInvoice: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/jobs/${id}/invoice`, {
      responseType: 'blob'
    })
    return response.data
  }
}
