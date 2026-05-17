// Finance domain models for Necter Ledger

export interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash'
  balance: number   // current balance in cents
  currency: string  // ISO 4217 e.g. 'USD'
  lastReconciled: string // ISO date
}

export interface Transaction {
  id: string
  accountId: string
  date: string      // ISO date YYYY-MM-DD
  payee: string
  amount: number    // in cents, negative = outflow
  categoryId: string | null
  notes: string
  cleared: boolean
  approved: boolean
}

export interface TransactionDraft {
  accountId: string
  date: string
  payee: string
  amount: number
  categoryId?: string
  notes?: string
}

export interface Category {
  id: string
  name: string
  group: string   // e.g. "Food", "Transport"
  hidden: boolean
}

export interface CategoryBudget {
  categoryId: string
  categoryName: string
  budgeted: number   // cents
  spent: number      // cents
  available: number  // budgeted - spent (cents)
}

export interface BudgetStatus {
  month: string            // 'YYYY-MM'
  categories: CategoryBudget[]
  totalIncome: number      // cents
  totalSpent: number      // cents
  totalBudgeted: number    // cents
}

export interface SafeSpendResult {
  date: string
  safeToSpend: number    // cents
  upcomingBills: number  // cents
  accountBalance: number // cents
}

export interface DateRange {
  start: string  // ISO date
  end: string    // ISO date
}
