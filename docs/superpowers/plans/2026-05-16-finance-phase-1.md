# Finance Phase 1 — Finance Adapter Core

**Goal:** Build the Finance Adapter Interface + Actual Budget adapter + Permission Gate — the foundation everything else plugs into.

**Target:** Necter v3.4.0

---

## What We're Building

```
src/main/finance/
├── adapters/
│   ├── FinanceAdapter.ts       ← base interface
│   ├── ActualBudgetAdapter.ts  ← first implementation
│   └── index.ts
├── permission/
│   ├── PermissionGate.ts
│   └── PermissionLevel.ts
├── models/
│   ├── Account.ts
│   ├── Transaction.ts
│   ├── Category.ts
│   └── BudgetStatus.ts
├── SafeSpendCalculator.ts
└── financeIpc.ts              ← main-process IPC handlers
```

---

## Step 1 — TypeScript Models

```typescript
// src/main/finance/models/Account.ts
export interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash'
  balance: number        // current balance in cents
  currency: string       // ISO 4217 e.g. 'USD'
  lastReconciled: string // ISO date
}

// src/main/finance/models/Transaction.ts
export interface Transaction {
  id: string
  accountId: string
  date: string           // ISO date
  payee: string
  amount: number         // in cents, negative = outflow
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

// src/main/finance/models/Category.ts
export interface Category {
  id: string
  name: string
  group: string   // e.g. "Food", "Transport"
  hidden: boolean
}

// src/main/finance/models/BudgetStatus.ts
export interface BudgetStatus {
  month: string           // 'YYYY-MM'
  categories: CategoryBudget[]
  totalIncome: number
  totalSpent: number
  totalBudgeted: number
}

export interface CategoryBudget {
  categoryId: string
  categoryName: string
  budgeted: number
  spent: number
  available: number  // budgeted - spent
}

export interface SafeSpendResult {
  date: string
  safeToSpend: number   // in cents
  upcomingBills: number
  accountBalance: number
}
```

---

## Step 2 — FinanceAdapter Interface

```typescript
// src/main/finance/adapters/FinanceAdapter.ts
import type { Account, Transaction, TransactionDraft,
             Category, BudgetStatus, SafeSpendResult, DateRange } from '../models'

export interface FinanceProvider {
  readonly name: string
  readonly backend: 'actual' | 'firefly' | 'openbb' | 'csv'

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

  // Health
  ping(): Promise<boolean>
}

export type { Account, Transaction, TransactionDraft,
             Category, BudgetStatus, SafeSpendResult, DateRange }
```

---

## Step 3 — Permission Gate

```typescript
// src/main/finance/permission/PermissionLevel.ts
export enum PermissionLevel {
  READ   = 0,  // summarize, explain, detect anomalies
  DRAFT  = 1,  // suggest, draft notes, draft changes
  WRITE  = 2,  // categorize, create transaction — REQUIRES user approval
  FORBID = 3,  // pay bills, transfer money, trade, delete — always blocked
}

// src/main/finance/permission/PermissionGate.ts
import { PermissionLevel } from './PermissionLevel'

export class PermissionGate {
  // Default: read + draft allowed, write requires approval, forbidden blocked
  static check(tool: string, level: PermissionLevel): void {
    if (level === PermissionLevel.FORBID) {
      throw new Error(`Permission denied: ${tool} is forbidden. AI cannot perform this action.`)
    }
    if (level === PermissionLevel.WRITE) {
      throw new Error(`Permission required: ${tool} requires user approval (Level 2).`)
    }
    // Level 0 (read) and Level 1 (draft) are always allowed
  }

  static readonly TOOL_LEVELS: Record<string, PermissionLevel> = {
    'finance.listAccounts':        PermissionLevel.READ,
    'finance.listTransactions':    PermissionLevel.READ,
    'finance.getAccount':           PermissionLevel.READ,
    'finance.getBudgetStatus':     PermissionLevel.READ,
    'finance.getSafeToSpend':      PermissionLevel.READ,
    'finance.listCategories':      PermissionLevel.READ,
    'finance.summarize':           PermissionLevel.READ,
    'finance.detectAnomaly':       PermissionLevel.READ,

    'finance.suggestCategory':     PermissionLevel.DRAFT,
    'finance.draftTransaction':    PermissionLevel.DRAFT,
    'finance.draftNote':           PermissionLevel.DRAFT,

    'finance.createTransaction':   PermissionLevel.WRITE,
    'finance.categorizeTransaction': PermissionLevel.WRITE,
    'finance.reallocateBudget':    PermissionLevel.WRITE,

    'finance.payBill':             PermissionLevel.FORBID,
    'finance.transferMoney':       PermissionLevel.FORBID,
    'finance.trade':               PermissionLevel.FORBID,
    'finance.deleteRecord':        PermissionLevel.FORBID,
    'finance.connectBank':         PermissionLevel.FORBID,
  }
}
```

---

## Step 4 — ActualBudgetAdapter

**Actual Budget** is a local-first personal finance app. It stores data in a sync file (encrypted SQLite). We interact with it via its REST API server.

### Setup
Actual Budget runs a local sync server. We connect to `http://localhost:50061` (default Actual sync server port).

```typescript
// src/main/finance/adapters/ActualBudgetAdapter.ts
import { FinanceProvider } from './FinanceAdapter'
import type { Account, Transaction, TransactionDraft,
             Category, BudgetStatus, SafeSpendResult, DateRange } from '../models'
import { PermissionGate, PermissionLevel } from '../permission'

export class ActualBudgetAdapter implements FinanceProvider {
  readonly name = 'Actual Budget'
  readonly backend = 'actual' as const
  private baseUrl = 'http://localhost:50061'

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/budget`)
      return res.ok
    } catch {
      return false
    }
  }

  async listAccounts(): Promise<Account[]> {
    PermissionGate.check('finance.listAccounts', PermissionLevel.READ)
    const res = await fetch(`${this.baseUrl}/accounts`)
    const data = await res.json()
    return data.map(this.mapAccount)
  }

  async getAccount(id: string): Promise<Account> {
    PermissionGate.check('finance.getAccount', PermissionLevel.READ)
    const res = await fetch(`${this.baseUrl}/accounts/${id}`)
    return this.mapAccount(await res.json())
  }

  async listTransactions(range: DateRange): Promise<Transaction[]> {
    PermissionGate.check('finance.listTransactions', PermissionLevel.READ)
    const url = `${this.baseUrl}/transactions?start=${range.start}&end=${range.end}`
    const res = await fetch(url)
    const data = await res.json()
    return data.map(this.mapTransaction)
  }

  async createTransaction(draft: TransactionDraft): Promise<Transaction> {
    PermissionGate.check('finance.createTransaction', PermissionLevel.WRITE)
    const res = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    return this.mapTransaction(await res.json())
  }

  async categorizeTransaction(id: string, categoryId: string): Promise<void> {
    PermissionGate.check('finance.categorizeTransaction', PermissionLevel.WRITE)
    await fetch(`${this.baseUrl}/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    })
  }

  async getBudgetStatus(month: string): Promise<BudgetStatus> {
    PermissionGate.check('finance.getBudgetStatus', PermissionLevel.READ)
    const res = await fetch(`${this.baseUrl}/budget/${month}`)
    return res.json()
  }

  async getSafeToSpend(date: string): Promise<SafeSpendResult> {
    PermissionGate.check('finance.getSafeToSpend', PermissionLevel.READ)
    const res = await fetch(`${this.baseUrl}/budget/safe-to-spend?date=${date}`)
    return res.json()
  }

  async listCategories(): Promise<Category[]> {
    PermissionGate.check('finance.listCategories', PermissionLevel.READ)
    const res = await fetch(`${this.baseUrl}/categories`)
    const data = await res.json()
    return data.map(this.mapCategory)
  }

  // ---- mappers (Actual's internal format → our model) ----
  private mapAccount(a: any): Account {
    return {
      id: a.id,
      name: a.name,
      type: a.type ?? 'checking',
      balance: Math.round((a.balance ?? 0) * 100), // dollars → cents
      currency: a.currency ?? 'USD',
      lastReconciled: a.lastReconciled ?? '',
    }
  }

  private mapTransaction(t: any): Transaction {
    return {
      id: t.id,
      accountId: t.account_id,
      date: t.date,
      payee: t.payee_name ?? '',
      amount: Math.round((t.amount ?? 0) * 100),
      categoryId: t.category_id ?? null,
      notes: t.notes ?? '',
      cleared: t.cleared ?? false,
      approved: t.approved ?? true,
    }
  }

  private mapCategory(c: any): Category {
    return {
      id: c.id,
      name: c.name,
      group: c.group ?? 'General',
      hidden: c.hidden ?? false,
    }
  }
}
```

---

## Step 5 — SafeSpendCalculator

```typescript
// src/main/finance/SafeSpendCalculator.ts
export class SafeSpendCalculator {
  static calculate(
    accountBalance: number,   // cents
    upcomingBills: number,    // cents
    reservedBudget: number,  // cents
  ): SafeSpendResult {
    const safeToSpend = accountBalance - upcomingBills - reservedBudget
    return {
      date: new Date().toISOString().split('T')[0],
      safeToSpend: Math.max(0, safeToSpend),
      upcomingBills,
      accountBalance,
    }
  }
}
```

---

## Step 6 — IPC Handlers (Main Process)

```typescript
// src/main/finance/financeIpc.ts
import { ipcMain } from 'electron'
import { ActualBudgetAdapter } from './adapters/ActualBudgetAdapter'
import { PermissionGate } from './permission'
import { SafeSpendCalculator } from './SafeSpendCalculator'

const adapter = new ActualBudgetAdapter()

export function registerFinanceIpc(): void {
  ipcMain.handle('finance:listAccounts',     () => adapter.listAccounts())
  ipcMain.handle('finance:getAccount',        (_, id) => adapter.getAccount(id))
  ipcMain.handle('finance:listTransactions',  (_, range) => adapter.listTransactions(range))
  ipcMain.handle('finance:createTransaction', (_, draft) => adapter.createTransaction(draft))
  ipcMain.handle('finance:categorize',        (_, id, catId) => adapter.categorizeTransaction(id, catId))
  ipcMain.handle('finance:budgetStatus',      (_, month) => adapter.getBudgetStatus(month))
  ipcMain.handle('finance:safeToSpend',      (_, date) => adapter.getSafeToSpend(date))
  ipcMain.handle('finance:listCategories',   () => adapter.listCategories())
  ipcMain.handle('finance:ping',             () => adapter.ping())
}
```

---

## Step 7 — Renderer IPC Bridge (Preload)

```typescript
// src/preload/financeBridge.ts  (add to existing preload.ts)
contextBridge.exposeInMainWorld('financeAPI', {
  listAccounts:     () => ipcRenderer.invoke('finance:listAccounts'),
  getAccount:       (id: string) => ipcRenderer.invoke('finance:getAccount', id),
  listTransactions: (range: DateRange) => ipcRenderer.invoke('finance:listTransactions', range),
  createTransaction: (draft: TransactionDraft) => ipcRenderer.invoke('finance:createTransaction', draft),
  categorize:       (id: string, catId: string) => ipcRenderer.invoke('finance:categorize', id, catId),
  budgetStatus:     (month: string) => ipcRenderer.invoke('finance:budgetStatus', month),
  safeToSpend:      (date: string) => ipcRenderer.invoke('finance:safeToSpend', date),
  listCategories:   () => ipcRenderer.invoke('finance:listCategories'),
  ping:             () => ipcRenderer.invoke('finance:ping'),
})
```

---

## Step 8 — Actual Budget Server Detection + Startup

Necter should detect if Actual Budget server is running. If not, it can offer to launch it.

```typescript
// src/main/finance/actualServer.ts
export async function ensureActualServer(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:50061/budget')
    return res.ok
  } catch {
    // Actual server not running
    // Could show user a dialog offering to start it
    return false
  }
}
```

---

## Verification

1. Start Actual Budget desktop app (enables sync server on port 50061)
2. Run `npm run build && npm run electron`
3. Open DevTools → Console: `await window.financeAPI.ping()` → `true`
4. `await window.financeAPI.listAccounts()` → Account list
5. `await window.financeAPI.listTransactions({start:'2026-01-01', end:'2026-12-31'})` → transactions
6. `await window.financeAPI.safeToSpend('2026-05-16')` → safe-to-spend figure
7. Try `window.financeAPI.createTransaction(...)` — should throw "requires user approval" (Level 2)
8. Verify Level 3 (forbidden) action throws error

---

## Milestones

- [ ] TypeScript models
- [ ] FinanceAdapter interface
- [ ] PermissionLevel enum + PermissionGate
- [ ] ActualBudgetAdapter (working, tested against real Actual Budget server)
- [ ] SafeSpendCalculator
- [ ] IPC handlers registered
- [ ] Preload bridge exposed
- [ ] Finance panel UI (basic account list + balance display)
- [ ] Tested against live Actual Budget instance

---

_Document created: 2026-05-16_
