# Control evidence register

From the ITWM Security Framework v3.1, Appendix A. Tier C. Framework version in force: 3.1.

- Update a row whenever a control is implemented or verified, and link the evidence: a PR, test file, screenshot or header capture.
- **Result** is one of: `Not started`, `In progress`, `Implemented`, `Verified`, `N/A` (with a justification) or `Exception` (with a link to the approval).

| ID | Control | Applicable? | Owner | Evidence / link | Result | Approved date |
|---|---|---|---|---|---|---|
| 01 | HTTPS and TLS | Yes | Rich | | Not started | |
| 02 | Authentication and account recovery | Yes | Rich | | Not started | |
| 03 | MFA and step-up | Yes | Rich | | Not started | |
| 04 | Authorisation and least privilege | Yes | Rich | `tests/db/rls.test.ts` (8 tests): drafts hidden, counts exclude drafts, anon insert/update blocked. Mutation check 29 Oct 2026: loosening the lessons policy made 3 tests fail. Runs in CI `database` job | Verified (local) | 2026-10-29 |
| 05 | Input validation and file handling | Yes (no uploads) | Rich | | Not started | |
| 06 | Injection and interpreter safety | Yes | Rich | Phase 1: supabase-js query builders only; grep of `src/` for `.rpc(`, `.sql`, `execute(` and `format(` finds nothing (29 Oct 2026). CSV formula neutralisation due in Phase 6 | In progress | 2026-10-29 |
| 07 | Cross-site scripting defence | Yes | Rich | | Not started | |
| 08 | CSRF and cross-origin protection | Yes | Rich | | Not started | |
| 09 | Session and cookie security | Yes | Rich | | Not started | |
| 10 | Encryption, secrets and key management | Yes | Rich | `server-only` on the Supabase client; only public values use `NEXT_PUBLIC_`; `npm run check:bundle` clean (13 client files); `.env.local` and `.env.test.local` git-ignored. Netlify env vars scoped by context (29 Oct 2026): production context uses the production project, deploy-preview and branch-deploy contexts use staging; only public values set, no secret key in any context. Hosted bundle check pending first deploy | Implemented | 2026-10-29 |
| 11 | Browser security headers | Yes | Rich | `src/config/security-headers.ts` (6 tests). Live capture from `next start`: CSP Report-Only, HSTS, nosniff, Referrer-Policy, X-Frame-Options DENY, Permissions-Policy; no X-Powered-By. Deploy-preview capture pending | Implemented | 2026-10-29 |
| 12 | API, integration and outbound requests | Yes | Rich | | Not started | |
| 13 | Dependencies, CI/CD and supply chain | Yes | Rich | `.github/workflows/ci.yml` (SHA-pinned actions, read-only permissions, CodeQL, gitleaks, npm audit); `.github/dependabot.yml`; lockfile committed. First CI run and branch protection pending (Task 12) | Implemented | 2026-10-29 |
| 14 | Hosting, deployment and caching | Yes | Rich | `productionBrowserSourceMaps: false` (0 .map files in .next/static); `use cache` holds public data only. Staging project `naxngnrzjpdqvuphgbht` created, schema and seed applied, RLS and security advisor verified; deploy previews and branch deploys point at it. Preview password pending (Rich, Netlify UI) | In progress | 2026-10-29 |
| 15 | Logging, error handling and detection | Yes | Rich | `src/app/error.tsx` and `not-found.tsx` show generic copy only; no error details rendered | Implemented | 2026-10-29 |
| 16 | Security testing, backup and recovery | Yes | Rich | | Not started | |
| 17 | Agency access and credential management | Yes | Rich | Both Supabase projects (production `ljxjzvpdaeolytxakpog`, staging `naxngnrzjpdqvuphgbht`) sit in the Into The Wild Marketing organisation, not a Carbon Offroad one. See exception EX-01 | Exception | 2026-10-29 |
| 18 | Domain, DNS and email authentication | Yes | Rich | | Not started | |
| 19 | Forms, lead data and outbound email | Yes | Rich | | Not started | |
| 20 | Third-party scripts, tags and tracking | Yes | Rich | | Not started | |
| 21 | AI features and chat assistants | N/A: the Academy has no AI features. Re-assess if one is added | Rich | | N/A | |
| 22 | Availability, abuse protection and vulnerability disclosure | Yes | Rich | `public/.well-known/security.txt` (RFC 9116, expires 2027-10-28). `security@carbonoffroad.com.au` mailbox must exist before merge | In progress | 2026-10-29 |

## Exceptions (framework section 1)

| ID | Control | Exception | Justification | Compensating controls | Expiry | Approved by |
|---|---|---|---|---|---|---|
| EX-01 | 17 | Supabase production and staging projects are in the Into The Wild Marketing organisation instead of a Carbon Offroad-owned one. Staging costs US$10/month on ITWM's Pro plan | Keeps the build moving while the Carbon Offroad organisation is set up | Both projects hold placeholder content only, no personal data. RLS verified on staging and locally. Access limited to Rich's named account. No production data until Phase 3 | **Before any real personal data is stored (Phase 3), and in any case before the Phase 7 release gate.** Fix by transferring both projects to a Carbon Offroad organisation | Rich, Sales and Marketing Manager, in chat, 29 October 2026 |

## Release record

| Release / commit | Tier | Open Critical | Open High | Approvers | Decision / date |
|---|---|---|---|---|---|
| | C | | | | |
