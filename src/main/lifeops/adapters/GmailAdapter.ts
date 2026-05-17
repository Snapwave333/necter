// Gmail REST API adapter — read-only (gmail.readonly scope) for Phase 1
// Uses native fetch with OAuth2 Bearer token

import { EmailItem } from '../models'

// Config keys stored in Necter config store
const CONF_KEYS = {
  ACCESS_TOKEN: 'lifeops.gmail.accessToken',
  REFRESH_TOKEN: 'lifeops.gmail.refreshToken',
  CLIENT_ID: 'lifeops.gmail.clientId',
  CLIENT_SECRET: 'lifeops.gmail.clientSecret',
  EXPIRY: 'lifeops.gmail.tokenExpiry',
} as const

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    labelIds?: string[]
  }
  internalDate: string
}

export class GmailAdapter {
  // --- OAuth2 token management ---

  private async getAccessToken(): Promise<string | null> {
    // TODO: load from Necter config store (config.ts)
    // For now return null — real implementation hooks into existing OAuth2 store
    return null
  }

  private async refreshAccessToken(): Promise<string | null> {
    // TODO: implement token refresh using stored refresh_token
    // POST TOKEN_URL with grant_type=refresh_token
    return null
  }

  private async gmailFetch(path: string, options: RequestInit = {}): Promise<unknown> {
    let token = await this.getAccessToken()
    if (!token) {
      // Not connected — return empty result
      throw new Error('Gmail not connected. Please authenticate in Settings > LifeOps.')
    }

    const url = path.startsWith('http') ? path : `${GMAIL_API}${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (res.status === 401) {
      // Token expired — try refresh
      token = await this.refreshAccessToken()
      if (!token) throw new Error('Gmail session expired. Please re-authenticate.')
      return this.gmailFetch(path, options)
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Gmail API error ${res.status}: ${err?.error?.message ?? res.statusText}`)
    }

    return res.json()
  }

  private parseMessage(raw: GmailMessage): EmailItem {
    const headers = raw.payload.headers
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

    return {
      id: raw.id,
      source: 'gmail',
      title: getHeader('Subject') || '(no subject)',
      from: getHeader('From'),
      to: getHeader('To').split(',').map((s) => s.trim()).filter(Boolean),
      subject: getHeader('Subject'),
      snippet: raw.snippet,
      body: undefined, // body fetched on demand
      isRead: !raw.payload.labelIds?.includes('UNREAD'),
      labels: raw.payload.labelIds ?? [],
      threadId: raw.threadId,
      createdAt: new Date(parseInt(raw.internalDate, 10)).toISOString(),
      updatedAt: new Date(parseInt(raw.internalDate, 10)).toISOString(),
      riskLevel: 0,
    }
  }

  // --- Public API (Phase 1: read-only) ---

  async listMessages(query = 'is:unread', maxResults = 20): Promise<EmailItem[]> {
    const data = await this.gmailFetch(
      `/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`
    ) as { messages?: Array<{ id: string; threadId: string }> }

    if (!data.messages?.length) return []

    // Fetch full message details for each
    const results = await Promise.allSettled(
      data.messages.map((m) => this.getMessage(m.id))
    )

    return results
      .filter((r): r is PromiseFulfilledResult<EmailItem> => r.status === 'fulfilled')
      .map((r) => r.value)
  }

  async getMessage(messageId: string): Promise<EmailItem> {
    const data = await this.gmailFetch(`/messages/${messageId}`) as GmailMessage
    return this.parseMessage(data)
  }

  async searchMessages(query: string, maxResults = 20): Promise<EmailItem[]> {
    return this.listMessages(query, maxResults)
  }

  async listLabels(): Promise<Array<{ id: string; name: string }>> {
    const data = await this.gmailFetch('/labels') as { labels?: Array<{ id: string; name: string }> }
    return data.labels ?? []
  }

  // --- Phase 2: Drafts ---

  async createDraft(to: string[], subject: string, body: string, threadId?: string): Promise<string> {
    const raw = JSON.stringify({
      message: {
        to: to.join(', '),
        subject,
        body,
        threadId,
      },
    })

    const data = await this.gmailFetch('/drafts', {
      method: 'POST',
      body: raw,
    }) as { id: string }

    return data.id
  }

  // --- Phase 2: Reply draft ---

  async replyDraft(messageId: string, body: string): Promise<string> {
    const original = await this.getMessage(messageId)
    return this.createDraft([original.from], `Re: ${original.subject}`, body, original.threadId)
  }

  /**
   * Send an email directly (no draft) via the Gmail send endpoint.
   * body is plain text; the caller is responsible for proper encoding.
   */
  async sendDraft(to: string, subject: string, body: string, threadId?: string): Promise<{ success: boolean }> {
    // Encode the raw email message as base64url
    const rawContent = `To: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`
    const base64url = Buffer.from(rawContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const payload = { raw: base64url }
    if (threadId) (payload as Record<string, unknown>).threadId = threadId

    await this.gmailFetch('/messages/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return { success: true }
  }

  // --- Phase 3: Write operations ---

  async sendMessage(draftId: string): Promise<void> {
    await this.gmailFetch(`/drafts/${draftId}/send`, { method: 'POST' })
  }

  async modifyMessage(
    messageId: string,
    opts: { addLabels?: string[]; removeLabels?: string[] }
  ): Promise<void> {
    await this.gmailFetch(`/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        addLabelIds: opts.addLabels ?? [],
        removeLabelIds: opts.removeLabels ?? [],
      }),
    })
  }

  async archiveLowRisk(messageId: string): Promise<void> {
    // Auto-archive: newsletters, promotions, social — not personal
    await this.modifyMessage(messageId, {
      addLabels: ['TRASH'],
      removeLabels: ['INBOX'],
    })
  }

  isLowRisk(item: EmailItem): boolean {
    const lowRiskLabels = ['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES']
    return item.labels.some((l) => lowRiskLabels.includes(l)) && !item.subject.match(/bill|payment|bank|transfer/i)
  }

  async archiveMessage(messageId: string): Promise<{ success: boolean }> {
    await this.modifyMessage(messageId, { addLabels: ['TRASH'], removeLabels: ['INBOX'] })
    return { success: true }
  }

  async modifyLabels(
    messageId: string,
    addLabels: string[],
    removeLabels: string[]
  ): Promise<{ success: boolean }> {
    await this.modifyMessage(messageId, { addLabels, removeLabels })
    return { success: true }
  }

  // --- Phase 3: Delete ---

  async trashMessage(messageId: string): Promise<void> {
    await this.gmailFetch(`/messages/${messageId}/trash`, { method: 'POST' })
  }
}
