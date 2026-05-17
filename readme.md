# Necter

<p align="center">
  <img src="https://github.com/Snapwave333/necter/raw/main/resources/necter-banner.png" alt="Necter" width="640" />
</p>

<p align="center">
  <strong>AI-first desktop agent that talks, thinks, and builds — in your language.</strong>
</p>

<p align="center">
  <a href="https://github.com/Snapwave333/necter/releases/latest"><img src="https://img.shields.io/github/v/release/Snapwave333/necter?include_prereleases&label=latest&color=07C160&style=flat-square" alt="Latest Release" /></a>
  <a href="https://github.com/Snapwave333/necter/stargazers"><img src="https://img.shields.io/github/stars/Snapwave333/necter?style=flat-square&color=ffcb2f" alt="Stars" /></a>
  <a href="https://github.com/Snapwave333/necter/forks"><img src="https://img.shields.io/github/forks/Snapwave333/necter?style=flat-square&color=2d2d2d" alt="Forks" /></a>
  <a href="https://github.com/Snapwave333/necter/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/i18n-16%20languages-blue?style=flat-square" alt="Languages" />
</p>

<p align="center">
  Forked from <a href="https://github.com/OpenCoworkAI/open-cowork"><strong>Open Cowork</strong></a> · Built on <a href="https://claude.com">Claude</a> · Runs locally, stays private.
</p>

---

## ✨ Key Features

| | |
|---|---|
| 🗣️ **Voice-first** | WebGL status orb · push-to-talk · Edge TTS auto-speak · 16 languages |
| 🧩 **Skills** | Built-in PPTX · DOCX · PDF · XLSX generation — prompt → document |
| 🖥️ **Computer use** | Control any desktop app directly — browser, file manager, terminal |
| 🤖 **Any model** | Claude · OpenAI · GLM · MiniMax · Kimi · Ollama · any OpenAI-compatible API |
| 🔒 **VM Sandbox** | WSL2 (Win) / Lima (macOS) — all agent commands isolated in Linux |
| 🔌 **MCP Connectors** | Chrome devtools · Notion · Feishu · and custom desktop integrations |
| 🧠 **Memory** | Persistent session memory · workspace experience · core preferences |
| 🌐 **i18n** | English · 中文 · Español · Français · Deutsch · 日本語 · 한국어 · and 9 more |

---

## 🗺️ Voice Orb

The header orb shows Necter's real-time state:

| State | Color | Meaning |
|---|---|---|
| 💤 Idle | Cyan | Waiting for input |
| 🤔 Thinking | Blue | Reasoning through a problem |
| 🔧 Tool | Green | Running a tool or command |
| 🔍 Searching | Yellow | Web search in progress |
| 🔊 Speaking | Magenta | TTS audio playing |
| ⚠️ Error | Orange | Something went wrong |
| 💾 Memory | White | Reading or writing memory |
| 💻 Coding | Purple | Writing or editing code |

Push-to-talk · TTS auto-speak · independent mic + TTS mute controls.

---

## 🚀 Quick Start

```
1. Open the app
2. Settings → paste your API key → set Base URL + model
3. Pick a workspace folder
4. Start chatting
```

**Recommended API setups:**

| Provider | Base URL | Model |
|---|---|---|
| OpenRouter | `https://openrouter.ai/api` | `claude-4-5-sonnet` |
| Anthropic | _(default)_ | `claude-4-5-sonnet` |
| Zhipu AI | `https://open.bigmodel.cn/api/anthropic` | `glm-4.7` |
| MiniMax | `https://api.minimaxi.com/anthropic` | `minimax-m2` |
| Kimi | `https://api.kimi.com/coding/` | `kimi-k2` |

---

## 📦 Installation

### macOS

```bash
brew tap Snapwave333/tap
brew install --cask --no-quarantine necter
```

### Windows

Download the latest `.exe` from [Releases →](https://github.com/Snapwave333/necter/releases/latest)

### Build from source

```bash
git clone https://github.com/Snapwave333/necter.git
cd necter
npm install
npm run dev
```

---

## 🛡️ Security

| Layer | Platform | How |
|---|---|---|
| Basic | All | Path guard — files restricted to workspace folder |
| Enhanced | Windows | WSL2 VM — all commands run in isolated Linux |
| Enhanced | macOS | Lima VM — all commands run in isolated Linux |

WSL2 and Lima are auto-detected. Falls back to native execution with path restrictions if unavailable.

---

## 🧰 Built-in Skills

| Skill | What it does |
|---|---|
| `pptx` | Generate PowerPoint presentations from a prompt |
| `docx` | Create or edit Word documents |
| `pdf` | Handle PDFs, fill forms, extract text |
| `xlsx` | Build Excel spreadsheets with formulas |
| `skill-creator` | Create your own custom skills |

---

## 👥 Who's it for?

- **Developers** — offload boilerplate, automate terminal tasks, control dev tools by voice
- **Researchers** — search papers, summarize to Notion, crunch datasets
- **Power users** — automate desktop workflows without scripts
- **Teams** — shared skills, scheduled prompts, remote control via Feishu

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

---

## 🙏 Thanks

Necter is based on **[Open Cowork](https://github.com/OpenCoworkAI/open-cowork)** by the OpenCowork team. If Necter is useful to you, please star ⭐ **[their repo](https://github.com/OpenCoworkAI/open-cowork)** too!

---

## 🔗 Links

<p align="center">
  <a href="https://github.com/Snapwave333/necter/stargazers"><img src="https://img.shields.io/github/stars/Snapwave333/necter?style=for-the-badge&color=ffcb2f" alt="Stars" /></a>
  <a href="https://github.com/Snapwave333/necter/network/members"><img src="https://img.shields.io/github/forks/Snapwave333/necter?style=for-the-badge&color=2d2d2d" alt="Forks" /></a>
  <a href="https://github.com/OpenCoworkAI/open-cowork"><img src="https://img.shields.io/badge/Original-Open%20Cowork-7C1600?style=for-the-badge" alt="Open Cowork" /></a>
</p>

---

## 📄 License

MIT — see [LICENSE](LICENSE)
