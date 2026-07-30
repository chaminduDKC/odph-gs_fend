import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { workersApi } from '../api/workers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Worker, SalaryType } from '@shared/types'

export const WorkersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [role, setRole] = useState('')
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().split('T')[0])
  const [salaryType, setSalaryType] = useState<SalaryType>('DAILY')
  const [baseRate, setBaseRate] = useState('0')
  const [active, setActive] = useState(true)

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers', search],
    queryFn: () => workersApi.listWorkers(search)
  })

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
    }
  })

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker)
    setName(worker.name)
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
      salaryType, baseRate: Number(baseRate)
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
      header: 'Actions',
      cell: ({ row }) => (
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
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Worker
          </button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search workers..." />
      </div>

      <DataTable data={workers} columns={columns} isLoading={isLoading} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingWorker ? "Edit Worker" : "Add Worker"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Full Name" required value={name} onChange={e => setName(e.target.value)} />
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
          
          <FormField label={`Base Rate (Rs. per ${salaryType === 'DAILY' ? 'day' : salaryType === 'HOURLY' ? 'hour' : 'month'})`} type="number" required min="0" value={baseRate} onChange={e => setBaseRate(e.target.value)} />

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

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Worker"
        message="Are you sure you want to delete this worker? Note: You can deactivate them instead of deleting."
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
