import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Edit, Trash2, Trash, RotateCcw } from 'lucide-react'
import { customersApi } from '../api/customers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'
import { Customer, Vehicle } from '@shared/types'
import { isAxiosError } from 'axios'
import { MessageDialog } from '@renderer/components/MessageDialog'
import { useF1Shortcut } from '../hooks/useF1Shortcut'

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showDeleted, setShowDeleted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [messageDialog, setMessageDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  useF1Shortcut(() => {
    setEditingCustomer(null)
    setName('')
    setPhone('')
    setAddress('')
    setIsModalOpen(true)
  }, isModalOpen || isViewOpen || !!deleteId || !!restoreId || !!permanentDeleteId || !!messageDialog)
  
  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    setPage(1)
  }, [search, showDeleted])

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['customers', search, page, showDeleted],
    queryFn: () => customersApi.listCustomers(search, page, 12, showDeleted)
  })

  useEffect(() => {
    if (customerData && page < customerData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['customers', search, page + 1, showDeleted],
        queryFn: () => customersApi.listCustomers(search, page + 1, 12, showDeleted)
      })
    }
  }, [customerData, page, search, showDeleted, queryClient])

  const { data: customerVehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['customerVehicles', editingCustomer?.id],
    queryFn: () => customersApi.getCustomerVehicles(editingCustomer!.id),
    enabled: !!editingCustomer && isViewOpen
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingCustomer 
      ? customersApi.updateCustomer(editingCustomer.id, data)
      : customersApi.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      closeModal()
     
    },
    onError(error:unknown){
      closeModal()
      if (isAxiosError(error)) {
        console.log('status:', error.response?.status)
        console.log('data:', error.response?.data.message)
        const msg = error.response?.data.message
        editingCustomer ? 
          setMessageDialog({ type: 'error', title: 'Failed to Update', message: msg })
          :
          setMessageDialog({ type: 'error', title: 'Failed to Create', message: msg })
      }

    }
  })

  const deleteMutation = useMutation({
    mutationFn:(id:string)=>  customersApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setDeleteId(null)
    },
    
  onError: (error: unknown) => {
    setDeleteId(null)
   if (isAxiosError(error)) {
    console.log('status:', error.response?.status)
    console.log('data:', error.response?.data.message)
    const msg = error.response?.data.message
    setMessageDialog({ type: 'error', title: 'Cannot Delete', message: msg })

  }
    
  }
   
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => customersApi.restoreCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setRestoreId(null)
      setMessageDialog({ type: 'success', title: 'Restored', message: 'Customer restored successfully.' })
    },
    onError: (error: unknown) => {
      setRestoreId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Restore', message: error.response?.data.message || 'Failed to restore customer' })
      }
    }
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.permanentDeleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setPermanentDeleteId(null)
      setMessageDialog({ type: 'success', title: 'Permanently Deleted', message: 'Customer permanently deleted.' })
    },
    onError: (error: unknown) => {
      setPermanentDeleteId(null)
      if (isAxiosError(error)) {
        setMessageDialog({ type: 'error', title: 'Cannot Delete Permanently', message: error.response?.data.message || 'Failed to permanently delete customer' })
      }
    }
  })

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setName(customer.name)
    setPhone(customer.phone)
    setAddress(customer.address || '')
    setIsModalOpen(true)
  }

  const handleView = (customer: Customer) => {
    setEditingCustomer(customer)
    setIsViewOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCustomer(null)
    setName('')
    setPhone('')
    setAddress('')
  }

  const closeViewModal = () => {
    setIsViewOpen(false)
    setEditingCustomer(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({ name, phone, address })
  }

  const columns: Column<Customer>[] = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Address', accessorFn: (row) => row.address || '-' },
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
          <button 
            className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20" 
            onClick={() => handleView(row)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button 
            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20" 
            onClick={() => setRestoreId(row.id)}
            title="Restore Customer"
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

  const vehicleCols: Column<Vehicle>[] = [
    { header: 'Reg No', accessorKey: 'regNumber' },
    { header: 'Make', accessorKey: 'make' },
    { header: 'Model', accessorKey: 'model' },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Customers" 
        action={
          <div className="flex gap-2 items-center">
            <button
              className={`btn ${showDeleted ? 'btn-danger' : 'btn-secondary'} flex items-center gap-2`}
              onClick={() => { setShowDeleted(v => !v); setPage(1) }}
              title={showDeleted ? 'Viewing deleted customers — click to go back' : 'Show deleted customers'}
            >
              <Trash size={16} />
              {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
            </button>
            {!showDeleted && (
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> Add Customer
              </button>
            )}
          </div>
        }
      />

      {showDeleted && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <Trash size={14} />
          Showing deleted customers. These records are soft-deleted and no longer active.
        </div>
      )}

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or phone..." />
      </div>

      <DataTable
        data={customerData?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        rowClassName={(row) => (row as any).isDeleted ? 'opacity-60 bg-red-500/5' : ''}
      />

      <Pagination
        page={page}
        totalPages={customerData?.totalPages ?? 1}
        total={customerData?.total}
        pageSize={customerData?.pageSize}
        onPageChange={setPage}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField autoFocus label="Full Name" required value={name} onChange={e => setName(e.target.value)} />
          <FormField label="Phone Number" required value={phone} type='number' onChange={e => setPhone(e.target.value)} />
          <FormField label="Address" as="textarea" rows={3} value={address} onChange={e => setAddress(e.target.value)} />
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending || !name.trim() || phone.length < 9 || !address.trim() }>
              {saveMutation.isPending ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isViewOpen} onClose={closeViewModal} title={(editingCustomer as any)?.isDeleted ? "Customer Profile (Deleted)" : "Customer Profile"} size="lg">
        {editingCustomer && (
          <div>
            {(editingCustomer as any)?.isDeleted && (
              <div className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <Trash size={14} />
                <span>This customer is deleted.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Name</p>
                <p className="text-lg font-medium">{editingCustomer.name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Phone</p>
                <p className="text-lg font-medium">{editingCustomer.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-[var(--color-text-secondary)]">Address</p>
                <p className="text-base">{editingCustomer.address || '-'}</p>
              </div>
            </div>
            
            <h3 className="font-semibold text-lg border-b border-[var(--color-border)] pb-2 mb-4">Vehicles</h3>
            <DataTable data={customerVehicles} columns={vehicleCols} isLoading={loadingVehicles} emptyMessage="No vehicles registered." />
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
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This record will be soft-deleted."
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
        title="Restore Customer"
        message="Are you sure you want to restore this customer? This record will become active again."
        isLoading={restoreMutation.isPending}
        confirmLabel="Restore"
        confirmVariant="success"
      />

      <ConfirmDialog
        isOpen={!!permanentDeleteId}
        onClose={() => setPermanentDeleteId(null)}
        onConfirm={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
        title="Delete Customer Permanently"
        message="Are you sure you want to permanently delete this customer from the database? This action CANNOT be undone."
        isLoading={permanentDeleteMutation.isPending}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />
    </div>
  )
}
