import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wallet,
  PlusCircle,
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { ledgerApi } from '../api/ledger'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { LoadingSpinner } from '../components/LoadingSpinner'
import type {
  LedgerEntry,
  LedgerAccount,
  LedgerTransactionType,
  CreateLedgerEntryRequest,
  UpdateLedgerEntryRequest,
} from '@shared/types'

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACCOUNT_LABELS: Record<LedgerAccount, string> = {
  GARAGE_CASH: 'Garage Cash',
  OWNER_CASH: 'Owner Cash',
}

const TYPE_LABELS: Record<LedgerTransactionType, string> = {
  STARTING_BALANCE: 'Starting Balance',
  CAPITAL_INJECTION: 'Capital Added',
  WITHDRAWAL: 'Cash Withdrawal',
  UTILITY_MACHINE: 'Utility Machine',
  EXPENSE: 'Expense',
  REPAIR_INCOME: 'Repair Income',
  REPAIRED_PARTS_INCOME: 'Parts Sale Income',
  INVENTORY_PURCHASES: 'Inventory Purchase',
  BIKE_PURCHASE: 'Bike Purchase',
  SUPPLIER_PAYMENT: 'Supplier Payment',
  SALARY_PAYMENTS: 'Salary Payment',
  REVERSAL: 'Reversal',
  PARTS_SALE_INCOME: 'Part Sale Income',
  BIKE_SALE_INCOME: 'Bike Sale Income',
}

const TYPE_OPTIONS: { value: LedgerTransactionType; label: string; flow: 'IN' | 'OUT' }[] = [
  { value: 'STARTING_BALANCE', label: 'Starting Balance', flow: 'IN' },
  { value: 'CAPITAL_INJECTION', label: 'Add Capital', flow: 'IN' },
  { value: 'WITHDRAWAL', label: 'Withdraw Cash', flow: 'OUT' },
  { value: 'UTILITY_MACHINE', label: 'Buy Utility Machine', flow: 'OUT' },
  { value: 'EXPENSE', label: 'Other Expense', flow: 'OUT' },
  { value: 'REPAIR_INCOME', label: 'Repair Income', flow: 'IN' },
  { value: 'REPAIRED_PARTS_INCOME', label: 'Parts Sale Income', flow: 'IN' },
  { value: 'INVENTORY_PURCHASES', label: 'Inventory Purchase', flow: 'OUT' },
  { value: 'BIKE_PURCHASE', label: 'Bike Purchase', flow: 'OUT' },
  { value: 'SALARY_PAYMENTS', label: 'Salary Payment', flow: 'OUT' },
  { value: 'REVERSAL', label: 'Reverse', flow: 'OUT' },
  { value: 'PARTS_SALE_INCOME', label: 'Part Sale', flow: 'IN' },
  { value: 'BIKE_SALE_INCOME', label: 'Bike Sale', flow: 'IN' },
]

const EXPENSE_CATEGORIES = [
  'Electricity', 'Water', 'Rent', 'Internet', 'Phone', 'Transport',
  'Fuel', 'Maintenance', 'Stationery', 'Cleaning', 'Medical', 'Food', 'Other',
]

const MACHINE_CATEGORIES = [
  'Air Compressor', 'Welding Machine', 'Hydraulic Jack', 'Battery Charger',
  'Drill Machine', 'Grinder', 'Scanner Tool', 'Lift/Ramp', 'Generator', 'Other',
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(val: number | string) {
  return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' })
}

function getTypeColor(type: LedgerTransactionType) {
  switch (type) {
    case 'STARTING_BALANCE': return 'bg-blue-500/20 text-blue-300'
    case 'CAPITAL_INJECTION': return 'bg-green-500/20 text-green-300'
    case 'WITHDRAWAL': return 'bg-orange-500/20 text-orange-300'
    case 'UTILITY_MACHINE': return 'bg-purple-500/20 text-purple-300'
    case 'EXPENSE': return 'bg-red-500/20 text-red-300'
    case 'REPAIR_INCOME': return 'bg-emerald-500/20 text-emerald-300'
    case 'REPAIRED_PARTS_INCOME': return 'bg-teal-500/20 text-teal-300'
    case 'INVENTORY_PURCHASES': return 'bg-rose-500/20 text-rose-300'
    case 'BIKE_PURCHASES': return 'bg-rose-500/20 text-rose-300'
    case 'SALARY_PAYMENTS': return 'bg-amber-500/20 text-amber-300'
    case 'REVERSAL': return 'bg-red-500/20 text-red-300'
    case 'PARTS_SALE_INCOME': return 'bg-green-500/20 text-green-300'
    case 'BIKE_SALE_INCOME': return 'bg-green-500/20 text-green-300'
    default: return 'bg-gray-500/20 text-gray-300'
  }
}

function getAccountColor(account: LedgerAccount) {
  return account === 'GARAGE_CASH'
    ? 'bg-cyan-500/20 text-cyan-300'
    : 'bg-amber-500/20 text-amber-300'
}

// ─── Empty Form State ──────────────────────────────────────────────────────────

const emptyForm = (): CreateLedgerEntryRequest => ({
  date: new Date().toISOString().split('T')[0],
  account: 'GARAGE_CASH',
  type: 'EXPENSE',
  amount: 0,
  category: '',
  description: '',
  reference: '',
})

const TYPE_PLACEHOLDERS: Record<LedgerTransactionType, string> = {
  STARTING_BALANCE: 'e.g. Initial cash balance',
  CAPITAL_INJECTION: 'e.g. Monthly capital injection',
  WITHDRAWAL: 'e.g. Owner withdrawal for personal use',
  UTILITY_MACHINE: 'e.g. Purchase of air compressor',
  EXPENSE: 'e.g. Monthly electricity bill',
  REPAIR_INCOME: 'e.g. Labor charge for job #245',
  REPAIRED_PARTS_INCOME: 'e.g. Parts used in job #245',
  INVENTORY_PURCHASES: 'e.g. Stock purchase from supplier',
  SALARY_PAYMENTS: 'e.g. August salary — mechanic',
}

// ─── Main Component ────────────────────────────────────────────────────────────

export const Ledger: React.FC = () => {
  const qc = useQueryClient()

  // ── Filters / Pagination ──
  const [filterAccount, setFilterAccount] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  // ── Modals ──
  const [modalOpen, setModalOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LedgerEntry | null>(null)
  const [form, setForm] = useState<CreateLedgerEntryRequest>(emptyForm())

  // ─── Data Fetching ───────────────────────────────────────────────────────────

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['ledger-summary'],
    queryFn: ledgerApi.getSummary,
  })

  
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['ledger-entries', page, filterAccount, filterType, search, dateFrom, dateTo],
    queryFn: () =>
      ledgerApi.listEntries({
        page,
        pageSize: PAGE_SIZE,
        account: filterAccount || undefined,
        type: filterType || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    })
    console.log(entriesData);

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['ledger-summary'] })
    qc.invalidateQueries({ queryKey: ['ledger-entries'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: CreateLedgerEntryRequest) => ledgerApi.createEntry(data),
    onSuccess: () => { invalidate(); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLedgerEntryRequest }) =>
      ledgerApi.updateEntry(id, data),
    onSuccess: () => { invalidate(); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ledgerApi.deleteEntry(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null) },
  })

  // ─── Modal Helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditEntry(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(entry: LedgerEntry) {
    setEditEntry(entry)
    setForm({
      date: new Date(entry.date).toISOString().split('T')[0],
      account: entry.account,
      type: entry.type,
      amount: Number(entry.amount),
      category: entry.category ?? '',
      description: entry.description,
      reference: entry.reference ?? '',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditEntry(null)
    setForm(emptyForm())
  }

  function handleFormChange(field: keyof CreateLedgerEntryRequest, value: string | number) {
    setForm((prev:any) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, amount: Number(form.amount) }
    console.log(payload)
    
    if (editEntry) {
      updateMutation.mutate({ id: editEntry.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const categoryOptions =
    form.type === 'UTILITY_MACHINE' ? MACHINE_CATEGORIES : EXPENSE_CATEGORIES

  const showCategory = form.type === 'UTILITY_MACHINE' || form.type === 'EXPENSE'
  const isMutating = createMutation.isPending || updateMutation.isPending

  // ─── Pagination ──────────────────────────────────────────────────────────────

  const totalPages = entriesData ? Math.ceil(entriesData.total / PAGE_SIZE) : 1

  return (
    <div className="animate-fade-in pb-10">
      <PageHeader
        title="Cash Ledger"
        subtitle="Track Garage Cash and Owner Cash flows — starting balance, capital, withdrawals, machines & expenses"
        action={
          <button
            onClick={openCreate}
            className="btn btn-primary"
          >
            <PlusCircle size={16} />
            Add Transaction
          </button>
        }
      />

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      {summaryLoading ? (
        <LoadingSpinner />
      ) : summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Garage Cash Balance */}
          <div className="glass-card rounded-lg p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm text-[var(--color-text-secondary)] font-medium">Garage Cash</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Wallet size={20} /></div>
            </div>
            <div className={`text-2xl font-bold mb-1 ${summary.garage.currentBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
              {fmtMoney(summary.garage.currentBalance)}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              In: {fmtMoney(summary.garage.totalIn)} | Out: {fmtMoney(summary.garage.totalOut)}
            </div>
          </div>

          {/* Owner Cash Balance */}
          <div className="glass-card rounded-lg p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm text-[var(--color-text-secondary)] font-medium">Owner Cash</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400"><Wallet size={20} /></div>
            </div>
            <div className={`text-2xl font-bold mb-1 ${summary.owner.currentBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
              {fmtMoney(summary.owner.currentBalance)}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              In: {fmtMoney(summary.owner.totalIn)} | Out: {fmtMoney(summary.owner.totalOut)}
            </div>
          </div>

          {/* Total Utility Machines */}
          <div className="glass-card rounded-lg p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm text-[var(--color-text-secondary)] font-medium">Utility Machines</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><Wrench size={20} /></div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{fmtMoney(summary.totalUtilityMachines)}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Total invested in machines</div>
          </div>

          {/* Total Expenses */}
          <div className="glass-card rounded-lg p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm text-[var(--color-text-secondary)] font-medium">Total Expenses</span>
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400"><TrendingDown size={20} /></div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{fmtMoney(summary.totalExpenses)}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Withdrawals: {fmtMoney(summary.totalWithdrawals)}
            </div>
          </div>
        </div>
      )}

      {/* ── Second row stats ──────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-400"><TrendingUp size={18} /></div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Total Cash Pool</p>
              <p className="font-bold text-white">{fmtMoney(summary.totalCashPool)}</p>
            </div>
          </div>
          <div className="glass-card rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><DollarSign size={18} /></div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Garage Start Balance</p>
              <p className="font-bold text-white">{fmtMoney(summary.garage.startingBalance)}</p>
            </div>
          </div>
          <div className="glass-card rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400"><DollarSign size={18} /></div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Owner Start Balance</p>
              <p className="font-bold text-white">{fmtMoney(summary.owner.startingBalance)}</p>
            </div>
          </div>
          <div className="glass-card rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-400"><TrendingUp size={18} /></div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Total Capital Added</p>
              <p className="font-bold text-white">{fmtMoney(summary.totalCapital)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1 font-medium">Account</label>
          <select
            value={filterAccount}
            onChange={e => { setFilterAccount(e.target.value); setPage(1) }}
            className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-2 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none"
          >
            <option value="">All Accounts</option>
            <option value="GARAGE_CASH">Garage Cash</option>
            <option value="OWNER_CASH">Owner Cash</option>
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1 font-medium">Type</label>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1) }}
            className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-2 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none"
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-32">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1 font-medium">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="w-full input-field text-sm rounded px-2 py-2"
          />
        </div>
        <div className="flex-1 min-w-32">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1 font-medium">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="w-full input-field text-sm  rounded px-2 py-2"
          />
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1 font-medium">Search</label>
          <input
            type="text"
            placeholder="Description, category..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full input-field text-sm"
          />
        </div>
        {(filterAccount || filterType || search || dateFrom || dateTo) && (
          <button
            className="text-xs text-[var(--color-text-secondary)] hover:text-white underline"
            onClick={() => { setFilterAccount(''); setFilterType(''); setSearch(''); setDateFrom(''); setDateTo(''); setPage(1) }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Transactions Table ────────────────────────────────────────────── */}
      <div className="glass-card rounded-lg overflow-hidden">
        {entriesLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : !entriesData || entriesData.data.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-secondary)]">
            <Wallet size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No transactions found</p>
            <p className="text-sm mt-1">Add your first transaction using the button above</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-white/5">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Account</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Type</th>
                    <th className="text-left py-3 px-4 font-semibold w-110 text-[var(--color-text-secondary)]">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Reference</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Source</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Amount</th>
                    <th className="text-center py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entriesData.data.map((entry:any, idx:number) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-[var(--color-border)]/50 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                    >
                      <td className="py-3 px-4 text-[var(--color-text-secondary)] whitespace-nowrap">{fmtDate(entry.date)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccountColor(entry.account)}`}>
                          {ACCOUNT_LABELS[entry.account]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                          {TYPE_LABELS[entry.type]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white max-w-48 truncate">{entry.description}</td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)]">{entry.category || '—'}</td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)] text-xs">{entry.reference || '—'}</td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)] text-xs">{entry.sourceModule || '—'}</td>
                      <td className={`py-3 px-4 text-right font-semibold whitespace-nowrap ${entry.flow === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
                        {entry.flow === 'IN' ? '+' : '-'} {fmtMoney(entry.amount)}
                      </td>
                      <td className="py-3 px-4">
                        {!entry.sourceModule && (

                          <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(entry)}
                            className="p-1.5 rounded hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white transition-colors"
                            title="Edit"
                            >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(entry)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-[var(--color-text-secondary)] hover:text-red-400 transition-colors"
                            title="Delete"
                            >
                            <Trash2 size={14} />
                          </button>
                        </div>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, entriesData.total)} of {entriesData.total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[var(--color-text-secondary)]">Page {page} / {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editEntry ? 'Edit Transaction' : 'Add Transaction'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Account *</label>
              <select
                value={form.account}
                onChange={e => handleFormChange('account', e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-2 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none"
                required
              >
                <option value="GARAGE_CASH">Garage Cash</option>
                <option value="OWNER_CASH">Owner Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Transaction Type *</label>
              <select
                value={form.type}
                onChange={e => handleFormChange('type', e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-2 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none"
                required
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.flow === 'IN' ? '↑ ' : '↓ '}{t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Date *"
              type="date"
              value={form.date ?? ''}
              onChange={e => handleFormChange('date', e.target.value)}
              required
            />
            <FormField
              label="Amount (Rs.) *"
              type="number"
              value={form.amount === 0 ? '' : String(form.amount)}
              onChange={e => handleFormChange('amount', Number(e.target.value))}
              required
              min={0.01}
              step={0.01}
            />
          </div>

          <FormField
            label="Description *"
            type="text"
            value={form.description}
            onChange={e => handleFormChange('description', e.target.value)}
            required
            placeholder={TYPE_PLACEHOLDERS[form.type] ?? 'e.g. Description'}
          />

          {showCategory && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Category</label>
              <input
                list="category-suggestions"
                type="text"
                value={form.category ?? ''}
                onChange={e => handleFormChange('category', e.target.value)}
                placeholder="Select or type a category"
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-2 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none"
              />
              <datalist id="category-suggestions">
                {categoryOptions.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          )}

          <FormField
            label="Reference / Note"
            type="text"
            value={form.reference ?? ''}
            onChange={e => handleFormChange('reference', e.target.value)}
            placeholder="e.g. Invoice #123, receipt number…"
          />

          {/* Flow indicator */}
          <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
            (TYPE_OPTIONS.find(t => t.value === form.type)?.flow ?? 'OUT') === 'IN'
              ? 'bg-green-500/10 text-green-300 border border-green-500/20'
              : 'bg-red-500/10 text-red-300 border border-red-500/20'
          }`}>
            {(TYPE_OPTIONS.find(t => t.value === form.type)?.flow ?? 'OUT') === 'IN' ? (
              <><TrendingUp size={16} /> This will <strong>increase</strong> {ACCOUNT_LABELS[form.account]} balance.</>
            ) : (
              <><TrendingDown size={16} /> This will <strong>decrease</strong> {ACCOUNT_LABELS[form.account]} balance.</>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isMutating} className="btn btn-primary">
              {isMutating ? 'Saving…' : editEntry ? 'Update Transaction' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          title="Delete Transaction"
          message={`Are you sure you want to delete "${deleteTarget.description}" (${fmtMoney(deleteTarget.amount)})? This will affect the account balance.`}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}