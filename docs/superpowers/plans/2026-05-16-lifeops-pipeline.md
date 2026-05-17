# Necter LifeOps — 4-Phase Roadmap

> Personal productivity intelligence layer for Necter — Gmail, Calendar, Tasks, and Obsidian behind one agent-safe interface with approval queue.

## Architecture Overview

```
[Necter Chat UI]
       ↓
[Necter Agent]
       ↓
[Permission Gate]  ← Level 0/1/2/3/4 safety model
       ↓
[Tool Adapters]
  ┌──────┼───────┼──────────┐
  ↓      ↓       ↓          ↓
 Gmail  Calendar Tasks  Obsidian
 (REST)  (REST)  (REST)  (file/MCP)
       ↓
[Audit Log]  ← every action recorded
       ↓
[Human Approval Queue]  ← Level 2 writes pause here
```

## Core Principle

**Agent decides intent. Tool adapter validates. Policy gate checks risk. User approves if needed. Adapter executes. Audit log records everything.**

---

## Adapter Interface

```typescript
interface AgentTool<TInput, TResult> {
  id: string
  name: string
  risk: 'read' | 'draft' | 'write' | 'destructive'
  run(input: TInput, context: AgentContext): Promise<TResult>
}
```

## Permission Levels

| Level | Name | Description | Default |
|-------|------|-------------|---------|
| 0 | Read-only | Summarize, explain, detect | ✅ Always allowed |
| 1 | Draft-only | Create drafts, suggest, propose | ✅ Always allowed |
| 2 | Approved Write | Send, create, delete, move | ⏳ User approval required |
| 3 | Autonomous Safe | Append daily note, label, archive low-risk | ✅ Allowed after opt-in |
| 4 | Forbidden | Pay bills, delete records, mass-edit | 🚫 Always blocked |

**Default: AI can read. AI can suggest. AI can draft. Human approves writes. AI never sends without you.**

---

## Gmail Integration

**API:** Official Gmail REST API via Google OAuth2
**Scopes (minimum first):** `gmail.readonly` → `gmail.modify` → `gmail.send`

### Abilities by Level

| Level | Abilities |
|-------|-----------|
| 0 (Read) | Summarize inbox, detect important messages, extract deadlines, find bills/receipts/confirmations |
| 1 (Draft) | Draft replies, draft follow-ups, propose labels, propose archive/delete |
| 2 (Write+Approval) | Send email, archive email, label email, mark read/unread, delete email |
| 3 (Auto-safe) | Label email, archive low-risk email |

### Flows
- "Summarize my unread emails" → Level 0
- "Draft a reply to that email" → Level 1
- "Send that reply" → Level 2 (approval)
- "Archive this newsletter" → Level 3 (auto if low-risk)

---

## Calendar Integration

**API:** Official Google Calendar REST API

### Abilities by Level

| Level | Abilities |
|-------|-----------|
| 0 (Read) | Today's schedule, free/busy windows, upcoming events, location/time conflicts |
| 1 (Draft) | Propose meeting times, draft events, suggest focus blocks, detect overbooking |
| 2 (Write+Approval) | Create event, move event, cancel event, invite people |
| 3 (Auto-safe) | Suggest focus blocks, propose reschedule |

### Best Flows
- "Plan my day" — reads calendar + tasks + email, generates morning briefing
- "Find 2 free hours this week"
- "Schedule this task before Friday"
- "Block recovery time after my shift"
- "Make a prep note for each event tomorrow"

---

## Google Tasks Integration

**API:** Official Google Tasks REST API

### Abilities by Level

| Level | Abilities |
|-------|-----------|
| 0 (Read) | List tasks, detect overdue tasks, connect tasks to emails/events |
| 1 (Draft) | Propose new tasks, break big tasks into subtasks, assign dates |
| 2 (Write+Approval) | Create task, complete task, update due date, delete task |

### Best Flow
```
Email says: "send file by Thursday"
        ↓
Agent extracts deadline
        ↓
Creates draft task
        ↓
Links source email
        ↓
Suggests calendar work block
        ↓
User approves
```

---

## Obsidian Integration

**APIs:** Direct vault file access (Phase 1) + Obsidian Local REST API / MCP (Phase 2)

### Abilities by Level

| Level | Abilities |
|-------|-----------|
| 0 (Read) | Search notes, read daily notes, read project plans, read meeting notes, read knowledge base |
| 1 (Draft) | Draft daily note entry, draft meeting note, draft project note |
| 2 (Write+Approval) | Create note, overwrite existing note |
| 3 (Auto-safe) | Append to daily note, append to meeting note |

### Safety Rules
- Never overwrite whole notes blindly
- Prefer append-only logs
- Use git/version snapshots
- Phase 2: implement MCP auth

---

## Unified Data Model

```typescript
type LifeItem = EmailItem | CalendarItem | TaskItem | NoteItem

interface LifeItemBase {
  id: string
  source: 'gmail' | 'calendar' | 'tasks' | 'obsidian'
  title: string
  body?: string
  createdAt?: string
  updatedAt?: string
  dueAt?: string
  url?: string
  riskLevel: number   // 0–4
  linkedItems?: string[]  // cross-link between Gmail/Task/Calendar/Note
}
```

### Cross-linking Example
```
Gmail email (deadline)
   ↓ creates
Google Task (linked to email ID)
   ↓ schedules
Calendar focus block (linked to task ID)
   ↓ logs into
Obsidian daily note (linked to all three)
```

---

## Morning Briefing — Phase 4 Feature

```
Morning Briefing
   ↓
Read Gmail
Read Calendar
Read Tasks
Read Obsidian daily note
   ↓
Generate daily plan
   ↓
Suggest:
- top 3 priorities
- missed deadlines
- calendar conflicts
- emails needing response
- notes to create
- tasks to schedule
```

Example output:
```
TODAY  [██████░░░░] 60% loaded

Calendar:
- Work shift 5 PM–1 AM

Gmail:
- 2 messages need attention
- 1 bill/receipt detected

Tasks:
- 3 overdue
- 1 should be scheduled today

Obsidian:
- Append daily plan to 2026-05-16.md?

Suggested actions:
1. Draft reply to Red Rocks shift message
2. Add prep block before work
3. Move overdue task to tomorrow
```

---

## Phase 1 ✅ Ready to Start
**LifeOps Adapter Core** — Gmail + Calendar + Tasks (read-only) + Obsidian append (v3.4.0)

- [ ] `LifeOpsAdapter` base interface
- [ ] `GmailAdapter` — read-only (gmail.readonly scope)
- [ ] `CalendarAdapter` — read-only (calendar.readonly scope)
- [ ] `TasksAdapter` — read-only (tasks.readonly scope)
- [ ] `ObsidianAdapter` — append-only (direct file access)
- [ ] Permission gate — Level 0/1/2/3/4 enforcement
- [ ] Audit log — every action recorded with timestamp + user + tool + input + result
- [ ] IPC handlers for all lifeops tools
- [ ] Gmail/Tasks/Calendar/Obsidian settings panel (connect + disconnect)
- [ ] Morning briefing agent prompt template

**Owner:** Necter Agent
**Status:** IN PROGRESS
**Details:** `docs/superpowers/plans/2026-05-16-lifeops-phase-1.md`

---

## Phase 2 📋 Planned
**Drafts + Approval Queue** — email drafts, task drafts, event drafts, approval UI (v3.5.0)

- [ ] Gmail draft creation + send-with-approval flow
- [ ] Calendar event draft creation + approval
- [ ] Task creation with approval
- [ ] Approval queue UI panel
- [ ] Cross-linking: email → task → calendar → note

**Status:** PLANNED

---

## Phase 3 📋 Planned
**Safe Writes + MCP** — Level 3 auto-writes, Obsidian MCP server, full write set (v3.6.0)

- [ ] Level 3 autonomous safe writes (append daily note, label, archive)
- [ ] Obsidian Local REST API / MCP integration
- [ ] Full Gmail write scope (gmail.modify, gmail.send)
- [ ] Full Calendar write scope
- [ ] Full Tasks write scope

**Status:** PLANNED

---

## Phase 4 📋 Planned
**Autonomous LifeOps** — morning briefing agent, weekly review, recurring routines (v3.7.0+)

- [ ] Morning briefing agent (auto-summarize Gmail + Calendar + Tasks + Obsidian daily note)
- [ ] Weekly review automation
- [ ] Recurring routine detection
- [ ] Project memory across sessions

**Status:** FUTURE

---

_Document created: 2026-05-16_
