# MindSpace — Agent & AI Contributor Instructions (SWoC 7)

> **FOR ALL AI CODING AGENTS (Cursor, Claude, Copilot, ChatGPT, Windsurf, Pi)**
> Read this file in full before editing or creating any files. MindSpace is an open-source project participating in **Social Winter of Code Season 7 (SWoC 7)**. We enforce strict, organisation-grade code standards.

---

## ⚡ Non-Negotiable Directives

### 1. Zero-Error & Zero-Hallucination Policy
- **Never guess or invent dependencies:** Only use libraries already listed in `package.json`.
- **Zero TypeScript Errors:** Running `npx tsc --noEmit` must return code `0`. Never use `// @ts-ignore`, `// @ts-nocheck`, or `any` to bypass type checks.
- **Strict Zod Validation:** All incoming API request payloads must be validated using `z.object({...}).safeParse(body)`. Never use unchecked `req.json()` directly.
- **Standardized API Responses:** Every API route returns `{ data: T }` on success or `{ error: string }` on failure with appropriate HTTP status codes.

### 2. Mandatory Verification with Tests
- **Verify Before Finishing:**
  - Execute `npx tsc --noEmit` to confirm zero compilation errors.
  - Run the test suite (`npm test`) and confirm all tests pass.
  - If adding new utilities, transformers, or API handlers, author companion tests in `src/__tests__/`.
- **No Pseudo-Tests:** Do not write mock tests with trivial assertions (`expect(true).toBe(true)`). Test actual logic, boundary conditions, and failure paths.

### 3. Design System: Bold Typography & Sharp Edges
- **Zero Border-Radius (0px):** Never use `rounded-md`, `rounded-lg`, `rounded-xl`, or `rounded-2xl` for containers, buttons, cards, modals, or inputs. All borders are sharp `0px`.
  - *Exception:* Circular status dots, priority pills, and avatar chips may use `rounded-full`.
- **Zero Drop Shadows:** Never use `.shadow-sm` through `.shadow-2xl`. Use 1px hairline borders (`border border-[#262626]`).
- **Color Tokens:**
  - Background: `#0A0A0A`
  - Elevated Surfaces / Cards: `#141414`
  - Hairline Borders: `#262626`
  - Primary Accent: `#FF3D00` (Vermillion)
  - Typography: Inter for UI body, JetBrains Mono for badges and code.

### 4. Architecture & Security Guardrails
- **Authentication:** All private routes must call `getSessionFromCookie()` and return `401` if missing. Admin routes must check `session.user.role === 'ADMIN'`.
- **Dual-Path Storage:** When working on storage layers (settings, chat, notifications), ensure both PostgreSQL/Prisma AND local `.data/*.json` fallbacks are respected.
- **AI Opt-in Gate:** AI features (Gemini / pgvector) are opt-in. Always check `user.aiEnabled` before calling AI endpoints. Wrap all external AI calls in try/catch blocks.

---

## 🛠️ Essential Verification Commands

```bash
# Typecheck validation (Must exit cleanly)
npx tsc --noEmit

# Run unit tests
npm test

# Build validation
npm run build
```

---

## 📖 Deep References
- Complete architectural rules: [`.agents/AGENTS.md`](.agents/AGENTS.md)
- Feature roadmap & backlog: [`ROADMAP.md`](ROADMAP.md)
- Contributor workflow: [`CONTRIBUTING.md`](CONTRIBUTING.md)
