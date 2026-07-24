# MindSpace — Project Rules & Agent Directives

> This file defines the authoritative architectural rules, coding conventions, and design specifications
> for every AI agent and developer working on this project. Read this before touching any code.

---

## 1. Project Identity

**MindSpace** is a self-hosted, AI-powered visual note-taking and mind-mapping platform.
It is built for a single-user or small-team localhost deployment on WSL, with production-grade code quality.

The full v2 feature roadmap is in [`ROADMAP.md`](../ROADMAP.md) at the project root.
The active task list and session log is in [`todo.md`](../todo.md) at the project root.

---

## 2. Environment & Deployment

| Item | Detail |
|---|---|
| **OS** | Windows 11 + WSL2 (Ubuntu) |
| **Dev Server** | `npm run dev` from Windows, connects to WSL Docker services |
| **Containers** | `docker compose up -d` inside WSL |
| **Database port** | PostgreSQL on `localhost:5433` (5432 reserved by other containers) |
| **MinIO ports** | API `localhost:9008`, Console `localhost:9009` |
| **Redis port** | `localhost:6379` |
| **Next.js port** | `localhost:3000` |

### Docker Services (`docker-compose.yml`)
```yaml
postgres:  # PostgreSQL 15 + pgvector, port 5433
minio:     # MinIO S3-compatible storage, ports 9008/9009
redis:     # Valkey 7 (Redis-compatible), port 6379
```

Never change these ports without updating both `docker-compose.yml` and `.env.local`.

---

## 3. Tech Stack (Canonical Reference)

### Core
| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | No Pages Router. Use Server Components by default. |
| Language | TypeScript (strict mode) | No `any` types. Zod for all external data. |
| Styling | Tailwind CSS | Follow design tokens in Section 7 exactly. |
| Database | PostgreSQL 15 + pgvector | Via Prisma ORM. Schema in `prisma/schema.prisma`. |
| Auth | Better-Auth | Session cookies. See `src/lib/auth.ts` and `src/lib/session.ts`. |
| ORM | Prisma | Always run `npx prisma db push` after schema changes. |
| Object Storage | MinIO (S3-compatible) | Use `src/lib/storage.ts` wrapper, never call MinIO SDK directly. |
| AI | Google Gemini (Vercel AI SDK) | AI is **opt-in** — check `user.aiEnabled` before calling AI routes. |

### Real-Time & Jobs (v2 additions)
| Layer | Technology | Notes |
|---|---|---|
| WebSockets | Socket.io | Embedded in Next.js custom server. Rooms: `user:[id]`, `canvas:[id]`, `group:[id]`. |
| Job Queue | BullMQ | Backed by Redis. Workers in `src/workers/`. Never use `setTimeout` for scheduled jobs. |
| Cache / Pub-Sub | Redis (Valkey 7) | Used by BullMQ and Socket.io adapter. Access via `src/lib/redis.ts`. |

### Bot Integrations
| Bot | Library | Notes |
|---|---|---|
| Discord | `discord.js v14` | Slash commands + interactive components. Webhook interactions mode — no gateway process. |
| Telegram | `grammy` | Conversation state machine. Webhook mode at `/api/telegram/bot`. |

### Canvas & Editor
| Layer | Technology | Notes |
|---|---|---|
| Mind Map Canvas | `@xyflow/react` | Multi-canvas model: `/canvas/[id]`. Always use `onlyRenderVisibleElements`. |
| Auto-Layout | ELK.js | Run in Web Workers for graphs > 20 nodes. |
| Rich Text Editor | TipTap (via reactjs-tiptap-editor) | In `src/components/editor/AdvancedNoteEditor.tsx`. |
| Stylus Input | Native Pointer Events → SVG | In `src/components/editor/stylus/`. |

---

## 4. Project Directory Structure

```
d:/Projects/MindSpace/
├── prisma/
│   └── schema.prisma              # Single source of truth for all DB models
├── src/
│   ├── app/                       # Next.js App Router pages and API routes
│   │   ├── (admin)/admin/         # Admin-only pages (role-gated)
│   │   │   ├── page.tsx           # Admin dashboard
│   │   │   ├── settings/          # System credentials & integrations config
│   │   │   ├── users/             # User management
│   │   │   ├── notifications/     # Dispatch logs
│   │   │   ├── queues/            # BullMQ monitor
│   │   │   ├── ai/                # AI model config
│   │   │   └── chat/              # Chat moderation
│   │   ├── (auth)/                # Login, register pages
│   │   ├── canvas/[id]/           # Interactive React Flow canvas (moved from /)
│   │   ├── calendar/              # Native MindSpace Calendar
│   │   ├── dashboard/             # Redirects to /
│   │   ├── notes/[id]/            # Rich-text note editor
│   │   ├── reminders/             # Reminders management page
│   │   ├── page.tsx               # Hub Dashboard (personalized cockpit — new default /)
│   │   ├── layout.tsx             # Root layout (AuthProvider, SocketProvider)
│   │   └── globals.css            # Global styles and design token CSS variables
│   │
│   ├── api/                       # All API route handlers
│   │   ├── auth/                  # login, register, session, profile, password, usage
│   │   ├── admin/settings/        # Admin: read/write SystemSetting keys
│   │   ├── calendar/events/       # Calendar CRUD
│   │   ├── canvas/                # Canvas CRUD
│   │   ├── chat/                  # Conversations, messages (REST fallback)
│   │   ├── discord/bot/           # Discord interaction endpoint
│   │   ├── discord/register/      # Register slash commands with Discord API
│   │   ├── generate/              # AI: Text → Mind Map
│   │   ├── hub/timeline/          # Merged urgency feed
│   │   ├── hub/capture/           # Quick capture inbox
│   │   ├── nodes/                 # Node CRUD, expand, copilot
│   │   ├── notes/                 # Note CRUD
│   │   ├── rag/search/            # Vector semantic search (AI — opt-in)
│   │   ├── reminders/             # Reminder CRUD + cron trigger
│   │   ├── tasks/                 # Task CRUD + complete
│   │   ├── telegram/bot/          # Telegram webhook endpoint
│   │   ├── telegram/pair/         # Pairing status
│   │   ├── upload/                # File upload → MinIO
│   │   ├── v1/nodes/              # Public REST API
│   │   └── webhooks/              # Outbound webhook CRUD
│   │
│   ├── components/
│   │   ├── canvas/                # MindSpaceCanvas.tsx, CanvasHeader.tsx
│   │   ├── chat/                  # ChatBubble.tsx, ChatPanel.tsx, ChatSidebar.tsx
│   │   ├── editor/                # AdvancedNoteEditor.tsx, stylus/, table/
│   │   ├── hub/                   # UrgencyTimeline.tsx, QuickCapture.tsx, RecentCanvases.tsx
│   │   ├── nodes/                 # ConceptNode.tsx, ReminderNode.tsx, TextNoteNode.tsx
│   │   ├── tasks/                 # TaskCard.tsx, MacroTaskWidget.tsx, PomodoroTimer.tsx
│   │   └── ui/                    # AccountDrawer.tsx, ReminderModal.tsx, shared primitives
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx         # User session, checkSession(), aiEnabled flag
│   │   └── SocketContext.tsx       # Socket.io client connection and room management
│   │
│   ├── hooks/
│   │   ├── useStylusHardware.ts
│   │   ├── useSocket.ts            # Subscribe to Socket.io room events
│   │   └── useTaskPressure.ts      # Subscribe to overdue task alerts
│   │
│   ├── lib/
│   │   ├── auth.ts                 # Better-Auth server config
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── redis.ts                # Redis/Valkey client singleton
│   │   ├── session.ts              # getSessionFromCookie(), SessionUser type
│   │   ├── storage.ts              # MinIO upload/download wrapper
│   │   ├── snooze-parser.ts        # Natural language → Date offset (no AI)
│   │   ├── graph/
│   │   │   ├── layout.ts           # ELK.js auto-layout
│   │   │   └── transformer.ts      # AI JSON → React Flow nodes/edges
│   │   ├── notifications/
│   │   │   ├── email.ts            # Nodemailer dispatcher
│   │   │   ├── discord.ts          # Discord DM / embed sender
│   │   │   └── telegram.ts         # Telegram sendMessage wrapper
│   │   └── stylus/                 # Stylus types, ink-to-text
│   │
│   └── workers/                    # BullMQ worker processes
│       ├── reminder.worker.ts      # Scans due reminders, dispatches channels
│       ├── digest.worker.ts        # Morning daily digest scheduler
│       └── embed.worker.ts         # (Stage B) Background embedding jobs
│
├── .agents/
│   └── AGENTS.md                   # This file
├── ROADMAP.md                      # Full v2 feature implementation plan
├── todo.md                         # Session log and active task tracker
├── docker-compose.yml
├── .env.local                      # Never commit. Contains all secrets.
└── prisma/schema.prisma
```

---

## 5. API Design Rules

### Authentication
- Every private API route MUST call `getSessionFromCookie()` and return `401` if no session.
- Admin routes MUST additionally check `session.user.role === 'ADMIN'` and return `403` if not.
- Never expose raw Prisma errors to the client — always return `{ error: string }`.

### Response Shape
```ts
// Success
{ data: T }  or  { message: string }

// Error
{ error: string }
```

### Zod Validation
- Parse ALL incoming request bodies with Zod before touching the database.
- Use `.safeParse()` — never `.parse()` inside API routes (prevents thrown errors).

### AI Routes
- Before calling any Gemini API, check: `if (!user.aiEnabled) return 403`.
- Always wrap Gemini calls in a try/catch. Return a graceful degraded response on failure.
- Never stream AI responses from bot handlers (Discord/Telegram). Buffer to string first.

### Bot Endpoints
- `/api/discord/bot` — verify the Discord Ed25519 signature header before processing.
- `/api/telegram/bot` — verify the secret token header set during webhook registration.
- All bot mutations → write to DB → emit Socket.io event to `user:[userId]` room.

---

## 6. Data Architecture Rules

### Prisma Schema
- The schema in `prisma/schema.prisma` is the **single source of truth**.
- After every schema change: `npx prisma db push` (dev) or `npx prisma migrate deploy` (prod).
- Never write raw SQL — always use Prisma client methods.
- `SystemSetting` table stores all admin-configurable keys as `key/value` string pairs.

### Key SystemSetting Keys
```
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME, SMTP_FROM_EMAIL
DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_INVITE_URL
TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME
GEMINI_API_KEY, GEMINI_MODEL, GEMINI_EMBED_MODEL, AI_ENABLED
REDIS_URL
MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
USER_STORAGE_LIMIT_MB       (default: 100)
REMIND_CRON_INTERVAL_SEC    (default: 60)
ALLOW_PUBLIC_REGISTRATION   (default: false)
MAX_GROUP_MEMBERS           (default: 50)
```

### pgvector (AI embeddings)
- Only used when `AI_ENABLED = true` AND `user.aiEnabled = true`.
- Embedding dimension: `1536` (Gemini `text-embedding-004`).
- Index type: `ivfflat` with `lists = 100` for cosine similarity queries.

### BullMQ Job Queues
| Queue name | Purpose |
|---|---|
| `reminders` | Dispatch due reminder notifications |
| `digest` | Morning daily digest send per user |
| `embed` | (Stage B) Background embedding jobs for notes/nodes |
| `webhook-retry` | Retry failed outbound webhook deliveries |

Workers live in `src/workers/`. They run in a separate Node.js process, not inside Next.js.

---

## 7. Real-Time Architecture

### Socket.io Rooms
| Room | Members | Events |
|---|---|---|
| `user:[userId]` | Single user across all tabs | `task:updated`, `task:done`, `reminder:fired`, `notification:new` |
| `canvas:[canvasId]` | All collaborators on a canvas | `node:moved`, `node:updated`, `edge:added`, `cursor:move` |
| `group:[conversationId]` | Group chat members | `message:new`, `member:joined`, `member:left` |

### Bot → Web Sync Pattern
Every bot mutation (Discord button click, Telegram command) MUST:
1. Write to Prisma DB.
2. Emit a Socket.io event to the user's `user:[userId]` room.
3. Return the bot's response (embed update or message reply).

---

## 8. Coding Conventions

### General
- **No `any` types.** Use proper TypeScript generics or `unknown` with type guards.
- **No inline `style={{}}` for colours or spacing** — use Tailwind classes tied to the design token system.
- **No magic numbers** — extract constants into named variables or config files.
- **Component file naming:** PascalCase (`AccountDrawer.tsx`). Hook naming: `use` prefix (`useSocket.ts`).

### React / Next.js
- Default to React Server Components. Add `'use client'` only when needed (interactivity, hooks, browser APIs).
- All page-level data fetching happens in Server Components, not via `useEffect`.
- State that crosses multiple components goes in a Context, not passed as deep props.
- All hooks (`useState`, `useEffect`, `useCallback`) MUST be declared at the **top level** of the component — never inside conditionals or after early returns.

### Forms & Mutations
- All form submissions use `fetch` POST to API routes, not server actions.
- Show loading state during submission (`isLoading` flag on button).
- Show inline success/error messages in the UI — never `alert()` or `console.log` for user-facing feedback.

### Error Boundaries
- Wrap all canvas and editor components in React `ErrorBoundary` to prevent full-page crashes.

---

## 9. Design System (Bold Typography)

This project uses the **Bold Typography** design system. All UI must adhere to these tokens.

### Color Tokens (Dark Mode Default)
```
background:       #0A0A0A    Near-black canvas
foreground:       #FAFAFA    Warm white
muted:            #1A1A1A    Subtle surface elevation
mutedForeground:  #737373    Secondary text (WCAG AA)
accent:           #FF3D00    Vermillion — urgency, CTAs, overdue items
accentForeground: #0A0A0A    Dark text on accent
border:           #262626    Hairline dividers
card:             #0F0F0F    Slight elevation from bg
```

### Typography
- **Primary:** `"Inter Tight", "Inter", system-ui, sans-serif`
- **Mono:** `"JetBrains Mono", "Fira Code", monospace` — labels, stats, code
- **No rounded corners anywhere** — `border-radius: 0` throughout.
- **No box shadows** — depth comes from layered type and border contrast.
- **Letter spacing:** `-0.04em` on headlines, `0.1em` on uppercase labels (tracking-wider).

### Component Rules
- **Buttons:** Text-only with animated underline (primary). Border + full inversion on hover (secondary).
- **Inputs:** `bg-[#1A1A1A]` background, `border-[#262626]` default, `border-[#FF3D00]` on focus.
- **Cards:** `bg-[#0F0F0F]` with `border-[#262626]`. Accent top border `h-1 w-12 bg-[#FF3D00]` for featured cards.
- **Icons:** `lucide-react`, stroke-width `1.5`, always outline (never filled).
- **Animations:** 150ms micro-interactions, `cubic-bezier(0.25, 0, 0, 1)` easing, no bounce.

### Urgency Visual Language
- **Overdue tasks/reminders:** Pulsing vermillion `#FF3D00` with `animate-pulse`.
- **Due today:** Shimmer amber border.
- **Future/upcoming:** Muted `#737373` text.
- This language is consistent across the Hub timeline, bot messages, and notification toasts.

---

## 10. Feature Status Reference

### Stage A — Classic Features (Non-AI)
| Feature | Status |
|---|---|
| Auth (login, register, Google OAuth) | ✅ Done |
| Rich text note editor (TipTap + stylus) | ✅ Done |
| Mind map canvas (`@xyflow/react`) | ✅ Done |
| Account settings drawer | ✅ Done |
| Outbound webhooks (CRUD) | ✅ Done |
| Discord account pairing | ✅ Done |
| Profile / password / storage APIs | ✅ Done |
| Admin dashboard (metrics) | ✅ Done |
| **Hub Dashboard (Timeline, Capture, Recents)** | 🔜 Sprint 1 |
| **Task System (Macro/Micro + Pomodoro)** | 🔜 Sprint 2 |
| **Advanced Reminders + BullMQ** | 🔜 Sprint 3 |
| **Interactive Discord & Telegram Bots** | 🔜 Sprint 3.5 |
| **Native MindSpace Calendar** | 🔜 Sprint 4 |
| **Community Chat + Groups + Co-presence** | 🔜 Sprint 5 |
| **Admin Panel (full pages)** | 🔜 Sprint 7 |

### Stage B — AI Layer (Opt-In)
| Feature | Status |
|---|---|
| Text → Mind Map | ✅ Done |
| Node expansion + AI copilot | ✅ Done |
| Document parsing (PDF/DOCX) | ✅ Done |
| **RAG semantic search** | 🔜 Sprint 6 |
| **Auto-tag suggestion** | 🔜 Sprint 6 |
| **AI task breakdown** | 🔜 Sprint 6 |
| **Smart canvas templates** | 🔜 Sprint 6 |

---

## 11. Git Commit Rules

Every commit message starts with an emoji type, followed by a space and a lowercase concise description.

| Emoji | Type |
|---|---|
| ✨ | New feature |
| 🐛 | Bug fix |
| ♻️ | Refactor |
| 🎨 | UI / style change |
| ⚡ | Performance improvement |
| 📝 | Documentation / todo update |
| 🔧 | Config or tooling change |
| 🗄️ | Database / schema change |

**Rules:**
- No AI-sounding phrases ("Refactor codebase to optimize performance metrics").
- No sprint tags, ticket IDs, or milestone references in commit messages.
- Keep messages punchy and human (e.g. `✨ add urgency timeline to hub dashboard`).
