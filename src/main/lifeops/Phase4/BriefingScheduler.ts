// BriefingScheduler — Phase 4: Schedules MorningBriefingAgent runs
// Uses setTimeout to trigger at a configured HH:mm time each day.
// Persists schedule in configStore and resumes on app restart.

import { setTimeout, clearTimeout } from 'timers'
import { BrowserWindow } from 'electron'
import { BriefingConfig } from '../models'
import { MorningBriefingAgent } from './MorningBriefingAgent'
import { configStore } from '../../config/config-store'

// configStore uses a string-key map; cast to allow arbitrary keys
const store = configStore as unknown as { get(key: string): unknown; set(key: string, value: unknown): void }

const CONFIG_KEY = 'lifeops.briefingTime'
const DEFAULT_TIME = '07:00'

export class BriefingScheduler {
  private timer: NodeJS.Timeout | null = null
  private currentTime: string = DEFAULT_TIME
  private config: BriefingConfig | null = null

  constructor() {
    // Restore schedule from configStore on construction
    const savedTime = store.get(CONFIG_KEY)
    if (typeof savedTime === 'string' && savedTime) {
      this.currentTime = savedTime
    }
  }

  /**
   * Initialize the scheduler with a briefing config and schedule the run.
   * Called after app restart when config is available.
   */
  init(config: BriefingConfig): void {
    this.config = config
    if (config.briefingTime) {
      this.currentTime = config.briefingTime
    }
    this.schedule(this.currentTime)
  }

  /**
   * Schedule the next briefing at the given HH:mm time.
   */
  schedule(briefingTime: string): void {
    this.unschedule()
    this.currentTime = briefingTime

    // Persist to configStore
    ;(store as { set(key: string, value: unknown): void }).set(CONFIG_KEY, briefingTime)

    // Calculate ms until next occurrence of briefingTime
    const msUntilRun = this.msUntilTime(briefingTime)
    console.log(`[BriefingScheduler] Next briefing scheduled for ${briefingTime} (in ${Math.round(msUntilRun / 1000 / 60)} min)`)

    this.timer = setTimeout(() => {
      this.runBriefing()
    }, msUntilRun)
  }

  /**
   * Cancel the scheduled briefing.
   */
  unschedule(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /**
   * Returns the Date of the next scheduled run, or null if not scheduled.
   */
  getNextRun(): Date | null {
    if (!this.isScheduled()) return null
    return new Date(Date.now() + this.msUntilTime(this.currentTime))
  }

  /**
   * Returns true if a briefing is currently scheduled.
   */
  isScheduled(): boolean {
    return this.timer !== null
  }

  private msUntilTime(hhmm: string): number {
    const [hours, minutes] = hhmm.split(':').map(Number)
    const now = new Date()
    const target = new Date(now)
    target.setHours(hours, minutes, 0, 0)

    // If the time has already passed today, schedule for tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1)
    }

    return target.getTime() - now.getTime()
  }

  private async runBriefing(): Promise<void> {
    if (!this.config) {
      console.warn('[BriefingScheduler] No config loaded, skipping briefing run')
      return
    }

    console.log('[BriefingScheduler] Running scheduled morning briefing...')

    try {
      const agent = new MorningBriefingAgent(this.config)
      const briefing = await agent.run()

      // Emit event to renderer
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('server.event', {
            type: 'lifeops.briefing.generated',
            payload: briefing,
          } as never)
        }
      }

      console.log('[BriefingScheduler] Briefing generated successfully')
    } catch (err) {
      console.error('[BriefingScheduler] Briefing generation failed:', err)
    } finally {
      // Reschedule for the next day
      this.schedule(this.currentTime)
    }
  }
}

// Singleton instance
let schedulerInstance: BriefingScheduler | null = null

export function getBriefingScheduler(): BriefingScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new BriefingScheduler()
  }
  return schedulerInstance
}
