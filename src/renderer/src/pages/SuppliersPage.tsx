import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Eye, Trash, RotateCcw } from 'lucide-react'
import { suppliersApi } from '../api/suppliers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'
import { Supplier, PurchaseTransaction } from '@shared/types'
import { StatusBadge } from '../components/StatusBadge'
import { useF1Shortcut } from '../hooks/useF1Shortcut'
import { MessageDialog } from '@renderer/components/MessageDialog'
import { isAxiosError } from 'axios'

export const SuppliersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [messageDialog, setMessageDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  useF1Shortcut(() => {
    setEditingSupplier(null)
    setName('')
    setContact('')
    setIsModalOpen(true)
  }, isModalOpen || isViewOpen || !!deleteId || !!restoreId || !!permanentDeleteId || !!messageDialog)

  // Form State
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')

  useEffect(() => {
    setPage(1)
  }, [search, showDeleted])

  const { data: supplierData, isLoading } = useQuery({
    queryKey: ['suppliers', search, page, showDeleted],
    queryFn: () => suppliersApi.listSuppliers(search, page, 12, showDeleted)
  })

  useEffect(() => {
    if (supplierData && page < supplierData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['suppliers', search, page + 1, showDeleted],
        queryFn: () => suppliersApi.listSuppliers(search, page + 1, 12, showDeleted)
      })
    }
  }, [supplierData, page, search, showDeleted, queryClient])

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
    },
    onError: (error: unknown) => {
      setDeleteId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Delete', message: error.response?.data?.message || 'Failed to delete supplier' })
      }
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.restoreSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setRestoreId(null)
      setMessageDialog({ type: 'success', title: 'Restored', message: 'Supplier restored successfully.' })
    },
    onError: (error: unknown) => {
      setRestoreId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Restore', message: error.response?.data?.message || 'Failed to restore supplier' })
      }
    }
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.permanentDeleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setPermanentDeleteId(null)
      setMessageDialog({ type: 'success', title: 'Permanently Deleted', message: 'Supplier permanently deleted from database.' })
    },
    onError: (error: unknown) => {
      setPermanentDeleteId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Delete Permanently', message: error.response?.data?.message || 'Failed to permanently delete supplier' })
      }
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
      header: 'Status',
      cell: ({ row }) => (row as any).isDeleted
        ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400">Deleted</span>
        : null
    },
    {
      header: 'Actions',
      cell: ({ row }) => (row as any).isDeleted ? (
        <div className="flex gap-2">
          <button className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20" onClick={() => handleView(row)} title="View Details">
            <Eye size={16} />
          </button>
          <button 
            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20" 
            onClick={() => setRestoreId(row.id)}
            title="Restore Supplier"
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
                <Plus size={18} /> Add Supplier
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers..." />
      </div>

      <DataTable data={supplierData?.data ?? []} columns={columns} isLoading={isLoading} rowClassName={(row) => (row as any).isDeleted ? 'opacity-60 bg-red-500/5' : ''} />

      <Pagination
        page={page}
        totalPages={supplierData?.totalPages ?? 1}
        total={supplierData?.total}
        pageSize={supplierData?.pageSize}
        onPageChange={setPage}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField autoFocus label="Supplier Name" required value={name} onChange={e => setName(e.target.value)} />
          <FormField label="Contact Information" type='number' value={contact} onChange={e => setContact(e.target.value)} />
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending || !name.trim() || contact.length < 9}>
              {saveMutation.isPending ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>
      
      <Modal isOpen={isViewOpen} onClose={closeViewModal} title={(editingSupplier as any)?.isDeleted ? "Supplier Details (Deleted)" : "Supplier Details"} size="lg">
        {editingSupplier && (
          <div>
            {(editingSupplier as any)?.isDeleted && (
              <div className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <Trash size={14} />
                <span>This supplier is deleted.</span>
              </div>
            )}
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
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This record will be soft-deleted."
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
        title="Restore Supplier"
        message="Are you sure you want to restore this supplier? This record will become active again."
        isLoading={restoreMutation.isPending}
        confirmLabel="Restore"
        confirmVariant="success"
      />

      <ConfirmDialog
        isOpen={!!permanentDeleteId}
        onClose={() => setPermanentDeleteId(null)}
        onConfirm={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
        title="Delete Supplier Permanently"
        message="Are you sure you want to permanently delete this supplier from the database? This action CANNOT be undone."
        isLoading={permanentDeleteMutation.isPending}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />
    </div>
  )
}
