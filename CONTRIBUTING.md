# Contributing to MindSpace — SWoC Season 7 Handbook

Welcome to **MindSpace**! We are thrilled to be participating in **Social Winter of Code Season 7 (SWoC 7)**. Whether you are taking your first steps into open source or are an experienced software craftsman, this guide provides everything you need to make meaningful, high-impact contributions to an organisation-grade codebase.

---

## ❄️ Social Winter of Code (SWoC 7) Guide

### How SWoC 7 Works on MindSpace
MindSpace participates in SWoC 7 with a structured, fair, and transparent issue allocation and scoring framework. Maintainers actively triage, review, and mentor participants throughout the program.

### Difficulty Levels & Point Distribution
Issues are tagged according to difficulty and carry official SWoC points:

| Label | Points | Description | Ideal For |
|---|:---:|---|---|
| `documentation` | **10 pts** | Improving guides, fixing setup docs, adding code comments, writing API specs | Beginners & Tech Writers |
| `level1` | **25 pts** | Good first issues, UI visual fixes, design system alignment, adding strict types, minor bug fixes | First-time contributors |
| `level2` | **45 pts** | New interactive widgets, API CRUD routes, unit test suites, canvas controls, TipTap editor extensions | Intermediate developers |
| `level3` | **70+ pts** | Real-time WebSocket sync, AI/RAG vector search, BullMQ background jobs, bot gateways, perf optimization | Advanced developers |

### Issue Claiming & Assignment Policy
To ensure fair opportunity for all participants and prevent abandoned issues:
1. **Never create a PR without an assigned issue:** Do not open unsolicited PRs. Always find or propose an issue first and wait for maintainer assignment.
2. **One Issue at a Time:** Each contributor may only be assigned **one issue at a time**. Once your PR is reviewed and merged, you are encouraged to claim another.
3. **The 3-Day (72-Hour) Activity Rule:** After being assigned an issue, you must submit a PR or post a meaningful progress update within **72 hours**. Inactive issues will be unassigned and made available to other contributors.
4. **Proposing New Issues:** If you have an idea for a feature or find a bug, open an issue using the [SWoC 7 Task Proposal Template](.github/ISSUE_TEMPLATE/swoc_proposal.yml). State the proposed difficulty level and testing plan.

---

## 🤖 AI Contributor Policy & Zero-Error Standard

MindSpace embraces modern AI-assisted engineering (Cursor, Claude, Copilot, ChatGPT, Pi), but we enforce a **strict, organisation-grade quality threshold**:

### The Zero-Error Policy
- **No Fabricated Imports:** Only import dependencies that exist in `package.json`. If a new dependency is required, get approval from maintainers on the issue first.
- **Zero TypeScript Errors:** Running `npx tsc --noEmit` must exit with code `0`.
- **No `@ts-ignore` or `any` Escapes:** Never bypass compiler errors using `// @ts-ignore`, `// @ts-expect-error`, or `any`.
- **No Placeholder/Stub Code:** Never submit PRs containing `// TODO: Implement later` or mock methods masquerading as finished code.

### Mandatory Verification with Tests
- **Verify Before PR:** Every PR must be verified locally with `npx tsc --noEmit` and `npm test`.
- **Companion Tests Required:** If you add new utilities, data transformers, or API handlers, you must add companion tests in `src/__tests__/`.
- **Human Accountability:** You must understand and be able to explain every line of code in your PR during code review.
- **AI Disclosure:** Disclose AI tools used in the PR description using the checklist in `.github/PULL_REQUEST_TEMPLATE.md`.

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js**: v18.18.0 or v20.x (recommended)
- **npm**: v9.x or later
- **Git** installed and configured
- **Docker & Docker Compose** (Optional: only needed if testing full PostgreSQL, MinIO, and Redis services; local JSON storage fallback is built-in!)

### Step-by-Step Setup

#### 1. Fork & Clone
Fork the repository on GitHub, then clone your fork:
```bash
git clone https://github.com/<your-username>/MindSpace-intelligent-knowledge-workspace.git
cd MindSpace-intelligent-knowledge-workspace
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(On Windows cmd.exe: `copy .env.example .env.local`)*

#### 4. Database Setup (Choose Option A or B)

**Option A: Zero-Docker Local Mode (Fastest for UI & Docs)**
MindSpace includes a built-in file fallback engine (`.data/`) for development without Docker. You can start developing immediately.

**Option B: Full Docker Stack (Recommended for Backend & DB work)**
```bash
# Start PostgreSQL (5433), MinIO (9008/9009), and Redis (6379)
docker compose up -d

# Push the Prisma schema to PostgreSQL
npm run db:push
```

#### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌿 Git & Contribution Workflow

### 1. Branch Naming Convention
Always create a fresh branch from the latest `master`:
```bash
git checkout master
git pull origin master
git checkout -b <type>/<short-description>
```
Examples:
- `swoc/level1-fix-canvas-zoom`
- `swoc/level2-pomodoro-sound-toggle`
- `swoc/level3-rag-reranking-pipeline`
- `docs/setup-troubleshooting-guide`

### 2. Conventional Commit Messages
Write concise, descriptive commit messages adhering to Conventional Commits:
```
<type>(<scope>): <short description>
```
- `feat(canvas): add minimap zoom controls`
- `fix(chat): prevent duplicate friend request crash`
- `docs(readme): add SWoC 7 contributor instructions`
- `style(hub): align urgency timeline cards to 0px sharp edges`
- `test(snooze): add unit tests for natural language parser`
- `refactor(auth): simplify session token decoding`

### 3. Pre-Commit Verification
Before pushing changes, run the verification checklist:
```bash
# 1. Verify TypeScript compiles cleanly with 0 errors
npx tsc --noEmit

# 2. Run unit tests
npm test

# 3. Verify the production build succeeds
npm run build
```

### 4. Submitting Your Pull Request
1. Push your branch to your fork:
   ```bash
   git push origin <your-branch-name>
   ```
2. Open a Pull Request against the `master` branch of the upstream repository.
3. Fill out the **Pull Request Template** completely:
   - Reference the assigned issue (`Fixes #123`).
   - Check the appropriate SWoC 7 difficulty level.
   - Attach screenshots or GIFs demonstrating UI changes.
   - Complete the AI disclosure checklist.

---

## 🎨 Design System: Bold Typography & Sharp Edges

MindSpace follows a strict, high-contrast, editorial architectural style:

| Design Rule | Specification | Forbidden |
|---|---|---|
| **Corners** | `border-radius: 0px` (`rounded-none`) | ❌ `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl` *(Exception: `rounded-full` for circular status dots only)* |
| **Shadows** | `box-shadow: none !important` | ❌ `.shadow-sm` through `.shadow-2xl` |
| **Borders** | `1px solid #262626` (hairline) | ❌ Thick borders or soft shadows |
| **Colors** | Background `#0A0A0A`, Cards `#141414`, Accent `#FF3D00` (Vermillion) | ❌ Random blues/purples for primary actions |
| **Typography** | Inter (UI), JetBrains Mono (badges, code, timestamps) | ❌ Inconsistent font families |

---

## 🛡️ API Architecture Rules

- **Authentication:** All protected API routes must call `getSessionFromCookie()` and return `401` if not authenticated.
- **Input Validation:** Parse all incoming JSON bodies with Zod `.safeParse()`. Never trust client inputs directly.
- **Consistent Response Structure:**
  ```ts
  // Success (200 / 201)
  return NextResponse.json({ data: result }, { status: 200 });

  // Error (400 / 401 / 403 / 404 / 500)
  return NextResponse.json({ error: "Human-readable message" }, { status: 400 });
  ```
- **Error Handling:** Wrap database and third-party API calls in `try/catch`. Never let unhandled exceptions leak stack traces.

---

## 🏆 Recognition & Mentorship

Every accepted contribution will:
- Earn official SWoC 7 points credited on the leaderboard.
- Be featured in the GitHub Release Notes.
- Add your profile to the **MindSpace Contributors Hall of Fame**.
- Top contributors will be eligible for special project badges, recommendation letters, and maintainer roles.

Have questions? Join the discussion on [GitHub Discussions](https://github.com/Yashraj-Jangra/MindSpace-intelligent-knowledge-workspace/discussions) or ask your SWoC mentor!
