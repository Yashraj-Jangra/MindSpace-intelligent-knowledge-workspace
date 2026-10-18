# Security Policy

MindSpace takes the security of our application, our users' private knowledge graphs, notes, and credentials seriously. We appreciate responsible disclosure of security vulnerabilities.

---

## Supported Versions

Only the latest release on the `master` branch receives active security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x / `master` | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in MindSpace, please report it privately:

1. **GitHub Security Advisory (Preferred):**
   Submit a private advisory report directly on GitHub under the **Security** tab -> **Advisories** -> **Report a vulnerability**.
2. **Email Disclosure:**
   Email the maintainers directly at `yashraj.jangra.dev@gmail.com` with the subject line `[SECURITY] MindSpace Vulnerability Report`.

### What to Include in Your Report

To help us triage and resolve the issue quickly, please provide:
- A clear description of the vulnerability and its potential impact.
- Step-by-step reproduction steps or a minimal Proof of Concept (PoC).
- Affected endpoints, components, or files.
- Any proposed remediation or mitigation patches (if available).

### Response SLA

- **Acknowledgment:** Within 48 hours of initial report.
- **Triage & Severity Assessment:** Within 5 business days.
- **Fix & Disclosure:** Coordinated disclosure timeline, usually within 14 to 30 days depending on severity.

---

## Security Best Practices for Contributors & AI Agents

When contributing to MindSpace, adhere to the following mandatory security rules:

1. **No Hardcoded Secrets:** Never commit API keys, bot tokens, database passwords, or JWT secrets. Use `.env.example` with dummy values.
2. **Strict Zod Input Validation:** All API endpoints must parse request bodies with Zod `.safeParse()` before processing.
3. **Session & Role Authentication:** Every protected route must verify `getSessionFromCookie()` and enforce `ADMIN` role checks where appropriate.
4. **No Raw SQL:** Always interact with PostgreSQL through Prisma Client to prevent SQL injection.
5. **Safe Deserialization & File Uploads:** Uploads to MinIO must enforce MIME type allowlists, file size ceilings, and user quota checks.
6. **AI Route Gating:** Never expose unauthenticated AI routes. Always check `user.aiEnabled` and respect user quotas.
