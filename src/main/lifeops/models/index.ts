// LifeOps unified data model — all adapters return these types

export type LifeItemSource = 'gmail' | 'calendar' | 'tasks' | 'obsidian'

export type LifeItem = EmailItem | CalendarItem | TaskItem | NoteItem

export type PermissionLevel = 0 | 1 | 2 | 3 | 4  // 4=forbidden

export interface LifeItemBase {
  id: string
  source: LifeItemSource
  title: string
  body?: string
  createdAt?: string
  updatedAt?: string
  dueAt?: string
  url?: string
  riskLevel: PermissionLevel
  linkedItems?: string[]
}

export interface EmailItem extends LifeItemBase {
  source: 'gmail'
  from: string
  to: string[]
  subject: string
  snippet: string
  isRead: boolean
  labels: string[]
  threadId: string
}

export interface CalendarItem extends LifeItemBase {
  source: 'calendar'
  start: string      // ISO datetime or ISO date (all-day)
  end: string        // ISO datetime or ISO date (all-day)
  location?: string
  attendees?: string[]
  isAllDay: boolean
  calendarId: string
  calendarName?: string
}

export interface TaskItem extends LifeItemBase {
  source: 'tasks'
  completed: boolean
  completedAt?: string
  listId: string
  listName?: string
  parentTaskId?: string
  status: 'needsAction' | 'completed'
}

export interface NoteItem extends LifeItemBase {
  source: 'obsidian'
  vaultPath: string
  tags?: string[]
  preview?: string  // first 200 chars
}

export interface FreeBusySlot {
  start: string
  end: string
  calendarId: string
}

export interface FreeBusyResult {
  calendarId: string
  busy: FreeBusySlot[]
}

// Audit log entry
export interface AuditLogEntry {
  id: string
  timestamp: string   // ISO datetime
  toolId: string      // e.g. 'gmail.listMessages'
  source: LifeItemSource
  input: Record<string, unknown>  // sanitized
  result?: unknown
  permissionLevel: PermissionLevel
  approved: boolean
  approvedBy?: string
  error?: string
}

// Gmail draft
export interface GmailDraft {
  id: string
  to: string[]
  subject: string
  body: string
  threadId?: string
}

// Calendar event draft
export interface CalendarEventDraft {
  summary: string
  description?: string
  location?: string
  start: string
  end: string
  isAllDay: boolean
  attendees?: string[]
  calendarId?: string
}

// Task draft
export interface TaskDraft {
  title: string
  notes?: string
  due?: string    // RFC 3339
  parentTaskId?: string
  listId: string
}

// Cross-link between LifeItems
export interface LifeLink {
  sourceType: LifeItemSource
  sourceId: string
  targetType: LifeItemSource
  targetId: string
  linkType: 'derived_from' | 'scheduled_for' | 'logged_in' | 'blocks' | 'relates_to'
}

// Morning briefing output
export interface MorningBriefing {
  date: string
  calendarItems: CalendarItem[]
  emailItems: EmailItem[]
  taskItems: TaskItem[]
  noteItems: NoteItem[]
  topPriorities: string[]
  missedDeadlines: string[]
  calendarConflicts: string[]
  suggestedActions: BriefingAction[]
  summary: string
}

export interface BriefingAction {
  type: 'reply' | 'schedule' | 'task' | 'note' | 'archive' | 'label'
  priority: 'high' | 'medium' | 'low'
  description: string
  linkedItems: LifeItem[]
}

export interface BriefingSection {
  title: string
  content: string
  priority: 'high' | 'medium' | 'low'
}

export interface BriefingConfig {
  obsidianVaultPath: string
  defaultCalendarId: string
  defaultTaskListId: string
  briefingTime: string  // "HH:mm", default "07:00"
  excludedCalendars: string[]
  userLevel: number  // default 0 (read-only)
}

export interface RecurringRoutine {
  id: string
  title: string
  frequency: 'daily' | 'weekly' | 'monthly'
  preferredDay?: number  // 0=Sun, 1=Mon (for weekly)
  preferredTime: string  // "HH:mm"
  durationMinutes: number
  type: 'focus' | 'admin' | 'review' | 'meeting' | 'exercise' | 'personal'
  status: 'suggested' | 'scheduled' | 'dismissed'
  createdAt: string
}

export interface ApprovalRequest {
  id: string
  toolId: string
  action: string
  params: Record<string, unknown>
  riskLevel: number
  suggestedSummary: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  approverNote?: string
  rejectionReason?: string
}
