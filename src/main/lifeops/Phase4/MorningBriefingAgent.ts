// MorningBriefingAgent — Phase 4: Morning Briefing Agent
// Collects email/calendar/tasks/notes data, uses LLM to generate a structured briefing,
// and appends it to today's Obsidian daily note.

import { BriefingConfig } from '../models'
import { GmailAdapter } from '../adapters/GmailAdapter'
import { CalendarAdapter } from '../adapters/CalendarAdapter'
import { TasksAdapter } from '../adapters/TasksAdapter'
import { ObsidianAdapter } from '../adapters/ObsidianAdapter'
import { runPiAiOneShot } from '../../claude/claude-sdk-one-shot'
import { configStore } from '../../config/config-store'
import type { BriefingSection, BriefingAction } from '../models'

export interface MorningBriefing {
  date: string
  sections: BriefingSection[]
  actionItems: BriefingAction[]
  unreadCount: number
  meetingCount: number
  overdueTaskCount: number
  generatedAt: string
}

interface CollectedData {
  yesterdayEmails: ReturnType<GmailAdapter['searchMessages']> extends Promise<infer T> ? T : never
  todayEvents: ReturnType<CalendarAdapter['listEvents']> extends Promise<infer T> ? T : never
  overdueTasks: ReturnType<TasksAdapter['getOverdueTasks']> extends Promise<infer T> ? T : never
  todayTasks: ReturnType<TasksAdapter['getTasksDueToday']> extends Promise<infer T> ? T : never
  yesterdayNote: ReturnType<ObsidianAdapter['readDailyNote']> extends Promise<infer T> ? T : never
}

export class MorningBriefingAgent {
  constructor(private config: BriefingConfig) {}

  async run(): Promise<MorningBriefing> {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD

    // Calculate yesterday boundaries
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    // Yesterday 6pm and midnight
    const yesterday6pm = `${yesterdayStr}T18:00:00`
    const todayMidnight = `${todayStr}T00:00:00`

    // Today's calendar boundaries
    const todayStart = `${todayStr}T00:00:00`
    const todayEnd = `${todayStr}T23:59:59`

    // Adapters
    const gmail = new GmailAdapter()
    const calendar = new CalendarAdapter()
    const tasks = new TasksAdapter()
    const obsidian = new ObsidianAdapter(this.config.obsidianVaultPath)

    // Collect data in parallel
    const [yesterdayEmails, todayEvents, overdueTasks, todayTasks, yesterdayNote] =
      await Promise.allSettled([
        gmail.searchMessages(`after:${yesterday6pm} before:${todayMidnight}`, 50),
        calendar.listEvents(todayStart, todayEnd, this.config.defaultCalendarId, 50),
        tasks.getOverdueTasks(this.config.defaultTaskListId),
        tasks.getTasksDueToday(this.config.defaultTaskListId),
        obsidian.readDailyNote(yesterdayStr),
      ]).then((results) =>
        results.map((r) => (r.status === 'fulfilled' ? r.value : []))
      )

    const data: CollectedData = {
      yesterdayEmails: yesterdayEmails as CollectedData['yesterdayEmails'],
      todayEvents: todayEvents as CollectedData['todayEvents'],
      overdueTasks: overdueTasks as CollectedData['overdueTasks'],
      todayTasks: todayTasks as CollectedData['todayTasks'],
      yesterdayNote: yesterdayNote as CollectedData['yesterdayNote'],
    }

    // Generate briefing via LLM
    const briefing = await this.generateBriefingWithLLM(data, todayStr)

    // Append to today's Obsidian daily note (skip if vault not configured)
    if (this.config.obsidianVaultPath) {
      try {
        const briefingContent = this.formatBriefingForObsidian(briefing)
        await obsidian.appendToDailyNote(todayStr, briefingContent)
      } catch (err) {
        console.warn('[MorningBriefing] Failed to write to Obsidian:', err)
      }
    }

    return briefing
  }

  private async generateBriefingWithLLM(
    data: CollectedData,
    date: string
  ): Promise<MorningBriefing> {
    const cfg = configStore.getAll()

    const systemPrompt = `You are a helpful executive assistant summarizing a person's morning. Create a clear, concise briefing that can be scannned in under 2 minutes. Format your response as a valid JSON object with this exact structure:
{
  "sections": [
    { "title": "string", "content": "string", "priority": "high"|"medium"|"low" }
  ],
  "actionItems": [
    {
      "type": "reply"|"schedule"|"task"|"note"|"archive"|"label",
      "priority": "high"|"medium"|"low",
      "description": "string"
    }
  ],
  "unreadCount": number,
  "meetingCount": number,
  "overdueTaskCount": number,
  "generatedAt": "ISO timestamp"
}
Only output the JSON — no markdown formatting, no explanation.`

    const userPrompt = JSON.stringify({
      date,
      yesterdayEveningEmails: data.yesterdayEmails,
      todayCalendar: data.todayEvents,
      overdueTasks: data.overdueTasks,
      todayTasks: data.todayTasks,
      yesterdayNotes: data.yesterdayNote,
    })

    try {
      const result = await runPiAiOneShot(userPrompt, systemPrompt, cfg as Parameters<typeof runPiAiOneShot>[2], {
        temperature: 0.3,
        maxTokens: 4096,
      })

      const parsed = JSON.parse(result.text)
      return {
        date,
        sections: parsed.sections ?? [],
        actionItems: parsed.actionItems ?? [],
        unreadCount: parsed.unreadCount ?? 0,
        meetingCount: parsed.meetingCount ?? 0,
        overdueTaskCount: parsed.overdueTaskCount ?? 0,
        generatedAt: new Date().toISOString(),
      }
    } catch (err) {
      console.warn('[MorningBriefing] LLM generation failed, returning empty briefing:', err)
      return {
        date,
        sections: [
          {
            title: 'Summary',
            content: 'Briefing generation encountered an error. Please check your data connections.',
            priority: 'medium',
          },
        ],
        actionItems: [],
        unreadCount: 0,
        meetingCount: 0,
        overdueTaskCount: 0,
        generatedAt: new Date().toISOString(),
      }
    }
  }

  private formatBriefingForObsidian(briefing: MorningBriefing): string {
    const lines: string[] = [
      `## Morning Briefing — ${briefing.date}\n`,
      `*Generated at ${new Date(briefing.generatedAt).toLocaleTimeString()}*\n`,
    ]

    if (briefing.sections.length > 0) {
      lines.push('### Sections\n')
      for (const section of briefing.sections) {
        lines.push(`#### ${section.title} (${section.priority})\n`)
        lines.push(`${section.content}\n`)
      }
    }

    if (briefing.actionItems.length > 0) {
      lines.push('### Action Items\n')
      for (const action of briefing.actionItems) {
        lines.push(`- [ ] **${action.type.toUpperCase()}** [${action.priority}] ${action.description}`)
      }
      lines.push('')
    }

    lines.push(`> Unread emails: ${briefing.unreadCount} | Meetings today: ${briefing.meetingCount} | Overdue tasks: ${briefing.overdueTaskCount}\n`)

    return lines.join('\n')
  }
}
