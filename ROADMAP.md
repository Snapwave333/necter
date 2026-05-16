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

- **Kokoro TTS end-to-end**: Main process IPC handler + Kokoro CLI path needs completion (SettingsVoice UI scaffolding already in place, edge-tTS pipeline functional as primary).
- **OrbCanvas cross-instance reactivity**: FIXED — shared `ttsStatus` via Zustand store; VoiceButton and ChatView both read/write to `useAppStore` so orb reacts to TTS events from either component.

## 📋 Planned

### Near-term (v3.4.0)

- **Sandbox Hardening**: Deep research and improvement of VM sandbox reliability, startup performance, and cross-platform consistency (Lima on macOS, WSL2 on Windows)
- **App Slimming**: Reduce installer from ~156 MB to ~80 MB — on-demand Python/Node.js download, lazy-load Feishu SDK, strip unused files ([details](docs/SLIM-PLAN.md))
- **Code Cleanup**: Split god files (index.ts 2672 lines, gui-operate-server.ts 6884 lines), lazy imports, dead code removal
- **Naming Standardization**: Clean up 75+ legacy references (claude-sdk, claude-sandbox, claude-plugin, pi-coding-agent) to consistent Necter naming conventions
- **Tool Completeness**: Implement native TodoWrite, AskUserQuestion, Glob, Grep, WebFetch, WebSearch tool schemas + handlers for API key users
- **Memory System Enhancements**: Improve prompt injection controls, cross-session retrieval UX, memory source inspection, and source-aware reranking quality
- **Scheduled Tasks**: Cron-like task scheduling with UI management and persistent execution
- **Log Management**: Structured logging with rotation, size limits, and user-accessible log viewer improvements
- **Installation Experience**: Smoother first-run — auto-detect system dependencies, clearer error messages, one-click setup
- **Linux Support**: First-class Linux builds (currently build-from-source only)

### Mid-term (v3.5.0+)

- **Plugin System**: Extensible architecture for community-built integrations
- **Multi-Agent**: Orchestrate multiple agents for complex workflows
- **Workspace Templates**: Pre-configured environments for common use cases (coding, writing, research)

### Long-term

- **Computer Use (CUA)**: GUI automation via screen capture and mouse/keyboard control
- **Collaborative Mode**: Multiple users sharing a workspace
- **Mobile Companion**: Lightweight mobile app for monitoring and quick interactions

---

_Last updated: 2026-05-16_
_Want to contribute? Check our [Contributing Guide](CONTRIBUTING.md) and pick an issue labeled `good first issue`._
