# MindSpace v2 — Revised Implementation Plan

## Overview

A complete feature expansion across 6 pillars, built in two clear stages:
- **Stage A (Classic):** All core non-AI features first — Hub, Calendar, Tasks, Reminders, Chat.
- **Stage B (AI Layer):** AI and RAG features added on top as an **opt-in enhancement**, user-toggled.

---

## Current Stack (Already Built)

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL 15 + pgvector (Dockerized, WSL) |
| ORM | Prisma |
| AI API | Google Gemini (via Vercel AI SDK) |
| Object Storage | MinIO (Dockerized, WSL, S3-compatible) |
| Canvas Engine | `@xyflow/react` (React Flow) |
| Layout Engine | ELK.js (auto-layout) |
| Auth | Better-Auth (session cookies) |
| Stylus | Native Pointer Events → SVG Vector |

---

## New Tech Stack Additions Required

| Addition | Purpose | Docker? |
|---|---|---|
| **Redis 7 (Valkey)** | Real-time pub/sub for chat, BullMQ reminder queue, rate limiting | ✅ Yes |
| **Socket.io** | WebSocket server for live chat, group rooms, canvas co-presence | Embedded in Next.js |
| **BullMQ** | Reliable job queue for reminder dispatching (backed by Redis) | Uses Redis |
| **Nodemailer** | Platform SMTP mail dispatch (admin-configured, not user-configured) | No |
| **node-telegram-bot-api** | Telegram bot message dispatching | No |
| **discord.js v14** | Discord slash commands, interactive components, bot DMs | No |
| **grammy** | Telegram bot framework with conversation state machine support | No |

### Docker Compose Addition
```yaml
redis:
  image: valkey/valkey:7-alpine
  ports: ["6379:6379"]
  restart: unless-stopped
  mem_limit: 512m
```

---

## Resource Requirements

### Minimum (Development / Single User)
```
RAM:    8 GB     (PG 1 GB + Redis 256 MB + Next.js dev 1.5 GB + OS)
CPU:    4 cores
Disk:   20 GB
```

### Recommended (Multi-User / Production)
```
RAM:    16 GB    (Socket.io connections + BullMQ workers + vector ops)
CPU:    6–8 cores
Disk:   100 GB   (media uploads, DB growth, embeddings)
```

---

## Stage A — Classic Features (Non-AI)

### Sprint 1 — Hub Dashboard & Canvas Routing

**Goal:** Replace the raw canvas `/` with a beautiful personal cockpit. Move canvas to `/canvas/[id]`.

#### Routing Change
- `/` → **Hub Dashboard** (new personalized page)
- `/canvas/[id]` → Interactive React Flow canvas (multi-canvas per user)
- `/dashboard` → Redirects to `/`

#### Hub Components

**1.1 Urgency Timeline Widget**
- Vertical scrollable feed of all upcoming deadlines from Notes, Tasks, and Reminders.
- Sorted by urgency: Overdue (pulse vermillion) → Due Today (shimmer) → Upcoming (muted).
- Inline actions: Mark done, Snooze (+1h / +1d / +1w), Jump to source.
- `GET /api/hub/timeline` — merges and sorts across all three tables.

**1.2 Quick Capture Inbox**
- Large, minimal textarea at top for rapid thought dumps.
- Supports plain text, paste URL (auto-fetch title), Upload document.
- "Save to Inbox" persists to `Capture` table. AI structuring is Stage B.

**1.3 Recent Canvases Grid**
- 3-column card grid of most recently edited canvases.
- Shows: title, node count, last edited timestamp.
- Actions: Open, Rename inline, Pin/Unpin, Delete.

**1.4 Pinned Items Rail**
- Horizontal scrollable row of all pinned notes, tasks, and reminders.
- Small dense cards with vermillion pin indicator.

#### Schema Additions — Sprint 1
```prisma
model Capture {
  id        String   @id @default(cuid())
  userId    String
  rawText   String   @db.Text
  sourceUrl String?
  status    String   @default("PENDING") // PENDING | PROCESSED | DISCARDED
  canvasId  String?  // linked canvas after processing
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("captures")
}
```

---

### Sprint 2 — Task System (Micro/Macro)

**Goal:** Nested task management with high-visibility pressure notifications.

#### Task Hierarchy
```
Macro Task (e.g. "Launch MindSpace v1.0")
  ├─ Micro Task 1  ("Write API docs")         [TODO]
  ├─ Micro Task 2  ("Fix auth bug")            [DONE]
  └─ Micro Task 3  ("Deploy Docker stack")     [IN_PROGRESS]
  Progress: 33%
```

#### Front Page Visibility
- **CRITICAL ZONE:** Tasks overdue or due today render as a pulsing vermillion banner at the absolute top of the Hub — impossible to ignore.
- **Progress meters:** Each Macro Task shows a percentage bar (completed micros / total micros).
- **Pomodoro Widget:** Focus timer pinned to any micro-task, visible in the global bottom bar across the entire app.

#### Notification Pressure Rules (configurable per task)
- Deadline < 2 hours → notify every 30 minutes on all enabled channels.
- Overdue → hourly persistent re-notification with escalating visual severity.
- `notifyEvery` field on Task controls base frequency in minutes.

#### Schema Additions — Sprint 2
```prisma
enum TaskStatus   { TODO IN_PROGRESS DONE CANCELLED }
enum TaskPriority { CRITICAL HIGH MEDIUM LOW }

model Task {
  id          String       @id @default(cuid())
  userId      String
  parentId    String?      // null = Macro Task, set = Micro Task
  title       String
  description String?      @db.Text
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueAt       DateTime?
  isPinned    Boolean      @default(false)
  tags        String[]     @default([])
  notifyEvery Int?         // minutes between reminder nudges (null = default)
  channels    String[]     @default(["in_app"])
  completedAt DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent      Task?        @relation("TaskHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  subtasks    Task[]       @relation("TaskHierarchy")
  @@index([userId, status])
  @@index([dueAt])
  @@map("tasks")
}
```

#### API Routes — Tasks
| Route | Method | Description |
|---|---|---|
| `/api/tasks` | GET | List all user tasks, subtasks nested |
| `/api/tasks` | POST | Create macro or micro task |
| `/api/tasks/[id]` | PATCH | Update status, deadline, priority |
| `/api/tasks/[id]` | DELETE | Remove task and its subtasks |
| `/api/tasks/[id]/complete` | POST | Mark done, fire completion webhook |

---

### Sprint 3 — Advanced Reminders & Multi-Channel Dispatch

**Goal:** Node/Note reminders fire reliably through multiple channels using BullMQ workers.

#### Dispatch Architecture
```
Cron Trigger (every 60s) → POST /api/reminders/cron
    └─ BullMQ Worker Pool
        ├─ Email Dispatcher     (Nodemailer → Admin-configured SMTP)
        ├─ Discord Dispatcher   (Bot DM or channel webhook)
        ├─ Telegram Dispatcher  (User token OR global admin bot)
        └─ Webhook Dispatcher   (HMAC-signed POST to user endpoints)
        └─ In-App Toast         (Always fires, no opt-out)
```

#### Telegram Bot Strategy
- **User-owned bot:** User enters their own `TELEGRAM_BOT_TOKEN` in Account Drawer → Telegram tab. MindSpace pairs to that bot.
- **Global fallback:** If no user token, MindSpace uses the admin-configured global bot token from `SystemSetting`.
- Pairing flow: User sends `/pair <code>` to the bot → MindSpace webhook saves `telegramChatId` to `TelegramAccount`.

#### Per-Reminder Channel Selection
```json
{
  "channels": ["email", "discord", "telegram", "webhook"],
  "telegramChatId": "optional-override"
}
```

#### UI — ReminderModal.tsx
- Channel checkboxes (Email, Discord, Telegram, Webhooks, In-App).
- If channel not paired, show inline "Connect ↗" link.
- Recurrence: Once / Daily / Weekly / Custom (cron expression).

#### Schema Additions — Sprint 3
```prisma
model TelegramAccount {
  id             String   @id @default(cuid())
  userId         String   @unique
  telegramChatId String
  username       String?
  isPaired       Boolean  @default(false)
  pairingCode    String?  @unique
  botToken       String?  // user-owned token (overrides global)
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("telegram_accounts")
}

// Add to Notification model:
// channels    String[]  @default(["in_app"])
// metadata    Json?     // extra dispatch info per channel
// retryCount  Int       @default(0)
// lastError   String?
```

#### API Routes — Reminders
| Route | Method | Description |
|---|---|---|
| `/api/reminders` | GET | List user's reminders |
| `/api/reminders` | POST | Create/update reminder on node or note |
| `/api/reminders/cron` | POST | Internal: scan due reminders + dispatch |
| `/api/telegram/pair` | POST | Telegram bot webhook endpoint for pairing |
| `/api/telegram/pair` | GET | Check pair status |

---

### Sprint 3.5 — Interactive Discord & Telegram Bots

**Goal:** Fully two-way bot companions — users can create tasks, add reminders, mark items done, and receive proactive check-ins entirely from Discord and Telegram. Every mutation syncs instantly to the web app via Socket.io.

#### Core Sync Architecture
```
User interacts with Discord/Telegram bot
        ↓
Platform POSTs event to MindSpace webhook endpoint
        ↓
  /api/discord/bot   OR   /api/telegram/bot
        ↓
Handler authenticates user (by paired userId)
        ↓
Prisma DB mutation (create task / mark done / snooze)
        ↓
Socket.io broadcast → user:[userId] room
        ↓
Web app updates in real-time (no page refresh needed)
```

**Key rule:** The bot never stores state itself. All data lives in MindSpace's PostgreSQL. The bot is a remote control for the database.

---

#### Discord Bot — Full Feature Set

**Library:** `discord.js v14` (slash commands + message components)
**Mode:** Webhook interactions endpoint (`/api/discord/bot`) — no persistent polling process needed.

##### Slash Commands
| Command | Description |
|---|---|
| `/tasks` | Lists all pending tasks with status emoji badges + action buttons |
| `/task add` | Opens a Discord Modal form (title, due date, priority) |
| `/task done <id>` | Marks a specific task complete |
| `/task snooze <id> <time>` | Bumps deadline — accepts natural phrases (`1h`, `tomorrow`, `next week`) |
| `/reminders` | Lists upcoming reminders in order of urgency |
| `/remind <message> <when>` | Creates a new reminder directly from Discord |
| `/capture <text>` | Dumps text to the MindSpace Quick Capture Inbox |
| `/digest` | Triggers an immediate day summary (skips waiting for morning send) |

##### Interactive Message Components
When a reminder or task deadline fires, the Discord dispatcher sends a **rich embed** with inline action buttons:
```
🔔 REMINDER DUE
  "Review pull requests" — was due 5 minutes ago

  [✅ Mark Done]  [💤 Snooze 1h]  [💤 Snooze 1d]  [🔗 Open in App]
```
- Clicking a button calls back to `/api/discord/bot` (Discord interaction endpoint).
- The bot **edits the original message** to reflect the new state (e.g. ~~strikethrough~~ on done) — no duplicate spam.
- Buttons are disabled after the first action to prevent double-taps.

##### Subtask Check-Off Flow
When a Macro Task fires, the bot sends an interactive select menu:
```
📋 "Build MindSpace v2" — 3 subtasks remaining

  Select to mark a subtask done:
  ▾ [Write API docs / Fix auth bug / Deploy Docker stack]

  Task Progress: ████░░░░ 33%
```
Selecting a subtask → marks it in DB → bot updates the embed progress bar → Socket.io updates the web progress meter live.

##### Proactive Completion Check-In
30 minutes after a reminder fires without user action, the bot follows up automatically:
```
🤔 Quick check-in: Did you complete "Review pull requests"?

  [Yes, all done ✅]  [Not yet, snooze 1h 💤]  [Dismiss ✗]
```
This is scheduled as a **delayed BullMQ job** at reminder creation time — not a polling loop.

##### Schema additions for Discord Bot
```prisma
// Add to DiscordAccount model:
// botToken          String?  // user-owned bot token (overrides global admin bot)
// digestTime        String?  // HH:MM in user's timezone, e.g. "08:00"
// digestEnabled     Boolean  @default(true)
// interactionToken  String?  // last interaction token (for editing messages)
```

---

#### Telegram Bot — Full Feature Set

**Library:** `grammy` (conversation-aware, middleware-based, webhook-compatible)
**Mode:** Webhook at `/api/telegram/bot` — Telegram POSTs all updates here.

##### Commands
| Command | Description |
|---|---|
| `/start` | Onboarding: explains MindSpace, shows pairing instructions |
| `/pair <code>` | Links the Telegram chat to a MindSpace account |
| `/tasks` | Paginated task list; each task has ✅ / 💤 / 📋 inline buttons |
| `/add` | Starts a conversational multi-step task creation flow |
| `/done <id>` | Direct mark-done shorthand |
| `/reminders` | Lists upcoming reminders with inline keyboard actions |
| `/remind <message> <when>` | Quick reminder creation |
| `/capture <text>` | Saves to Quick Capture Inbox |
| `/digest` | Immediate morning digest on demand |
| `/help` | Full command reference card |

##### Conversational Task Creation (Multi-Step State Machine)
grammy's `conversations` plugin tracks the bot's position in a dialogue:
```
User: /add Launch blog post
Bot:  📅 When is it due? (e.g. "tomorrow", "July 28", or tap /skip)
User: July 30
Bot:  🎯 Priority?
      [🔴 Critical]  [🟠 High]  [🟡 Medium]  [⚪ Low]
User: (taps High)
Bot:  ✅ Task created!
      📋 Launch blog post
      📅 Due: Jul 30  •  🟠 High priority
      [View in App →]
```
Conversation state is stored ephemerally in Redis (not in the DB) — expires after 5 minutes of inactivity.

##### Interactive Inline Keyboards
Every task in `/tasks` list gets per-row action buttons:
```
📋 Fix auth bug   [🔴 Critical]  Due: Today
   [✅ Done]  [💤 Snooze]  [📋 Subtasks]
```

##### Proactive Check-In (same as Discord)
Same BullMQ-delayed follow-up message 30 minutes post-deadline, with Telegram inline keyboard:
```
🤔 Did you complete "Fix auth bug"?
  [✅ Yes, done!]  [💤 Snooze 1 hour]  [✗ Dismiss]
```

---

#### Morning Daily Digest (Both Platforms)
A **scheduled BullMQ CRON job** fires at each user's configured digest time:
```
☀️ Good morning! MindSpace briefing for July 25:

📋 TASKS DUE TODAY (3)
  🔴 Fix login bug         [Critical]
  🟠 Write API docs        [High]
  🟡 Review PR #42         [Medium]

⏰ UPCOMING REMINDERS
  → 2:00 PM  Dentist appointment
  → 5:00 PM  Team standup

📌 PINNED TASKS (1 overdue)
  ⚠️ Deploy Docker stack   was due yesterday
```
- Digest time set per-user in Account Drawer → Discord / Telegram tab.
- If no tasks/reminders for the day, digest is skipped (no spam).

#### Natural Language Snooze Parser
A small utility (`lib/snooze-parser.ts`) maps common phrases to concrete `Date` offsets — no AI required:
```ts
"in 30 minutes"  → now + 30min
"1h"             → now + 1h
"after lunch"    → same day 13:00
"tonight"        → same day 20:00
"tomorrow"       → next day 09:00
"next week"      → next Monday 09:00
"July 30"        → Jul 30 09:00
```

#### API Routes — Bot Endpoints
| Route | Method | Description |
|---|---|---|
| `/api/discord/bot` | POST | Discord interactions endpoint (slash cmds + button callbacks) |
| `/api/discord/register` | POST | Admin: registers slash commands with Discord API |
| `/api/telegram/bot` | POST | Telegram webhook — receives all bot updates |
| `/api/telegram/pair` | GET | Check Telegram pairing status |

---

### Sprint 4 — Native MindSpace Calendar

**Goal:** A fully custom-built calendar system (no Google Calendar). Manages events, reminders, and tasks visually.

#### Pages
- **`/calendar`** — Full monthly view (CSS Grid, no external calendar lib).
- Week view and Day view toggle.
- Click any cell → slide-over panel with all items for that day + "Add" form.

#### Colour-Coded Layers
| Colour | Represents |
|---|---|
| `#FF3D00` Vermillion | MindSpace Reminders & Node deadlines |
| `#4285F4` Blue | Personal events (birthdays, appointments) |
| `#10B981` Emerald | Tasks with due dates |
| `#8B5CF6` Purple | Recurring events |

#### Calendar Event Types
- **Personal Events:** Freeform events (birthdays, meetings, appointments, ticket stubs, travel).
- **Reminders:** Linked from canvas nodes and notes.
- **Tasks:** Task deadlines shown on the calendar.

#### Drag to Reschedule
- Drag any event card to a new day cell → updates `CalendarEvent.startAt` in DB.

#### Event Detail Slide-Over
- Shows full description, attached note/canvas link, location, recurrence.
- For tasks: shows progress bar of subtasks.
- Edit and delete inline.

#### Schema Additions — Sprint 4
```prisma
enum EventRecurrence { NONE DAILY WEEKLY MONTHLY YEARLY }

model CalendarEvent {
  id          String          @id @default(cuid())
  userId      String
  title       String
  description String?         @db.Text
  startAt     DateTime
  endAt       DateTime?
  isAllDay    Boolean         @default(false)
  location    String?
  color       String          @default("#4285F4")
  recurrence  EventRecurrence @default(NONE)
  sourceType  String          @default("EVENT") // EVENT | REMINDER | TASK
  sourceId    String?         // linked reminder or task id
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, startAt])
  @@map("calendar_events")
}
```

#### API Routes — Calendar
| Route | Method | Description |
|---|---|---|
| `/api/calendar/events` | GET | Fetch events in date range (`?from=&to=`) |
| `/api/calendar/events` | POST | Create new event |
| `/api/calendar/events/[id]` | PATCH | Update event (date, title, etc.) |
| `/api/calendar/events/[id]` | DELETE | Remove event |

---

### Sprint 5 — Community & Chat System

**Goal:** Federated friend system, real-time DM and group chat, canvas co-presence.

#### Architecture
```
Socket.io Server (embedded in Next.js)
    ├─ Room: user:[userId]              — Private DM
    ├─ Room: group:[conversationId]     — Group chat room
    └─ Room: canvas:[canvasId]          — Multiplayer canvas presence
```

#### 5.1 Friend System (Federated)
- Search for friends by **email** or **MindSpace username**.
- Send a friend request → recipient gets in-app notification + email.
- Accept → conversation DM thread is automatically created between both users.
- Reject → request disappears.
- Friend list shows online presence (green dot via Socket.io heartbeat).

#### 5.2 Group System
- Create a group with a name and optional description.
- Add friends to group from friend list.
- **Invitation link:** Generate a shareable invite URL (`/invite/[token]`). Anyone with the link can join the group (link expiry configurable: 24h / 7d / Never).
- Group admin can remove members, change group name/icon, and revoke invite links.
- Roles: `ADMIN` (creator) | `MEMBER`.

#### 5.3 Chat Panel Modes
- **Bubble mode:** Bottom-right floating button, expands to 380px chat panel (like Intercom).
- **Side panel mode:** Right-side slide-in inside `/notes/[id]` and `/canvas/[id]`.
- Supports:
  - Text messages (markdown rendered)
  - Code blocks (syntax highlighted)
  - Image uploads (stored in MinIO)
  - **Share Note card** — drops a note preview card into chat
  - **Share Canvas link** — drops a canvas invite card

#### 5.4 Canvas Co-Presence (Multiplayer)
- When a canvas is shared with collaborators (via invite link or direct share), active users appear as coloured ghost cursors with name labels.
- Live node edits (label changes, position drags) broadcast to all connected clients via Socket.io.
- Presence indicator on canvas: "3 people viewing" badge.
- Roles: `OWNER` | `EDITOR` | `VIEWER` — viewers cannot move nodes.

#### Schema Additions — Sprint 5
```prisma
enum FriendRequestStatus { PENDING ACCEPTED REJECTED BLOCKED }

model FriendRequest {
  id         String              @id @default(cuid())
  senderId   String
  receiverId String
  status     FriendRequestStatus @default(PENDING)
  createdAt  DateTime            @default(now())
  sender     User                @relation("SentRequests", fields: [senderId], references: [id], onDelete: Cascade)
  receiver   User                @relation("ReceivedRequests", fields: [receiverId], references: [id], onDelete: Cascade)
  @@unique([senderId, receiverId])
  @@map("friend_requests")
}

model Conversation {
  id           String        @id @default(cuid())
  name         String?       // null for DMs, set for groups
  isGroup      Boolean       @default(false)
  iconUrl      String?
  inviteToken  String?       @unique
  inviteExpiry DateTime?
  createdAt    DateTime      @default(now())
  members      ConversationMember[]
  messages     ChatMessage[]
  @@map("conversations")
}

model ConversationMember {
  id             String       @id @default(cuid())
  conversationId String
  userId         String
  role           String       @default("MEMBER") // ADMIN | MEMBER
  joinedAt       DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([conversationId, userId])
  @@map("conversation_members")
}

model ChatMessage {
  id             String       @id @default(cuid())
  conversationId String
  senderId       String
  content        String       @db.Text
  type           String       @default("TEXT") // TEXT | IMAGE | NOTE_LINK | CANVAS_LINK
  readBy         String[]     @default([])
  editedAt       DateTime?
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender         User         @relation(fields: [senderId], references: [id], onDelete: Cascade)
  @@index([conversationId, createdAt])
  @@map("chat_messages")
}

model CanvasCollaborator {
  id        String   @id @default(cuid())
  canvasId  String
  userId    String
  role      String   @default("VIEWER") // OWNER | EDITOR | VIEWER
  invitedAt DateTime @default(now())
  canvas    Canvas   @relation(fields: [canvasId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([canvasId, userId])
  @@map("canvas_collaborators")
}

// Add to User model:
// username      String?   @unique  (for friend search)
// friends       FriendRequest[] (both SentRequests + ReceivedRequests)
// conversations ConversationMember[]
// chatMessages  ChatMessage[]
```

---

## Stage B — AI Layer (Optional, User-Controlled)

> [!IMPORTANT]
> All AI features below are **opt-in**. Users can disable AI entirely from their Account Settings.
> When AI is disabled, all AI buttons are hidden and embedding jobs are skipped.
> Admins control the global AI API key and model selection from `/admin/ai`.

### Sprint 6 — AI Enhancements (Post-Classic)

#### 6.1 Global AI Toggle
- `User.aiEnabled Boolean @default(true)` — user flips in Account Settings.
- Admin can disable AI platform-wide via `SystemSetting: AI_ENABLED = false`.

#### 6.2 Quick Capture → AI Structure
- After saving to inbox, "Structure as Mind Map" button (only visible if `aiEnabled`).
- Calls `/api/generate` → creates a new Canvas with AI-generated nodes.

#### 6.3 Vector Embedding Pipeline
- Every note, node, and task description is embedded using Gemini `text-embedding-004`.
- Embeddings stored in `Node.embedding` (vector(1536), already in schema).
- Notes get `embedding Unsupported("vector(1536)")?` added to schema.
- Background embedding happens in a BullMQ job so it doesn't block the UI.

#### 6.4 RAG Semantic Search
- Global search bar on Hub Dashboard → `/api/rag/search`.
- Query embedded → pgvector cosine similarity → top-K matches across notes, nodes, tasks.
- Results grouped by type with relevance scores.

#### 6.5 AI Features Summary
| Feature | Route | When |
|---|---|---|
| Text → Mind Map | `/api/generate` | Stage A (already built) |
| Node Topic Expansion | `/api/nodes/expand` | Stage A (already built) |
| AI Copilot | `/api/nodes/copilot` | Stage A (already built) |
| Document Parse | `/api/parse-document` | Stage A (already built) |
| **Capture → AI Structure** | `/api/hub/capture/structure` | Stage B |
| **RAG Semantic Search** | `/api/rag/search` | Stage B |
| **Auto-Tag Suggestion** | `/api/ai/suggest-tags` | Stage B |
| **AI Task Breakdown** | `/api/ai/breakdown-task` | Stage B |
| **Smart Canvas Templates** | `/api/ai/template` | Stage B |

#### 6.6 AI Task Breakdown
- User types a high-level goal → AI returns structured Macro + Micro tasks with suggested priorities and deadlines.
- User reviews and clicks "Import All" → tasks created in bulk.

---

## Sprint 7 — Admin Control Panel (`/admin`)

**Goal:** Centralized operator control over all system integrations and credentials.

### Admin Pages

| Page | Route | Controls |
|---|---|---|
| **Dashboard** | `/admin` | Metrics, active users, queue depth stats |
| **System Settings** | `/admin/settings` | All integration credentials |
| **User Management** | `/admin/users` | List, role change, force password reset |
| **Notification Logs** | `/admin/notifications` | Dispatch history, retry failed sends |
| **Queue Monitor** | `/admin/queues` | BullMQ job states, failed jobs, retry |
| **AI Config** | `/admin/ai` | Gemini key, model, embedding toggle |
| **Chat Moderation** | `/admin/chat` | Group list, flag reports |

### `SystemSetting` Keys (Full List)

```
# Email
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME, SMTP_FROM_EMAIL

# Discord
DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_INVITE_URL

# Telegram
TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME

# AI (Stage B)
GEMINI_API_KEY, GEMINI_MODEL, GEMINI_EMBED_MODEL, AI_ENABLED

# Infrastructure
REDIS_URL
MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET

# Platform Rules
USER_STORAGE_LIMIT_MB         (default: 100)
REMINDER_CRON_INTERVAL_SEC    (default: 60)
ALLOW_PUBLIC_REGISTRATION     (default: false)
MAX_GROUP_MEMBERS             (default: 50)
INVITE_LINK_DEFAULT_EXPIRY    (default: 604800 — 7 days in seconds)
```

### Admin UI Features
- Bold Typography design (consistent with main app).
- **Live connection test** on save (send test email, ping Discord API, verify Telegram bot token).
- Status badges per integration (CONNECTED | NOT_CONFIGURED | ERROR).
- Queue depth live counter on admin dashboard card.

---

## Sprint 8 — Polish, Performance & Mobile QA

- Responsive mobile layouts for Hub, Calendar, Chat.
- Socket.io reconnection handling (exponential backoff).
- BullMQ dead-letter queue for failed notification jobs.
- Rate limiting on all API routes via Redis.
- End-to-end test run of all reminder channels.

---

## Sprint Order Summary

| Sprint | Focus | Effort |
|---|---|---|
| **S1** | Hub Dashboard + Canvas routing refactor | 5–7 days |
| **S2** | Macro/Micro Task System + pressure notifications | 4–5 days |
| **S3** | Advanced Reminders + BullMQ + multi-channel dispatch | 4–5 days |
| **S3.5** | Interactive Discord & Telegram Bots (two-way, real-time sync) | 5–6 days |
| **S4** | Native MindSpace Calendar | 4–5 days |
| **S5** | Community Chat + Groups + Invite Links + Canvas Co-presence | 6–8 days |
| **S6** | AI Layer (opt-in) — RAG, embeddings, auto-tag, task breakdown | 4–5 days |
| **S7** | Admin Panel — all pages, queue monitor, chat moderation | 3–4 days |
| **S8** | Polish, performance, mobile QA | 3–4 days |

**Total: ~38–49 days**

---

## Bot Feature Summary Table

| Feature | Discord | Telegram |
|---|---|---|
| Slash/Text Commands | ✅ Slash commands + Modals | ✅ `/command` text |
| Task List with Buttons | ✅ Embeds + Components | ✅ Inline keyboards |
| Create Task | ✅ Modal form | ✅ Conversational flow |
| Mark Task Done | ✅ Button + `/task done` | ✅ Button + `/done` |
| Snooze | ✅ Button + natural lang | ✅ Button + natural lang |
| Subtask Check-Off | ✅ Select menu | ✅ Inline keyboard |
| Reminder Notification | ✅ Rich embed | ✅ Formatted message |
| Proactive Check-In | ✅ 30min follow-up | ✅ 30min follow-up |
| Morning Digest | ✅ Scheduled BullMQ | ✅ Scheduled BullMQ |
| Quick Capture | ✅ `/capture` | ✅ `/capture` |
| Real-time Web Sync | ✅ Socket.io broadcast | ✅ Socket.io broadcast |
| User-owned Bot Token | ✅ Configurable | ✅ Configurable |
| Global Admin Bot | ✅ Fallback | ✅ Fallback |
