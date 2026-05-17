// Obsidian vault adapter — append-only (Phase 1) via direct file system access
// Phase 2: Obsidian Local REST API / MCP server integration

import * as fs from 'fs'
import * as path from 'path'
import { NoteItem } from '../models'

export class ObsidianAdapter {
  private vaultPath: string

  constructor(vaultPath?: string) {
    // TODO: load from Necter config store
    this.vaultPath = vaultPath ?? ''
  }

  setVaultPath(vaultPath: string): void {
    this.vaultPath = vaultPath
  }

  private validateVault(): void {
    if (!this.vaultPath) {
      throw new Error('Obsidian vault path not set. Please configure in Settings > LifeOps.')
    }
    if (!fs.existsSync(this.vaultPath)) {
      throw new Error(`Obsidian vault not found at: ${this.vaultPath}`)
    }
    if (!fs.existsSync(path.join(this.vaultPath, '.obsidian'))) {
      throw new Error('Vault path does not appear to be an Obsidian vault (no .obsidian folder).')
    }
  }

  // --- Phase 1: Read-only ---

  /**
   * Search notes by filename and first 200 chars of content.
   * Does NOT use Obsidian search — simple grep over .md files.
   */
  async searchNotes(query: string): Promise<NoteItem[]> {
    this.validateVault()
    const results: NoteItem[] = []
    const queryLower = query.toLowerCase()

    const searchDir = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name !== '.obsidian' && entry.name !== '.trash') {
            searchDir(full)
          }
        } else if (entry.name.endsWith('.md')) {
          try {
            const content = fs.readFileSync(full, 'utf8')
            const first200 = content.slice(0, 200).toLowerCase()
            const fileNameLower = entry.name.toLowerCase()
            if (fileNameLower.includes(queryLower) || first200.includes(queryLower)) {
              results.push({
                id: full,
                source: 'obsidian',
                title: entry.name.replace(/\.md$/, ''),
                preview: content.slice(0, 200),
                vaultPath: full,
                riskLevel: 0,
              })
            }
          } catch {
            // Skip files we can't read
          }
        }
      }
    }

    searchDir(this.vaultPath)
    return results.slice(0, 50) // cap at 50 results
  }

  /**
   * Read a note by its vault path.
   */
  async readNote(vaultPath: string): Promise<NoteItem> {
    this.validateVault()
    if (!vaultPath.startsWith(this.vaultPath)) {
      throw new Error('Path is outside the configured vault.')
    }
    if (!fs.existsSync(vaultPath)) {
      throw new Error(`Note not found: ${vaultPath}`)
    }

    const content = fs.readFileSync(vaultPath, 'utf8')
    const stats = fs.statSync(vaultPath)

    // Extract frontmatter tags
    const tagMatch = content.match(/^tags:\s*\[(.*?)\]/m)
    const tags = tagMatch
      ? tagMatch[1].split(',').map((t) => t.trim()).filter(Boolean)
      : []

    return {
      id: vaultPath,
      source: 'obsidian',
      title: path.basename(vaultPath, '.md'),
      body: content,
      preview: content.slice(0, 200),
      vaultPath,
      tags,
      riskLevel: 0,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
    }
  }

  /**
   * Read a daily note for a given date string (YYYY-MM-DD).
   */
  async readDailyNote(date: string): Promise<NoteItem> {
    // Obsidian daily notes are stored in a "Daily notes" folder
    // Convention: {vault}/YYYY-MM-DD.md or {vault}/Daily Notes/YYYY-MM-DD.md
    const candidates = [
      path.join(this.vaultPath, `${date}.md`),
      path.join(this.vaultPath, 'Daily Notes', `${date}.md`),
      path.join(this.vaultPath, 'daily', `${date}.md`),
    ]

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return this.readNote(candidate)
      }
    }

    // Return empty note if not found — don't throw
    return {
      id: candidates[0],
      source: 'obsidian',
      title: date,
      body: '',
      preview: '',
      vaultPath: candidates[0],
      riskLevel: 0,
    }
  }

  // --- Phase 3: Auto-safe append (never overwrites) ---

  /**
   * Append content to a daily note. Creates the note if it doesn't exist.
   * Always appends — never modifies existing content.
   */
  async appendToDailyNote(date: string, content: string): Promise<void> {
    const candidates = [
      path.join(this.vaultPath, `${date}.md`),
      path.join(this.vaultPath, 'Daily Notes', `${date}.md`),
      path.join(this.vaultPath, 'daily', `${date}.md`),
    ]

    let targetPath: string | null = null
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        targetPath = candidate
        break
      }
    }

    if (!targetPath) {
      // Create the daily note if it doesn't exist
      // Try the first convention first
      targetPath = candidates[0]
      const dir = path.dirname(targetPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      // Write with date as title
      fs.writeFileSync(targetPath, `# ${date}\n\n`, 'utf8')
    }

    await this.appendToNote(targetPath, content)
  }

  /**
   * Append content to any note. Never overwrites — only adds new sections.
   */
  async appendToNote(vaultPath: string, content: string): Promise<void> {
    this.validateVault()
    if (!vaultPath.startsWith(this.vaultPath)) {
      throw new Error('Path is outside the configured vault.')
    }

    const separator = '\n\n---\n'
    const entry = `${separator}${content.trim()}\n`
    fs.appendFileSync(vaultPath, entry, 'utf8')
  }

  // --- Phase 2: Create notes ---

  /**
   * Create a new note. Fails if the file already exists.
   */
  async createNote(vaultPath: string, content: string): Promise<NoteItem> {
    this.validateVault()
    if (!vaultPath.startsWith(this.vaultPath)) {
      throw new Error('Path is outside the configured vault.')
    }

    if (fs.existsSync(vaultPath)) {
      throw new Error(`Note already exists: ${vaultPath}`)
    }

    const dir = path.dirname(vaultPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(vaultPath, content, 'utf8')
    return this.readNote(vaultPath)
  }

  /**
   * Create a note from a template by substituting {{var}} placeholders.
   */
  async createNoteFromTemplate(
    templatePath: string,
    vars: Record<string, string>
  ): Promise<NoteItem> {
    this.validateVault()
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`)
    }

    let content = fs.readFileSync(templatePath, 'utf8')
    for (const [key, value] of Object.entries(vars)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }

    const targetPath = templatePath.replace(/\.md$/, `-${Date.now()}.md`)
    return this.createNote(targetPath, content)
  }
}
