// Phase 5: Weekly Review Agent — analyzes the week's email, calendar, tasks + audit log
// and produces a structured WeeklyReview with metrics, highlights, suggestions,
// and a markdown note for Obsidian.

import * as fs from 'fs'
import * as path from 'path'
import { GmailAdapter } from '../adapters/GmailAdapter'
import { CalendarAdapter } from '../adapters/CalendarAdapter'
import { TasksAdapter } from '../adapters/TasksAdapter'
import { ObsidianAdapter } from '../adapters/ObsidianAdapter'
import { AuditLog } from '../audit/AuditLog'
import {
  BriefingConfig,
  EmailItem,
  CalendarItem,
  RecurringRoutine,
} from '../models'
import { configStore } from '../../config/config-store'

export interface WeeklyMetrics {
  totalEmails: number
  emailsBySender: Record<string, number>
  meetingHours: number
  meetingCount: number
  tasksCompleted: number
  tasksCreated: number
  mostActiveDay: string
  recurringPatterns: RecurringPattern[]
}

export interface RecurringPattern {
  title: string
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  avgDurationMinutes: number
  pattern: string  // "Every Tuesday 2-3pm"
}

export interface WeeklyReview {
  weekOf: string   // ISO date of Monday
  weekUntil: string  // ISO date of Sunday
  metrics: WeeklyMetrics
  highlights: string[]   // AI-generated insights
  suggestions: string[]  // Actionable recommendations
  weeklyNoteContent: string  // Markdown to append to Obsidian
  suggestedRoutines: RecurringRoutine[]
}

interface DailyActivity {
  day: string
  emails: number
  meetings: number
  tasks: number
}

export class WeeklyReviewAgent {
  constructor(private config: BriefingConfig) {}

  /**
   * Run the weekly review for the week containing `weekStartDate` (ISO Monday).
   * If not provided, defaults to the current week.
   */
  async run(weekStartDate?: string): Promise<WeeklyReview> {
    // ── 1. Calculate week range (Monday → Sunday) ──────────────────────────────
    const monday = weekStartDate
      ? this.parseMonday(weekStartDate)
      : this.getCurrentWeekMonday()
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    const weekOf = monday.toISOString().split('T')[0]
    const weekUntil = sunday.toISOString().split('T')[0]

    const gmail = new GmailAdapter()
    const calendar = new CalendarAdapter()
    const tasksAdapter = new TasksAdapter()
    const obsidian = new ObsidianAdapter()
    const audit = new AuditLog()

    // ── 2. Collect data ─────────────────────────────────────────────────────

    // 2a. Emails for the full week
    let emails: EmailItem[] = []
    try {
      const emailResults = await gmail.searchMessages(
        `after:${weekOf} before:${weekUntil}`,
        200
      )
      emails = Array.isArray(emailResults) ? emailResults : []
    } catch {
      emails = []
    }

    // 2b. Calendar events for the full week
    let events: CalendarItem[] = []
    try {
      const timeMin = new Date(monday).toISOString()
      const timeMax = new Date(sunday).toISOString()
      events = await calendar.listEvents(timeMin, timeMax, 'primary', 500)
    } catch {
      events = []
    }

    // 2c. Task data from audit log (comparing week vs previous week)
    const weekStartMs = monday.getTime()
    const weekEndMs = sunday.getTime() + 24 * 60 * 60 * 1000

    let auditEntries: Array<{ toolId: string; timestamp: string }> = []
    try {
      auditEntries = audit.readRange(
        new Date(weekStartMs).toISOString(),
        new Date(weekEndMs).toISOString()
      ) as Array<{ toolId: string; timestamp: string }>
    } catch {
      auditEntries = []
    }

    // ── 3. Compute metrics ───────────────────────────────────────────────────

    // Email metrics
    const totalEmails = emails.length
    const emailsBySender: Record<string, number> = {}
    for (const email of emails) {
      const sender = email.from.replace(/<.*?>/, '').trim() || email.from
      emailsBySender[sender] = (emailsBySender[sender] || 0) + 1
    }

    // Calendar metrics
    let meetingHours = 0
    let meetingCount = 0
    const dayActivity: Record<string, DailyActivity> = {}

    for (const event of events) {
      if (event.title?.toLowerCase().includes('cancelled')) continue
      meetingCount++
      const startMs = new Date(event.start).getTime()
      const endMs = new Date(event.end).getTime()
      meetingHours += (endMs - startMs) / (1000 * 60 * 60)

      const dayKey = new Date(event.start).toLocaleDateString('en-US', { weekday: 'short' })
      if (!dayActivity[dayKey]) {
        dayActivity[dayKey] = { day: dayKey, emails: 0, meetings: 0, tasks: 0 }
      }
      dayActivity[dayKey].meetings++
    }

    // Add email activity per day
    for (const email of emails) {
      const dayKey = new Date(email.createdAt || email.updatedAt || monday).toLocaleDateString('en-US', { weekday: 'short' })
      if (!dayActivity[dayKey]) {
        dayActivity[dayKey] = { day: dayKey, emails: 0, meetings: 0, tasks: 0 }
      }
      dayActivity[dayKey].emails++
    }

    // Find most active day
    let mostActiveDay = 'Mon'
    let maxActivity = 0
    for (const act of Object.values(dayActivity)) {
      const total = act.emails + act.meetings + act.tasks
      if (total > maxActivity) {
        maxActivity = total
        mostActiveDay = act.day
      }
    }

    // Task completion/creation from audit
    const taskCreatesThisWeek = auditEntries.filter((e) => e.toolId === 'tasks.createTask').length
    const taskCompletionsThisWeek = auditEntries.filter((e) => e.toolId === 'tasks.completeTask').length

    // Recurring patterns
    const recurringPatterns = this.identifyRecurringPatterns(events)

    const metrics: WeeklyMetrics = {
      totalEmails,
      emailsBySender,
      meetingHours: Math.round(meetingHours * 10) / 10,
      meetingCount,
      tasksCompleted: taskCompletionsThisWeek,
      tasksCreated: taskCreatesThisWeek,
      mostActiveDay,
      recurringPatterns,
    }

    // ── 4. Generate insights and suggestions ──────────────────────────────────
    const { highlights, suggestions } = this.generateInsights(metrics, emails, recurringPatterns)

    // ── 5. Generate suggested routines ────────────────────────────────────────
    const suggestedRoutines = this.suggestRoutines(metrics, recurringPatterns)

    // ── 6. Build markdown note content ────────────────────────────────────────
    const weekNum = this.getWeekNumber(monday)
    const year = monday.getFullYear()
    const weeklyNoteContent = this.buildWeeklyNote(
      weekOf,
      weekUntil,
      weekNum,
      year,
      metrics,
      highlights,
      suggestions
    )

    // ── 7. Write review note to Obsidian ─────────────────────────────────────
    const reviewFileName = `${year}-W${String(weekNum).padStart(2, '0')}-review.md`
    try {
      const vaultPath = (configStore.get('obsidianVaultPath' as any) || '') as string
      if (vaultPath) {
        const reviewPath = path.join(vaultPath, reviewFileName)
        if (fs.existsSync(reviewPath)) {
          obsidian.appendToNote(reviewPath, `\n\n## Updated: ${new Date().toISOString()}\n${weeklyNoteContent}`)
        } else {
          fs.writeFileSync(reviewPath, weeklyNoteContent, 'utf8')
        }
      }
    } catch {
      console.warn('[WeeklyReviewAgent] Could not write review note to Obsidian.')
    }

    return {
      weekOf,
      weekUntil,
      metrics,
      highlights,
      suggestions,
      weeklyNoteContent,
      suggestedRoutines,
    }
  }

  private parseMonday(isoDate: string): Date {
    const d = new Date(isoDate)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  private getCurrentWeekMonday(): Date {
    return this.parseMonday(new Date().toISOString())
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  private identifyRecurringPatterns(events: CalendarItem[]): RecurringPattern[] {
    const patterns: RecurringPattern[] = []
    const byTitle: Record<string, CalendarItem[]> = {}
    for (const event of events) {
      const key = event.title?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30) || ''
      if (!key) continue
      if (!byTitle[key]) byTitle[key] = []
      byTitle[key].push(event)
    }

    for (const evts of Object.values(byTitle)) {
      if (evts.length < 2) continue

      const daysOfWeek = evts.map((e) => new Date(e.start).getDay())
      const allSame = daysOfWeek.every((d) => d === daysOfWeek[0])

      const hours = evts.map((e) => new Date(e.start).getHours())
      const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length
      const allSimilar = hours.every((h) => Math.abs(h - avgHour) <= 1)

      if (allSame && allSimilar) {
        const dayName = new Date(evts[0].start).toLocaleDateString('en-US', { weekday: 'long' })
        const fmt = (n: number) => String(n).padStart(2, '0')
        const startD = new Date(evts[0].start)
        const endD = new Date(evts[0].end)
        const timeStr = `${fmt(startD.getHours())}:${fmt(startD.getMinutes())}-${fmt(endD.getHours())}:${fmt(endD.getMinutes())}`

        const avgDurationMs = evts.reduce((sum, e) => {
          return sum + (new Date(e.end).getTime() - new Date(e.start).getTime())
        }, 0) / evts.length

        patterns.push({
          title: evts[0].title,
          frequency: 'weekly',
          avgDurationMinutes: Math.round(avgDurationMs / 60000),
          pattern: `Every ${dayName} ${timeStr}`,
        })
      }
    }

    return patterns.slice(0, 10)
  }

  private generateInsights(
    metrics: WeeklyMetrics,
    emails: EmailItem[],
    recurringPatterns: RecurringPattern[]
  ): { highlights: string[]; suggestions: string[] } {
    const highlights: string[] = []
    const suggestions: string[] = []

    const topSender = Object.entries(metrics.emailsBySender)
      .sort(([, a], [, b]) => b - a)[0]
    if (topSender) {
      highlights.push(
        `You received ${metrics.totalEmails} emails this week, with ${topSender[0]} being your most frequent correspondent (${topSender[1]} emails).`
      )
    }

    if (metrics.meetingHours > 20) {
      highlights.push(
        `You had ${metrics.meetingCount} meetings totaling ~${metrics.meetingHours.toFixed(1)} hours — a heavy meeting load.`
      )
    } else if (metrics.meetingHours > 0) {
      highlights.push(
        `You had ${metrics.meetingCount} meetings totaling ~${metrics.meetingHours.toFixed(1)} hours this week.`
      )
    }

    if (metrics.tasksCreated > 0) {
      const rate = Math.round((metrics.tasksCompleted / metrics.tasksCreated) * 100)
      highlights.push(
        `You created ${metrics.tasksCreated} tasks and completed ${metrics.tasksCompleted} (${rate}% completion rate).`
      )
    }

    highlights.push(`${metrics.mostActiveDay} was your most active day this week.`)

    if (recurringPatterns.length > 0) {
      const names = recurringPatterns.map((p) => p.title).join(', ')
      highlights.push(`Detected ${recurringPatterns.length} recurring meeting(s): ${names}.`)
    }

    if (metrics.meetingHours > 20) {
      suggestions.push('Consider blocking focus time mid-week to reduce back-to-back meetings.')
    }
    if (metrics.totalEmails > 50) {
      suggestions.push('Consider unsubscribing from low-priority newsletters to reduce email volume.')
    }
    if (metrics.tasksCompleted < metrics.tasksCreated * 0.5 && metrics.tasksCreated > 5) {
      suggestions.push('Your task completion rate is low. Try breaking large tasks into smaller subtasks.')
    }
    if (recurringPatterns.length === 0) {
      suggestions.push('No recurring meetings detected. Consider setting up weekly routines for regular tasks.')
    }
    if (suggestions.length === 0) {
      suggestions.push('Schedule a weekly review each Monday to maintain momentum and set weekly priorities.')
      suggestions.push('Consider blocking 2 hours of deep focus time on your most productive days.')
    }

    return { highlights, suggestions }
  }

  private suggestRoutines(
    metrics: WeeklyMetrics,
    recurringPatterns: RecurringPattern[]
  ): RecurringRoutine[] {
    const routines: RecurringRoutine[] = []

    if (recurringPatterns.length > 0) {
      const meetingDays = recurringPatterns
        .map((p) => {
          const match = p.pattern.match(/Every (\w+)/)
          return match ? match[1] : null
        })
        .filter(Boolean) as string[]

      const focusDays = ['Tuesday', 'Thursday', 'Friday'].filter(
        (d) => !meetingDays.includes(d)
      )
      if (focusDays.length > 0) {
        routines.push({
          id: `routine-focus-${Date.now()}`,
          title: 'Deep Focus Block',
          frequency: 'weekly',
          preferredDay: 2,
          preferredTime: '09:00',
          durationMinutes: 120,
          type: 'focus',
          status: 'suggested',
          createdAt: new Date().toISOString(),
        })
      }
    } else {
      routines.push({
        id: `routine-weekly-review-${Date.now()}`,
        title: 'Weekly Review',
        frequency: 'weekly',
        preferredDay: 1,
        preferredTime: '17:00',
        durationMinutes: 60,
        type: 'review',
        status: 'suggested',
        createdAt: new Date().toISOString(),
      })
    }

    if (metrics.tasksCreated > 10) {
      routines.push({
        id: `routine-admin-${Date.now()}`,
        title: 'Inbox & Tasks Cleanup',
        frequency: 'daily',
        preferredTime: '08:30',
        durationMinutes: 30,
        type: 'admin',
        status: 'suggested',
        createdAt: new Date().toISOString(),
      })
    }

    return routines
  }

  private buildWeeklyNote(
    weekOf: string,
    weekUntil: string,
    weekNum: number,
    year: number,
    metrics: WeeklyMetrics,
    highlights: string[],
    suggestions: string[]
  ): string {
    const lines: string[] = [
      `# Weekly Review — ${weekOf} to ${weekUntil}`,
      '',
      '## Metrics',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Emails | ${metrics.totalEmails} |`,
      `| Meetings | ${metrics.meetingCount} (~${metrics.meetingHours}h) |`,
      `| Tasks Completed | ${metrics.tasksCompleted} |`,
      `| Tasks Created | ${metrics.tasksCreated} |`,
      `| Most Active Day | ${metrics.mostActiveDay} |`,
      '',
    ]

    const topSenders = Object.entries(metrics.emailsBySender)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
    if (topSenders.length > 0) {
      lines.push('## Top Email Senders')
      for (const [sender, count] of topSenders) {
        lines.push(`- ${sender}: ${count} emails`)
      }
      lines.push('')
    }

    if (metrics.recurringPatterns.length > 0) {
      lines.push('## Recurring Meetings')
      for (const p of metrics.recurringPatterns) {
        lines.push(`- **${p.title}** (${p.frequency}) — ${p.pattern}`)
      }
      lines.push('')
    }

    if (highlights.length > 0) {
      lines.push('## Highlights')
      for (const h of highlights) {
        lines.push(`- ${h}`)
      }
      lines.push('')
    }

    if (suggestions.length > 0) {
      lines.push('## Suggestions')
      for (const s of suggestions) {
        lines.push(`- ${s}`)
      }
      lines.push('')
    }

    lines.push('## Suggested Routines')
    lines.push('(Pending — schedule them to activate)')
    lines.push('')

    return lines.join('\n')
  }
}
