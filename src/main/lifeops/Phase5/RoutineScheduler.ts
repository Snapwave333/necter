// Phase 5: RoutineScheduler — manages RecurringRoutines persisted in configStore
// and syncs 'scheduled' routines to Google Calendar.

import { RecurringRoutine } from '../models'
import { configStore } from '../../config/config-store'
import { CalendarAdapter } from '../adapters/CalendarAdapter'

const ROUTINES_KEY = 'lifeops.routines'

export class RoutineScheduler {
  /**
   * Get all stored routines.
   */
  getRoutines(): RecurringRoutine[] {
    try {
      const stored = configStore.get(ROUTINES_KEY as any) as
        | RecurringRoutine[]
        | null
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  }

  /**
   * Persist the full routines array back to configStore.
   */
  private save(routines: RecurringRoutine[]): void {
    configStore.set(ROUTINES_KEY as any, routines)
  }

  /**
   * Add a new routine. No-op if an identical title+frequency routine already exists.
   */
  addRoutine(routine: RecurringRoutine): void {
    const existing = this.getRoutines()
    const alreadyExists = existing.some(
      (r) => r.title === routine.title && r.frequency === routine.frequency
    )
    if (alreadyExists) return
    this.save([...existing, { ...routine, id: routine.id || `routine-${Date.now()}` }])
  }

  /**
   * Remove a routine by id.
   */
  removeRoutine(id: string): void {
    this.save(this.getRoutines().filter((r) => r.id !== id))
  }

  /**
   * Partially update a routine.
   */
  updateRoutine(id: string, updates: Partial<RecurringRoutine>): void {
    this.save(
      this.getRoutines().map((r) => (r.id === id ? { ...r, ...updates } : r))
    )
  }

  /**
   * Sync 'scheduled' routines of type focus/admin/review to Google Calendar
   * for the current week (Mon–Sun).
   *
   * Returns counts and any errors.
   */
  async syncToCalendar(): Promise<{
    created: number
    skipped: number
    errors: string[]
  }> {
    const calendar = new CalendarAdapter()
    const routines = this.getRoutines().filter(
      (r) => r.status === 'scheduled' && ['focus', 'admin', 'review'].includes(r.type)
    )

    // Compute current week Mon–Sun
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const routine of routines) {
      // Determine which day of the current week to schedule
      const targetDay = routine.preferredDay ?? 1 // default Monday
      const scheduleDate = new Date(monday)
      scheduleDate.setDate(monday.getDate() + ((targetDay - 1 + 7) % 7))

      // Parse preferred time
      const [hours, minutes] = (routine.preferredTime || '09:00').split(':').map(Number)
      scheduleDate.setHours(hours, minutes, 0, 0)

      const endDate = new Date(scheduleDate.getTime() + routine.durationMinutes * 60 * 1000)

      const eventTitle = `[Routine] ${routine.title}`
      const eventStartISO = scheduleDate.toISOString()
      const eventEndISO = endDate.toISOString()

      // Check if event already exists at this time (skip duplicates)
      try {
        const existingEvents = await calendar.listEvents(
          eventStartISO,
          eventEndISO,
          'primary',
          10
        )
        const alreadyScheduled = existingEvents.some(
          (e) =>
            e.title === eventTitle &&
            new Date(e.start).getTime() === scheduleDate.getTime()
        )
        if (alreadyScheduled) {
          skipped++
          continue
        }
      } catch {
        // Could not check — try to create anyway
      }

      // Create the calendar event
      try {
        await calendar.createEvent({
          id: '',
          source: 'calendar',
          title: eventTitle,
          body: `Routine: ${routine.title}\nType: ${routine.type}\nFrequency: ${routine.frequency}`,
          start: eventStartISO,
          end: eventEndISO,
          isAllDay: false,
          calendarId: 'primary',
          riskLevel: 0,
        })
        created++
      } catch (err) {
        errors.push(`Failed to create event for "${routine.title}": ${String(err)}`)
      }
    }

    return { created, skipped, errors }
  }
}
