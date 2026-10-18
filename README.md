<div align="center">

# 🧠 MindSpace

### The Self-Hosted, AI-Augmented Intelligent Knowledge Workspace

[![Social Winter of Code Season 7](https://img.shields.io/badge/SWoC-Season%207%20Participant-FF3D00?style=for-the-badge&logo=git&logoColor=white)](https://www.socialwinterofcode.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14%2F16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%20%2B%20pgvector-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)

<p align="center">
  <b>Infinite Canvas</b> • <b>Rich-Text Notes</b> • <b>Stylus Ink</b> • <b>Knowledge Graphs</b> • <b>Telegram & Discord Bots</b> • <b>Opt-In AI</b>
</p>

[Explore Features](#-features) • [SWoC 7 Guide](#-social-winter-of-code-season-7-swoc-7) • [Quickstart](#-quickstart--local-setup) • [Future Plans](#-future-plans--roadmap) • [Contributing](#-contributing)

---

</div>

## 🌟 What is MindSpace?

**MindSpace** is a modern, self-hosted personal knowledge operating system designed for thinkers, builders, researchers, and developers. It fuses an **infinite visual mind-mapping canvas**, an **editorial rich-text note editor with stylus ink support**, **task and deadline management**, and **companion messaging bots** into a unified, high-contrast command cockpit.

Built with **Next.js App Router**, **TypeScript**, **PostgreSQL with pgvector**, **Prisma**, **Socket.io**, and **Docker**, MindSpace prioritizes privacy, lightning-fast local performance, and zero-compromise design aesthetics.

---

## ❄️ Social Winter of Code Season 7 (SWoC 7)

MindSpace is proud to be an official participating project in **Social Winter of Code Season 7 (SWoC 7)**! 🎉

Whether you are contributing to open source for the very first time or are an experienced software craftsman, we have structured, mentored tasks across frontend, backend, AI, real-time networking, and devops.

### Quick Links for SWoC Participants
- 📖 [SWoC 7 Contributor Handbook](CONTRIBUTING.md) — Detailed rules, workflow, and point guide.
- 🗺️ [Open Source Roadmap & Issue Catalog](ROADMAP.md) — Feature backlogs categorized by difficulty.
- 🤖 [AI & Agent Directives](AGENTS.md) — Non-negotiable zero-error policy and testing protocol.
- 📋 [Propose a SWoC Task](.github/ISSUE_TEMPLATE/swoc_proposal.yml) — Claim or propose an issue.

### SWoC Point Scoring Tiers
| Tier | Points | Description |
|---|:---:|---|
| `documentation` | **10 pts** | Docs, guides, architectural walkthroughs, API specs |
| `level1` | **25 pts** | Good first issues, UI visual fixes, strict typing, minor bugs |
| `level2` | **45 pts** | New interactive widgets, API CRUD routes, unit test suites, TipTap extensions |
| `level3` | **70+ pts** | Real-time WebSocket sync, AI/RAG pipelines, bot gateways, perf optimization |

---

## ✨ Features

### 🎨 1. Infinite Canvas & Visual Mind-Mapping
- **Multi-Canvas Architecture:** Organize thoughts into dedicated, project-specific visual canvases (`/canvas/[id]`).
- **ELK.js Auto-Layout:** One-click algorithmic tree, organic, and hierarchical graph layouts.
- **Custom Node Ecosystem:** Concept nodes, reminder nodes with live timers, text cards, and media embeds.
- **Stylus & Freehand Vector Ink:** Natural pointer-event drawing powered by `perfect-freehand` with pressure sensitivity.
- **Multiplayer Ghost Cursors:** Real-time multi-user canvas presence with color-coded live cursors via Socket.io.

### 📝 2. Editorial Rich-Text & Knowledge Notes
- **TipTap Core Engine:** Structured rich-text editing with tables, checklists, code blocks, and media.
- **Syntax Highlighting:** Multi-language syntax highlighting powered by `lowlight`.
- **Clean Editorial Design:** Sharp, high-contrast Bold Typography theme with zero clutter.

### 🧠 3. Opt-In AI Copilot & Semantic RAG
- **Privacy-First & Opt-In:** AI is disabled by default; enabled only per user preference (`user.aiEnabled`).
- **Text-to-MindMap:** Generate structured visual graphs from unstructured text prompts via Google Gemini.
- **Semantic Vector Search:** Deep contextual knowledge retrieval powered by `pgvector` embeddings.
- **Node Expansion Copilot:** 1-click contextual thought branching and idea generation.

### ⚡ 4. Hub Command Cockpit
- **Personalized Control Center (`/`):** Real-time telemetry overview of canvases, notes, tasks, and overdue reminders.
- **Urgency Timeline Widget:** Merged, cross-table timeline sorting items by deadline urgency (Overdue, Due Today, Upcoming).
- **Quick Thought Capture Inbox:** Distraction-free scratchpad for brain dumps, URL clipping, and rapid note storage.
- **Recent Canvases & Pinned Rail:** Instant access to active canvases and pinned critical assets.

### ⏱️ 5. Tasks, Calendar & Productivity
- **Micro & Macro Task Hierarchy:** Break down complex projects into actionable milestones.
- **Floating Pomodoro Engine:** Persistent, distraction-free pomodoro focus timer with auditory ticks.
- **Overdue Task Pressure:** Visual pulse and telemetry alerts when critical deadlines are approaching.
- **Native Calendar View:** Monthly, weekly, and daily views for scheduled notes and tasks.

### 🤖 6. Discord & Telegram Bot Ecosystem
- **24/7 Persistent Gateway Integration:** Companion bots run continuously inside the Node.js server.
- **Discord Slash Commands:** `/pair`, `/task`, `/capture`, and interactive modal forms with embeds.
- **Telegram Bot (Grammy):** Conversational state machine for quick task completion, snooze, and capture.
- **Secure 15-Minute Pairing:** Ephemeral pairing codes securely link chat accounts to MindSpace users.

### 🛡️ 7. Enterprise Admin Governance Suite
- **Role-Gated Dashboard (`/admin`):** System metrics, active user tracking, and system health status.
- **System Settings Manager:** GUI editor for SMTP, Discord tokens, Telegram keys, and Gemini models.
- **Queue Monitor & Dispatch Logs:** Live BullMQ job queue telemetry and notification delivery history.
- **Dual-Path Storage Engine:** Full PostgreSQL + MinIO stack with zero-docker local JSON fallback (`.data/`).

---

## 🏗️ Architecture & Tech Stack

```
                              ┌───────────────────────────────────┐
                              │     Next.js 14/16 App Router      │
                              │ (Hub, Canvas, Notes, Admin, APIs) │
                              └─────────────────┬─────────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 │                              │                              │
        ┌────────▼────────┐            ┌────────▼────────┐            ┌────────▼────────┐
        │    Socket.io    │            │     BullMQ      │            │   Prisma ORM    │
        │ Real-Time Cursors│           │ Background Jobs │            │ PostgreSQL 15   │
        │ Live Chat Sync  │            │ Daily Digest    │            │ + pgvector      │
        └────────┬────────┘            └────────┬────────┘            └────────┬────────┘
                 │                              │                              │
                 └──────────────────────┬───────┴──────────────────────────────┘
                                        │
                              ┌─────────▼─────────┐
                              │   Redis / Valkey  │
                              │ Pub/Sub & Caching │
                              └───────────────────┘
```

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 / 16 (App Router, Server Actions, API Route Handlers) |
| **Language** | TypeScript (Strict mode, zero `any` policy) |
| **Styling** | Tailwind CSS (Bold Typography design system, sharp 0px edges) |
| **Canvas** | `@xyflow/react` (React Flow) + ELK.js layout engine |
| **Editor** | TipTap (`@tiptap/react`, `reactjs-tiptap-editor`, `lowlight`) |
| **Database** | PostgreSQL 15 + `pgvector` via Prisma ORM |
| **Storage** | MinIO (S3-compatible) with local JSON storage engine fallback |
| **Real-Time** | Socket.io (rooms: `user:[id]`, `canvas:[id]`, `group:[id]`) |
| **Queue** | BullMQ backed by Valkey 7 / Redis |
| **Bots** | `discord.js v14` (Gateway) + `grammy` (Telegram) |
| **AI** | Google Gemini 1.5 Pro / Flash via Vercel AI SDK (Opt-in) |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18.18+ or v20.x (LTS recommended)
- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/) (Optional: only needed for full DB stack)

### 1. Clone the Repository
```bash
git clone https://github.com/Yashraj-Jangra/MindSpace-intelligent-knowledge-workspace.git
cd MindSpace-intelligent-knowledge-workspace
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env.local
```
*(On Windows: `copy .env.example .env.local`)*

### 4. Choose Your Running Mode

#### Mode A: Zero-Docker Local Mode (Fastest — 30 seconds!)
MindSpace has a built-in local fallback engine (`.data/`) so you can develop UI, editor, canvas, and docs immediately without running containers:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Mode B: Full Docker Stack (PostgreSQL, MinIO, Redis)
```bash
# 1. Start Docker containers
docker compose up -d

# 2. Push schema to PostgreSQL
npm run db:push

# 3. Start development server with persistent custom socket/bot server
npm run dev
```

---

## 🤖 AI & Agent Contributor Rules (Strict Zero-Error Policy)

Many contributors and maintainers use modern AI coding tools (Claude Code, Cursor, Copilot, ChatGPT, Pi). MindSpace welcomes AI assistance, but enforces an **organisation-grade zero-error policy**:

1. **Zero Hallucination:** Only import packages existing in `package.json`. Never guess API signatures.
2. **Zero TypeScript Errors:** `npx tsc --noEmit` MUST exit with code `0`. Never use `any` or `// @ts-ignore`.
3. **Mandatory Test Verification:** Run `npm test` before submitting PRs. Include unit tests for new logic.
4. **Design System Adherence:** Sharp `0px` edges (`rounded-none`). No drop shadows (`box-shadow: none`). Accent is `#FF3D00`.
5. **Human Understanding:** Contributors must thoroughly understand and verify any code generated with AI.

👉 Read the complete [AI Agent Directives](AGENTS.md) and [`.agents/AGENTS.md`](.agents/AGENTS.md).

---

## 🔮 Future Plans & Roadmap

Our active development roadmap for SWoC 7 and beyond includes:

- [ ] **Track 1 (Canvas):** High-res SVG/PDF export, interactive minimap HUD, sticky notes, orthogonal edges.
- [ ] **Track 2 (Knowledge Graph):** Bi-directional `[[WikiLinks]]`, 3D force-directed graph view, local WebGPU embeddings.
- [ ] **Track 3 (Editor):** LaTeX math equation editor (KaTeX), Markdown `.md` import/export, audio voice memos.
- [ ] **Track 4 (Productivity):** Kanban board view (`/tasks/kanban`), Google Calendar two-way sync, recurring tasks.
- [ ] **Track 5 (Ecosystem):** Browser Web Clipper extension, Slack companion bot, mobile PWA with offline caching.
- [ ] **Track 6 (Quality):** Vitest test suite, Playwright E2E tests, OpenAPI documentation viewer.

For complete milestone details, visit [`ROADMAP.md`](ROADMAP.md).

---

## 🤝 Contributing

We welcome contributions from developers of all backgrounds!

1. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for full guidelines.
2. Check [Issues](https://github.com/Yashraj-Jangra/MindSpace-intelligent-knowledge-workspace/issues) for available tasks or propose one via the [SWoC Proposal Form](.github/ISSUE_TEMPLATE/swoc_proposal.yml).
3. Fork, create a branch (`swoc/level1-xyz`), verify tests pass, and submit a PR!

---

## 📜 Code of Conduct & License

- **Code of Conduct:** MindSpace adheres to the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md). Please be respectful and supportive.
- **License:** MindSpace is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with passion for knowledge explorers everywhere. Part of <b>Social Winter of Code Season 7</b>.</sub>
</div>
