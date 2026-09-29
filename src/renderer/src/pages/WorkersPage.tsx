import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Trash, RotateCcw } from 'lucide-react'
import { workersApi } from '../api/workers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'
import { Worker, SalaryType } from '@shared/types'
import { useF1Shortcut } from '../hooks/useF1Shortcut'
import { MessageDialog } from '@renderer/components/MessageDialog'
import { isAxiosError } from 'axios'

export const WorkersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [messageDialog, setMessageDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  const [useBaseRate, setUseBaseRate] = useState(false)

  useF1Shortcut(() => {
    setEditingWorker(null)
    setName('')
    setContact('')
    setRole('')
    setJoinDate(new Date().toISOString().split('T')[0])
    setSalaryType('DAILY')
    setBaseRate('0')
    setActive(true)
    setUseBaseRate(false)
    setIsModalOpen(true)
  }, isModalOpen || !!deleteId || !!restoreId || !!permanentDeleteId || !!messageDialog)

  // Form State
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [role, setRole] = useState('')
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().split('T')[0])
  const [salaryType, setSalaryType] = useState<SalaryType>('DAILY')
  const [baseRate, setBaseRate] = useState('0')
  const [active, setActive] = useState(true)

  useEffect(() => {
    setPage(1)
  }, [search, showDeleted])

  const { data: workerData, isLoading } = useQuery({
    queryKey: ['workers', search, page, showDeleted],
    queryFn: () => workersApi.listWorkers(search, page, 12, showDeleted)
  })

  useEffect(() => {
    if (workerData && page < workerData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['workers', search, page + 1, showDeleted],
        queryFn: () => workersApi.listWorkers(search, page + 1, 12, showDeleted)
      })
    }
  }, [workerData, page, search, showDeleted, queryClient])

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingWorker 
      ? workersApi.updateWorker(editingWorker.id, data)
      : workersApi.createWorker(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: workersApi.deleteWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      setDeleteId(null)
    },
    onError: (error: unknown) => {
      setDeleteId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Delete', message: error.response?.data?.message || 'Failed to delete worker' })
      }
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => workersApi.restoreWorker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      setRestoreId(null)
      setMessageDialog({ type: 'success', title: 'Restored', message: 'Worker restored successfully.' })
    },
    onError: (error: unknown) => {
      setRestoreId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Restore', message: error.response?.data?.message || 'Failed to restore worker' })
      }
    }
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => workersApi.permanentDeleteWorker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      setPermanentDeleteId(null)
      setMessageDialog({ type: 'success', title: 'Permanently Deleted', message: 'Worker permanently deleted from database.' })
    },
    onError: (error: unknown) => {
      setPermanentDeleteId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Delete Permanently', message: error.response?.data?.message || 'Failed to permanently delete worker' })
      }
    }
  })

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker)
    setName(worker.name)
    setUseBaseRate(Number(worker.baseRate) > 0)
    setContact(worker.contact || '')
    setRole(worker.role || '')
    setJoinDate(new Date(worker.joinDate).toISOString().split('T')[0])
    setSalaryType(worker.salaryType)
    setBaseRate(worker.baseRate)
    setActive(worker.active)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingWorker(null)
    setName('')
    setContact('')
    setRole('')
    setJoinDate(new Date().toISOString().split('T')[0])
    setSalaryType('DAILY')
    setBaseRate('0')
    setActive(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name, contact, role, joinDate,
      salaryType, baseRate: useBaseRate ? Number(baseRate) : 0
    }
    if (editingWorker) {
      Object.assign(data, { active })
    }
    saveMutation.mutate(data)
  }

  const columns: Column<Worker>[] = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Role', accessorFn: (row) => row.role || '-' },
    { header: 'Contact', accessorFn: (row) => row.contact || '-' },
    { header: 'Join Date', accessorFn: (row) => new Date(row.joinDate).toLocaleDateString('en-GB') },
    { header: 'Pay Type', accessorKey: 'salaryType' },
    { header: 'Rate', accessorFn: (row) => `Rs. ${Number(row.baseRate).toFixed(2)}` },
    { 
      header: 'Status', 
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${row.active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
          {row.active ? 'ACTIVE' : 'INACTIVE'}
        </span>
      )
    },
    {
      header: 'Deleted',
      cell: ({ row }) => (row as any).isDeleted
        ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400">Deleted</span>
        : null
    },
    {
      header: 'Actions',
      cell: ({ row }) => (row as any).isDeleted ? (
        <div className="flex gap-2">
          <button 
            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20" 
            onClick={() => setRestoreId(row.id)}
            title="Restore Worker"
          >
            <RotateCcw size={16} />
          </button>
          <button 
            className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20" 
            onClick={() => setPermanentDeleteId(row.id)}
            title="Delete Permanently"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="p-1.5 bg-amber-500/10 text-amber-500 rounded hover:bg-amber-500/20" onClick={() => handleEdit(row)}>
            <Edit size={16} />
          </button>
          <button className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20" onClick={() => setDeleteId(row.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Workers" 
        action={
          <div className='flex gap-2 items-center'>
            <button
              className={`btn ${showDeleted ? 'btn-danger' : 'btn-secondary'} flex items-center gap-2`}
              onClick={() => { setShowDeleted(v => !v); setPage(1) }}
              title={showDeleted ? 'Viewing deleted — click to go back' : 'Show deleted records'}
            >
              <Trash size={16} />
              {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
            </button>
            {!showDeleted && (
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> Add Worker
              </button>
            )}
          </div>
        }
      />

      {showDeleted && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <Trash size={14} />
          Showing deleted records. These are soft-deleted and no longer active.
        </div>
      )}

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search workers..." />
      </div>

      <DataTable data={workerData?.data ?? []} columns={columns} isLoading={isLoading} rowClassName={(row) => (row as any).isDeleted ? 'opacity-60 bg-red-500/5' : ''} />

      <Pagination
        page={page}
        totalPages={workerData?.totalPages ?? 1}
        total={workerData?.total}
        pageSize={workerData?.pageSize}
        onPageChange={setPage}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingWorker ? "Edit Worker" : "Add Worker"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField autoFocus label="Full Name" required value={name} onChange={e => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact" value={contact} onChange={e => setContact(e.target.value)} />
            <FormField label="Role / Job Title" value={role} onChange={e => setRole(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Join Date" type="date" required value={joinDate} onChange={e => setJoinDate(e.target.value)} />
            <FormField label="Salary Type" as="select" value={salaryType} onChange={e => setSalaryType(e.target.value as SalaryType)}>
              <option value="DAILY">Daily Rate</option>
              <option value="FIXED">Fixed Monthly</option>
              <option value="HOURLY">Hourly Rate</option>
            </FormField>
          </div>
          
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={useBaseRate}
              onClick={() => {
                const next = !useBaseRate
                setUseBaseRate(next)
                if (!next) setBaseRate('0')
              }}
              className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                useBaseRate ? 'bg-[var(--color-accent)]' : 'bg-gray-500/40'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useBaseRate ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span
              className="text-sm text-[var(--color-text-secondary)] cursor-pointer"
              onClick={() => {
                const next = !useBaseRate
                setUseBaseRate(next)
                if (!next) setBaseRate('0')
              }}
            >
              This amount will be added daily if worker is present. If you manually maintain salaries, ignore this.
            </span>
          </div>

          <FormField
            disabled={!useBaseRate}
            label={`Base Rate (Rs. per ${salaryType === 'DAILY' ? 'day' : salaryType === 'HOURLY' ? 'hour' : 'month'})`}
            type="number"
            required={useBaseRate}
            min="0"
            value={baseRate}
            onChange={e => setBaseRate(e.target.value)}
          />
          {editingWorker && (
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input 
                type="checkbox" 
                checked={active} 
                onChange={e => setActive(e.target.checked)}
                className="rounded border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">Worker is currently active</span>
            </label>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Worker'}
            </button>
          </div>
        </form>
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
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Worker"
        message="Are you sure you want to delete this worker? This record will be soft-deleted."
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
        title="Restore Worker"
        message="Are you sure you want to restore this worker? This record will become active again."
        isLoading={restoreMutation.isPending}
        confirmLabel="Restore"
        confirmVariant="success"
      />

      <ConfirmDialog
        isOpen={!!permanentDeleteId}
        onClose={() => setPermanentDeleteId(null)}
        onConfirm={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
        title="Delete Worker Permanently"
        message="Are you sure you want to permanently delete this worker from the database? This action CANNOT be undone."
        isLoading={permanentDeleteMutation.isPending}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />
    </div>
  )
}
