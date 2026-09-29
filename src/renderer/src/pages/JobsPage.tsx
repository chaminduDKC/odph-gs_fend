import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Download, ShieldCheck, Trash2, CheckCircle2, CreditCard, Pencil, Package, ExternalLink, Trash, RotateCcw } from 'lucide-react'
import { jobsApi } from '../api/jobs'
import { vehiclesApi } from '../api/vehicles'
import { customersApi } from '../api/customers'
import { inventoryApi } from '../api/inventory'
import { workersApi } from '../api/workers'
import { suppliersApi } from '../api/suppliers'
import { PageHeader } from '../components/PageHeader'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { Pagination } from '../components/Pagination'
import { Job, JobStatus, PaymentStatus, Vehicle, Customer } from '@shared/types'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { isAxiosError } from 'axios'
import { MessageDialog } from '@renderer/components/MessageDialog'
import { useF1Shortcut } from '../hooks/useF1Shortcut'

export const JobsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<JobStatus | ''>('')
  const [page, setPage] = useState(1)
  const [showDeleted, setShowDeleted] = useState(false)
  
  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [viewJobId, setViewJobId] = useState<string | null>(null)
  
  const [downloading, setDownloading] = useState(false)
  // Form State
  const [vehicleId, setVehicleId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [restoreJobId, setRestoreJobId] = useState<string | null>(null)
  const [permanentDeleteJobId, setPermanentDeleteJobId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [laborCost, setLaborCost] = useState('0')
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  
  // Add Part State
  const [partMode, setPartMode] = useState<'inventory' | 'external'>('inventory')
  const [partItemId, setPartItemId] = useState('')
  const [partQty, setPartQty] = useState('1')
  // External part fields
  const [extPartName, setExtPartName] = useState('')
  const [extBuyPrice, setExtBuyPrice] = useState('')
  const [extSellingPrice, setExtSellingPrice] = useState('')
  const [extSupplierId, setExtSupplierId] = useState('')
  // Inline supplier creation
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierContact, setNewSupplierContact] = useState('')

  // Add Vehicle State (inside Create Job Modal)
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [newRegNumber, setNewRegNumber] = useState('')
  const [newMake, setNewMake] = useState('')
  const [newModel, setNewModel] = useState('')
  const [newVehicleCustomerId, setNewVehicleCustomerId] = useState('')

  // Add Customer Quick State (inside Add Vehicle Modal)
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustAddress, setNewCustAddress] = useState('')

  // Edit Labor Cost State
  const [isEditLaborOpen, setIsEditLaborOpen] = useState(false)
  const [editLaborValue, setEditLaborValue] = useState('0')
  const [messageDialog, setMessageDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  useF1Shortcut(() => {
    resetForm()
    setIsNewOpen(true)
  }, isNewOpen || !!viewJobId || isEditLaborOpen || !!deletingId || !!messageDialog || isCreatingSupplier || isAddVehicleOpen || isAddCustomerOpen)

  useEffect(() => {
    setPage(1)
  }, [filterStatus, showDeleted])

  const { data: jobData, isLoading } = useQuery({
    queryKey: ['jobs', filterStatus, page, showDeleted],
    queryFn: () => jobsApi.listJobs(filterStatus as JobStatus || undefined, page, 12, showDeleted)
  })

  useEffect(() => {
    if (jobData && page < jobData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['jobs', filterStatus, page + 1, showDeleted],
        queryFn: () => jobsApi.listJobs(filterStatus as JobStatus || undefined, page + 1, 12, showDeleted)
      })
    }
  }, [jobData, page, filterStatus, showDeleted, queryClient])

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'all'],
    queryFn: async () => (await vehiclesApi.listVehicles(undefined, 1, 1000)).data
  })
  const { data: workers = [] } = useQuery({
    queryKey: ['workers', 'all'],
    queryFn: async () => (await workersApi.listWorkers(undefined, 1, 1000)).data
  })
  const { data: items = [] } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => (await inventoryApi.listItems(undefined, undefined, 1, 1000)).data
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: async () => (await suppliersApi.listSuppliers(undefined, 1, 1000)).data
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => (await customersApi.listCustomers(undefined, 1, 1000)).data
  })

  const { data: jobDetails } = useQuery({
    queryKey: ['job', viewJobId],
    queryFn: () => jobsApi.getJob(viewJobId!),
    enabled: !!viewJobId
  })

  if(jobDetails){
    console.log(jobDetails);
    
  }

  const createMutation = useMutation({
    mutationFn: jobsApi.createJob,
    onSuccess: () => {
      
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsNewOpen(false)
      resetForm()
    }
  })

  const statusMutation = useMutation({
    mutationFn: (data: { id: string; status: JobStatus; paymentStatus?: PaymentStatus }) => 
      jobsApi.updateJobStatus(data.id, data.status, data.paymentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
       queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['job', viewJobId] })
    }
  })

  const addPartMutation = useMutation({
    mutationFn: (data: { id: string } & Parameters<typeof jobsApi.addJobPart>[1]) => {
      const { id, ...payload } = data
      return jobsApi.addJobPart(id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', viewJobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      setPartItemId('')
      setPartQty('1')
      setExtPartName('')
      setExtBuyPrice('')
      setExtSellingPrice('')
      setExtSupplierId('')
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Failed to Add Part', message: error.response?.data?.message || 'Error adding part' })
      }
    }
  })

  const createSupplierMutation = useMutation({
    mutationFn: (data: { name: string; contact?: string }) => suppliersApi.createSupplier(data),
    onSuccess: (newSupp) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setExtSupplierId(newSupp.id)
      setIsCreatingSupplier(false)
      setNewSupplierName('')
      setNewSupplierContact('')
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Failed to Create Supplier', message: error.response?.data?.message || 'Error creating supplier' })
      }
    }
  })

  const createVehicleMutation = useMutation({
    mutationFn: (data: { regNumber: string; make: string; model: string; customerId: string }) =>
      vehiclesApi.createVehicle(data),
    onSuccess: (newVehicle) => {
      queryClient.setQueryData<Vehicle[]>(['vehicles', 'all'], (old) => {
        return old ? [newVehicle, ...old] : [newVehicle]
      })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setVehicleId(newVehicle.id)
      setIsAddVehicleOpen(false)
      setNewRegNumber('')
      setNewMake('')
      setNewModel('')
      setNewVehicleCustomerId('')
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setMessageDialog({
          type: 'error',
          title: 'Cannot Create Vehicle',
          message: error.response?.data?.message || 'Failed to create vehicle'
        })
      }
    }
  })

  const createCustomerMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; address?: string }) =>
      customersApi.createCustomer(data),
    onSuccess: (newCustomer) => {
      queryClient.setQueryData<Customer[]>(['customers', 'all'], (old) => {
        return old ? [newCustomer, ...old] : [newCustomer]
      })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setNewVehicleCustomerId(newCustomer.id)
      setIsAddCustomerOpen(false)
      setNewCustName('')
      setNewCustPhone('')
      setNewCustAddress('')
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        setMessageDialog({
          type: 'error',
          title: 'Cannot Create Customer',
          message: error.response?.data?.message || 'Failed to create customer'
        })
      }
    }
  })

  const removePartMutation = useMutation({
    mutationFn: (data: { jobId: string; partId: string }) =>
      jobsApi.removeJobPart(data.jobId, data.partId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', viewJobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
       queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  const updateLaborMutation = useMutation({
    mutationFn: (data: { id: string; laborCost: number }) =>
      jobsApi.updateJob(data.id, { laborCost: data.laborCost }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', viewJobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
       queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsEditLaborOpen(false)
    }
  })

  const resetForm = () => {
    setVehicleId('')
    setDescription('')
    setLaborCost('0')
    setSelectedWorkers([])
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      vehicleId,
      description,
      laborCost: Number(laborCost),
      workerIds: selectedWorkers
    })
  }

  const downloadInvoice = async (id: string) => {
    try {
      setDownloading(true)
      const blob = await jobsApi.downloadInvoice(id)
      const arrayBuffer = await blob.arrayBuffer();
      
      const fileName = `job_invoice_${id}.pdf`
      const subFolder = "invoices"
      const result = await window.api.pdf.savePdfAndOpen(fileName, arrayBuffer, subFolder)
      
      
      if (!result.success) {
        console.log(result.error)
      setDownloading(false)
      return
    }
     
    } catch (err) {
      console.error('Failed to download invoice', err)
    }
    finally{
      setDownloading(false)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: jobsApi.deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      setDeletingId("")
    },
    onError(error: unknown) {
      if (isAxiosError(error)) {
        console.log(error.response?.data)
        setMessageDialog({ type: 'error', title: 'Cannot Delete', message: error.response?.data.message })
      }
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => jobsApi.restoreJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
      setRestoreJobId(null)
      setMessageDialog({ type: 'success', title: 'Restored', message: 'Job card restored successfully.' })
    },
    onError: (error: unknown) => {
      setRestoreJobId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Restore', message: error.response?.data.message || 'Failed to restore job' })
      }
    }
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => jobsApi.permanentDeleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setPermanentDeleteJobId(null)
      setMessageDialog({ type: 'success', title: 'Permanently Deleted', message: 'Job card permanently deleted from database.' })
    },
    onError: (error: unknown) => {
      setPermanentDeleteJobId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Delete Permanently', message: error.response?.data.message || 'Failed to permanently delete job' })
      }
    }
  })

  const columns: Column<Job>[] = [
    { header: 'Job Number', accessorKey: 'jobNumber' },
    { header: 'Vehicle', accessorFn: (row) => row.vehicle?.regNumber || '-' },
    { header: 'Date', accessorFn: (row) => new Date(row.receivedDate).toLocaleDateString('en-LK') },
    { header: 'Job', accessorFn: (row) => `${row.description}` },
    { header: 'Status', cell: ({ row }) => <StatusBadge status={row.status} type="job" /> },
    { header: 'Payment', cell: ({ row }) => <StatusBadge status={row.paymentStatus} type="payment" /> },
    { header: 'Total', accessorFn: (row) => `Rs. ${Number(row.totalBill).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}` },
    {
      header: 'Actions',
      cell: ({ row }) => (row as any).isDeleted ? (
        <div className="flex gap-2 items-center">
          <button 
            className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 flex items-center gap-1"
            onClick={() => setViewJobId(row.id)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button 
            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20 flex items-center gap-1"
            onClick={() => setRestoreJobId(row.id)}
            title="Restore Job"
          >
            <RotateCcw size={16} />
          </button>
          <button 
            className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 flex items-center gap-1"
            onClick={() => setPermanentDeleteJobId(row.id)}
            title="Delete Permanently"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button 
            className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 flex items-center gap-1"
            onClick={() => setViewJobId(row.id)}
          >
            <Eye size={16} />
          </button>
          <button className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 flex items-center gap-1" onClick={()=> setDeletingId(row.id)}>
             <Trash2 size={16} /> 
          </button>
        </div>
      )
    }
  ]

  const tabs: { label: string, value: JobStatus | '' }[] = [
    { label: 'All', value: '' },
    { label: 'Received', value: 'RECEIVED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Delivered', value: 'DELIVERED' }
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Job Cards" 
        action={
          <div className="flex gap-2 items-center">
            <button
              className={`btn ${showDeleted ? 'btn-danger' : 'btn-secondary'} flex items-center gap-2`}
              onClick={() => { setShowDeleted(v => !v); setPage(1) }}
            >
              <Trash size={16} />
              {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
            </button>
            {!showDeleted && (
              <button className="btn btn-primary" onClick={() => setIsNewOpen(true)}>
                <Plus size={18} /> New Job
              </button>
            )}
          </div>
        }
      />

      {showDeleted && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <Trash size={14} />
          Showing deleted jobs. These job cards are soft-deleted.
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar pb-2">
        {tabs.map(tab => (
          <button
            key={tab.value}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterStatus === tab.value 
                ? 'bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/20' 
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
            onClick={() => setFilterStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        data={jobData?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        rowClassName={(row) => (row as any).isDeleted ? 'opacity-60 bg-red-500/5' : ''}
      />

      <Pagination
        page={page}
        totalPages={jobData?.totalPages ?? 1}
        total={jobData?.total}
        pageSize={jobData?.pageSize}
        onPageChange={setPage}
      />

      {/* New Job Modal */}
      <Modal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title="Create New Job">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="flex flex-col mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                onClick={() => setIsAddVehicleOpen(true)}
              >
                <Plus size={14} /> New Vehicle
              </button>
            </div>
            <div className="flex gap-2">
              <select
                autoFocus
                required
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-md px-3 py-2 text-sm text-white transition-colors custom-scrollbar"
              >
                <option value="">Select a vehicle...</option>
                {vehicles.map((v:any) => (
                  <option key={v.id} value={v.id}>{v.regNumber} - {v.make} {v.model}</option>
                ))}
              </select>
              
            </div>
          </div>
          
          <FormField label="Job Description / Complaints" as="textarea" rows={3} required value={description} onChange={e => setDescription(e.target.value)} />
          
          <FormField label="Estimated Labor Cost (Rs.)" type="number" required min="0" value={laborCost} onChange={e => setLaborCost(e.target.value)} />
          
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Assign Workers (Optional)</label>
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-3 max-h-40 overflow-y-auto custom-scrollbar">
              {workers.filter(w => w.active).map(w => (
                <label key={w.id} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                    checked={selectedWorkers.includes(w.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedWorkers(prev => [...prev, w.id])
                      else setSelectedWorkers(prev => prev.filter(id => id !== w.id))
                    }}
                  />
                  <span className="text-sm">{w.name} ({w.role || 'Worker'})</span>
                </label>
              ))}
              {workers.filter((w:any) => w.active).length === 0 && <span className="text-xs text-[var(--color-text-muted)]">No active workers found.</span>}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={() => setIsNewOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Job Detail View Modal */}
      <Modal isOpen={!!viewJobId} onClose={() => setViewJobId(null)} title={jobDetails ? `Job ${jobDetails.jobNumber}` : 'Job Details'} size="xl">
        {jobDetails && (
          <div className="space-y-6">
            {(jobDetails as any).isDeleted && (
              <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                <Trash2 size={16} />
                <span>This job is deleted. Details cannot be changed.</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card bg-[var(--color-bg-secondary)] p-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Vehicle</p>
                <p className="font-semibold text-lg">{jobDetails.vehicle?.regNumber}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{jobDetails.vehicle?.make} {jobDetails.vehicle?.model}</p>
              </div>
              <div className="card bg-[var(--color-bg-secondary)] p-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Job Status</p>
                <div className="flex flex-col gap-2 mt-1">
                  <StatusBadge status={jobDetails.status} type="job" />
                  <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-1">Mark as:</p>
                  <div className="flex flex-wrap gap-1">
                    {(['RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'] as JobStatus[]).map((st) => (
                      <button
                        key={st}
                        disabled={(jobDetails as any).isDeleted || jobDetails.status === st || statusMutation.isPending}
                        onClick={() => {statusMutation.mutate({ id: jobDetails.id, status: st })}}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          jobDetails.status === st
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)] cursor-default'
                            : (jobDetails as any).isDeleted
                            ? 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50 cursor-not-allowed'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-white'
                        }`}
                      >
                     
                        {st === 'IN_PROGRESS' ? 'In Progress' : st.charAt(0) + st.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card bg-[var(--color-bg-secondary)] p-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Payment Status</p>
                <div className="flex flex-col gap-2 mt-1">
                  <StatusBadge status={jobDetails.paymentStatus} type="payment" />
                  <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-1">Mark payment as:</p>
                  <div className="flex flex-wrap gap-1">
                    {(['DUE', 'PAID'] as PaymentStatus[]).map((st) => (
                      <button
                        key={st}
                        disabled={(jobDetails as any).isDeleted || jobDetails.paymentStatus === st || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: jobDetails.id, status: jobDetails.status, paymentStatus: st })}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          jobDetails.paymentStatus === st
                            ? 'border-green-500 bg-green-500/20 text-green-400 cursor-default'
                            : (jobDetails as any).isDeleted
                            ? 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50 cursor-not-allowed'
                            : st === 'PAID'
                            ? 'border-green-600 text-green-400 hover:bg-green-500/20 cursor-pointer'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-white cursor-pointer'
                        }`}
                      >
                        
                        {st === 'PAID' ? '✓ Mark PAID' : 'DUE'}
                      </button>
                    ))}
                  </div>
                  
                </div>
              </div>
            </div>

            <ConfirmDialog isOpen={statusMutation.isPending } message='Job Status is Updating... ' title='Please Wait' onClose={()=> {}} onConfirm={()=> {}}  isLoading={statusMutation.isPending}/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-4">
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] p-3 rounded">
                  {jobDetails.description}
                </p>
              </div>

              <div className="card p-4">
                <h4 className="font-semibold mb-2">Assigned Workers</h4>
                {jobDetails.workers && jobDetails.workers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {jobDetails.workers.map((w: any, i: number) => (
                      <p
                        key={w.workerId ?? i}
                        className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] p-3 rounded"
                      >
                        {w.worker.name}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] p-3 rounded">
                    No workers Assigned
                  </p>
                )}
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
                <h4 className="font-semibold flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--color-accent)]" /> Attached Parts</h4>
              </div>
              <div className="p-4 bg-[var(--color-bg-primary)]">
                {jobDetails.parts && jobDetails.parts.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                        <th className="pb-2 font-medium">Part Name</th>
                        <th className="pb-2 font-medium text-right">Qty</th>
                        <th className="pb-2 font-medium text-right">Cost Price</th>
                        <th className="pb-2 font-medium text-right">Selling Price</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                        <th className="pb-2 font-medium text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobDetails.parts && jobDetails.parts.map((part: any) => (
                        <tr key={part.id} className="border-b border-[var(--color-border)]/50 hover:bg-white/5">
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              {part.isExternal ? (
                                <>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold uppercase tracking-wider">
                                    External
                                  </span>
                                  <span>{part.partName || 'External Part'}</span>
                                  {part.supplier && (
                                    <span className="text-xs text-[var(--color-text-muted)]">
                                      ({part.supplier.name})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span>{part.item?.name || 'Unknown Item'}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 text-right">{part.quantity}</td>
                          <td className="py-2 text-right">Rs. {Number(part.unitPriceSnapshot).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td className="py-2 text-right">Rs. {Number(part.sellingPriceSnapshot || part.unitPriceSnapshot).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td className="py-2 text-right font-medium">Rs. {(part.quantity * Number(part.sellingPriceSnapshot || part.unitPriceSnapshot)).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => removePartMutation.mutate({ jobId: jobDetails.id, partId: part.id })}
                              disabled={(jobDetails as any).isDeleted || removePartMutation.isPending || addPartMutation.isPending || jobDetails.paymentStatus !== "DUE"}
                              className={`p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors ${(jobDetails as any).isDeleted ? 'opacity-40 cursor-not-allowed' : ''}`}
                              title={(jobDetails as any).isDeleted ? "Cannot remove part from deleted job" : "Remove part"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] italic py-2">No parts attached yet.</p>
                )}

                {/* Add Part Section */}
                <div className="mt-4 bg-[var(--color-bg-secondary)] p-3.5 rounded border border-[var(--color-border)]">
                  {/* Mode Selector Tabs */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      disabled={(jobDetails as any).isDeleted}
                      onClick={() => setPartMode('inventory')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded font-medium transition-colors ${
                        partMode === 'inventory'
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-white border border-[var(--color-border)]'
                      } ${(jobDetails as any).isDeleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Package size={13} /> Inventory Part
                    </button>
                    <button
                      type="button"
                      disabled={(jobDetails as any).isDeleted}
                      onClick={() => setPartMode('external')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded font-medium transition-colors ${
                        partMode === 'external'
                          ? 'bg-amber-600 text-white'
                          : 'bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-white border border-[var(--color-border)]'
                      } ${(jobDetails as any).isDeleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <ExternalLink size={13} /> External Part
                    </button>
                  </div>

                  {partMode === 'inventory' ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if ((jobDetails as any).isDeleted) return;
                        if (partItemId && partQty) {
                          addPartMutation.mutate({
                            id: jobDetails.id,
                            isExternal: false,
                            itemId: partItemId,
                            quantity: Number(partQty)
                          });
                        }
                      }} 
                      className="flex gap-2 items-end"
                    >
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Select Inventory Item</label>
                        <select 
                          className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          value={partItemId} onChange={e => setPartItemId(e.target.value)} required
                          disabled={(jobDetails as any).isDeleted}
                        >
                          <option value="">-- Select Inventory Item --</option>
                          {items.map(item => (
                            <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                              {item.name} (Stock: {item.quantity}) - Rs. {item.sellingPrice}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Qty</label>
                        <input 
                          type="number" min="1" required value={partQty} onChange={e => setPartQty(e.target.value)}
                          disabled={(jobDetails as any).isDeleted}
                          className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <button type="submit" disabled={(jobDetails as any).isDeleted || addPartMutation.isPending || jobDetails.paymentStatus !== "DUE"} className="btn btn-primary py-1.5 px-3 h-[34px] disabled:opacity-50 disabled:cursor-not-allowed">
                        <Plus size={16} /> Add
                      </button>
                    </form>
                  ) : (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if ((jobDetails as any).isDeleted) return;
                        if (extPartName && extBuyPrice && extSellingPrice && partQty) {
                          addPartMutation.mutate({
                            id: jobDetails.id,
                            isExternal: true,
                            partName: extPartName.trim(),
                            buyPrice: Number(extBuyPrice),
                            sellingPrice: Number(extSellingPrice),
                            supplierId: extSupplierId || null,
                            quantity: Number(partQty)
                          });
                        }
                      }} 
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Part Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Brake Caliper, Spark Plug"
                            required
                            value={extPartName}
                            onChange={e => setExtPartName(e.target.value)}
                            disabled={(jobDetails as any).isDeleted}
                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Qty *</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={partQty}
                            onChange={e => setPartQty(e.target.value)}
                            disabled={(jobDetails as any).isDeleted}
                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Buy Price (Rs.) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Cost paid"
                            required
                            value={extBuyPrice}
                            onChange={e => setExtBuyPrice(e.target.value)}
                            disabled={(jobDetails as any).isDeleted}
                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Selling Price (Rs.) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Charged to customer"
                            required
                            value={extSellingPrice}
                            onChange={e => setExtSellingPrice(e.target.value)}
                            disabled={(jobDetails as any).isDeleted}
                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Supplier</label>
                            <button
                              type="button"
                              disabled={(jobDetails as any).isDeleted}
                              onClick={() => setIsCreatingSupplier(true)}
                              className="text-[11px] text-[var(--color-accent)] hover:underline flex items-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                            >
                              <Plus size={11} /> New Supplier
                            </button>
                          </div>
                          <select
                            value={extSupplierId}
                            onChange={e => setExtSupplierId(e.target.value)}
                            disabled={(jobDetails as any).isDeleted}
                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">-- Optional Supplier --</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          ℹ️ External parts deduct cost from <strong className="text-amber-400">Owner Cash</strong> via an External Parts ledger record.
                        </span>
                        <button
                          type="submit"
                          disabled={(jobDetails as any).isDeleted || addPartMutation.isPending || jobDetails.paymentStatus !== "DUE"}
                          className="btn btn-primary py-1.5 px-4 h-[34px] bg-amber-600 hover:bg-amber-500 border-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus size={16} /> Add External Part
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
              <div className="bg-[var(--color-bg-secondary)] p-4 border-t border-[var(--color-border)]">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-[var(--color-text-secondary)] flex items-center gap-2">
                    Labor Cost
                    <button
                      disabled={(jobDetails as any).isDeleted || jobDetails.paymentStatus !== "DUE"}
                      onClick={() => { setEditLaborValue(String(Number(jobDetails.laborCost)));  setIsEditLaborOpen(true) }}
                      className={`p-0.5 text-(--color-text-muted) hover:text-(--color-accent) transition-colors ${(jobDetails as any).isDeleted || jobDetails.paymentStatus !== "DUE" ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      title={(jobDetails as any).isDeleted ? "Cannot edit labor on deleted job" : "Edit labor cost"}
                    >
                      <Pencil size={12} />
                    </button>
                    {(jobDetails as any).isDeleted ? (
                      <p className='text-red-400'>This job is deleted and cannot be modified</p>
                    ) : jobDetails.paymentStatus !== "DUE" && (
                      <p className='text-red-400'>You cannot change labor cost or add parts if the JOB was Paid</p>
                    )}
                  </span>
                  <span>Rs. {Number(jobDetails.laborCost).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-1 text-[var(--color-text-secondary)]">
                  <span>Parts Subtotal</span>
                  <span>Rs. {(jobDetails.parts || []).reduce((s, p) => s + p.quantity * Number(p.unitPriceSnapshot), 0).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-1 text-[var(--color-success)]">
                  <span>Parts Profit</span>
                  <span>Rs. {(Number((jobDetails.parts || []).reduce((s, p) => s + p.quantity * Number(p.sellingPriceSnapshot), 0)) - Number((jobDetails.parts || []).reduce((s, p) => s + p.quantity * Number(p.unitPriceSnapshot), 0))).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg text-[var(--color-accent)] mt-2 pt-2 border-t border-[var(--color-border)]">
                  <span>Total Bill</span>
                  <span>Rs. {Number(jobDetails.totalBill).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-[var(--color-border)] pt-4">
              <button className="btn btn-secondary" onClick={() => setViewJobId(null)}>Close</button>
              <button disabled={downloading} className="btn btn-primary" onClick={() => downloadInvoice(jobDetails.id)}>
                <Download size={18} /> {downloading ? "Downloading" : "Download invoice"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Labor Cost Modal */}
      <Modal isOpen={isEditLaborOpen} onClose={() => setIsEditLaborOpen(false)} title="Update Labor Cost" size="sm">
        {viewJobId && (
          <form onSubmit={(e) => { e.preventDefault(); updateLaborMutation.mutate({ id: viewJobId, laborCost: Number(editLaborValue) }) }} className="space-y-4">
            <FormField
              label="Labor Cost (Rs.)"
              type="number"
              min="0"
              step="0.01"
              required
              value={editLaborValue}
              onChange={e => setEditLaborValue(e.target.value)}
            />
            <p className="text-xs text-[var(--color-text-muted)]">Total Bill will be recalculated as: Labor + all attached parts.</p>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditLaborOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={(jobDetails as any)?.isDeleted || updateLaborMutation.isPending}>
                {updateLaborMutation.isPending ? 'Saving...' : 'Save Labor Cost'}
              </button>
            </div>
          </form>
        )}
      </Modal>
        {messageDialog && (
                    <MessageDialog
                      isOpen={true}
                      onClose={() => setMessageDialog(null)}
                      type={messageDialog.type}
                      title={messageDialog.title}
                      message={messageDialog.message}
                    />
                  )}

       <ConfirmDialog
              isOpen={!!deletingId}
              onClose={() => setDeletingId("")}
              onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
              title="Delete Job"
              message="Are you sure you want to delete this job? This record will be soft-deleted."
              isLoading={deleteMutation.isPending}
            />

       <ConfirmDialog
              isOpen={!!restoreJobId}
              onClose={() => setRestoreJobId(null)}
              onConfirm={() => restoreJobId && restoreMutation.mutate(restoreJobId)}
              title="Restore Job"
              message="Are you sure you want to restore this job card? It will become active again."
              isLoading={restoreMutation.isPending}
              confirmLabel="Restore"
              confirmVariant="success"
            />

       <ConfirmDialog
              isOpen={!!permanentDeleteJobId}
              onClose={() => setPermanentDeleteJobId(null)}
              onConfirm={() => permanentDeleteJobId && permanentDeleteMutation.mutate(permanentDeleteJobId)}
              title="Delete Job Permanently"
              message="Are you sure you want to permanently delete this job card from the database? This action CANNOT be undone."
              isLoading={permanentDeleteMutation.isPending}
              confirmLabel="Delete Permanently"
              confirmVariant="danger"
            />

      {/* New Supplier Quick Modal */}
      <Modal isOpen={isCreatingSupplier} onClose={() => setIsCreatingSupplier(false)} title="Add New Supplier" size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newSupplierName.trim()) {
              createSupplierMutation.mutate({
                name: newSupplierName.trim(),
                contact: newSupplierContact.trim() || undefined
              });
            }
          }}
          className="space-y-4"
        >
          <FormField
            label="Supplier Name"
            type="text"
            required
            autoFocus
            placeholder="e.g. Auto Zone Distributors"
            value={newSupplierName}
            onChange={e => setNewSupplierName(e.target.value)}
          />
          <FormField
            label="Contact Info / Phone (Optional)"
            type="text"
            placeholder="e.g. 0771234567"
            value={newSupplierContact}
            onChange={e => setNewSupplierContact(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreatingSupplier(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createSupplierMutation.isPending}
            >
              {createSupplierMutation.isPending ? 'Adding...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Vehicle Modal */}
      <Modal
        isOpen={isAddVehicleOpen}
        onClose={() => {
          if (isAddCustomerOpen) return
          setIsAddVehicleOpen(false)
          setNewRegNumber('')
          setNewMake('')
          setNewModel('')
          setNewVehicleCustomerId('')
        }}
        title="Add New Vehicle"
        size="md"
        zIndex={60}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newRegNumber.trim() && newMake.trim() && newModel.trim() && newVehicleCustomerId) {
              createVehicleMutation.mutate({
                regNumber: newRegNumber.trim(),
                make: newMake.trim(),
                model: newModel.trim(),
                customerId: newVehicleCustomerId
              })
            }
          }}
          className="space-y-4"
        >
          <FormField
            autoFocus
            label="Registration Number"
            required
            placeholder="e.g. CAB-1234"
            value={newRegNumber}
            onChange={e => setNewRegNumber(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Make (e.g. Toyota)"
              required
              placeholder="e.g. Toyota"
              value={newMake}
              onChange={e => setNewMake(e.target.value)}
            />
            <FormField
              label="Model (e.g. Corolla)"
              required
              placeholder="e.g. Corolla"
              value={newModel}
              onChange={e => setNewModel(e.target.value)}
            />
          </div>
          <div className="flex flex-col mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Owner (Customer) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                onClick={() => setIsAddCustomerOpen(true)}
              >
                <Plus size={14} /> New Customer
              </button>
            </div>
            <div className="flex gap-2">
              <select
                required
                value={newVehicleCustomerId}
                onChange={e => setNewVehicleCustomerId(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-md px-3 py-2 text-sm text-white transition-colors custom-scrollbar"
              >
                <option value="">Select an owner...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsAddVehicleOpen(false)
                setNewRegNumber('')
                setNewMake('')
                setNewModel('')
                setNewVehicleCustomerId('')
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                createVehicleMutation.isPending ||
                !newRegNumber.trim() ||
                !newMake.trim() ||
                !newModel.trim() ||
                !newVehicleCustomerId
              }
            >
              {createVehicleMutation.isPending ? 'Saving...' : 'Save & Select Vehicle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => {
          setIsAddCustomerOpen(false)
          setNewCustName('')
          setNewCustPhone('')
          setNewCustAddress('')
        }}
        title="Add New Customer"
        size="md"
        zIndex={80}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newCustName.trim() && newCustPhone.trim()) {
              createCustomerMutation.mutate({
                name: newCustName.trim(),
                phone: newCustPhone.trim(),
                address: newCustAddress.trim() || undefined
              })
            }
          }}
          className="space-y-4"
        >
          <FormField
            autoFocus
            label="Full Name"
            required
            placeholder="e.g. John Doe"
            value={newCustName}
            onChange={e => setNewCustName(e.target.value)}
          />
          <FormField
            label="Phone Number"
            type="text"
            required
            placeholder="e.g. 0771234567"
            value={newCustPhone}
            onChange={e => setNewCustPhone(e.target.value)}
          />
          <FormField
            label="Address"
            as="textarea"
            rows={3}
            placeholder="e.g. 123 Main St, Colombo (Optional)"
            value={newCustAddress}
            onChange={e => setNewCustAddress(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsAddCustomerOpen(false)
                setNewCustName('')
                setNewCustPhone('')
                setNewCustAddress('')
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                createCustomerMutation.isPending ||
                !newCustName.trim() ||
                newCustPhone.trim().length < 9
              }
            >
              {createCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
