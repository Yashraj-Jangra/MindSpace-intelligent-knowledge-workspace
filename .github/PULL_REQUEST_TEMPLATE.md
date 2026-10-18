## ❄️ Social Winter of Code Season 7 (SWoC 7) Details

- **SWoC 7 Participant?**: [ ] Yes  [ ] No
- **Associated Issue**: Fixes #<!-- issue number -->
- **Assigned Difficulty Level**:
  - [ ] `documentation`
  - [ ] `level1` (Beginner - UI tweak, bugfix, types)
  - [ ] `level2` (Intermediate - new component, API route, feature extension)
  - [ ] `level3` (Advanced - architectural, AI pipeline, real-time, performance)

---

## 📝 Description of Changes

<!--
Provide a clear, detailed summary of what this PR introduces, fixes, or refactors.
Explain the technical motivation and any trade-offs made.
-->

---

## 🧪 Testing & Verification Evidence

<!--
Mandatory for all contributions (especially AI-assisted work).
PRs without concrete verification proof will be flagged or closed.
-->

- [ ] **Typecheck Passed**: `npx tsc --noEmit` exited cleanly with 0 errors.
- [ ] **Build Succeeded**: `npm run build` compiled without fatal errors.
- [ ] **Tests Executed**: Unit/Integration tests added or passing cleanly.
- [ ] **Manual Browser/API Testing**: Verified feature interactively in localhost.

### Proof / Screenshots / Logs:
<!-- Attach before/after screenshots, terminal output, or a short video demo -->

```bash
# Paste verification command output here (e.g., npx tsc --noEmit, test output)
```

---

## 🤖 AI / Agent Contributor Disclosure

<!--
In accordance with MindSpace Open Source & SWoC 7 Policy:
AI tools (ChatGPT, Claude, Cursor, GitHub Copilot, Pi) are permitted, BUT contributors
are strictly responsible for the correctness, safety, and cleanliness of every line.
-->

- [ ] **AI Tools Used**: <!-- e.g., Cursor, Claude 3.7, Copilot, None -->
- [ ] **Zero-Hallucination Verified**: No fabricated APIs, non-existent libraries, or dummy code left behind.
- [ ] **No Error Policy**: Verified that no `// @ts-ignore`, `// @ts-nocheck`, or loose `any` types were introduced.
- [ ] **Human Reviewed**: I have personally reviewed and understood every single line of code in this PR.

---

## 📐 Design System & Code Quality Checklist

- [ ] Follows MindSpace **Bold Typography** guidelines (sharp `0px` edges, no rounded corners, no drop shadows).
- [ ] Primary accent uses `#FF3D00` (vermillion), dark palette `#0A0A0A` / `#141414`.
- [ ] All new inputs validated with **Zod** (`.safeParse()`).
- [ ] Protected API routes authenticate with `getSessionFromCookie()`.
- [ ] No secrets or `.env` files committed.
