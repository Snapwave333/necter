# LifeOps Phase 1 — Gmail + Calendar + Tasks + Obsidian (Read-Only + Append)

**Goal:** Build the LifeOps adapter foundation — Gmail, Calendar, Tasks (read-only), Obsidian (append-only) — behind the PermissionGate with audit logging.

**Target:** Necter v3.4.0

---

## File Structure

```
src/main/lifeops/
  models/
    index.ts          # LifeItem, EmailItem, CalendarItem, TaskItem, NoteItem, LifeItemBase
  adapters/
    LifeOpsAdapter.ts # Base interface
    GmailAdapter.ts   # Gmail REST API (read-only, gmail.readonly scope)
    CalendarAdapter.ts # Google Calendar REST API (read-only)
    TasksAdapter.ts  # Google Tasks REST API (read-only)
    ObsidianAdapter.ts # Direct file access (append-only)
  permission/
    LifeOpsPermissionGate.ts # Level 0/1/2/3/4 enforcement
  audit/
    AuditLog.ts      # Timestamped record of every tool call
  lifeopsIpc.ts     # IPC handlers — registers all lifeops:* channels
  MorningBriefing.ts # Morning briefing prompt + aggregator
```

---

## Step 1 — Models (`src/main/lifeops/models/index.ts`)

```typescript
export type LifeItemSource = 'gmail' | 'calendar' | 'tasks' | 'obsidian'

export interface LifeItemBase {
  id: string
  source: LifeItemSource
  title: string
  body?: string
  createdAt?: string
  updatedAt?: string
  dueAt?: string
  url?: string
  riskLevel: 0 | 1 | 2 | 3 | 4
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
}

export interface CalendarItem extends LifeItemBase {
  source: 'calendar'
  start: string      // ISO datetime
  end: string        // ISO datetime
  location?: string
  attendees?: string[]
  isAllDay: boolean
}

export interface TaskItem extends LifeItemBase {
  source: 'tasks'
  completed: boolean
  completedAt?: string
  listId: string
  parentTaskId?: string
}

export interface NoteItem extends LifeItemBase {
  source: 'obsidian'
  vaultPath: string
  tags?: string[]
}
```

---

## Step 2 — Gmail Adapter (`src/main/lifeops/adapters/GmailAdapter.ts`)

**API:** `https://gmail.googleapis.com/gmail/v1/users/me/`
**Auth:** OAuth2 access token via `google-auth-library`
**Scopes:** Start with `https://www.googleapis.com/auth/gmail.readonly`

### Config
```typescript
// Stored in Necter config store (encrypted at rest)
// ACTUAL_GMAIL_TOKEN, ACTUAL_GMAIL_REFRESH_TOKEN, ACTUAL_GMAIL_CLIENT_ID, ACTUAL_GMAIL_CLIENT_SECRET
// Port: use existing config system's Google OAuth2 flow
```

### Methods
```typescript
class GmailAdapter implements LifeOpsAdapter {
  readonly name = 'Gmail'
  readonly riskLevel = 0  // read-only for Phase 1

  // Level 0 — always allowed
  listMessages(query?: string, maxResults?: number): Promise<EmailItem[]>
  getMessage(messageId: string): Promise<EmailItem>
  searchMessages(query: string, maxResults?: number): Promise<EmailItem[]>

  // Phase 2
  createDraft(to: string, subject: string, body: string): Promise<string>  // returns draft ID
  // Phase 3
  sendMessage(messageId: string): Promise<void>
  modifyMessage(messageId: string, addLabels?: string[], removeLabels?: string[]): Promise<void>
  trashMessage(messageId: string): Promise<void>
}
```

### Key Implementation Notes
- Use `googleapis` npm package
- List messages: `GET /messages?maxResults=N&q=is:unread`
- Get message: `GET /messages/{id}` — parse `snippet`, `payload.headers`
- Search: `GET /messages?q={encodedQuery}` — support `from:`, `subject:`, `after:`, `before:`, `is:unread`
- Store tokens via Necter's existing OAuth2 token store
- Return `EmailItem[]` — never expose raw API response

---

## Step 3 — Calendar Adapter (`src/main/lifeops/adapters/CalendarAdapter.ts`)

**API:** `https://www.googleapis.com/calendar/v3/`
**Auth:** Same OAuth2 token as Gmail
**Scopes:** `https://www.googleapis.com/auth/calendar.readonly`

### Config
```typescript
// Reuse Gmail OAuth2 tokens — same Google account
// ACTUAL_CALENDAR_TOKEN (via existing Google OAuth2 flow)
```

### Methods
```typescript
class CalendarAdapter implements LifeOpsAdapter {
  readonly name = 'Google Calendar'
  readonly riskLevel = 0  // read-only for Phase 1

  // Level 0
  listEvents(timeMin: string, timeMax: string, calendarId?: string): Promise<CalendarItem[]>
  getEvent(eventId: string, calendarId?: string): Promise<CalendarItem>
  listCalendars(): Promise<{ id: string; summary: string; primary?: boolean }[]>

  // Phase 2
  createEventDraft(event: Partial<CalendarItem>): Promise<string>  // returns draft ID
  // Phase 3
  createEvent(event: CalendarItem): Promise<CalendarItem>
  moveEvent(eventId: string, calendarId: string): Promise<void>
  deleteEvent(eventId: string, calendarId?: string): Promise<void>
}
```

### Key Implementation Notes
- List events: `GET /calendars/primary/events?timeMin=...&timeMax=...&singleEvents=true&orderBy=startTime`
- Free/busy: `POST /freeBusy` — useful for "find 2 free hours"
- All-day events: `start.date` vs `start.dateTime`
- Return `CalendarItem[]`

---

## Step 4 — Tasks Adapter (`src/main/lifeops/adapters/TasksAdapter.ts`)

**API:** `https://tasks.googleapis.com/tasks/v1/`
**Auth:** Same OAuth2 token as Gmail
**Scopes:** `https://www.googleapis.com/auth/tasks.readonly`

### Config
```typescript
// Reuse Gmail OAuth2 tokens
// ACTUAL_TASKS_TOKEN (via existing Google OAuth2 flow)
```

### Methods
```typescript
class TasksAdapter implements LifeOpsAdapter {
  readonly name = 'Google Tasks'
  readonly riskLevel = 0  // read-only for Phase 1

  // Level 0
  listTaskLists(): Promise<{ id: string; title: string }[]>
  listTasks(taskListId: string): Promise<TaskItem[]>
  getTask(taskId: string, taskListId: string): Promise<TaskItem>

  // Phase 2
  createTaskDraft(taskListId: string, task: Partial<TaskItem>): Promise<string>
  // Phase 3
  createTask(taskListId: string, task: TaskItem): Promise<TaskItem>
  completeTask(taskId: string, taskListId: string): Promise<void>
  deleteTask(taskId: string, taskListId: string): Promise<void>
}
```

### Key Implementation Notes
- Default task list: `@default`
- List tasks: `GET /lists/{taskListId}/tasks`
- Recurring tasks: follow `parent` + `links` for subtasks
- Return `TaskItem[]` — never expose raw API response

---

## Step 5 — Obsidian Adapter (`src/main/lifeops/adapters/ObsidianAdapter.ts`)

**API:** Direct file system access (Phase 1) + Obsidian Local REST API (Phase 2)
**Auth:** Vault path configured in Necter settings

### Config
```typescript
// Stored in Necter config store
// ACTUAL_OBSIDIAN_VAULT_PATH = 'C:/Users/chrom/Vault'
```

### Methods
```typescript
class ObsidianAdapter implements LifeOpsAdapter {
  readonly name = 'Obsidian'
  readonly riskLevel = 1  // append-only for Phase 1

  // Level 0
  searchNotes(query: string): Promise<NoteItem[]>   // filename + first 200 chars search
  readNote(vaultPath: string): Promise<NoteItem>    // read file contents
  readDailyNote(date: string): Promise<NoteItem>    // e.g. "2026-05-16"

  // Level 3 (auto-safe) — append only, never overwrite
  appendToDailyNote(date: string, content: string): Promise<void>
  appendToNote(vaultPath: string, content: string): Promise<void>

  // Phase 2
  createNote(vaultPath: string, content: string): Promise<NoteItem>
  createNoteFromTemplate(templatePath: string, vars: Record<string, string>): Promise<NoteItem>
}
```

### Key Implementation Notes
- Vault path: read from Necter config store
- Daily note convention: `{vault}/{YYYY-MM-DD}.md`
- Search: `grep -r` over `.md` files in vault (ignore `.obsidian/` dir)
- Append: open file, append `\n\n---\n{content}`, close
- Never delete or overwrite existing content in Phase 1
- Phase 2: integrate Obsidian Local REST API for better search + note management

---

## Step 6 — Permission Gate (`src/main/lifeops/permission/LifeOpsPermissionGate.ts`)

```typescript
export enum LifeOpsPermission {
  READ      = 0,  // Gmail list/get, Calendar list, Tasks list, Obsidian read/search
  DRAFT     = 1,  // Create draft (email, event, task, note)
  WRITE     = 2,  // Send, create, modify, delete — REQUIRES user approval
  AUTO_SAFE = 3,  // Append daily note, label email, archive low-risk
  FORBID    = 4,  // Pay bills, delete records, mass-edit — always blocked
}

export class LifeOpsPermissionGate {
  check(toolId: string, userLevel: LifeOpsPermission): boolean {
    const required = TOOL_PERMISSION_MAP[toolId] ?? LifeOpsPermission.READ
    return userLevel >= required   // higher number = more restricted
  }

  // Returns 'approved' | 'pending_approval' | 'blocked'
  resolve(toolId: string, userLevel: LifeOpsPermission): 'approved' | 'pending_approval' | 'blocked' {
    if (userLevel >= LifeOpsPermission.FORBID) return 'blocked'
    if (userLevel >= TOOL_PERMISSION_MAP[toolId]) return 'approved'
    return 'pending_approval'
  }
}

// Default user level = READ (0) — user must opt into higher levels
```

### Gmail Tool → Permission Map
| Tool | Required Level |
|------|---------------|
| gmail.listMessages | 0 (READ) |
| gmail.search | 0 (READ) |
| gmail.getMessage | 0 (READ) |
| gmail.createDraft | 1 (DRAFT) |
| gmail.sendMessage | 2 (WRITE) |
| gmail.modifyMessage | 3 (AUTO_SAFE) for label/archive |
| gmail.trashMessage | 4 (FORBID) — user must explicitly allow |

### Calendar Tool → Permission Map
| Tool | Required Level |
|------|---------------|
| calendar.listEvents | 0 (READ) |
| calendar.getEvent | 0 (READ) |
| calendar.listFreeBusy | 0 (READ) |
| calendar.createDraftEvent | 1 (DRAFT) |
| calendar.createEvent | 2 (WRITE) |
| calendar.deleteEvent | 4 (FORBID) |

---

## Step 7 — Audit Log (`src/main/lifeops/audit/AuditLog.ts`)

Every LifeOps tool call gets logged. Log entries are stored in the Necter SQLite DB.

```typescript
interface AuditLogEntry {
  id: string
  timestamp: string        // ISO datetime
  userId?: string
  toolId: string            // e.g. 'gmail.listMessages'
  source: LifeItemSource
  input: unknown            // sanitized — no tokens/passwords
  result?: unknown          // sanitized
  permissionLevel: number
  approved: boolean         // false if went to approval queue
  approvedBy?: string       // user ID if manual approval
  error?: string
}
```

**Sanitization rules:**
- Strip OAuth tokens, refresh tokens, API keys
- Strip passwords, secrets
- Keep: message IDs, email subjects, event titles, task titles, note paths

---

## Step 8 — IPC Handlers (`src/main/lifeops/lifeopsIpc.ts`)

```typescript
export function registerLifeOpsIpc(): void {
  // Gmail
  ipcMain.handle('lifeops:gmail.listMessages', async (_, query?: string, maxResults?: number) =>
    gmailAdapter.listMessages(query, maxResults))
  ipcMain.handle('lifeops:gmail.getMessage', async (_, messageId: string) =>
    gmailAdapter.getMessage(messageId))
  ipcMain.handle('lifeops:gmail.search', async (_, query: string, maxResults?: number) =>
    gmailAdapter.searchMessages(query, maxResults))

  // Calendar
  ipcMain.handle('lifeops:calendar.listEvents', async (_, timeMin: string, timeMax: string, calendarId?: string) =>
    calendarAdapter.listEvents(timeMin, timeMax, calendarId))
  ipcMain.handle('lifeops:calendar.getEvent', async (_, eventId: string, calendarId?: string) =>
    calendarAdapter.getEvent(eventId, calendarId))
  ipcMain.handle('lifeops:calendar.listFreeBusy', async (_, timeMin: string, timeMax: string) =>
    calendarAdapter.listFreeBusy(timeMin, timeMax))

  // Tasks
  ipcMain.handle('lifeops:tasks.listTaskLists', async () => tasksAdapter.listTaskLists())
  ipcMain.handle('lifeops:tasks.listTasks', async (_, taskListId: string) =>
    tasksAdapter.listTasks(taskListId))

  // Obsidian
  ipcMain.handle('lifeops:obsidian.search', async (_, query: string) =>
    obsidianAdapter.searchNotes(query))
  ipcMain.handle('lifeops:obsidian.readNote', async (_, vaultPath: string) =>
    obsidianAdapter.readNote(vaultPath))
  ipcMain.handle('lifeops:obsidian.readDailyNote', async (_, date: string) =>
    obsidianAdapter.readDailyNote(date))
  ipcMain.handle('lifeops:obsidian.appendToDailyNote', async (_, date: string, content: string) =>
    obsidianAdapter.appendToDailyNote(date, content))
}
```

---

## Step 9 — Register in index.ts

Add to `src/main/index.ts`:

```typescript
import { registerLifeOpsIpc } from './lifeops/lifeopsIpc'
```

Add to the IPC handler section (after `registerFinanceIpc()`):
```typescript
registerFinanceIpc()
registerLifeOpsIpc()
```

---

## Step 10 — Settings UI (`src/renderer/components/settings/`)

New panel: `SettingsLifeOps.tsx`

**UI sections:**
1. Gmail — Connect/Disconnect button, shows connected email address, scope level
2. Calendar — Same pattern, shows primary calendar
3. Tasks — Same pattern, shows default task list
4. Obsidian — Vault path input, Browse button, test connection
5. Permission Level — dropdown: Read-only (default) / Draft / Write / Auto-Safe
6. Audit Log — "View Audit Log" button → opens modal with recent entries

**OAuth2 flow:**
- Use existing Necter Google OAuth2 flow if already connected
- If not connected, prompt user to authenticate with Google
- Request minimum scopes: `gmail.readonly` + `calendar.readonly` + `tasks.readonly`
- Store tokens in Necter encrypted config store

---

## Verification

1. Build succeeds (`npx vite build`)
2. No new lint errors introduced
3. Vite + electron-builder both produce working output
4. Gmail adapter: mock test returns correctly shaped `EmailItem[]`
5. Calendar adapter: mock test returns correctly shaped `CalendarItem[]`
6. Tasks adapter: mock test returns correctly shaped `TaskItem[]`
7. Obsidian adapter: appends to daily note without corrupting existing content
8. Permission gate: blocks forbidden tools even when user level is set high
9. Audit log: every call creates a log entry with sanitized data

---

## Notes

- **Google OAuth2:** Reuse Necter's existing `configStore` Google OAuth2 flow if present — don't create a separate flow
- **Token storage:** All tokens go through Necter's existing encrypted store (`electron-store` with encryption key from user's machine keychain)
- **No `dangerous` scope:** Never request `gmail.modify` or `gmail.send` in Phase 1 — add only when Phase 2 requires it
- **Obsidian vault path validation:** Verify path exists and contains `.obsidian` folder before accepting

---

_Next: Phase 2 — Drafts + Approval Queue (email drafts, task drafts, event drafts, approval UI panel)_
