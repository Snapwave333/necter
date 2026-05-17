// Finance IPC handlers — registers all finance:* channels in the main process

import { ipcMain } from 'electron'
import { ActualBudgetAdapter } from './adapters/ActualBudgetAdapter'
import type { TransactionDraft, DateRange } from './models'

// Singleton adapter instance (port configured via env or defaults to 50061)
const adapter = new ActualBudgetAdapter()

export function registerFinanceIpc(): void {
  // ── Accounts ────────────────────────────────────────────────────────────────
  ipcMain.handle('finance:listAccounts', async () => {
    return adapter.listAccounts()
  })

  ipcMain.handle('finance:getAccount', async (_, id: string) => {
    return adapter.getAccount(id)
  })

  // ── Transactions ───────────────────────────────────────────────────────────
  ipcMain.handle('finance:listTransactions', async (_, range: DateRange) => {
    return adapter.listTransactions(range)
  })

  ipcMain.handle(
    'finance:createTransaction',
    async (_, draft: TransactionDraft) => {
      return adapter.createTransaction(draft)
    },
  )

  ipcMain.handle(
    'finance:categorizeTransaction',
    async (_, id: string, categoryId: string) => {
      return adapter.categorizeTransaction(id, categoryId)
    },
  )

  // ── Budget ────────────────────────────────────────────────────────────────
  ipcMain.handle('finance:getBudgetStatus', async (_, month: string) => {
    return adapter.getBudgetStatus(month)
  })

  ipcMain.handle('finance:getSafeToSpend', async (_, date: string) => {
    return adapter.getSafeToSpend(date)
  })

  // ── Categories ────────────────────────────────────────────────────────────
  ipcMain.handle('finance:listCategories', async () => {
    return adapter.listCategories()
  })

  // ── Health ────────────────────────────────────────────────────────────────
  ipcMain.handle('finance:ping', async () => {
    return adapter.ping()
  })
}
