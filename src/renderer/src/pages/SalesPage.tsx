import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Trash, RotateCcw } from 'lucide-react'
import { salesApi } from '../api/sales'
import { inventoryApi } from '../api/inventory'
import { customersApi } from '../api/customers'
import { PageHeader } from '../components/PageHeader'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'
import { PartSale, Customer } from '@shared/types'
import { MessageDialog } from '@renderer/components/MessageDialog'
import { isAxiosError } from 'axios'
import { useF1Shortcut } from '../hooks/useF1Shortcut'

export const SalesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [showDeleted, setShowDeleted] = useState(false)

  // Quick Customer State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [messageDialog, setMessageDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  useF1Shortcut(() => {
    setItemId('')
    setQuantity('1')
    setSoldPrice('0')
    setCustomerId('')
    setIsModalOpen(true)
  }, isModalOpen || isCustomerModalOpen || !!deleteId || !!restoreId || !!permanentDeleteId || !!messageDialog)

  useEffect(() => {
    setPage(1)
  }, [showDeleted])
  
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', page, showDeleted],
    queryFn: () => salesApi.listSales(page, 12, showDeleted)
  })

  useEffect(() => {
    if (salesData && page < salesData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['sales', page + 1, showDeleted],
        queryFn: () => salesApi.listSales(page + 1, 12, showDeleted)
      })
    }
  }, [salesData, page, showDeleted, queryClient])

  const { data: items = [] } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => (await inventoryApi.listItems(undefined, undefined, 1, 1000)).data
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => (await customersApi.listCustomers(undefined, 1, 1000)).data
  })

  // Form State
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [soldPrice, setSoldPrice] = useState('0')
  const [customerId, setCustomerId] = useState('')

  const createMutation = useMutation({
    mutationFn: salesApi.createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: salesApi.deleteSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteId(null)
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => salesApi.restoreSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setRestoreId(null)
      setMessageDialog({ type: 'success', title: 'Restored', message: 'Sale record restored successfully.' })
    },
    onError: (error: unknown) => {
      setRestoreId(null)
      if (isAxiosError(error)) {
        setMessageDialog({
          type: 'error',
          title: 'Cannot Restore',
          message: error.response?.data?.message || 'Failed to restore sale record'
        })
      }
    }
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => salesApi.permanentDeleteSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setPermanentDeleteId(null)
      setMessageDialog({ type: 'success', title: 'Permanently Deleted', message: 'Sale record permanently deleted.' })
    },
    onError: (error: unknown) => {
      setPermanentDeleteId(null)
      if (isAxiosError(error)) {
        setMessageDialog({
          type: 'error',
          title: 'Cannot Delete Permanently',
          message: error.response?.data?.message || 'Failed to permanently delete sale record'
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
      setCustomerId(newCustomer.id)
      closeCustomerModal()
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

  const closeCustomerModal = () => {
    setIsCustomerModalOpen(false)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewCustomerAddress('')
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setItemId('')
    setQuantity('1')
    setSoldPrice('0')
    setCustomerId('')
  }

  const handleItemChange = (selectedId: string) => {
    setItemId(selectedId)
    const item = items.find(i => i.id === selectedId)
    if (item) {
      setSoldPrice(item.sellingPrice)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      itemId,
      quantity: Number(quantity),
      soldPrice: Number(soldPrice),
      customerId: customerId || undefined
    })
  }

  const columns: Column<PartSale>[] = [
    { header: 'Date', accessorFn: (row) => new Date(row.createdAt).toLocaleDateString('en-GB') },
    { header: 'Item', accessorFn: (row) => row.item?.name || '-' },
    { header: 'Customer', accessorFn: (row) => row.customer?.name || '-' },
    { header: 'Qty', accessorKey: 'quantity' },
    { header: 'Cost Price', accessorFn: (row) => `Rs. ${Number(row.costPrice).toFixed(2)}` },
    { header: 'Sold Price', accessorFn: (row) => `Rs. ${Number(row.soldPrice).toFixed(2)}` },
    { 
      header: 'Profit', 
      cell: ({ row }) => {
        const profit = Number(row.profit)
        return <span className={`font-medium ${profit > 0 ? 'text-green-500' : profit < 0 ? 'text-red-500' : ''}`}>Rs. {profit.toFixed(2)}</span>
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
          <button
            onClick={() => setRestoreId(row.id)}
            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20 transition-colors"
            title="Restore Sale"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => setPermanentDeleteId(row.id)}
            className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
            title="Delete Permanently"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
            title="Delete Sale"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ]
  
  const selectedItem = items.find(i => i.id === itemId)
  const currentProfitPreview = selectedItem ? (Number(soldPrice) - Number(selectedItem.unitCost)) * Number(quantity) : 0

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Counter Sales" 
        action={
          <div className="flex gap-2 items-center">
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
                <Plus size={18} /> New Sale
              </button>
            )}
          </div>
        }
      />

      {showDeleted && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <Trash size={14} />
          Showing deleted counter sales. These records are soft-deleted and no longer active.
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Sale Record"
        message="Are you sure you want to delete this sale record? The sold quantity will be returned to inventory stock."
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
        title="Restore Sale Record"
        message="Are you sure you want to restore this sale record? The inventory item quantity will be deducted accordingly."
        isLoading={restoreMutation.isPending}
        confirmLabel="Restore"
        confirmVariant="success"
      />

      <ConfirmDialog
        isOpen={!!permanentDeleteId}
        onClose={() => setPermanentDeleteId(null)}
        onConfirm={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
        title="Delete Sale Record Permanently"
        message="Are you sure you want to permanently delete this sale record from the database? This action CANNOT be undone."
        isLoading={permanentDeleteMutation.isPending}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />

      <DataTable
        data={salesData?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        rowClassName={(row) => (row as any).isDeleted ? 'opacity-60 bg-red-500/5' : ''}
      />

      <Pagination
        page={page}
        totalPages={salesData?.totalPages ?? 1}
        total={salesData?.total}
        pageSize={salesData?.pageSize}
        onPageChange={setPage}
      />

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Record Sale">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Item" as="select" required value={itemId} onChange={e => handleItemChange(e.target.value)}>
            <option value="">Select an item...</option>
            {items.filter(i => i.quantity > 0).map(i => (
              <option key={i.id} value={i.id}>{i.name} (Stock: {i.quantity})</option>
            ))}
          </FormField>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField 
              label="Quantity" 
              type="number" 
              required min="1" 
              max={selectedItem?.quantity || 1} 
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
            />
            <FormField label="Selling Price (Per Unit Rs.)" type="number" required min="0" step="0.01" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} />
          </div>

          <div className="flex flex-col mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Customer (Optional)
              </label>
              <button
                type="button"
                className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                onClick={() => setIsCustomerModalOpen(true)}
              >
                <Plus size={14} /> New Customer
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-md px-3 py-2 text-sm text-white transition-colors custom-scrollbar"
              >
                <option value="">None (Walk-in)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                ))}
              </select>
             
            </div>
          </div>
          
          {selectedItem && (
            <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border)] mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--color-text-secondary)]">Cost Price</span>
                <span>Rs. {Number(selectedItem.unitCost).toFixed(2)} x {quantity}</span>
              </div>
              <div className="flex justify-between font-bold mt-2 pt-2 border-t border-[var(--color-border)] text-[var(--color-accent)]">
                <span>Est. Profit</span>
                <span>Rs. {currentProfitPreview.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || !itemId}>
              {createMutation.isPending ? 'Saving...' : 'Record Sale'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Customer Quick Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={closeCustomerModal}
        title="Add New Customer"
        size="md"
        zIndex={60}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newCustomerName.trim() && newCustomerPhone.trim()) {
              createCustomerMutation.mutate({
                name: newCustomerName.trim(),
                phone: newCustomerPhone.trim(),
                address: newCustomerAddress.trim() || undefined
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
            value={newCustomerName}
            onChange={e => setNewCustomerName(e.target.value)}
          />
          <FormField
            label="Phone Number"
            type="text"
            required
            placeholder="e.g. 0771234567"
            value={newCustomerPhone}
            onChange={e => setNewCustomerPhone(e.target.value)}
          />
          <FormField
            label="Address"
            as="textarea"
            rows={3}
            placeholder="e.g. 123 Main St, Colombo (Optional)"
            value={newCustomerAddress}
            onChange={e => setNewCustomerAddress(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeCustomerModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                createCustomerMutation.isPending ||
                !newCustomerName.trim() ||
                newCustomerPhone.trim().length < 9
              }
            >
              {createCustomerMutation.isPending ? 'Saving...' : 'Save & Select Customer'}
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
    </div>
  )
}
