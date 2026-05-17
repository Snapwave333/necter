// In-memory approval queue — survives in-process but not restarts
// Phase 2 of LifeOps pipeline

import { ApprovalRequest } from '../models'

let queue: ApprovalRequest[] = []

export const approvalQueue = {
  /**
   * Add a new pending approval request.
   * Returns the generated request id.
   */
  enqueue(req: ApprovalRequest): string {
    queue.push({ ...req })
    return req.id
  },

  /**
   * Remove and return a specific request by id.
   * Returns null if not found.
   */
  dequeue(id: string): ApprovalRequest | null {
    const idx = queue.findIndex((r) => r.id === id)
    if (idx === -1) return null
    return queue.splice(idx, 1)[0]
  },

  /**
   * Mark a request as approved. Returns true if found, false otherwise.
   */
  approve(id: string, note?: string): boolean {
    const req = queue.find((r) => r.id === id)
    if (!req) return false
    req.status = 'approved'
    req.approverNote = note
    return true
  },

  /**
   * Mark a request as rejected. Returns true if found, false otherwise.
   */
  reject(id: string, reason?: string): boolean {
    const req = queue.find((r) => r.id === id)
    if (!req) return false
    req.status = 'rejected'
    req.rejectionReason = reason
    return true
  },

  /**
   * Return all pending requests (status === 'pending').
   */
  listPending(): ApprovalRequest[] {
    return queue.filter((r) => r.status === 'pending')
  },

  /**
   * Return a specific request by id, or null if not found.
   */
  get(id: string): ApprovalRequest | null {
    return queue.find((r) => r.id === id) ?? null
  },

  /**
   * Return the full queue (all statuses).
   */
  listAll(): ApprovalRequest[] {
    return [...queue]
  },

  /**
   * Clear the entire queue. Used for testing.
   */
  clear(): void {
    queue = []
  },
}
