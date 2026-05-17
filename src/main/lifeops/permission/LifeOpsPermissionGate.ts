import { PermissionLevel } from '../models'

// Tool → minimum required permission level
const TOOL_PERMISSION_MAP: Record<string, PermissionLevel> = {
  // Gmail — read
  'gmail.listMessages': 0,
  'gmail.getMessage': 0,
  'gmail.search': 0,
  'gmail.listLabels': 0,
  // Gmail — draft
  'gmail.createDraft': 1,
  'gmail.replyDraft': 1,
  // Gmail — write (approval required)
  'gmail.sendMessage': 2,
  'gmail.modifyMessage': 2,
  'gmail.createLabel': 2,
  // Gmail — auto-safe (user must opt in)
  'gmail.archiveLowRisk': 3,
  'gmail.labelLowRisk': 3,
  // Gmail — forbidden
  'gmail.trashMessage': 4,
  'gmail.deleteForever': 4,

  // Calendar — read
  'calendar.listEvents': 0,
  'calendar.getEvent': 0,
  'calendar.listCalendars': 0,
  'calendar.listFreeBusy': 0,
  // Calendar — draft
  'calendar.createEventDraft': 1,
  'calendar.proposeTime': 1,
  // Calendar — write (approval required)
  'calendar.createEvent': 2,
  'calendar.moveEvent': 2,
  'calendar.updateEvent': 2,
  'calendar.invitePeople': 2,
  // Calendar — forbidden
  'calendar.cancelEvent': 4,
  'calendar.deleteEvent': 4,

  // Tasks — read
  'tasks.listTaskLists': 0,
  'tasks.listTasks': 0,
  'tasks.getTask': 0,
  // Tasks — draft
  'tasks.createTaskDraft': 1,
  'tasks.breakIntoSubtasks': 1,
  // Tasks — write (approval required)
  'tasks.createTask': 2,
  'tasks.updateTask': 2,
  'tasks.moveTask': 2,
  // Tasks — auto-safe
  'tasks.completeTask': 3,
  'tasks.deleteTask': 4,

  // Obsidian — read
  'obsidian.search': 0,
  'obsidian.readNote': 0,
  'obsidian.readDailyNote': 0,
  'obsidian.listVaults': 0,
  // Obsidian — draft
  'obsidian.createNoteDraft': 1,
  'obsidian.createMeetingNoteDraft': 1,
  // Obsidian — auto-safe append
  'obsidian.appendToDailyNote': 3,
  'obsidian.appendToNote': 3,
  // Obsidian — write (approval required)
  'obsidian.createNote': 2,
  'obsidian.overwriteNote': 2,
  // Obsidian — forbidden
  'obsidian.deleteNote': 4,
  'obsidian.bulkOverwrite': 4,
}

export type CheckResult = 'approved' | 'pending_approval' | 'blocked'

export class LifeOpsPermissionGate {
  /**
   * Check if a user with `userLevel` can run `toolId`.
   * Returns true only if the tool's required permission is met or exceeded.
   */
  canRun(toolId: string, userLevel: PermissionLevel): boolean {
    const required = TOOL_PERMISSION_MAP[toolId] ?? 0
    return userLevel >= required
  }

  /**
   * Resolve whether a tool call should proceed, pause for approval, or be blocked.
   */
  resolve(toolId: string, userLevel: PermissionLevel): CheckResult {
    // Forbidden tools are always blocked regardless of user level
    const required = TOOL_PERMISSION_MAP[toolId] ?? 0
    if (required === 4) return 'blocked'
    if (userLevel >= required) return 'approved'
    return 'pending_approval'
  }

  /**
   * Get the required permission level for a tool.
   */
  getRequiredLevel(toolId: string): PermissionLevel {
    return TOOL_PERMISSION_MAP[toolId] ?? 0
  }

  /**
   * Check if a tool is allowed at a given user level without any approval.
   */
  isAutoApproved(toolId: string, userLevel: PermissionLevel): boolean {
    const required = TOOL_PERMISSION_MAP[toolId] ?? 0
    return userLevel >= required && required < 2
  }

  /**
   * Returns all tools available at a given permission level (no approval needed).
   */
  getAutoApprovedTools(userLevel: PermissionLevel): string[] {
    return Object.entries(TOOL_PERMISSION_MAP)
      .filter(([, required]) => required <= userLevel && required < 2)
      .map(([toolId]) => toolId)
  }

  /**
   * Returns all tools that require approval at a given permission level.
   */
  getApprovalRequiredTools(userLevel: PermissionLevel): string[] {
    return Object.entries(TOOL_PERMISSION_MAP)
      .filter(([, required]) => required > userLevel && required < 4)
      .map(([toolId]) => toolId)
  }

  /**
   * Returns all forbidden tools.
   */
  getForbiddenTools(): string[] {
    return Object.entries(TOOL_PERMISSION_MAP)
      .filter(([, required]) => required === 4)
      .map(([toolId]) => toolId)
  }
}
