import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import { suppliersApi } from '../api/suppliers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Supplier, PurchaseTransaction } from '@shared/types'
import { StatusBadge } from '../components/StatusBadge'

export const SuppliersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersApi.listSuppliers(search)
  })

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ['supplierTransactions', editingSupplier?.id],
    queryFn: () => suppliersApi.getSupplierTransactions(editingSupplier!.id),
    enabled: !!editingSupplier && isViewOpen
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingSupplier 
      ? suppliersApi.updateSupplier(editingSupplier.id, data)
      : suppliersApi.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: suppliersApi.deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setDeleteId(null)
    }
  })

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setName(supplier.name)
    setContact(supplier.contact || '')
    setIsModalOpen(true)
  }
  
  const handleView = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setIsViewOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSupplier(null)
    setName('')
    setContact('')
  }
  
  const closeViewModal = () => {
    setIsViewOpen(false)
    setEditingSupplier(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({ name, contact })
  }

  const columns: Column<Supplier>[] = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Contact', accessorFn: (row) => row.contact || '-' },
    { 
      header: 'Balance Owed', 
      cell: ({ row }) => {
        const amt = Number(row.balanceOwed)
        return (
          <span className={`font-semibold ${amt > 0 ? 'text-red-500' : 'text-green-500'}`}>
            Rs. {amt.toFixed(2)}
          </span>
        )
      }
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20" onClick={() => handleView(row)}>
            <Eye size={16} />
          </button>
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
  
  const txCols: Column<PurchaseTransaction>[] = [
    { header: 'Date', accessorFn: (row) => new Date(row.createdAt).toLocaleDateString('en-GB') },
    { header: 'Total', accessorFn: (row) => `Rs. ${Number(row.total).toFixed(2)}` },
    { header: 'Type', cell: ({ row }) => <StatusBadge status={row.paymentType} type="payment" /> },
    { header: 'Paid', accessorFn: (row) => `Rs. ${Number(row.amountPaid).toFixed(2)}` },
    { header: 'Due', cell: ({ row }) => <span className={Number(row.amountDue) > 0 ? 'text-red-500' : ''}>Rs. {Number(row.amountDue).toFixed(2)}</span> }
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Suppliers" 
        action={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Supplier
          </button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers..." />
      </div>

      <DataTable data={suppliers} columns={columns} isLoading={isLoading} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Supplier Name" required value={name} onChange={e => setName(e.target.value)} />
          <FormField label="Contact Information" value={contact} onChange={e => setContact(e.target.value)} />
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>
      
      <Modal isOpen={isViewOpen} onClose={closeViewModal} title="Supplier Details" size="lg">
        {editingSupplier && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="card p-4">
                <p className="text-sm text-[var(--color-text-secondary)]">Name</p>
                <p className="text-lg font-medium">{editingSupplier.name}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-[var(--color-text-secondary)]">Contact</p>
                <p className="text-lg font-medium">{editingSupplier.contact || '-'}</p>
              </div>
            </div>
            
            <h3 className="font-semibold text-lg border-b border-[var(--color-border)] pb-2 mb-4">Purchase History</h3>
            <DataTable data={transactions} columns={txCols} isLoading={loadingTx} emptyMessage="No transactions found." />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
