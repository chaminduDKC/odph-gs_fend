import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Trash2 } from 'lucide-react'
import { purchasesApi } from '../api/purchases'
import { suppliersApi } from '../api/suppliers'
import { inventoryApi } from '../api/inventory'
import { PageHeader } from '../components/PageHeader'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { StatusBadge } from '../components/StatusBadge'
import { PurchaseTransaction, PurchaseType, PurchaseItem } from '@shared/types'

export const PurchasesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const { data: purchases = [], isLoading } = useQuery({ queryKey: ['purchases'], queryFn: purchasesApi.listPurchases })
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.listSuppliers })
  const { data: items = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryApi.listItems() })

  // Form State
  const [supplierId, setSupplierId] = useState('')
  const [purchaseId, setPurchaseId] = useState('')
  const [paymentType, setPaymentType] = useState<PurchaseType>('PAID')
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [amountPaid, setAmountPaid] = useState('0')
  const [amountToPaid, setAmountToPaid] = useState('0')
  const [totalPayment, setTotalPayment] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [lineItems, setLineItems] = useState<{ id: string; itemId: string; quantity: number; unitCost: number }[]>([])

  const createMutation = useMutation({
    mutationFn: purchasesApi.createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      closeModal()
    }
  })
const updatePaymentMutation = useMutation({
  mutationFn: (vars: { purchaseId: string; amountToPaid: number; supplierId:string }) => 
    purchasesApi.updatePurchase(vars.purchaseId, vars.amountToPaid, vars.supplierId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['purchases'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    closeViewModal()
  }
})

  const closeModal = () => {
    setIsModalOpen(false)
    setSupplierId('')
    setPaymentType('PAID')
    setAmountPaid('0')
    setDueDate('')
    setLineItems([])
  }
  const closeViewModal = () => {
    setIsViewOpen(false)
    setSupplierId('')
    setPaymentType('PAID')
    setAmountPaid('0')
    setDueDate('')
    setLineItems([])
    setAmountToPaid("0")
  }

  const handleEdit = (row:PurchaseTransaction)=>{
    console.log(row);
    setSupplierId(row.supplierId)
    setPurchaseId(row.id)
    setPaymentType(row.paymentType)
    setAmountPaid(row.amountPaid)
    setDueDate(row.dueDate)
    setTotalPayment(Number(row.total))
    setIsViewOpen(true)
  }
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { id: Math.random().toString(), itemId: '', quantity: 1, unitCost: 0 }])
  }
  
  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(i => i.id !== id))
  }
  
  const handleLineItemChange = (id: string, field: string, value: string | number) => {
    setLineItems(lineItems.map(i => {
      if (i.id !== id) return i
      
      const updatedItem = { ...i, [field]: value }
      if (field === 'itemId') {
        const selectedItem = items.find(it => it.id === value)
        if (selectedItem) {
          updatedItem.unitCost = Number(selectedItem.unitCost)
        }
      }
      return updatedItem
    }))
  }

  const total = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
  }, [lineItems])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (lineItems.length === 0) return alert('Please add at least one item')
    
    createMutation.mutate({
      supplierId,
      paymentType,
      amountPaid: Number(amountPaid),
      dueDate: paymentType === 'CREDIT' ? dueDate : undefined,
      items: lineItems.map(({ itemId, quantity, unitCost }) => ({ itemId, quantity, unitCost }))
    })
  }

    const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    
    
    updatePaymentMutation.mutate({
      purchaseId: purchaseId,       
      amountToPaid: Number(amountToPaid),
      supplierId:supplierId
    })
  }

  const columns: Column<PurchaseTransaction>[] = [
    { header: 'Date', accessorFn: (row) => new Date(row.createdAt).toLocaleDateString('en-LK') },
    { header: 'Supplier', accessorFn: (row) => row.supplier?.name || '-' },
    { header: 'Total', accessorFn: (row) => `Rs. ${Number(row.total).toFixed(2)}` },
    { header: 'Payment', cell: ({ row }) => <StatusBadge status={row.paymentType} type="payment" /> },
    { header: 'Paid', accessorFn: (row) => `Rs. ${Number(row.amountPaid).toFixed(2)}` },
    { header: 'Due', cell: ({ row }) => <span className={Number(row.amountDue) > 0 ? 'text-red-500' : ''}>Rs. {Number(row.amountDue).toFixed(2)}</span> },
    { header: 'Due Date', accessorFn: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-LK') : '-' },
    { header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-2">
        <button className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20" onClick={()=> handleEdit(row)}>
          <Eye size={16} />
        </button>
        <button className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20">
          <Trash2 size={16} />
        </button>
      </div>
) }
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Purchases" 
        action={
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> New Purchase
          </button>
        }
      />
      <Modal isOpen={isViewOpen} onClose={closeViewModal} title='Edit Credit Details'>
        <form onSubmit={handleSubmitUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className='text-left'>
              <div className="text-xs text-[var(--color-text-secondary)]">Total Amount</div>
              <div className="text-xl font-bold text-[var(--color-accent)]">Rs. {totalPayment.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
            <div className='text-right'>
              <div className="text-xs text-[var(--color-text-secondary)]">Amount Due</div>
              <div className="text-xl font-bold text-red-500">Rs. {(totalPayment - Number(amountPaid)).toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
              
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount Paid (Rs.)" type="number" required min="0" step="0.01" value={amountPaid} disabled onChange={e => setAmountPaid(e.target.value)} />
            <FormField label="Add New Payment (Rs.)" type="number" required min="0" max={totalPayment - Number(amountPaid)} step="0.01" value={amountToPaid} onChange={e => setAmountToPaid(e.target.value)} />
          </div>

          <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
            <button type="button" className="btn btn-secondary ml-4" onClick={closeViewModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={totalPayment - Number(amountPaid) < Number(amountToPaid)}>
              {createMutation.isPending ? 'Updating...' : 'Update Purchase'}
            </button>
          </div>
          
          </form>
      </Modal>

      <DataTable data={purchases} columns={columns} isLoading={isLoading} />

      <Modal isOpen={isModalOpen} onClose={closeModal} title="New Purchase" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Supplier" as="select" required value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">Select a supplier...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </FormField>
            <FormField label="Payment Type" as="select" value={paymentType} onChange={e => setPaymentType(e.target.value as PurchaseType)}>
              <option value="PAID">Paid</option>
              <option value="CREDIT">Credit (Due)</option>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount Paid (Rs.)" type="number" required min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
            {paymentType === 'CREDIT' && (
              <FormField label="Due Date" type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
            )}
          </div>
          
          <div className="mt-6 border-t border-[var(--color-border)] pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-white">Line Items</h3>
              <button type="button" className="btn btn-secondary text-sm py-1" onClick={handleAddLineItem}>
                <Plus size={16} /> Add Item
              </button>
            </div>
            
            {lineItems.length === 0 ? (
              <div className="text-center p-4 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm">
                No items added yet. Click "Add Item" to start.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-start bg-[var(--color-bg-secondary)] p-2 rounded border border-[var(--color-border)]">
                    <div className="flex-1">
                      <select 
                        required
                        className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white"
                        value={item.itemId} 
                        onChange={e => handleLineItemChange(item.id, 'itemId', e.target.value)}
                      >
                        <option value="">Select inventory item...</option>
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <input 
                        type="number" required min="1" placeholder="Qty"
                        className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white"
                        value={item.quantity} 
                        onChange={e => handleLineItemChange(item.id, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className="w-24">
                      <input 
                        type="number" required min="0" step="0.01" placeholder="Cost"
                        className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-white"
                        value={item.unitCost} 
                        onChange={e => handleLineItemChange(item.id, 'unitCost', Number(e.target.value))}
                      />
                    </div>
                    <div className="w-24 flex items-center justify-end px-2 text-sm">
                      Rs. {(item.quantity * item.unitCost).toFixed(2)}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="text-right">
              <div className="text-xs text-[var(--color-text-secondary)]">Total Amount</div>
              <div className="text-xl font-bold text-[var(--color-accent)]">Rs. {total.toFixed(2)}</div>
            </div>
            <button type="button" className="btn btn-secondary ml-4" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || lineItems.length === 0}>
              {createMutation.isPending ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
