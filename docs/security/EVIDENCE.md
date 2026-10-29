# Control evidence register

From the ITWM Security Framework v3.1, Appendix A. Tier C. Framework version in force: 3.1.

- Update a row whenever a control is implemented or verified, and link the evidence: a PR, test file, screenshot or header capture.
- **Result** is one of: `Not started`, `In progress`, `Implemented`, `Verified`, `N/A` (with a justification) or `Exception` (with a link to the approval).

| ID | Control | Applicable? | Owner | Evidence / link | Result | Approved date |
|---|---|---|---|---|---|---|
| 01 | HTTPS and TLS | Yes | Rich | Production on Netlify serves HTTPS with HSTS (`max-age=31536000; includeSubDomains; preload`, set by Netlify on *.netlify.app). App HSTS header ready for the academy domain. CAA and domain setup due in Phase 7 | In progress | 2026-10-29 |
| 02 | Authentication and account recovery | Yes | Rich | | Not started | |
| 03 | MFA and step-up | Yes | Rich | | Not started | |
| 04 | Authorisation and least privilege | Yes | Rich | `tests/db/rls.test.ts` (8 tests): drafts hidden, counts exclude drafts, anon insert/update blocked; mutation check: loosening the lessons policy failed 3 tests. **Phase 2:** `tests/db/qr.test.ts` (9 tests): `qr_links`/`qr_scans` unreadable and unwritable with the publishable key; scans only through `log_qr_scan()`, which ignores links to unpublished lessons. All run in CI `database` job | Verified (local) | 2026-10-29 |
| 05 | Input validation and file handling | Yes (no uploads) | Rich | **Phase 2:** `/go/[slug]` validates the slug with Zod (`QrSlug`) and UTMs with a Zod allowlist (`pickUtm`); invalid input falls back safely to `/lessons` (unit tests; curl 29 Oct 2026: malformed slug, unknown slug and `<script>` UTM all handled). Server Actions arrive in Phase 3 | In progress | 2026-10-29 |
| 06 | Injection and interpreter safety | Yes | Rich | supabase-js query builders only in `src/`. **Phase 2:** the one RPC, `log_qr_scan()`, is parameterised plpgsql with `search_path = '`; an injection-shaped slug returns nothing (DB test). CSV formula neutralisation due in Phase 6 | In progress | 2026-10-29 |
| 07 | Cross-site scripting defence | Yes | Rich | No `dangerouslySetInnerHTML`. `isVimeoId` and `safeHttpsUrl` (host allowlist) validate stored values before they reach `src`/`href` (unit tests). Runtime check 29 Oct 2026: a `javascript:` warranty URL renders no CTA and never appears in the page; a valid carbonoffroad.com.au URL renders the CTA | Verified (local) | 2026-10-29 |
| 08 | CSRF and cross-origin protection | Yes | Rich | | Not started | |
| 09 | Session and cookie security | Yes | Rich | | Not started | |
| 10 | Encryption, secrets and key management | Yes | Rich | `server-only` on the Supabase client; only public values use `NEXT_PUBLIC_`; `npm run check:bundle` clean (13 client files); `.env.local` and `.env.test.local` git-ignored. Netlify env vars scoped by context (29 Oct 2026): production context uses the production project, deploy-preview and branch-deploy contexts use staging; only public values set, no secret key in any context. Hosted bundle check pending first deploy | Implemented | 2026-10-29 |
| 11 | Browser security headers | Yes | Rich | `src/config/security-headers.ts` (7 tests). Production capture 29 Oct 2026: CSP Report-Only allowlist, HSTS, nosniff, Referrer-Policy, X-Frame-Options DENY, Permissions-Policy; no X-Powered-By. **Phase 2:** `frame-src` is `https://player.vimeo.com` only; no CSP reports during local playback. CSP enforcement and nonce CSP for authenticated routes due in Phases 3 and 7 | Implemented | 2026-10-29 |
| 12 | API, integration and outbound requests | Yes | Rich | **Phase 2:** no user-supplied fetch URLs; Vimeo is an iframe on a fixed host (no API calls, no remote images, `remotePatterns` empty). `/go` passes only five known UTM keys and redirects with a relative path built from database slugs (no open redirect; never a pinned Netlify deploy address). Route tests in `src/app/go/[slug]/route.test.ts` | Implemented | 2026-10-29 |
| 13 | Dependencies, CI/CD and supply chain | Yes | Rich | `.github/workflows/ci.yml` (SHA-pinned actions, read-only permissions): `checks`, `database`, `secrets` (gitleaks) and `codeql` all green on PR #1, PR #8 and `main`. Dependabot active (PRs #2-#7). Branch protection on `main` still to be set | In progress | 2026-10-29 |
| 14 | Hosting, deployment and caching | Yes | Rich | `productionBrowserSourceMaps: false` (0 .map files in .next/static); `use cache` holds public data only. Staging project `naxngnrzjpdqvuphgbht` created, schema and seed applied, RLS and security advisor verified; deploy previews and branch deploys point at it. Non-production deploys require Netlify team login (preview returns 401). **Incident 29 Oct 2026:** the first production deploy ran without the Next.js runtime and served raw `.next` files (server output downloadable, every page 404). Fixed in PR #8 by declaring `@netlify/plugin-nextjs` in netlify.toml; `/server/app/index.html` now 404s; guarded by `tests/config/netlify.test.ts`. No secrets were exposed (public env vars only; Netlify secret scan clean). Functions run in us-east-2, see decision S9 | Implemented | 2026-10-29 |
| 15 | Logging, error handling and detection | Yes | Rich | `src/app/error.tsx` and `not-found.tsx` show generic copy only; no error details rendered | Implemented | 2026-10-29 |
| 16 | Security testing, backup and recovery | Yes | Rich | | Not started | |
| 17 | Agency access and credential management | Yes | Rich | Both Supabase projects (production `ljxjzvpdaeolytxakpog`, staging `naxngnrzjpdqvuphgbht`) sit in the Into The Wild Marketing organisation, not a Carbon Offroad one. See exception EX-01 | Exception | 2026-10-29 |
| 18 | Domain, DNS and email authentication | Yes | Rich | | Not started | |
| 19 | Forms, lead data and outbound email | Yes | Rich | | Not started | |
| 20 | Third-party scripts, tags and tracking | Yes | Rich | `docs/security/TAG_INVENTORY.md`: Vimeo player (click-to-play, `dnt=1`); GA4 not loaded (D6). Local check 29 Oct 2026: zero Vimeo requests before play; after play only `player.vimeo.com`. Analytics events carry slugs only | Implemented | 2026-10-29 |
| 21 | AI features and chat assistants | N/A: the Academy has no AI features. Re-assess if one is added | Rich | | N/A | |
| 22 | Availability, abuse protection and vulnerability disclosure | Yes | Rich | `/.well-known/security.txt` live on production (RFC 9116, expires 2027-10-28); `security@carbonoffroad.com.au` mailbox to be confirmed monitored. **Phase 2:** `log_qr_scan()` records at most 60 scans per link per minute (DB test; mutation check: disabling the cap fails it). Netlify Traffic Rule for `/go/*` optional. Uptime and certificate monitoring due in Phase 7 | In progress | 2026-10-29 |

## Exceptions (framework section 1)

| ID | Control | Exception | Justification | Compensating controls | Expiry | Approved by |
|---|---|---|---|---|---|---|
| EX-01 | 17 | Supabase production and staging projects are in the Into The Wild Marketing organisation instead of a Carbon Offroad-owned one. Staging costs US$10/month on ITWM's Pro plan | Keeps the build moving while the Carbon Offroad organisation is set up | Both projects hold placeholder content only, no personal data. RLS verified on staging and locally. Access limited to Rich's named account. No production data until Phase 3 | **Before any real personal data is stored (Phase 3), and in any case before the Phase 7 release gate.** Fix by transferring both projects to a Carbon Offroad organisation | Rich, Sales and Marketing Manager, in chat, 29 October 2026 |

## Release record

| Release / commit | Tier | Open Critical | Open High | Approvers | Decision / date |
|---|---|---|---|---|---|
| | C | | | | |
