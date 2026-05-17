# Necter

<p align="center">
  <img src="https://github.com/Snapwave333/necter/raw/main/resources/necter-banner.png" alt="Necter — AI Desktop Agent" width="680" />
</p>

<p align="center">
  <strong>AI-first desktop agent that talks, thinks, and builds — in 16 languages.</strong>
</p>

<p align="center">

[![GitHub release (latest)](https://img.shields.io/github/v/release/Snapwave333/necter?color=07C160&style=flat-square&label=latest)](https://github.com/Snapwave333/necter/releases/latest)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)
[![Stars](https://img.shields.io/github/stars/Snapwave333/necter?style=flat-square&color=ffcb2f)](https://github.com/Snapwave333/necter/stargazers)
[![Forks](https://img.shields.io/github/forks/Snapwave333/necter?style=flat-square&color=2d2d2d)](https://github.com/Snapwave333/necter/network/members)
[![Last Commit](https://img.shields.io/github/last-commit/Snapwave333/necter/main?style=flat-square&color=888888)](https://github.com/Snapwave333/necter/commits/main)
[![CI](https://img.shields.io/github/actions/workflow/status/Snapwave333/necter/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/Snapwave333/necter/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/Snapwave333/necter/release.yml?event=tag&label=Release&style=flat-square)](https://github.com/Snapwave333/necter/actions/workflows/release.yml)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-0277ct?style=flat-square)](#installation)
[![16 Languages](https://img.shields.io/badge/i18n-16%20languages-blue?style=flat-square)](#-i18n--16-languages)
[![Claude](https://img.shields.io/badge/Built%20with-Claude-red?style=flat-square&logo=anthropic)](https://anthropic.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

</p>

<p align="center">
  🔱 Forked from <a href="https://github.com/OpenCoworkAI/open-cowork"><strong>Open Cowork</strong></a> · Built on Claude · Runs locally · Stays private
</p>

---

## 📋 Table of Contents

- [✨ Key Features](#-key-features)
- [🗺️ Voice Orb](#️-voice-orb)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🛡️ Security](#️-security)
- [🧰 Built-in Skills](#-built-in-skills)
- [👥 Who's it for?](#-whos-it-for)
- [🤝 Contributing](#-contributing)
- [🙏 Thanks](#-thanks)
- [🔗 Links](#-links)

---

## ✨ Key Features

| | |
|---|---|
| 🗣️ **Voice-first** | WebGL status orb · push-to-talk · Edge TTS · auto-speak in 16 languages |
| 🧩 **Skills** | PPTX · DOCX · PDF · XLSX generation — prompt → finished document |
| 🖥️ **Computer use** | Control any desktop app directly by voice or text |
| 🤖 **Any model** | Claude · OpenAI · GLM · MiniMax · Kimi · Ollama · any OpenAI-compatible API |
| 🔒 **VM Sandbox** | WSL2 (Win) / Lima (macOS) — all agent commands isolated in Linux |
| 🔌 **MCP Connectors** | Chrome devtools · Notion · Feishu · and custom desktop integrations |
| 🧠 **Memory** | Persistent session memory · workspace experience · core preferences |
| 🌐 **i18n** | English · 中文 · Español · Français · Deutsch · 日本語 · 한국어 · Português · Русский · العربية · हिन्दी · Italiano · Nederlands · Polski · Türkçe · Tiếng Việt |
| ⏰ **Scheduled prompts** | Alarm-style automation — run any task on a cron schedule |
| 📡 **Remote control** | Use Necter from Feishu, Slack, Telegram, and other channels |

---

## 🗺️ Voice Orb

The header orb shows Necter's real-time state:

| | Color | Meaning |
|---|---|---|
| 💤 **Idle** | 🟡 Cyan | Waiting for input |
| 🤔 **Thinking** | 🔵 Blue | Reasoning through a problem |
| 🔧 **Tool** | 🟢 Green | Running a tool or command |
| 🔍 **Searching** | 🟡 Yellow | Web search in progress |
| 🔊 **Speaking** | 🟣 Magenta | TTS audio playing |
| ⚠️ **Error** | 🟠 Orange | Something went wrong |
| 💾 **Memory** | ⚪ White | Reading or writing memory |
| 💻 **Coding** | 🟣 Purple | Writing or editing code |

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
| 🛡️ Basic | All | Path guard — file access restricted to workspace folder |
| 🔒 Enhanced | Windows | WSL2 VM — all agent commands run in isolated Linux |
| 🔒 Enhanced | macOS | Lima VM — all agent commands run in isolated Linux |

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

| | |
|---|---|
| 🧑‍💻 **Developers** | Offload boilerplate, automate terminal tasks, control dev tools by voice |
| 🔬 **Researchers** | Search papers, summarize to Notion, crunch datasets |
| ⚡ **Power users** | Automate desktop workflows without writing scripts |
| 👥 **Teams** | Shared skills, scheduled prompts, remote control via Feishu |

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen?style=social&logo=github)](CONTRIBUTING.md)

---

## 🙏 Thanks

Necter is built on the shoulders of giants — specifically the **[Open Cowork](https://github.com/OpenCoworkAI/open-cowork)** project by the OpenCowork team. If Necter is useful to you, please star ⭐ **[their repo](https://github.com/OpenCoworkAI/open-cowork)** too!

---

## 🔗 Links

<p align="center">

[![Stars](https://img.shields.io/github/stars/Snapwave333/necter?style=for-the-badge&color=ffcb2f)](https://github.com/Snapwave333/necter/stargazers)
[![Forks](https://img.shields.io/github/forks/Snapwave333/necter?style=for-the-badge&color=2d2d2d)](https://github.com/Snapwave333/necter/network/members)
[![Open Cowork](https://img.shields.io/badge/Original-Open%20Cowork-7C1600?style=for-the-badge)](https://github.com/OpenCoworkAI/open-cowork)
[![Releases](https://img.shields.io/github/v/release/Snapwave333/necter?style=for-the-badge&color=07C160)](https://github.com/Snapwave333/necter/releases/latest)

</p>

---

## 📄 License

MIT — see [LICENSE](LICENSE)
