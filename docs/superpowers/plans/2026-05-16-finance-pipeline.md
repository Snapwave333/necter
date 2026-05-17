# Finance Pipeline — 5-Phase Roadmap

> Personal finance intelligence layer for Necter — adapter-based, permission-gated, local-first.

## Architecture Overview

```
[Necter Chat UI]
       ↓
[Finance Agent Layer]
       ↓
[Permission Gate]  ← AI action safety model
       ↓
[Finance Adapter Interface]
       ↓
  ┌──────┼───────┬──────────┐
  ↓      ↓       ↓          ↓
Actual  Firefly  OpenBB    CSV
Budget   III    (invest)  Import
```

## Adapter Interface (TypeScript)

```typescript
interface FinanceProvider {
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
}

interface DateRange {
  start: string   // ISO date
  end: string      // ISO date
}
```

## AI Safety Model — Permission Levels

| Level | Name | Description | Default |
|-------|------|-------------|---------|
| 0 | Read-only | Summarize, explain, detect anomalies | ✅ Allowed |
| 1 | Draft | Suggest categories, draft notes, draft changes | ✅ Allowed |
| 2 | Approved Write | Categorize, create transaction, move budget | ⏳ User approval required |
| 3 | Forbidden | Pay bills, transfer money, trade, delete records | 🚫 Always blocked |

**Default policy: AI can read. AI can suggest. AI can draft. Human approves writes. AI never moves money.**

---

## Phase 1 ✅ Ready to Start
**Finance Adapter Core** — Interface + Actual Budget + Permission Gate (v3.4.0)

- [ ] `FinanceAdapter` TypeScript interface (`src/main/finance/adapters/FinanceAdapter.ts`)
- [ ] `ActualBudgetAdapter` — first backend implementation
- [ ] `PermissionGate` — enforces Level 0/1/2/3 model
- [ ] `SafeSpendCalculator` — safe-to-spend logic using Actual's API
- [ ] Basic Finance UI panel — account list, balance, transaction feed
- [ ] IPC handlers for finance operations
- [ ] Actual Budget sync daemon (runs alongside Necter main process)

**Owner:** Necter Agent
**Status:** IN PROGRESS
**Details:** `docs/superpowers/plans/2026-05-16-finance-phase-1.md`

---

## Phase 2 📋 Next
**Smart Spend Engine** — Categorization + Anomaly Detection + Ollama (v3.5.0)

- [ ] Ollama/Qwen categorizer — suggests category for new transactions
- [ ] Bill detection — flags recurring payments
- [ ] Anomaly detection — flags unusual spending patterns
- [ ] Budget progress UI — envelope/budget status per category
- [ ] Upcoming bills widget
- [ ] Monthly spending summary

**Owner:** TBD
**Status:** PLANNED

---

## Phase 3 📋 Planned
**Write Operations + Firefly III** — Draft/Approve Flow + Second Backend (v3.6.0)

- [ ] Level 2 approved-write flow — AI drafts, user confirms
- [ ] Transaction creation (manual entry with AI assist)
- [ ] Budget reallocation (AI suggests, user approves)
- [ ] `FireflyIIIAdapter` — second backend for power users
- [ ] Adapter selector UI — pick which backend per workspace
- [ ] AGPL compliance notes for Firefly III integration

**Owner:** TBD
**Status:** PLANNED

---

## Phase 4 📋 Planned
**Investment Layer** — OpenBB + Portfolio Intelligence (v3.7.0)

- [ ] `OpenBBAdapter` — stocks, crypto, ETFs, macro data
- [ ] Portfolio dashboard
- [ ] Market research copilot
- [ ] Investment Health Score
- [ ] News + sentiment integration

**Owner:** TBD
**Status:** PLANNED

---

## Phase 5 📋 Future
**Automation + Collaboration** — Scheduled Flows + Multi-User (v3.8.0+)

- [ ] Scheduled budgeting automations (cron-based)
- [ ] CSV + SimpleFIN import pipeline
- [ ] Plaid import (future, if user provides credentials)
- [ ] Multi-workspace finance views
- [ ] Finance skills for Necter agent

**Owner:** TBD
**Status:** FUTURE

---

_Document created: 2026-05-16_
