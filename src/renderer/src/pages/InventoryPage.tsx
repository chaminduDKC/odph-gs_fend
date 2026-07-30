import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
import { inventoryApi } from '../api/inventory'
import { suppliersApi } from '../api/suppliers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { InventoryItem } from '@shared/types'

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [unitCost, setUnitCost] = useState('0')
  const [sellingPrice, setSellingPrice] = useState('0')
  const [quantity, setQuantity] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('5')
  const [supplierId, setSupplierId] = useState('')

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['inventory', search],
    queryFn: () => inventoryApi.listItems(search)
  })

  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersApi.listSuppliers() })

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setDeleteId(null)
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

  const displayedItems = showLowStockOnly 
    ? allItems.filter(i => i.quantity <= i.reorderLevel)
    : allItems

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
        title="Inventory" 
        action={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Item
          </button>
        }
      />

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

      <DataTable data={displayedItems} columns={columns} isLoading={isLoading} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingItem ? "Edit Item" : "Add Item"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Item Name" required value={name} onChange={e => setName(e.target.value)} />

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category (Optional)" value={category} onChange={e => setCategory(e.target.value)} />
            <FormField label="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Unit Cost (Rs.)" type="number" required min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
            <FormField label="Selling Price (Rs.)" type="number" required min="0" step="0.01" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Reorder Level" type="number" required min="0" value={reorderLevel} onChange={e => setReorderLevel(e.target.value)} />
            <FormField label="Preferred Supplier" as="select" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">None</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </FormField>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
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
        message="Are you sure you want to delete this inventory item? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
