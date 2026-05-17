// DraftGenerator — uses the app's configured LLM to generate email/calendar drafts
// Phase 2 of LifeOps pipeline

import { configStore } from '../../config/config-store'
import { EmailItem, CalendarItem } from '../models'

// Simple UUID v4 without crypto dependency
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class DraftGenerator {
  /**
   * Call the configured LLM with a chat-style prompt and return the text response.
   */
  private async callLLM(messages: LLMMessage[]): Promise<string> {
    const apiKey = configStore.get('apiKey') as string | undefined
    const model = configStore.get('model') as string | undefined
    const provider = configStore.get('provider') as string | undefined
    const baseUrl = configStore.get('baseUrl') as string | undefined

    if (!apiKey) {
      throw new Error('LLM API key not configured. Please set it in Settings.')
    }

    const endpoint = baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions'

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`LLM error ${res.status}: ${err?.error?.message ?? res.statusText}`)
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('LLM returned an empty response.')
    }
    return content
  }

  /**
   * Generate a plain-text email reply draft based on the original email.
   * tone: 'formal' | 'casual' | 'brief' | undefined (defaults to professional)
   */
  async generateEmailReply(email: EmailItem, tone?: string): Promise<string> {
    const toneInstruction = tone
      ? tone === 'formal'
        ? 'Write in a formal, professional tone.'
        : tone === 'casual'
        ? 'Write in a casual, friendly tone.'
        : tone === 'brief'
        ? 'Keep the reply brief and to the point.'
        : ''
      : 'Write in a professional but friendly tone.'

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are an expert email assistant. Given an original email, write a concise, well-crafted plain-text reply email. Do NOT include a subject line (the subject is handled separately). Do NOT quote the original email. Start directly with your response. Keep it to 3-5 sentences unless the context requires more.',
      },
      {
        role: 'user',
        content: `From: ${email.from}
To: ${email.to.join(', ')}
Subject: ${email.subject}
---
${email.snippet}
---
${toneInstruction}`,
      },
    ]

    return this.callLLM(messages)
  }

  /**
   * Generate a description/summary for a calendar event draft.
   */
  async generateCalendarDescription(event: Partial<CalendarItem>): Promise<string> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are an expert calendar assistant. Given partial details about a calendar event, generate a concise, useful description. Include relevant context, goals, or agenda points if inferable. Keep it to 2-4 sentences. If the event seems to be a meeting, suggest an agenda. If it is a deadline, mention what needs to be done.',
      },
      {
        role: 'user',
        content: `Event title: ${event.title ?? '(no title)'}
Start: ${event.start ?? 'unknown'}
End: ${event.end ?? 'unknown'}
Location: ${event.location ?? 'not specified'}
Attendees: ${event.attendees?.join(', ') ?? 'not specified'}
Existing description: ${event.body ?? '(none)'}`,
      },
    ]

    return this.callLLM(messages)
  }
}
