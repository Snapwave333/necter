# 🗺️ Necter Roadmap

> This document outlines the development direction for Necter. For feature requests and discussion, see [GitHub Issues](https://github.com/NecterAI/necter/issues).

## ✅ Completed

- **Core**: Stable Windows & macOS installers with build verification
- **Security**: Full filesystem sandboxing + path traversal / zip-slip hardening
- **VM Sandbox**: WSL2 (Windows) and Lima (macOS) VM-level isolation
- **Skills**: PPTX, DOCX, PDF, XLSX support + custom skill management + hot-reload
- **MCP Connectors**: Custom connector support (stdio / SSE / Streamable HTTP)
- **Rich Input**: File upload and image input in chat
- **Multi-Model**: Claude, GPT, Gemini, DeepSeek, Qwen, GLM, Kimi, Grok, MiniMax, Ollama
- **UI/UX Premium Pass**: 7-component cinematic overhaul — glass depth hierarchy, glowing orb status indicator, per-session accent sidebar, temporal ThinkingBlock, sacred input bar with cyan glow, border-elimination design language.
- **Voice + Orb Pipeline**: edge-tTS CLI (no API key), useEdgeTTS hook, WebGL orb (8-state), useOrb state machine, VoiceButton push-to-talk + auto-speak, mute controls, voice.speak IPC handler.
- **Remote Control**: Feishu (Lark) bot integration with pairing mode + approval panel
- **CI/CD**: Automated builds, smoke tests, Codex-powered PR review bot
- **Model Presets**: Up-to-date model catalogs for all major providers
- **Dependency Policy**: Tiered management strategy with Dependabot grouping
- **Memory System Foundation**: Unified storage with core/experience memory and source-aware retrieval workflow (PR #138)
- **v3.3.0 Stable Release**: Graduate from beta — all blocking issues resolved

## 🚧 In Progress

### Phase 1 — LifeOps Adapter Core (v3.4.0)
**Gmail + Calendar + Tasks (read-only) + Obsidian (append-only) + Permission Gate + Audit Log**

- `LifeOpsAdapter` base interface
- `GmailAdapter` — Gmail REST API (read-only, gmail.readonly scope)
- `CalendarAdapter` — Google Calendar REST API (read-only)
- `TasksAdapter` — Google Tasks REST API (read-only)
- `ObsidianAdapter` — direct vault file access (append-only)
- `LifeOpsPermissionGate` — Level 0/1/2/3/4 enforcement
- `AuditLog` — every action recorded with timestamp + user + tool + result
- IPC handlers for all lifeops channels
- Gmail/Tasks/Calendar/Obsidian settings panel (connect + disconnect)
- Morning briefing agent prompt template
- [Details](docs/superpowers/plans/2026-05-16-lifeops-phase-1.md)

### Phase 1 — Finance Adapter Core (v3.4.0)
**Finance Adapter Interface + Actual Budget + Permission Gate**

- `FinanceAdapter` TypeScript interface
- `ActualBudgetAdapter` — first backend implementation
- `PermissionGate` — enforces Level 0/1/2/3 AI safety model
- `SafeSpendCalculator` — safe-to-spend logic
- Basic Finance UI panel — account list, balance, transaction feed
- IPC handlers + preload bridge
- [Details](docs/superpowers/plans/2026-05-16-finance-phase-1.md)

### Also In Progress
- **Kokoro TTS end-to-end**: Main process IPC handler + Kokoro CLI path needs completion (edge-tTS functional as primary).
- **OrbCanvas cross-instance reactivity**: FIXED — shared `ttsStatus` via Zustand store.

## 📋 Planned

### Phase 2 — LifeOps Drafts + Approval Queue (v3.5.0)
**Email Drafts + Task Drafts + Event Drafts + Approval UI**

- Gmail draft creation + send-with-approval flow
- Calendar event draft creation + approval
- Task creation with approval
- Approval queue UI panel
- Cross-linking: email → task → calendar → note
- `gmail.modify` and `gmail.send` scope activation
- Full Calendar write scope
- Full Tasks write scope

### Phase 3 — Safe Writes + Autonomous LifeOps (v3.6.0)
**Level 3 Auto-Writes + Morning Briefing Agent**

- Level 3 autonomous safe writes (append daily note, label, archive)
- Obsidian Local REST API / MCP integration
- Morning briefing agent — auto-summarize Gmail + Calendar + Tasks + Obsidian daily note
- Weekly review automation
- Recurring routine detection

### Phase 5 — Smart Spend Engine (v3.8.0)
**Categorization + Anomaly Detection + Ollama**

- Ollama/Qwen categorizer — suggests category for new transactions
- Bill detection — flags recurring payments
- Anomaly detection — flags unusual spending patterns
- Budget progress UI — envelope/budget status per category
- Upcoming bills widget
- Monthly spending summary

### Phase 6 — Write Operations + Firefly III (v3.9.0)
**Draft/Approve Flow + Second Backend**

- Level 2 approved-write flow — AI drafts, user confirms
- Transaction creation (manual entry with AI assist)
- Budget reallocation (AI suggests, user approves)
- `FireflyIIIAdapter` — second backend for power users
- Adapter selector UI — pick which backend per workspace
- AGPL compliance notes for Firefly III integration

### Phase 7 — Investment Layer (v3.10.0)
**OpenBB + Portfolio Intelligence**

- `OpenBBAdapter` — stocks, crypto, ETFs, macro data
- Portfolio dashboard
- Market research copilot
- Investment Health Score
- News + sentiment integration

### Phase 8 — Automation + Collaboration (v3.11.0+)
**Scheduled Flows + Multi-User**

- Scheduled budgeting automations (cron-based)
- CSV + SimpleFIN import pipeline
- Plaid import (future, if user provides credentials)
- Multi-workspace finance views
- Finance skills for Necter agent

### Near-term Infrastructure (all phases)

- **Sandbox Hardening**: VM reliability, startup performance, Lima/WSL2 consistency
- **App Slimming**: Reduce installer from ~267 MB to ~80 MB — on-demand deps, lazy-load SDKs, strip unused files
- **Code Cleanup**: Split god files (index.ts 2672 lines, gui-operate-server.ts 6884 lines), lazy imports, dead code removal
- **Naming Standardization**: Clean up 75+ legacy references to consistent Necter naming conventions
- **Tool Completeness**: Native TodoWrite, AskUserQuestion, Glob, Grep, WebFetch, WebSearch tool schemas + handlers
- **Memory System Enhancements**: Prompt injection controls, cross-session retrieval UX
- **Scheduled Tasks**: Cron-like task scheduling with UI management
- **Log Management**: Structured logging with rotation + user-accessible viewer
- **Installation Experience**: Smoother first-run — auto-detect deps, clearer error messages, one-click setup
- **Linux Support**: First-class Linux builds (currently build-from-source only)
- **Plugin System**: Extensible architecture for community-built integrations
- **Multi-Agent**: Orchestrate multiple agents for complex workflows
- **Workspace Templates**: Pre-configured environments for common use cases

### Long-term

- **Computer Use (CUA)**: GUI automation via screen capture and mouse/keyboard control
- **Collaborative Mode**: Multiple users sharing a workspace
- **Mobile Companion**: Lightweight mobile app for monitoring and quick interactions

---

_Last updated: 2026-05-16_
_Want to contribute? Check our [Contributing Guide](CONTRIBUTING.md) and pick an issue labeled `good first issue`._
