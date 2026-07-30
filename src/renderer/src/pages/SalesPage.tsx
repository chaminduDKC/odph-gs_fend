import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { salesApi } from '../api/sales'
import { inventoryApi } from '../api/inventory'
import { customersApi } from '../api/customers'
import { PageHeader } from '../components/PageHeader'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { PartSale } from '@shared/types'

export const SalesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const { data: sales = [], isLoading } = useQuery({ queryKey: ['sales'], queryFn: salesApi.listSales })
  const { data: items = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryApi.listItems() })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => customersApi.listCustomers() })

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
    }
  ]
  
  const selectedItem = items.find(i => i.id === itemId)
  const currentProfitPreview = selectedItem ? (Number(soldPrice) - Number(selectedItem.unitCost)) * Number(quantity) : 0

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Counter Sales" 
        action={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> New Sale
          </button>
        }
      />

      <DataTable data={sales} columns={columns} isLoading={isLoading} />

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

          <FormField label="Customer (Optional)" as="select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">None (Walk-in)</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </FormField>
          
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
    </div>
  )
}
