import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, AlertCircle, Trash, RotateCcw } from 'lucide-react'
import { inventoryApi } from '../api/inventory'
import { suppliersApi } from '../api/suppliers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'
import { InventoryItem } from '@shared/types'
import { MessageDialog } from '@renderer/components/MessageDialog'
import { useF1Shortcut } from '../hooks/useF1Shortcut'
import { isAxiosError } from 'axios'

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [messageDialog, setMessageDialog] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  useF1Shortcut(() => {
    setEditingItem(null)
    setName('')
    setCategory('')
    setQuantity('0')
    setUnitCost('0')
    setSellingPrice('0')
    setAmountPaid('0')
    setReorderLevel('5')
    setSupplierId('')
    setIsModalOpen(true)
  }, isModalOpen || !!deleteId || !!restoreId || !!permanentDeleteId || !!messageDialog)

  // Form State
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [unitCost, setUnitCost] = useState('0')
  const [sellingPrice, setSellingPrice] = useState('0')
  const [amountPaid, setAmountPaid] = useState('0')
  const [quantity, setQuantity] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('5')
  const [supplierId, setSupplierId] = useState('')


  useEffect(() => {
    setPage(1)
  }, [search, showDeleted])

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', search, page, showDeleted],
    queryFn: () => inventoryApi.listItems(search, undefined, page, 12, showDeleted)
  })

  useEffect(() => {
    if (inventoryData && page < inventoryData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['inventory', search, page + 1, showDeleted],
        queryFn: () => inventoryApi.listItems(search, undefined, page + 1, 12, showDeleted)
      })
    }
  }, [inventoryData, page, search, showDeleted, queryClient])

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: async () => (await suppliersApi.listSuppliers(undefined, 1, 1000)).data
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingItem 
      ? inventoryApi.updateItem(editingItem.id, data)
      : inventoryApi.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }) // Since dashboard shows low stock
      closeModal()
    }
  })

const deleteMutation = useMutation({
  mutationFn: inventoryApi.deleteItem,
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setDeleteId(null)

    if (data?.message) {
      setMessageDialog({ type: 'success', title: '', message: data?.message})
    } else {
      setMessageDialog({ type: 'success', title: '', message: "Item deleted"})
    }
  },
  onError: (error) => {
    setDeleteId(null)
    if (isAxiosError(error)) {
      setMessageDialog({ type: 'error', title: 'Cannot Delete', message: error.response?.data?.message || 'Failed to delete item' })
    }
  }
})

const restoreMutation = useMutation({
  mutationFn: (id: string) => inventoryApi.restoreItem(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setRestoreId(null)
    setMessageDialog({ type: 'success', title: 'Restored', message: 'Item restored successfully.' })
  },
  onError: (error: unknown) => {
    setRestoreId(null)
    if (isAxiosError(error)) {
      setMessageDialog({ type: 'error', title: 'Cannot Restore', message: error.response?.data?.message || 'Failed to restore item' })
    }
  }
})

const permanentDeleteMutation = useMutation({
  mutationFn: (id: string) => inventoryApi.permanentDeleteItem(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setPermanentDeleteId(null)
    setMessageDialog({ type: 'success', title: 'Permanently Deleted', message: 'Item permanently deleted from database.' })
  },
  onError: (error: unknown) => {
    setPermanentDeleteId(null)
    if (isAxiosError(error)) {
      setMessageDialog({ type: 'error', title: 'Cannot Delete Permanently', message: error.response?.data?.message || 'Failed to permanently delete item' })
    }
  }
})

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setName(item.name)
    setCategory(item.category || '')
    setQuantity(item.quantity || '')
    setUnitCost(item.unitCost)
    setSellingPrice(item.sellingPrice)
    setReorderLevel(item.reorderLevel.toString())
    setSupplierId(item.supplierId || '')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setName('')
    setCategory('')
    setUnitCost('0')
    setSellingPrice('0')
    setReorderLevel('5')
    setSupplierId('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({ 
      name, category, 
      unitCost: Number(unitCost), 
      sellingPrice: Number(sellingPrice), 
      reorderLevel: Number(reorderLevel), 
      quantity:Number(quantity),
      supplierId: supplierId || undefined 
    })
  }

  const items = inventoryData?.data ?? []
  const displayedItems = showLowStockOnly 
    ? items.filter(i => i.quantity <= i.reorderLevel)
    : items

  const columns: Column<InventoryItem>[] = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Category', accessorFn: (row) => row.category || '-' },
    { 
      header: 'Qty', 
      cell: ({ row }) => (
        <span className={`font-medium ${row.quantity <= row.reorderLevel ? 'text-red-500' : 'text-white'}`}>
          {row.quantity}
          {row.quantity <= row.reorderLevel && <AlertCircle size={14} className="inline ml-1 mb-0.5" />}
        </span>
      )
    },
    { header: 'Cost', accessorFn: (row) => `Rs. ${Number(row.unitCost).toFixed(2)}` },
    { header: 'Price', accessorFn: (row) => `Rs. ${Number(row.sellingPrice).toFixed(2)}` },
    { header: 'Reorder At', accessorKey: 'reorderLevel' },
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
            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20" 
            onClick={() => setRestoreId(row.id)}
            title="Restore Item"
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
        title="Inventory" 
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
          </div>
        }
      />
      {showDeleted && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <Trash size={14} />
          Showing deleted items. These records are soft-deleted and no longer active.
        </div>
      )}
      {messageDialog && (
              <MessageDialog
                isOpen={true}
                onClose={() => setMessageDialog(null)}
                type={messageDialog.type}
                title={messageDialog.title}
                message={messageDialog.message}
              />
            )}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-start sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search parts/items..." />
        
        <label className="flex items-center gap-2 cursor-pointer bg-[var(--color-bg-secondary)] px-3 py-2 rounded-md border border-[var(--color-border)]">
          <input 
            type="checkbox" 
            checked={showLowStockOnly} 
            onChange={e => setShowLowStockOnly(e.target.checked)}
            className="rounded border-[var(--color-border)] bg-[var(--color-bg-primary)] text-red-500 focus:ring-red-500"
          />
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">Show Low Stock Only</span>
        </label>
      </div>

      <DataTable
        data={displayedItems}
        columns={columns}
        isLoading={isLoading}
        rowClassName={(row) => (row as any).isDeleted ? 'opacity-60 bg-red-500/5' : ''}
      />

      <Pagination
        page={page}
        totalPages={inventoryData?.totalPages ?? 1}
        total={inventoryData?.total}
        pageSize={inventoryData?.pageSize}
        onPageChange={setPage}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingItem ? "Edit Item" : "Add Item"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">

           <FormField autoFocus label="Preferred Supplier" as="select" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">--Select a Supplier</option>
              {suppliers.map((s:any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </FormField>
          <FormField label="Item Name" required value={name} onChange={e => setName(e.target.value)} />

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category (Optional)" value={category} onChange={e => setCategory(e.target.value)} />
            <FormField required label="Quantity" type='number' value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Unit Cost (Rs.)" type="number" required min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
            <FormField label="Selling Price (Rs.)" type="number" required min="0" step="0.01" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Reorder Level" type="number" required min="0" value={reorderLevel} onChange={e => setReorderLevel(e.target.value)} />
            <FormField label="Paid Amount (Rs.)" type="number" required min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending || !name.trim() || !category.trim() || unitCost === "0" || sellingPrice === "0" || quantity === "0" || !quantity || !sellingPrice || !unitCost}>
              {saveMutation.isPending ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Item"
        message="Are you sure you want to delete this inventory item? This record will be soft-deleted."
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
        title="Restore Item"
        message="Are you sure you want to restore this inventory item? This record will become active again."
        isLoading={restoreMutation.isPending}
        confirmLabel="Restore"
        confirmVariant="success"
      />

      <ConfirmDialog
        isOpen={!!permanentDeleteId}
        onClose={() => setPermanentDeleteId(null)}
        onConfirm={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
        title="Delete Item Permanently"
        message="Are you sure you want to permanently delete this inventory item from the database? This action CANNOT be undone."
        isLoading={permanentDeleteMutation.isPending}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />
    </div>
  )
}
