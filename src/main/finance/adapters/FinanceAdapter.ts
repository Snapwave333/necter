// Finance provider interface — implemented by Actual Budget, Firefly III, OpenBB, CSV, etc.

import type {
  Account,
  Transaction,
  TransactionDraft,
  Category,
  BudgetStatus,
  SafeSpendResult,
  DateRange,
} from '../models'

export type FinanceBackend = 'actual' | 'firefly' | 'openbb' | 'csv'

export interface FinanceProvider {
  readonly name: string
  readonly backend: FinanceBackend

  // Accounts
  listAccounts(): Promise<Account[]>
  getAccount(id: string): Promise<Account>

  // Transactions
  listTransactions(range: DateRange): Promise<Transaction[]>
  createTransaction(draft: TransactionDraft): Promise<Transaction>
  categorizeTransaction(id: string, categoryId: string): Promise<void>

  // Budget
  getBudgetStatus(month: string): Promise<BudgetStatus>
  getSafeToSpend(date: string): Promise<SafeSpendResult>

  // Categories
  listCategories(): Promise<Category[]>

  // Health check
  ping(): Promise<boolean>
}
