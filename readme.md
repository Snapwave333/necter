# Necter

<p align="center">
  <img src="resources/logo.png" alt="Necter" width="480" />
</p>

**Necter** is a fork of [Open Cowork](https://github.com/pynjtai/OpenCowork) — a free, open-source AI agent desktop app for Windows and macOS. It wraps Claude Code, OpenAI, Gemini, DeepSeek, and other AI models into a GUI with one-click installation.

This fork adds: real-time Voice UI with a WebGL status orb, a built-in Skills system for generating PPTX/DOCX/PDF/XLSX files, GUI automation via computer use, multi-model support beyond just Claude, and VM-level sandbox isolation (WSL2 on Windows, Lima on macOS).

---

## What's New in This Fork

| Feature | Details |
|---|---|
| **Voice UI** | WebGL status orb + push-to-talk + Edge TTS auto-speak |
| **Skills System** | Built-in workflows for PPTX, DOCX, PDF, XLSX generation |
| **GUI Automation** | Computer use — control desktop apps directly |
| **Multi-Model** | Claude, OpenAI, GLM, MiniMax, Kimi, any OpenAI-compatible API |
| **VM Sandbox** | WSL2 (Win) / Lima (macOS) — all commands isolated in a Linux VM |
| **MCP Connectors** | Browser, Notion, and custom desktop app integrations |
| **i18n** | English and Chinese (中文) |

---

## Installation

### macOS — Homebrew (recommended)

```bash
brew tap Snapwave333/tap
brew install --cask --no-quarantine necter
```

### Windows — Download

Get the latest `.exe` installer from [Releases](https://github.com/Snapwave333/necter/releases).

### Build from Source

```bash
git clone https://github.com/Snapwave333/necter.git
cd necter
npm install
npm run dev
```

---

## Quick Start

1. Open the app
2. Go to **Settings** → paste your API key → set the Base URL and model
3. Pick a workspace folder
4. Start chatting

---

## Voice UI

Necter has a real-time WebGL orb in the header that reflects what the AI is doing:

| State | Color | Meaning |
|---|---|---|
| Idle | Cyan | Waiting |
| Thinking | Blue | Reasoning |
| Tool | Green | Running a tool |
| Searching | Yellow | Web search |
| Speaking | Magenta | TTS playing |
| Error | Orange | Something failed |
| Memory | White | Accessing memory |
| Coding | Purple | Writing code |

Push-to-talk (hold mic button), TTS auto-speak on responses, and independent mute controls are in the header.

---

## Skills

Built-in skills ready to use out of the box:

- **pptx** — Generate PowerPoint presentations
- **docx** — Create or edit Word documents
- **pdf** — Handle PDFs and fill forms
- **xlsx** — Build Excel spreadsheets
- **skill-creator** — Create your own skills

---

## Sandbox Security

| Level | Platform | How |
|---|---|---|
| Basic | All | Path guard — files restricted to workspace |
| Enhanced | Windows | WSL2 VM — all commands run in isolated Linux |
| Enhanced | macOS | Lima VM — all commands run in isolated Linux |

---

## FAQ

**Is this free?**
Yes. MIT licensed. You only pay for your AI model's API usage.

**Does it work on Linux?**
Not with a pre-built installer yet. Build from source works.

**Is my data safe?**
Your files stay in your chosen workspace folder. The only external traffic is to your AI provider's API.

---

## License

MIT — see [LICENSE](LICENSE)
