# MindSpace — Executive Rules Summary for AI Agents

1. **Zero-Error Policy**: `npx tsc --noEmit` must pass with 0 errors. No `any`, no `// @ts-ignore`.
2. **Verify with Tests**: Run `npm test`. Write companion unit tests for new modules.
3. **Design System**: Sharp `0px` edges only (`rounded-none`). No shadows. Accent is `#FF3D00`.
4. **Validation**: Validate all API inputs using Zod `.safeParse()`.
5. **Security**: Authenticate private routes with `getSessionFromCookie()`. Role check for `ADMIN`.
6. **Package Constraint**: Never add external imports without verifying they exist in `package.json`.
7. **Dual Storage**: Respect Prisma PostgreSQL + `.data/*.json` resilient fallback architecture.
