import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Edit, Trash2 } from 'lucide-react'
import { customersApi } from '../api/customers'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { DataTable, Column } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Customer, Vehicle } from '@shared/types'

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.listCustomers(search)
  })

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
    }
  })

  const deleteMutation = useMutation({
    mutationFn: customersApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setDeleteId(null)
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
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Customer
          </button>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or phone..." />
      </div>

      <DataTable data={customers} columns={columns} isLoading={isLoading} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Full Name" required value={name} onChange={e => setName(e.target.value)} />
          <FormField label="Phone Number" required value={phone} onChange={e => setPhone(e.target.value)} />
          <FormField label="Address" as="textarea" rows={3} value={address} onChange={e => setAddress(e.target.value)} />
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isViewOpen} onClose={closeViewModal} title="Customer Profile" size="lg">
        {editingCustomer && (
          <div>
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

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
