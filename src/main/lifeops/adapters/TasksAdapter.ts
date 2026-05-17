// Google Tasks REST API adapter — read-only (tasks.readonly scope) for Phase 1
// Uses native fetch with OAuth2 Bearer token

import { TaskItem } from '../models'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'
const DEFAULT_LIST = '@default'

interface TasksTask {
  id: string
  title: string
  notes?: string
  status: 'needsAction' | 'completed'
  completed?: string  // RFC 3339
  due?: string        // RFC 3339
  parent?: string    // parent task ID for subtasks
  listId?: string
  updated?: string
  created?: string
  links?: Array<{ type: string; description: string; url: string }>
}

interface TaskList {
  id: string
  title: string
}

export class TasksAdapter {
  private async getAccessToken(): Promise<string | null> {
    // TODO: load from Necter config store — shares Google OAuth2 token with Gmail/Calendar
    return null
  }

  private async tasksFetch(path: string, options: RequestInit = {}): Promise<unknown> {
    const token = await this.getAccessToken()
    if (!token) {
      throw new Error('Google Tasks not connected. Please authenticate in Settings > LifeOps.')
    }

    const url = path.startsWith('http') ? path : `${TASKS_API}${path}`
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
      throw new Error(`Tasks API error ${res.status}: ${err?.error?.message ?? res.statusText}`)
    }

    return res.status === 204 ? null : res.json()
  }

  private parseTask(raw: TasksTask, listId: string, listName?: string): TaskItem {
    return {
      id: raw.id,
      source: 'tasks',
      title: raw.title ?? '(no title)',
      body: raw.notes,
      completed: raw.status === 'completed',
      completedAt: raw.completed,
      dueAt: raw.due,
      status: raw.status,
      listId,
      listName,
      parentTaskId: raw.parent,
      riskLevel: 0,
      createdAt: raw.created,
      updatedAt: raw.updated,
    }
  }

  // --- Phase 1: Read-only ---

  async listTaskLists(): Promise<Array<{ id: string; title: string }>> {
    const data = await this.tasksFetch('/users/@me/lists') as { items?: TaskList[] }
    return data.items ?? []
  }

  async listTasks(taskListId = DEFAULT_LIST): Promise<TaskItem[]> {
    const data = await this.tasksFetch(
      `/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true`
    ) as { items?: TasksTask[] }

    if (!data.items) return []

    // Get list name for display
    const lists = await this.listTaskLists()
    const listName = lists.find((l) => l.id === taskListId)?.title

    return data.items.map((t) => this.parseTask(t, taskListId, listName))
  }

  async getTask(taskId: string, taskListId = DEFAULT_LIST): Promise<TaskItem> {
    const data = await this.tasksFetch(
      `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`
    ) as TasksTask

    const lists = await this.listTaskLists()
    const listName = lists.find((l) => l.id === taskListId)?.title
    return this.parseTask(data, taskListId, listName)
  }

  // Get overdue tasks
  async getOverdueTasks(taskListId = DEFAULT_LIST): Promise<TaskItem[]> {
    const all = await this.listTasks(taskListId)
    const now = new Date()
    return all.filter((t) => {
      if (t.completed || !t.dueAt) return false
      return new Date(t.dueAt) < now
    })
  }

  // Get tasks due today
  async getTasksDueToday(taskListId = DEFAULT_LIST): Promise<TaskItem[]> {
    const all = await this.listTasks(taskListId)
    const today = new Date().toISOString().split('T')[0]
    return all.filter((t) => {
      if (t.completed || !t.dueAt) return false
      return t.dueAt.startsWith(today)
    })
  }

  // --- Phase 2: Drafts ---

  async createTaskDraft(
    taskListId: string,
    task: Partial<TaskItem>
  ): Promise<string> {
    const draftId = `draft:${Date.now()}:${Math.random().toString(36).slice(2)}`
    return draftId
  }

  // Break a big task into subtasks
  async breakIntoSubtasks(
    parentId: string,
    taskListId = DEFAULT_LIST
  ): Promise<string[]> {
    // Read parent task first
    const parent = await this.getTask(parentId, taskListId)
    const words = parent.title.split(' ')

    // Heuristic: if title is long, split by conjunctions or comma-separated items
    const segments = parent.title
      .split(/[,;]| and | or | then /)
      .map((s) => s.trim())
      .filter((s) => s.length > 3 && s.length < 80)

    if (segments.length <= 1) return []

    // Return draft IDs (Phase 3 would actually create them)
    return segments.map(
      (title) => `draft:${Date.now()}:${Math.random().toString(36).slice(2)}`
    )
  }

  // --- Phase 3: Write operations ---

  async createTask(taskListId: string, task: TaskItem): Promise<TaskItem> {
    const payload: Record<string, unknown> = {
      title: task.title,
      notes: task.body,
      status: task.status,
    }
    if (task.dueAt) payload.due = task.dueAt
    if (task.parentTaskId) payload.parent = task.parentTaskId

    const data = await this.tasksFetch(
      `/lists/${encodeURIComponent(taskListId)}/tasks`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ) as TasksTask

    const lists = await this.listTaskLists()
    const listName = lists.find((l) => l.id === taskListId)?.title
    return this.parseTask(data, taskListId, listName)
  }

  async completeTask(taskId: string, taskListId = DEFAULT_LIST): Promise<void> {
    await this.tasksFetch(
      `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', completed: new Date().toISOString() }),
      }
    )
  }

  async updateTask(
    taskId: string,
    updates: Partial<TaskItem>,
    taskListId = DEFAULT_LIST
  ): Promise<TaskItem> {
    const payload: Record<string, unknown> = {}
    if (updates.title) payload.title = updates.title
    if (updates.body !== undefined) payload.notes = updates.body
    if (updates.dueAt) payload.due = updates.dueAt
    if (updates.status) payload.status = updates.status

    const data = await this.tasksFetch(
      `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ) as TasksTask

    const lists = await this.listTaskLists()
    const listName = lists.find((l) => l.id === taskListId)?.title
    return this.parseTask(data, taskListId, listName)
  }

  async deleteTask(taskId: string, taskListId = DEFAULT_LIST): Promise<void> {
    await this.tasksFetch(
      `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'DELETE' }
    )
  }

  // --- Phase 3: Write helpers ---

  /**
   * Insert a new task (alias of createTask).
   */
  async insertTask(taskListId: string, title: string, notes?: string, dueDate?: string): Promise<TaskItem> {
    const payload: Record<string, unknown> = { title }
    if (notes) payload.notes = notes
    if (dueDate) payload.due = dueDate

    const data = await this.tasksFetch(
      `/lists/${encodeURIComponent(taskListId)}/tasks`,
      { method: 'POST', body: JSON.stringify(payload) }
    ) as TasksTask

    const lists = await this.listTaskLists()
    const listName = lists.find((l) => l.id === taskListId)?.title
    return this.parseTask(data, taskListId, listName)
  }

  /**
   * Patch specific fields on a task (alias of updateTask).
   */
  async patchTask(
    taskListId: string,
    taskId: string,
    updates: { title?: string; notes?: string; dueDate?: string; status?: string }
  ): Promise<TaskItem> {
    const payload: Record<string, unknown> = {}
    if (updates.title) payload.title = updates.title
    if (updates.notes !== undefined) payload.notes = updates.notes
    if (updates.dueDate) payload.due = updates.dueDate
    if (updates.status) payload.status = updates.status

    const data = await this.tasksFetch(
      `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    ) as TasksTask

    const lists = await this.listTaskLists()
    const listName = lists.find((l) => l.id === taskListId)?.title
    return this.parseTask(data, taskListId, listName)
  }

  /**
   * Move a task to a different task list by patching its listId reference.
   * Implementation: read task, delete from source, create in target.
   */
  async moveTaskToList(taskListId: string, taskId: string, newTaskListId: string): Promise<TaskItem> {
    const task = await this.getTask(taskId, taskListId)
    await this.deleteTask(taskId, taskListId)

    const payload: Record<string, unknown> = { title: task.title }
    if (task.body) payload.notes = task.body
    if (task.dueAt) payload.due = task.dueAt

    const data = await this.tasksFetch(
      `/lists/${encodeURIComponent(newTaskListId)}/tasks`,
      { method: 'POST', body: JSON.stringify(payload) }
    ) as TasksTask

    const lists = await this.listTaskLists()
    const listName = lists.find((l) => l.id === newTaskListId)?.title
    return this.parseTask(data, newTaskListId, listName)
  }
}
