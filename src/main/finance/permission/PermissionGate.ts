// Permission gate — enforces AI safety model for finance operations

import { PermissionLevel } from './PermissionLevel'

export class PermissionGate {
  /**
   * Check if a tool is allowed at the given permission level.
   * Throws an Error with a user-friendly message if blocked.
   */
  static check(tool: string, level: PermissionLevel): void {
    if (level === PermissionLevel.FORBID) {
      throw new Error(
        `[Finance] Permission denied: "${tool}" is forbidden. ` +
        `AI cannot pay bills, transfer money, trade, or delete financial records.`
      )
    }
    if (level === PermissionLevel.WRITE) {
      throw new Error(
        `[Finance] Approval required: "${tool}" requires your confirmation before executing.`
      )
    }
    // Level 0 (READ) and Level 1 (DRAFT) are always allowed silently
  }

  /** Map tool names to their required permission levels */
  static readonly TOOL_LEVELS: Record<string, PermissionLevel> = {
    // ── READ (Level 0) ──────────────────────────────────────
    'finance.listAccounts':       PermissionLevel.READ,
    'finance.getAccount':         PermissionLevel.READ,
    'finance.listTransactions':   PermissionLevel.READ,
    'finance.getBudgetStatus':    PermissionLevel.READ,
    'finance.getSafeToSpend':     PermissionLevel.READ,
    'finance.listCategories':     PermissionLevel.READ,
    'finance.summarize':          PermissionLevel.READ,
    'finance.detectAnomaly':      PermissionLevel.READ,
    'finance.getUpcomingBills':   PermissionLevel.READ,
    'finance.getMonthlySummary':  PermissionLevel.READ,

    // ── DRAFT (Level 1) ─────────────────────────────────────
    'finance.suggestCategory':    PermissionLevel.DRAFT,
    'finance.draftTransaction':    PermissionLevel.DRAFT,
    'finance.draftNote':           PermissionLevel.DRAFT,
    'finance.draftBudgetChange':   PermissionLevel.DRAFT,

    // ── WRITE (Level 2) — requires user approval ───────────
    'finance.createTransaction':           PermissionLevel.WRITE,
    'finance.categorizeTransaction':       PermissionLevel.WRITE,
    'finance.reallocateBudget':           PermissionLevel.WRITE,
    'finance.updateTransactionNotes':      PermissionLevel.WRITE,
    'finance.importTransactions':           PermissionLevel.WRITE,

    // ── FORBIDDEN (Level 3) — always blocked ────────────────
    'finance.payBill':              PermissionLevel.FORBID,
    'finance.transferMoney':        PermissionLevel.FORBID,
    'finance.trade':               PermissionLevel.FORBID,
    'finance.deleteRecord':        PermissionLevel.FORBID,
    'finance.connectBank':         PermissionLevel.FORBID,
    'finance.exportData':          PermissionLevel.FORBID,
  }

  /** Resolve the permission level for a tool name */
  static levelFor(tool: string): PermissionLevel {
    return PermissionGate.TOOL_LEVELS[tool] ?? PermissionLevel.FORBID
  }
}
