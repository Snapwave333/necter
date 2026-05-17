// IPC handler: bridges renderer ↔ LifeOps adapters
// Called from preload via contextBridge.exposeInMainWorld('lifeops', {...})

import { ipcMain } from 'electron'
import { GmailAdapter } from './adapters/GmailAdapter'
import { CalendarAdapter } from './adapters/CalendarAdapter'
import { TasksAdapter } from './adapters/TasksAdapter'
import { ObsidianAdapter } from './adapters/ObsidianAdapter'
import { LifeOpsPermissionGate } from './permission/LifeOpsPermissionGate'
import { AuditLog } from './audit/AuditLog'
import { approvalQueue } from './Phase2/ApprovalQueue'
import { BriefingConfig, ApprovalRequest, PermissionLevel } from './models'
import { configStore } from '../config/config-store'
import { MorningBriefingAgent } from './Phase4/MorningBriefingAgent'
import { BriefingScheduler } from './Phase4/BriefingScheduler'
import { DraftGenerator } from './Phase2/DraftGenerator'
import { WeeklyReviewAgent } from './Phase5/WeeklyReviewAgent'
import { RoutineScheduler } from './Phase5/RoutineScheduler'
const gmail = new GmailAdapter()
const calendar = new CalendarAdapter()
const tasks = new TasksAdapter()
const obsidian = new ObsidianAdapter()
const gate = new LifeOpsPermissionGate()
const audit = new AuditLog()

// BriefingScheduler — instantiated once, restores schedule from configStore on startup
const briefingScheduler = new BriefingScheduler()
const routineScheduler = new RoutineScheduler()
const draftGen = new DraftGenerator()

// Simple UUID v4 without crypto dependency
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function requirePermission(userLevel: number, requiredLevel: number, toolId: string): void {
  if (!gate.canRun(toolId, userLevel as PermissionLevel)) {
    throw new Error(
      `Permission denied: tool '${toolId}' requires level ${requiredLevel} but user is level ${userLevel}.`
    )
  }
}

export function registerLifeOpsIpcHandlers(): void {
  // ── Gmail ──────────────────────────────────────────────────────────────────

  ipcMain.handle('lifeops:gmail.listMessages', async (_, { query, maxResults, userLevel }) => {
    requirePermission(userLevel, 0, 'gmail.listMessages')
    try {
      const results = await gmail.listMessages(query, maxResults)
      audit.log({ toolId: 'gmail.listMessages', source: 'gmail', input: { query, maxResults }, permissionLevel: userLevel as PermissionLevel, approved: true, result: results })
      return results
    } catch (err) {
      audit.log({ toolId: 'gmail.listMessages', source: 'gmail', input: { query }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  ipcMain.handle('lifeops:gmail.getMessage', async (_, { messageId, userLevel }) => {
    requirePermission(userLevel, 0, 'gmail.getMessage')
    return gmail.getMessage(messageId)
  })

  ipcMain.handle('lifeops:gmail.searchMessages', async (_, { query, maxResults, userLevel }) => {
    requirePermission(userLevel, 0, 'gmail.searchMessages')
    return gmail.searchMessages(query, maxResults)
  })

  ipcMain.handle('lifeops:gmail.listLabels', async (_, { userLevel }) => {
    requirePermission(userLevel, 0, 'gmail.listLabels')
    return gmail.listLabels()
  })

  // ── Gmail: Phase 2/3 write ───────────────────────────────────────────────

  ipcMain.handle('lifeops:gmail.send', async (_, { to, subject, body, threadId, userLevel }) => {
    if (!gate.canRun('gmail.sendMessage', userLevel as PermissionLevel)) {
      const req: ApprovalRequest = {
        id: uuid(),
        toolId: 'gmail.sendMessage',
        action: 'send',
        params: { to, subject, body, threadId },
        riskLevel: 2,
        suggestedSummary: `Send email to ${to}: ${subject}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      approvalQueue.enqueue(req)
      return { error: 'PERMISSION_DENIED', approvalId: req.id }
    }
    try {
      const result = await gmail.sendDraft(to, subject, body, threadId)
      audit.log({ toolId: 'gmail.sendMessage', source: 'gmail', input: { to, subject, threadId }, permissionLevel: userLevel as PermissionLevel, approved: true, result })
      return result
    } catch (err) {
      audit.log({ toolId: 'gmail.sendMessage', source: 'gmail', input: { to, subject }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  ipcMain.handle('lifeops:gmail.archive', async (_, { messageId, userLevel }) => {
    if (!gate.canRun('gmail.sendMessage', userLevel as PermissionLevel)) {
      const req: ApprovalRequest = {
        id: uuid(),
        toolId: 'gmail.sendMessage',
        action: 'archive',
        params: { messageId },
        riskLevel: 2,
        suggestedSummary: `Archive email ${messageId}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      approvalQueue.enqueue(req)
      return { error: 'PERMISSION_DENIED', approvalId: req.id }
    }
    try {
      const result = await gmail.archiveMessage(messageId)
      audit.log({ toolId: 'gmail.archive', source: 'gmail', input: { messageId }, permissionLevel: userLevel as PermissionLevel, approved: true, result })
      return result
    } catch (err) {
      audit.log({ toolId: 'gmail.archive', source: 'gmail', input: { messageId }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  ipcMain.handle('lifeops:gmail.modifyLabels', async (_, { messageId, addLabels, removeLabels, userLevel }) => {
    if (!gate.canRun('gmail.sendMessage', userLevel as PermissionLevel)) {
      const req: ApprovalRequest = {
        id: uuid(),
        toolId: 'gmail.sendMessage',
        action: 'modifyLabels',
        params: { messageId, addLabels, removeLabels },
        riskLevel: 2,
        suggestedSummary: `Modify labels on email ${messageId}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      approvalQueue.enqueue(req)
      return { error: 'PERMISSION_DENIED', approvalId: req.id }
    }
    try {
      const result = await gmail.modifyLabels(messageId, addLabels, removeLabels)
      audit.log({ toolId: 'gmail.modifyLabels', source: 'gmail', input: { messageId, addLabels, removeLabels }, permissionLevel: userLevel as PermissionLevel, approved: true, result })
      return result
    } catch (err) {
      audit.log({ toolId: 'gmail.modifyLabels', source: 'gmail', input: { messageId, addLabels, removeLabels }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  // ── Calendar ───────────────────────────────────────────────────────────────

  ipcMain.handle('lifeops:calendar.listEvents', async (_, { timeMin, timeMax, calendarId, maxResults, userLevel }) => {
    requirePermission(userLevel, 0, 'calendar.listEvents')
    return calendar.listEvents(timeMin, timeMax, calendarId, maxResults)
  })

  ipcMain.handle('lifeops:calendar.getEvent', async (_, { eventId, calendarId, userLevel }) => {
    requirePermission(userLevel, 0, 'calendar.getEvent')
    return calendar.getEvent(eventId, calendarId)
  })

  ipcMain.handle('lifeops:calendar.listCalendars', async (_, { userLevel }) => {
    requirePermission(userLevel, 0, 'calendar.listCalendars')
    return calendar.listCalendars()
  })

  ipcMain.handle('lifeops:calendar.listFreeBusy', async (_, { timeMin, timeMax, calendarIds, userLevel }) => {
    requirePermission(userLevel, 0, 'calendar.listFreeBusy')
    return calendar.listFreeBusy(timeMin, timeMax, calendarIds)
  })

  // ── Calendar: Phase 2/3 write ─────────────────────────────────────────────

  ipcMain.handle('lifeops:calendar.createEvent', async (_, { calendarId, event, userLevel }) => {
    if (!gate.canRun('calendar.createEvent', userLevel as PermissionLevel)) {
      const req: ApprovalRequest = {
        id: uuid(),
        toolId: 'calendar.createEvent',
        action: 'create',
        params: { calendarId, event },
        riskLevel: 2,
        suggestedSummary: `Create calendar event: ${event?.title ?? '(no title)'}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      approvalQueue.enqueue(req)
      return { error: 'PERMISSION_DENIED', approvalId: req.id }
    }
    try {
      const result = await calendar.createEvent(event)
      audit.log({ toolId: 'calendar.createEvent', source: 'calendar', input: { calendarId, event }, permissionLevel: userLevel as PermissionLevel, approved: true, result })
      return result
    } catch (err) {
      audit.log({ toolId: 'calendar.createEvent', source: 'calendar', input: { calendarId, event }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  // ── Tasks ──────────────────────────────────────────────────────────────────

  ipcMain.handle('lifeops:tasks.listTaskLists', async (_, { userLevel }) => {
    requirePermission(userLevel, 0, 'tasks.listTaskLists')
    return tasks.listTaskLists()
  })

  ipcMain.handle('lifeops:tasks.listTasks', async (_, { taskListId, userLevel }) => {
    requirePermission(userLevel, 0, 'tasks.listTasks')
    return tasks.listTasks(taskListId)
  })

  ipcMain.handle('lifeops:tasks.getTask', async (_, { taskId, taskListId, userLevel }) => {
    requirePermission(userLevel, 0, 'tasks.getTask')
    return tasks.getTask(taskId, taskListId)
  })

  ipcMain.handle('lifeops:tasks.getOverdueTasks', async (_, { taskListId, userLevel }) => {
    requirePermission(userLevel, 0, 'tasks.getOverdueTasks')
    return tasks.getOverdueTasks(taskListId)
  })

  ipcMain.handle('lifeops:tasks.getTasksDueToday', async (_, { taskListId, userLevel }) => {
    requirePermission(userLevel, 0, 'tasks.getTasksDueToday')
    return tasks.getTasksDueToday(taskListId)
  })

  // ── Tasks: Phase 2/3 write ───────────────────────────────────────────────

  ipcMain.handle('lifeops:tasks.insertTask', async (_, { taskListId, title, notes, dueDate, userLevel }) => {
    if (!gate.canRun('tasks.createTask', userLevel as PermissionLevel)) {
      const req: ApprovalRequest = {
        id: uuid(),
        toolId: 'tasks.createTask',
        action: 'insert',
        params: { taskListId, title, notes, dueDate },
        riskLevel: 2,
        suggestedSummary: `Insert task "${title}"`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      approvalQueue.enqueue(req)
      return { error: 'PERMISSION_DENIED', approvalId: req.id }
    }
    try {
      const result = await tasks.insertTask(taskListId, title, notes, dueDate)
      audit.log({ toolId: 'tasks.insertTask', source: 'tasks', input: { taskListId, title, notes, dueDate }, permissionLevel: userLevel as PermissionLevel, approved: true, result })
      return result
    } catch (err) {
      audit.log({ toolId: 'tasks.insertTask', source: 'tasks', input: { taskListId, title }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  ipcMain.handle('lifeops:tasks.patchTask', async (_, { taskListId, taskId, updates, userLevel }) => {
    if (!gate.canRun('tasks.updateTask', userLevel as PermissionLevel)) {
      const req: ApprovalRequest = {
        id: uuid(),
        toolId: 'tasks.updateTask',
        action: 'patch',
        params: { taskListId, taskId, updates },
        riskLevel: 2,
        suggestedSummary: `Patch task ${taskId}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      approvalQueue.enqueue(req)
      return { error: 'PERMISSION_DENIED', approvalId: req.id }
    }
    try {
      const result = await tasks.patchTask(taskListId, taskId, updates)
      audit.log({ toolId: 'tasks.patchTask', source: 'tasks', input: { taskListId, taskId, updates }, permissionLevel: userLevel as PermissionLevel, approved: true, result })
      return result
    } catch (err) {
      audit.log({ toolId: 'tasks.patchTask', source: 'tasks', input: { taskListId, taskId, updates }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  ipcMain.handle('lifeops:tasks.moveToList', async (_, { taskListId, taskId, newTaskListId, userLevel }) => {
    if (!gate.canRun('tasks.moveTask', userLevel as PermissionLevel)) {
      const req: ApprovalRequest = {
        id: uuid(),
        toolId: 'tasks.moveTask',
        action: 'move',
        params: { taskListId, taskId, newTaskListId },
        riskLevel: 2,
        suggestedSummary: `Move task ${taskId} to list ${newTaskListId}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      approvalQueue.enqueue(req)
      return { error: 'PERMISSION_DENIED', approvalId: req.id }
    }
    try {
      const result = await tasks.moveTaskToList(taskListId, taskId, newTaskListId)
      audit.log({ toolId: 'tasks.moveToList', source: 'tasks', input: { taskListId, taskId, newTaskListId }, permissionLevel: userLevel as PermissionLevel, approved: true, result })
      return result
    } catch (err) {
      audit.log({ toolId: 'tasks.moveToList', source: 'tasks', input: { taskListId, taskId, newTaskListId }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  // ── Obsidian ───────────────────────────────────────────────────────────────

  ipcMain.handle('lifeops:obsidian.searchNotes', async (_, { query, userLevel }) => {
    requirePermission(userLevel, 0, 'obsidian.searchNotes')
    return obsidian.searchNotes(query)
  })

  ipcMain.handle('lifeops:obsidian.readNote', async (_, { vaultPath, userLevel }) => {
    requirePermission(userLevel, 0, 'obsidian.readNote')
    return obsidian.readNote(vaultPath)
  })

  ipcMain.handle('lifeops:obsidian.readDailyNote', async (_, { date, userLevel }) => {
    requirePermission(userLevel, 0, 'obsidian.readDailyNote')
    return obsidian.readDailyNote(date)
  })

  ipcMain.handle('lifeops:obsidian.appendToDailyNote', async (_, { date, content, userLevel }) => {
    requirePermission(userLevel, 1, 'obsidian.appendToDailyNote')
    return obsidian.appendToDailyNote(date, content)
  })

  ipcMain.handle('lifeops:obsidian.setVaultPath', async (_, { vaultPath, userLevel }) => {
    requirePermission(userLevel, 2, 'obsidian.setVaultPath')
    obsidian.setVaultPath(vaultPath)
    return { ok: true }
  })

  // ── Obsidian: Phase 3 write ─────────────────────────────────────────────

  ipcMain.handle('lifeops:obsidian.appendToNote', async (_, { vaultPath, content, userLevel }) => {
    if (!gate.canRun('obsidian.appendToNote', userLevel as PermissionLevel)) {
      const req: ApprovalRequest = {
        id: uuid(),
        toolId: 'obsidian.appendToNote',
        action: 'append',
        params: { vaultPath, content },
        riskLevel: 2,
        suggestedSummary: `Append to note ${vaultPath}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      approvalQueue.enqueue(req)
      return { error: 'PERMISSION_DENIED', approvalId: req.id }
    }
    try {
      await obsidian.appendToNote(vaultPath, content)
      audit.log({ toolId: 'obsidian.appendToNote', source: 'obsidian', input: { vaultPath, content: content.slice(0, 100) }, permissionLevel: userLevel as PermissionLevel, approved: true, result: { success: true } })
      return { success: true }
    } catch (err) {
      audit.log({ toolId: 'obsidian.appendToNote', source: 'obsidian', input: { vaultPath }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  // ── Draft Generation ──────────────────────────────────────────────────────

  ipcMain.handle('lifeops:draft.emailReply', async (_, { emailId, tone, userLevel }) => {
    requirePermission(userLevel, 0, 'gmail.getMessage')
    try {
      const email = await gmail.getMessage(emailId)
      const draft = await draftGen.generateEmailReply(email, tone)
      audit.log({ toolId: 'draft.emailReply', source: 'gmail', input: { emailId, tone }, permissionLevel: userLevel as PermissionLevel, approved: true, result: { draft } })
      return { draft }
    } catch (err) {
      audit.log({ toolId: 'draft.emailReply', source: 'gmail', input: { emailId, tone }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  ipcMain.handle('lifeops:draft.calendarDescription', async (_, { eventId, calendarId, userLevel }) => {
    requirePermission(userLevel, 0, 'calendar.getEvent')
    try {
      const event = await calendar.getEvent(eventId, calendarId)
      const draft = await draftGen.generateCalendarDescription(event)
      audit.log({ toolId: 'draft.calendarDescription', source: 'calendar', input: { eventId, calendarId }, permissionLevel: userLevel as PermissionLevel, approved: true, result: { draft } })
      return { draft }
    } catch (err) {
      audit.log({ toolId: 'draft.calendarDescription', source: 'calendar', input: { eventId, calendarId }, permissionLevel: userLevel as PermissionLevel, approved: true, error: String(err) })
      throw err
    }
  })

  // ── Approval Queue ──────────────────────────────────────────────────────────

  ipcMain.handle('lifeops:approval.poll', async () => {
    return approvalQueue.listPending()
  })

  ipcMain.handle('lifeops:approval.resolve', async (_, { id, approved, note }: { id: string; approved: boolean; note?: string }) => {
    const req = approvalQueue.get(id)
    if (!req) throw new Error(`Approval request ${id} not found.`)

    if (approved) {
      approvalQueue.approve(id, note)
      audit.log({
        toolId: req.toolId,
        source: req.toolId.startsWith('gmail') ? 'gmail'
          : req.toolId.startsWith('calendar') ? 'calendar'
          : req.toolId.startsWith('tasks') ? 'tasks'
          : 'obsidian',
        input: req.params,
        permissionLevel: 2,
        approved: true,
        approvedBy: note,
        result: { id, status: 'approved' },
      })
    } else {
      approvalQueue.reject(id, note)
      audit.log({
        toolId: req.toolId,
        source: req.toolId.startsWith('gmail') ? 'gmail'
          : req.toolId.startsWith('calendar') ? 'calendar'
          : req.toolId.startsWith('tasks') ? 'tasks'
          : 'obsidian',
        input: req.params,
        permissionLevel: 2,
        approved: false,
        result: { id, status: 'rejected', reason: note },
      })
    }
    return { ok: true }
  })

  // ── Audit Log ──────────────────────────────────────────────────────────────

  ipcMain.handle('lifeops:audit.recent', async (_, { limit }: { limit?: number }) => {
    return audit.readRecent(limit)
  })

  ipcMain.handle('lifeops:audit.range', async (_, { startISO, endISO }: { startISO: string; endISO: string }) => {
    return audit.readRange(startISO, endISO)
  })

  // ── Morning Briefing (Phase 4) ───────────────────────────────────────────────

  ipcMain.handle('lifeops:briefing.generate', async (_, { userLevel }: { userLevel: number }) => {
    // Read BriefingConfig from configStore
    const rawConfig = (configStore as unknown as { get(key: string): unknown }).get('lifeops.briefingConfig')
    const briefingConfig: BriefingConfig | undefined = typeof rawConfig === 'object' && rawConfig !== null
      ? (rawConfig as BriefingConfig)
      : undefined

    if (!briefingConfig) {
      throw new Error('LifeOps briefing is not configured. Set obsidianVaultPath, defaultCalendarId, and defaultTaskListId in config.')
    }

    const agent = new MorningBriefingAgent(briefingConfig)
    const briefing = await agent.run()

    // Audit log — toolId 'briefing.generate', read-only (level 0)
    audit.log({
      toolId: 'briefing.generate',
      source: 'gmail',
      input: { date: briefing.date, sections: briefing.sections.length },
      permissionLevel: userLevel as PermissionLevel,
      approved: true,
      result: { date: briefing.date, sections: briefing.sections.length, actions: briefing.actionItems.length },
    })

    return briefing
  })

  ipcMain.handle('lifeops:briefing.schedule', async (_, { briefingTime }: { briefingTime: string }) => {
    briefingScheduler.schedule(briefingTime)
    return { success: true }
  })

  ipcMain.handle('lifeops:briefing.getSchedule', async () => {
    return {
      briefingTime: briefingScheduler.isScheduled()
        ? (briefingScheduler as unknown as { currentTime: string }).currentTime
        : null,
      nextRun: briefingScheduler.getNextRun()?.toISOString() ?? null,
      isScheduled: briefingScheduler.isScheduled(),
    }
  })

  // ── Weekly Review (Phase 5) ─────────────────────────────────────────────────

  ipcMain.handle('lifeops:review.generate', async (_, { userLevel }: { userLevel: number }) => {
    requirePermission(userLevel, 0, 'review.generate')
    try {
      const rawConfig = (configStore as unknown as { get(key: string): unknown }).get('lifeops.briefingConfig')
      const briefingConfig: BriefingConfig | undefined = typeof rawConfig === 'object' && rawConfig !== null
        ? (rawConfig as BriefingConfig)
        : undefined

      const agent = new WeeklyReviewAgent(briefingConfig!)
      const review = await agent.run()

      audit.log({
        toolId: 'review.generate',
        source: 'gmail',
        input: { weekOf: review.weekOf },
        permissionLevel: userLevel as PermissionLevel,
        approved: true,
        result: { weekOf: review.weekOf, suggestions: review.suggestions.length },
      })
      return review
    } catch (err) {
      audit.log({
        toolId: 'review.generate',
        source: 'gmail',
        input: {},
        permissionLevel: userLevel as PermissionLevel,
        approved: true,
        error: String(err),
      })
      throw err
    }
  })

  // ── Routine Scheduler (Phase 5) ────────────────────────────────────────────

  ipcMain.handle('lifeops:routines.list', async () => {
    return routineScheduler.getRoutines()
  })

  ipcMain.handle('lifeops:routines.add', async (_, { routine }: { routine: Parameters<typeof routineScheduler.addRoutine>[0] }) => {
    routineScheduler.addRoutine(routine)
    return { ok: true }
  })

  ipcMain.handle('lifeops:routines.remove', async (_, { id }: { id: string }) => {
    routineScheduler.removeRoutine(id)
    return { ok: true }
  })

  ipcMain.handle('lifeops:routines.syncToCalendar', async (_, { userLevel }: { userLevel: number }) => {
    requirePermission(userLevel, 2, 'routines.syncToCalendar')
    try {
      const result = await routineScheduler.syncToCalendar()
      audit.log({
        toolId: 'routines.syncToCalendar',
        source: 'calendar',
        input: {},
        permissionLevel: userLevel as PermissionLevel,
        approved: true,
        result,
      })
      return result
    } catch (err) {
      audit.log({
        toolId: 'routines.syncToCalendar',
        source: 'calendar',
        input: {},
        permissionLevel: userLevel as PermissionLevel,
        approved: true,
        error: String(err),
      })
      throw err
    }
  })

  // ── OAuth2 URL generation ───────────────────────────────────────────────────

  ipcMain.handle('lifeops:oauth.getUrl', async (_, { service }: { service: 'gmail' | 'calendar' | 'tasks' }) => {
    const CLIENT_ID_KEY = `lifeops.${service}.clientId`
    const clientId = (configStore as unknown as { get(key: string): unknown }).get(CLIENT_ID_KEY) as string | undefined
    if (!clientId) {
      throw new Error(`OAuth2 not configured for ${service}. Set the client ID in Settings > LifeOps Connectors.`)
    }
    const redirectUri = 'http://localhost:3847/oauth/callback'
    const scopes: Record<string, string[]> = {
      gmail: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
      calendar: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
      tasks: ['https://www.googleapis.com/auth/tasks.readonly', 'https://www.googleapis.com/auth/tasks'],
    }
    const scopeStr = scopes[service].join(' ')
    const state = `${service}:${Date.now()}`
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopeStr)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`
    return { url, state }
  })

  ipcMain.handle('lifeops:oauth.handleCallback', async (_, { code, service }: { code: string; service: 'gmail' | 'calendar' | 'tasks' }) => {
    const CLIENT_ID_KEY = `lifeops.${service}.clientId`
    const CLIENT_SECRET_KEY = `lifeops.${service}.clientSecret`
    const clientId = (configStore as unknown as { get(key: string): unknown }).get(CLIENT_ID_KEY) as string | undefined
    const clientSecret = (configStore as unknown as { get(key: string): unknown }).get(CLIENT_SECRET_KEY) as string | undefined
    if (!clientId || !clientSecret) {
      throw new Error(`OAuth2 not configured for ${service}. Set client ID and secret in Settings > LifeOps Connectors.`)
    }
    const redirectUri = 'http://localhost:3847/oauth/callback'
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Token exchange failed: ${err}`)
    }
    const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    ;(configStore as unknown as { set(key: string, value: unknown): void }).set(`lifeops.${service}.accessToken` as any, tokens.access_token)
    ;(configStore as unknown as { set(key: string, value: unknown): void }).set(`lifeops.${service}.refreshToken` as any, tokens.refresh_token)
    ;(configStore as unknown as { set(key: string, value: unknown): void }).set(`lifeops.${service}.tokenExpiry` as any, Date.now() + tokens.expires_in * 1000)
    return { ok: true }
  })

  ipcMain.handle('lifeops:oauth.getStatus', async (_, { service }: { service: 'gmail' | 'calendar' | 'tasks' }) => {
    const accessToken = (configStore as unknown as { get(key: string): unknown }).get(`lifeops.${service}.accessToken` as any) as string | undefined
    return { connected: !!accessToken }
  })

  console.log('[LifeOps] IPC handlers registered (Phase 2+3+4+5)')
}
