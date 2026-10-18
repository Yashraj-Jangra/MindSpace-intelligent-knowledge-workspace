# Claude Code Directives — MindSpace

## Project Overview
MindSpace is a self-hosted, AI-assisted visual note-taking and mind-mapping platform built with Next.js 14/16 App Router, TypeScript, React Flow (@xyflow/react), TipTap, Prisma, PostgreSQL + pgvector, MinIO, BullMQ, and Socket.io.
Participating in **Social Winter of Code Season 7 (SWoC 7)**.

## Commands
- Dev Server: `npm run dev`
- Next Dev: `npm run dev:next`
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build`
- Tests: `npm test`
- Database push: `npx prisma db push`

## Strict Guidelines
1. **Zero-Error Policy**: Never use `any`, `// @ts-ignore`, or invent uninstalled packages.
2. **Design Tokens**: Sharp corners `0px` (`rounded-none`). No `shadow-*` utility classes. Primary accent is `#FF3D00`.
3. **API Standards**: Always validate incoming payloads with Zod (`.safeParse()`). Return `{ data: T }` or `{ error: string }`.
4. **Testing**: Write companion unit tests for new business logic and utilities.
5. **Full Rules Reference**: See `.agents/AGENTS.md` and `AGENTS.md`.
