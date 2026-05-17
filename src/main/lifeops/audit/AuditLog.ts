import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { AuditLogEntry, PermissionLevel, LifeItemSource } from '../models'

// Simple UUID v4 without crypto dependency
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Secrets to strip from audit logs
const STRIP_KEYS = [
  'token', 'accessToken', 'refreshToken', 'apiKey', 'secret',
  'password', 'authorization', 'x-goog-authorization',
  'credential', 'privateKey', 'clientSecret',
]

export class AuditLog {
  private logPath: string

  constructor() {
    const userData = app?.getPath?.('userData') || process.cwd()
    this.logPath = path.join(userData, 'lifeops-audit.jsonl')
  }

  private sanitize(input: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      if (STRIP_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        result[key] = '[REDACTED]'
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.sanitize(value as Record<string, unknown>)
      } else if (Array.isArray(value)) {
        result[key] = value.map((v) =>
          v && typeof v === 'object' ? this.sanitize(v as Record<string, unknown>) : v
        )
      } else {
        result[key] = value
      }
    }
    return result
  }

  private append(entry: AuditLogEntry): void {
    try {
      const line = JSON.stringify(entry) + '\n'
      fs.appendFileSync(this.logPath, line, 'utf8')
    } catch (err) {
      // Non-fatal — log to console but don't crash the tool
      console.error('[AuditLog] Failed to write audit entry:', err)
    }
  }

  /**
   * Log a tool call. Call this before and after every LifeOps tool invocation.
   */
  log(params: {
    toolId: string
    source: LifeItemSource
    input: Record<string, unknown>
    permissionLevel: PermissionLevel
    approved: boolean
    approvedBy?: string
    result?: unknown
    error?: string
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      toolId: params.toolId,
      source: params.source,
      input: this.sanitize(params.input),
      permissionLevel: params.permissionLevel,
      approved: params.approved,
      approvedBy: params.approvedBy,
      result: params.result !== undefined ? this.sanitize(params.result as Record<string, unknown>) : undefined,
      error: params.error,
    }
    this.append(entry)
    return entry
  }

  /**
   * Read recent audit entries (newest first).
   */
  readRecent(limit = 100): AuditLogEntry[] {
    try {
      if (!fs.existsSync(this.logPath)) return []
      const content = fs.readFileSync(this.logPath, 'utf8')
      const lines = content.trim().split('\n').filter(Boolean)
      return lines
        .slice(-limit)
        .reverse()
        .map((line) => {
          try {
            return JSON.parse(line) as AuditLogEntry
          } catch {
            return null
          }
        })
        .filter(Boolean) as AuditLogEntry[]
    } catch {
      return []
    }
  }

  /**
   * Read audit entries for a specific date range.
   */
  readRange(startISO: string, endISO: string): AuditLogEntry[] {
    const start = new Date(startISO).getTime()
    const end = new Date(endISO).getTime()
    return this.readRecent(10000).filter((e) => {
      const ts = new Date(e.timestamp).getTime()
      return ts >= start && ts <= end
    })
  }
}
