// Actual Budget REST API adapter
// Actual Budget runs a local sync server (default port 50061).
// Docs: https://actualbudget.com/docs

import { FinanceProvider, FinanceBackend } from './FinanceAdapter'
import type {
  Account,
  Transaction,
  TransactionDraft,
  Category,
  BudgetStatus,
  SafeSpendResult,
  DateRange,
} from '../models'
import { PermissionGate } from '../permission/PermissionGate'

export class ActualBudgetAdapter implements FinanceProvider {
  readonly name = 'Actual Budget'
  readonly backend: FinanceBackend = 'actual'
  private baseUrl: string

  constructor(port = 50061) {
    this.baseUrl = `http://localhost:${port}`
  }

  // ── Health ─────────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/budget`, {
        signal: AbortSignal.timeout(3000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  // ── Accounts ───────────────────────────────────────────────────────────────

  async listAccounts(): Promise<Account[]> {
    PermissionGate.check('finance.listAccounts', PermissionGate.levelFor('finance.listAccounts'))
    const res = await this.get(`/accounts`)
    const data = await res.json()
    return (Array.isArray(data) ? data : data.accounts ?? []).map(this.mapAccount)
  }

  async getAccount(id: string): Promise<Account> {
    PermissionGate.check('finance.getAccount', PermissionGate.levelFor('finance.getAccount'))
    const res = await this.get(`/accounts/${id}`)
    return this.mapAccount(await res.json())
  }

  // ── Transactions ───────────────────────────────────────────────────────────

  async listTransactions(range: DateRange): Promise<Transaction[]> {
    PermissionGate.check('finance.listTransactions', PermissionGate.levelFor('finance.listTransactions'))
    const url = `${this.baseUrl}/transactions?start=${range.start}&end=${range.end}`
    const res = await this.get(url)
    const data = await res.json()
    return (Array.isArray(data) ? data : data.transactions ?? []).map(this.mapTransaction)
  }

  async createTransaction(draft: TransactionDraft): Promise<Transaction> {
    PermissionGate.check('finance.createTransaction', PermissionGate.levelFor('finance.createTransaction'))
    // POST to /transactions/bulk POST body: { transactions: [draft] }
    const res = await this.post(`/transactions`, {
      transactions: [{ ...draft, approved: false }],
    })
    const result = await res.json()
    const created = Array.isArray(result) ? result[0] : result.transactions?.[0] ?? result
    return this.mapTransaction(created)
  }

  async categorizeTransaction(id: string, categoryId: string): Promise<void> {
    PermissionGate.check(
      'finance.categorizeTransaction',
      PermissionGate.levelFor('finance.categorizeTransaction')
    )
    await this.patch(`/transactions/${id}`, { categoryId })
  }

  // ── Budget ─────────────────────────────────────────────────────────────────

  async getBudgetStatus(month: string): Promise<BudgetStatus> {
    PermissionGate.check('finance.getBudgetStatus', PermissionGate.levelFor('finance.getBudgetStatus'))
    const res = await this.get(`/budget/${month}`)
    return res.json()
  }

  async getSafeToSpend(date: string): Promise<SafeSpendResult> {
    PermissionGate.check('finance.getSafeToSpend', PermissionGate.levelFor('finance.getSafeToSpend'))
    const res = await this.get(`/budget/safe-to-spend?date=${date}`)
    return res.json()
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async listCategories(): Promise<Category[]> {
    PermissionGate.check('finance.listCategories', PermissionGate.levelFor('finance.listCategories'))
    const res = await this.get(`/categories`)
    const data = await res.json()
    return (Array.isArray(data) ? data : data.categories ?? []).map(this.mapCategory)
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  private async get(path: string): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Actual API error ${res.status} on GET ${path}: ${await res.text()}`)
    return res
  }

  private async post(path: string, body: unknown): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Actual API error ${res.status} on POST ${path}: ${await res.text()}`)
    return res
  }

  private async patch(path: string, body: unknown): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Actual API error ${res.status} on PATCH ${path}: ${await res.text()}`)
    return res
  }

  // ── Mappers — Actual Budget internal format → our domain model ─────────────

  /** Actual stores amounts as dollars (float); we store as cents (integer) */
  private mapAccount(a: Record<string, unknown>): Account {
    return {
      id: String(a.id ?? ''),
      name: String(a.name ?? ''),
      type: (a.type as Account['type']) ?? 'checking',
      balance: Math.round((Number(a.balance) || 0) * 100),
      currency: String(a.currency ?? a.detailedType ?? 'USD'),
      lastReconciled: String(a.lastReconciled ?? ''),
    }
  }

  private mapTransaction(t: Record<string, unknown>): Transaction {
    return {
      id: String(t.id ?? ''),
      accountId: String(t.account_id ?? ''),
      date: String(t.date ?? ''),
      payee: String(t.payee_name ?? t.payee ?? ''),
      amount: Math.round((Number(t.amount) || 0) * 100),
      categoryId: t.category_id ? String(t.category_id) : null,
      notes: String(t.notes ?? ''),
      cleared: Boolean(t.cleared),
      approved: Boolean(t.approved ?? true),
    }
  }

  private mapCategory(c: Record<string, unknown>): Category {
    return {
      id: String(c.id ?? ''),
      name: String(c.name ?? ''),
      group: String(c.group ?? 'General'),
      hidden: Boolean(c.hidden),
    }
  }
}
