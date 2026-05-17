// Google Calendar REST API adapter — read-only (calendar.readonly scope) for Phase 1
// Uses native fetch with OAuth2 Bearer token

import { CalendarItem, FreeBusyResult, FreeBusySlot } from '../models'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string } // dateTime = timed, date = all-day
  end: { dateTime?: string; date?: string }
  attendees?: Array<{ email: string; displayName?: string }>
  calendarId?: string
  organizer?: { email: string; displayName?: string }
  status?: string
}

export class CalendarAdapter {
  private async getAccessToken(): Promise<string | null> {
    // TODO: load from Necter config store — shares Google OAuth2 token with Gmail
    return null
  }

  private async calendarFetch(path: string, options: RequestInit = {}): Promise<unknown> {
    const token = await this.getAccessToken()
    if (!token) {
      throw new Error('Google Calendar not connected. Please authenticate in Settings > LifeOps.')
    }

    const url = path.startsWith('http') ? path : `${CALENDAR_API}${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Calendar API error ${res.status}: ${err?.error?.message ?? res.statusText}`)
    }

    return res.status === 204 ? null : res.json()
  }

  private parseEvent(raw: CalendarEvent, calendarId = 'primary'): CalendarItem {
    const isAllDay = !raw.start.dateTime
    return {
      id: raw.id,
      source: 'calendar',
      title: raw.summary ?? '(no title)',
      body: raw.description,
      location: raw.location,
      start: (raw.start.dateTime ?? raw.start.date ?? new Date().toISOString()),
      end: (raw.end.dateTime ?? raw.end.date ?? new Date().toISOString()),
      isAllDay,
      attendees: raw.attendees?.map((a) => a.email ?? a.displayName ?? '').filter(Boolean),
      calendarId,
      calendarName: calendarId === 'primary' ? 'My Calendar' : calendarId,
      riskLevel: 0,
      createdAt: undefined,
      updatedAt: undefined,
    }
  }

  // --- Phase 1: Read-only ---

  async listEvents(
    timeMin: string,
    timeMax: string,
    calendarId = 'primary',
    maxResults = 100
  ): Promise<CalendarItem[]> {
    const data = await this.calendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
        `singleEvents=true&orderBy=startTime&maxResults=${maxResults}`
    ) as { items?: CalendarEvent[] }

    if (!data.items) return []
    return data.items
      .filter((e) => e.status !== 'cancelled')
      .map((e) => this.parseEvent(e, calendarId))
  }

  async getEvent(eventId: string, calendarId = 'primary'): Promise<CalendarItem> {
    const data = await this.calendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    ) as CalendarEvent
    return this.parseEvent(data, calendarId)
  }

  async listCalendars(): Promise<Array<{ id: string; summary: string; primary?: boolean }>> {
    const data = await this.calendarFetch('/users/me/calendarList') as {
      items?: Array<{ id: string; summary: string; primary?: boolean }>
    }
    return data.items ?? []
  }

  async listFreeBusy(
    timeMin: string,
    timeMax: string,
    calendarIds: string[] = ['primary']
  ): Promise<FreeBusyResult[]> {
    const data = await this.calendarFetch('/freeBusy', {
      method: 'POST',
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: calendarIds.map((id) => ({ id })),
      }),
    }) as {
      calendars: Record<string, { busy: Array<{ start: string; end: string }> }>
    }

    return Object.entries(data.calendars).map(([calendarId, { busy }]) => ({
      calendarId,
      busy: busy as FreeBusySlot[],
    }))
  }

  // Find free windows of at least `minDurationMinutes`
  findFreeWindows(
    freeBusy: FreeBusyResult[],
    workingHours = { start: 9, end: 17 },
    minDurationMinutes = 60
  ): Array<{ start: string; end: string }> {
    const windows: Array<{ start: string; end: string }> = []
    const now = new Date()

    for (const { busy } of freeBusy) {
      let cursor = new Date(now)
      cursor.setHours(workingHours.start, 0, 0, 0)

      const endOfDay = new Date(cursor)
      endOfDay.setHours(workingHours.end, 0, 0, 0)

      for (const slot of busy) {
        const slotStart = new Date(slot.start)
        const slotEnd = new Date(slot.end)

        // Skip if slot is outside working hours
        if (slotEnd <= cursor || slotStart >= endOfDay) continue

        const gapStart = cursor.toISOString()
        const gapEnd = slotStart < endOfDay ? slotStart.toISOString() : endOfDay.toISOString()
        const gapMs = new Date(gapEnd).getTime() - new Date(gapStart).getTime()

        if (gapMs >= minDurationMinutes * 60 * 1000) {
          windows.push({ start: gapStart, end: gapEnd })
        }

        cursor = slotEnd > cursor ? slotEnd : cursor
      }

      // Final window to end of working day
      if (cursor < endOfDay) {
        const gapMs = endOfDay.getTime() - cursor.getTime()
        if (gapMs >= minDurationMinutes * 60 * 1000) {
          windows.push({ start: cursor.toISOString(), end: endOfDay.toISOString() })
        }
      }
    }

    return windows
  }

  // --- Phase 2: Drafts ---

  async createEventDraft(
    event: Partial<CalendarItem>,
    calendarId = 'primary'
  ): Promise<string> {
    // Draft = store locally, don't create on Google yet
    const draftId = `draft:${Date.now()}:${Math.random().toString(36).slice(2)}`
    return draftId
  }

  // --- Phase 3: Write operations ---

  async createEvent(event: CalendarItem): Promise<CalendarItem> {
    const payload = {
      summary: event.title,
      description: event.body,
      location: event.location,
      start: event.isAllDay
        ? { date: event.start.split('T')[0] }
        : { dateTime: event.start, timeZone: 'UTC' },
      end: event.isAllDay
        ? { date: event.end.split('T')[0] }
        : { dateTime: event.end, timeZone: 'UTC' },
      attendees: event.attendees?.map((email) => ({ email })),
    }

    const data = await this.calendarFetch(
      `/calendars/${encodeURIComponent(event.calendarId ?? 'primary')}/events`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ) as CalendarEvent

    return this.parseEvent(data, event.calendarId ?? 'primary')
  }

  async moveEvent(
    eventId: string,
    sourceCalendarId: string,
    targetCalendarId: string
  ): Promise<void> {
    // Get event, delete from source, create in target
    const event = await this.getEvent(eventId, sourceCalendarId)
    await this.calendarFetch(
      `/calendars/${encodeURIComponent(sourceCalendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    )
    await this.createEvent({ ...event, calendarId: targetCalendarId })
  }

  async updateEvent(
    eventId: string,
    updates: Partial<CalendarItem>,
    calendarId = 'primary'
  ): Promise<CalendarItem> {
    const payload: Record<string, unknown> = {}
    if (updates.title) payload.summary = updates.title
    if (updates.body) payload.description = updates.body
    if (updates.location) payload.location = updates.location
    if (updates.start) {
      payload.start = updates.isAllDay
        ? { date: updates.start.split('T')[0] }
        : { dateTime: updates.start, timeZone: 'UTC' }
    }
    if (updates.end) {
      payload.end = updates.isAllDay
        ? { date: updates.end.split('T')[0] }
        : { dateTime: updates.end, timeZone: 'UTC' }
    }

    const data = await this.calendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ) as CalendarEvent

    return this.parseEvent(data, calendarId)
  }

  async deleteEvent(eventId: string, calendarId = 'primary'): Promise<void> {
    await this.calendarFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    )
  }
}
