# Necter

<p align="center">
  <img src="https://github.com/Snapwave333/necter/raw/main/resources/necter-banner.png" alt="Necter" width="640" />
</p>

<p align="center">
  <a href="https://github.com/Snapwave333/necter/releases/latest"><img src="https://img.shields.io/github/v/release/Snapwave333/necter?include_prereleases&label=latest&color=07C160&style=flat-square" alt="Latest Release" /></a>
  <a href="https://github.com/Snapwave333/necter/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" /></a>
  <a href="https://github.com/Snapwave333/necter/stargazers"><img src="https://img.shields.io/github/stars/Snapwave333/necter?style=flat-square&color=ffcb2f" alt="Stars" /></a>
  <a href="https://github.com/Snapwave333/necter/forks"><img src="https://img.shields.io/github/forks/Snapwave333/necter?style=flat-square&color=2d2d2d" alt="Forks" /></a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/Node.js-18+-brightgreen?style=flat-square" alt="Node.js" />
  <img src="https://img.shields.io/badge/i18n-16%20languages-blue?style=flat-square" alt="Languages" />
</p>

<p align="center">
  <strong>Necter</strong> is a fork of <a href="https://github.com/OpenCoworkAI/open-cowork"><strong>Open Cowork</strong></a> — a free, open-source AI agent desktop app for Windows and macOS.
</p>

---

## 🙏 Thanks & Acknowledgements

Necter is based on **[Open Cowork](https://github.com/OpenCoworkAI/open-cowork)** by the OpenCowork team. We're grateful for their foundational work building an open-source AI agent framework that powers desktop productivity.

If you find Necter useful, please also star ⭐ **[the original repo](https://github.com/OpenCoworkAI/open-cowork)**!

---

## 🔗 Links

<p align="center">
  <a href="https://github.com/Snapwave333/necter/stargazers"><img src="https://img.shields.io/github/stars/Snapwave333/necter?style=for-the-badge&color=ffcb2f" alt="Stars" /></a>
  <a href="https://github.com/Snapwave333/necter/network/members"><img src="https://img.shields.io/github/forks/Snapwave333/necter?style=for-the-badge&color=2d2d2d" alt="Forks" /></a>
  <a href="https://github.com/OpenCoworkAI/open-cowork"><img src="https://img.shields.io/badge/Original-Open%20Cowork-7C1600?style=for-the-badge" alt="Open Cowork" /></a>
</p>

---

## ✨ What This Fork Adds

| | |
|---|---|
| 🎙️ **Voice UI** | WebGL status orb · push-to-talk · Edge TTS auto-speak |
| 🧩 **Skills System** | Built-in workflows for PPTX · DOCX · PDF · XLSX generation |
| 🖥️ **GUI Automation** | Computer use — control desktop apps directly |
| 🤖 **Multi-Model** | Claude · OpenAI · GLM · MiniMax · Kimi · any OpenAI-compatible API |
| 🔒 **VM Sandbox** | WSL2 (Windows) / Lima (macOS) — all commands isolated in a Linux VM |
| 🔌 **MCP Connectors** | Browser · Notion · and custom desktop app integrations |
| 🌐 **i18n** | 16 languages · auto-detect browser locale |

---

## 🚀 Quick Start

```
1. Open the app
2. Settings → paste your API key → set Base URL + model
3. Pick a workspace folder
4. Start chatting
```

**API Configuration:**

| Provider | Base URL | Recommended Model |
|---|---|---|
| OpenRouter | `https://openrouter.ai/api` | `claude-4-5-sonnet` |
| Anthropic | _(default)_ | `claude-4-5-sonnet` |
| Zhipu AI | `https://open.bigmodel.cn/api/anthropic` | `glm-4.7` |
| MiniMax | `https://api.minimaxi.com/anthropic` | `minimax-m2` |
| Kimi | `https://api.kimi.com/coding/` | `kimi-k2` |

---

## 🗺️ Voice Orb

The header orb reflects what Necter is doing in real-time:

| | | |
|---|---|---|
| 💤 **Idle** | Cyan | Waiting for input |
| 🤔 **Thinking** | Blue | Reasoning through a problem |
| 🔧 **Tool** | Green | Running a tool or command |
| 🔍 **Searching** | Yellow | Web search in progress |
| 🔊 **Speaking** | Magenta | TTS audio playing |
| ⚠️ **Error** | Orange | Something went wrong |
| 💾 **Memory** | White | Reading or writing memory |
| 💻 **Coding** | Purple | Writing or editing code |

Push-to-talk · TTS auto-speak · independent mic + TTS mute controls.

---

## 📦 Installation

### macOS — Homebrew

```bash
brew tap Snapwave333/tap
brew install --cask --no-quarantine necter
```

### Windows

Download the latest `.exe` from [Releases →](https://github.com/Snapwave333/necter/releases/latest)

### Build from Source

```bash
git clone https://github.com/Snapwave333/necter.git
cd necter
npm install
npm run dev
```

---

## 🛡️ Sandbox Security

| Level | Platform | Method |
|---|---|---|
| Basic | All | Path guard — files restricted to workspace folder |
| Enhanced | Windows | WSL2 VM — all commands in isolated Linux |
| Enhanced | macOS | Lima VM — all commands in isolated Linux |

WSL2 and Lima are auto-detected. Falls back to native execution with path restrictions if unavailable.

---

## 🧰 Built-in Skills

| Skill | What it does |
|---|---|
| `pptx` | Generate PowerPoint presentations |
| `docx` | Create or edit Word documents |
| `pdf` | Handle PDFs, fill forms |
| `xlsx` | Build Excel spreadsheets |
| `skill-creator` | Create your own custom skills |

---

## ❓ FAQ

**Is this free?**
Yes — MIT license. You only pay for your AI model's API usage.

**Does it work on Linux?**
Not with a pre-built installer yet. Build from source is supported.

**Is my data safe?**
Your files stay in your chosen workspace folder. The only external traffic is to your configured AI provider's API.

**How does VM isolation work?**
On Windows, WSL2 is used. On macOS, Lima is used. Both run all agent commands inside an isolated Linux VM, keeping your host system protected.

---

## 📄 License

MIT — see [LICENSE](LICENSE)
