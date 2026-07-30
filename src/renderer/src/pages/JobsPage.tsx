import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Download, ShieldCheck, Trash2, CheckCircle2, CreditCard, Pencil } from 'lucide-react'
import { jobsApi } from '../api/jobs'
import { vehiclesApi } from '../api/vehicles'
import { inventoryApi } from '../api/inventory'
import { workersApi } from '../api/workers'
import { PageHeader } from '../components/PageHeader'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { Job, JobStatus, PaymentStatus } from '@shared/types'

export const JobsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<JobStatus | ''>('')
  
  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [viewJobId, setViewJobId] = useState<string | null>(null)
  
  // Form State
  const [vehicleId, setVehicleId] = useState('')
  const [description, setDescription] = useState('')
  const [laborCost, setLaborCost] = useState('0')
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  
  // Add Part State
  const [partItemId, setPartItemId] = useState('')
  const [partQty, setPartQty] = useState('1')

  // Edit Labor Cost State
  const [isEditLaborOpen, setIsEditLaborOpen] = useState(false)
  const [editLaborValue, setEditLaborValue] = useState('0')

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', filterStatus],
    queryFn: () => jobsApi.listJobs(filterStatus as JobStatus || undefined)
  })

  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.listVehicles() })
  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: () => workersApi.listWorkers() })
  const { data: items = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryApi.listItems() })

  const { data: jobDetails } = useQuery({
    queryKey: ['job', viewJobId],
    queryFn: () => jobsApi.getJob(viewJobId!),
    enabled: !!viewJobId
  })

  const createMutation = useMutation({
    mutationFn: jobsApi.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setIsNewOpen(false)
      resetForm()
    }
  })

  const statusMutation = useMutation({
    mutationFn: (data: { id: string; status: JobStatus; paymentStatus?: PaymentStatus }) => 
      jobsApi.updateJobStatus(data.id, data.status, data.paymentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job', viewJobId] })
    }
  })

  const addPartMutation = useMutation({
    mutationFn: (data: { id: string; itemId: string; quantity: number }) =>
      jobsApi.addJobPart(data.id, { itemId: data.itemId, quantity: data.quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', viewJobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setPartItemId('')
      setPartQty('1')
    }
  })

  const removePartMutation = useMutation({
    mutationFn: (data: { jobId: string; partId: string }) =>
      jobsApi.removeJobPart(data.jobId, data.partId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', viewJobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    }
  })

  const updateLaborMutation = useMutation({
    mutationFn: (data: { id: string; laborCost: number }) =>
      jobsApi.updateJob(data.id, { laborCost: data.laborCost }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', viewJobId] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
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
      const blob = await jobsApi.downloadInvoice(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice_${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download invoice', err)
    }
  }

  const columns: Column<Job>[] = [
    { header: 'Job Number', accessorKey: 'jobNumber' },
    { header: 'Vehicle', accessorFn: (row) => row.vehicle?.regNumber || '-' },
    { header: 'Date', accessorFn: (row) => new Date(row.receivedDate).toLocaleDateString('en-LK') },
    { header: 'Job', accessorFn: (row) => `${row.description}` },
    { header: 'Status', cell: ({ row }) => <StatusBadge status={row.status} type="job" /> },
    { header: 'Payment', cell: ({ row }) => <StatusBadge status={row.paymentStatus} type="payment" /> },
    { header: 'Total', accessorFn: (row) => `Rs. ${Number(row.totalBill).toFixed(2)}` },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <button 
          className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 flex items-center gap-1"
          onClick={() => setViewJobId(row.id)}
        >
          <Eye size={16} /> <span className="text-xs font-medium">View</span>
        </button>
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
          <button className="btn btn-primary" onClick={() => setIsNewOpen(true)}>
            <Plus size={18} /> New Job
          </button>
        }
      />

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

      <DataTable data={jobs} columns={columns} isLoading={isLoading} />

      {/* New Job Modal */}
      <Modal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title="Create New Job">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <FormField label="Vehicle" as="select" required value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            <option value="">Select a vehicle...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.regNumber} - {v.make} {v.model}</option>
            ))}
          </FormField>
          
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
              {workers.filter(w => w.active).length === 0 && <span className="text-xs text-[var(--color-text-muted)]">No active workers found.</span>}
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
                        disabled={jobDetails.status === st || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: jobDetails.id, status: st })}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          jobDetails.status === st
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)] cursor-default'
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
                    {(['DUE', 'PARTIAL', 'PAID'] as PaymentStatus[]).map((st) => (
                      <button
                        key={st}
                        disabled={jobDetails.paymentStatus === st || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: jobDetails.id, status: jobDetails.status, paymentStatus: st })}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          jobDetails.paymentStatus === st
                            ? 'border-green-500 bg-green-500/20 text-green-400 cursor-default'
                            : st === 'PAID'
                            ? 'border-green-600 text-green-400 hover:bg-green-500/20'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-white'
                        }`}
                      >
                        {st === 'PAID' ? '✓ Mark PAID' : st === 'PARTIAL' ? '½ Partial' : 'DUE'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] p-3 rounded">{jobDetails.description}</p>
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
                        <th className="pb-2 font-medium text-right">Unit Price</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                        <th className="pb-2 font-medium text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobDetails.parts && jobDetails.parts.map(part => (
                        <tr key={part.id} className="border-b border-[var(--color-border)]/50 hover:bg-white/5">
                          <td className="py-2">{part.item?.name || 'Unknown Item'}</td>
                          <td className="py-2 text-right">{part.quantity}</td>
                          <td className="py-2 text-right">Rs. {Number(part.unitPriceSnapshot).toFixed(2)}</td>
                          <td className="py-2 text-right">Rs. {(part.quantity * Number(part.unitPriceSnapshot)).toFixed(2)}</td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => removePartMutation.mutate({ jobId: jobDetails.id, partId: part.id })}
                              disabled={removePartMutation.isPending}
                              className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                              title="Remove part"
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

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if(partItemId && partQty) addPartMutation.mutate({ id: jobDetails.id, itemId: partItemId, quantity: Number(partQty) });
                  }} 
                  className="flex gap-2 mt-4 items-end bg-[var(--color-bg-secondary)] p-3 rounded border border-[var(--color-border)]"
                >
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Select Part</label>
                    <select 
                      className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none"
                      value={partItemId} onChange={e => setPartItemId(e.target.value)} required
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
                      className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white focus:border-[var(--color-accent)] outline-none"
                    />
                  </div>
                  <button type="submit" disabled={addPartMutation.isPending} className="btn btn-primary py-1.5 px-3 h-[34px]">
                    <Plus size={16} /> Add
                  </button>
                </form>
              </div>
              <div className="bg-[var(--color-bg-secondary)] p-4 border-t border-[var(--color-border)]">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-[var(--color-text-secondary)] flex items-center gap-2">
                    Labor Cost
                    <button
                      onClick={() => { setEditLaborValue(String(Number(jobDetails.laborCost))); setIsEditLaborOpen(true) }}
                      className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                      title="Edit labor cost"
                    >
                      <Pencil size={12} />
                    </button>
                  </span>
                  <span>Rs. {Number(jobDetails.laborCost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-1 text-[var(--color-text-secondary)]">
                  <span>Parts Subtotal</span>
                  <span>Rs. {(jobDetails.parts || []).reduce((s, p) => s + p.quantity * Number(p.unitPriceSnapshot), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg text-[var(--color-accent)] mt-2 pt-2 border-t border-[var(--color-border)]">
                  <span>Total Bill</span>
                  <span>Rs. {Number(jobDetails.totalBill).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-[var(--color-border)] pt-4">
              <button className="btn btn-secondary" onClick={() => setViewJobId(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => downloadInvoice(jobDetails.id)}>
                <Download size={18} /> Download Invoice
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
              <button type="submit" className="btn btn-primary" disabled={updateLaborMutation.isPending}>
                {updateLaborMutation.isPending ? 'Saving...' : 'Save Labor Cost'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
