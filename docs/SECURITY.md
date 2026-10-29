# Carbon Offroad Academy: Security Reference

Build-ready application of the **ITWM Custom Website Security & Compliance Framework v3.1 (17 October 2026)**, stored at `docs/security/ITWM_Custom_Website_Security_Framework_v3.1.docx`.

- **The framework is the source of truth.** If anything here conflicts with it, the framework wins.
- **References:** controls are written with two digits (control 05) and sections with one (section 5), as in the framework.
- **Not a certification:** the framework is an internal assurance standard, not a certification or legal advice (section 10).

**Framework version in force for this project:** 3.1. The project does not switch benchmark mid-build (section 1, Document control).

---

## 1. Tier

**Tier C (High), verified against OWASP ASVS 5.0.0 Level 2.** Section 1 puts any project with "client portals or user accounts … complex roles or multi-tenant access" in Tier C. A formal risk assessment can raise a tier but never lower it below these rules.

The Academy meets those conditions:

- Learner accounts: magic link, progress, quiz attempts and certificates.
- Two roles, learner and admin, plus store and partner scoping, which is close to multi-tenant.
- An admin area that manages people, stores and certificates.

There are no uploads, no payments and no free-text fields, which keeps Highly Sensitive data out of scope.

Tier C requires (section 1, "What each tier requires"):

| Requirement | Where it happens |
|---|---|
| Tier A checklist + Tier B/C pre-launch checklist (section 7) | Phase 7 |
| Controls 01–22, each with evidence (`docs/security/EVIDENCE.md`) | Every phase |
| ASVS Level 2 applicability register | Started in Phase 3, complete by Phase 7 |
| Documented threat model, independently reviewed (STRIDE, section 5) | Draft before Phase 3, updated each phase |
| Data classification and retention register | Draft below; approved before Phase 3 |
| Permissions matrix (control 04) | Phase 3 (learner), Phase 6 (admin) |
| Vendor assessment for all material vendors | Supabase, Netlify, Vimeo, email provider, GA4: before Phase 7 |
| SAST, dependency and secret scanning on every PR (control 13) | Phase 1 CI |
| DAST or manual security testing | Phase 7 |
| **Independent penetration test** | Phase 7, before launch |
| **Independent review of evidence** (someone who didn't build it) | Each phase's PR, and Phase 7 |
| Data-flow diagram reviewed by the client | Before Phase 3 |
| SBOM | Phase 7 (`npm sbom --sbom-format cyclonedx`) |
| Restore rehearsal with backup isolation (control 16) | Phase 7 |
| Production release gate with independent sign-off (section 7) | Phase 7 |

## 2. Roles (section 1, Accountability)

| Framework role | Academy |
|---|---|
| Project owner (approves scope and tier) | Rich, Sales and Marketing Manager, Carbon Offroad |
| Client (owns post-handover decisions and all accounts) | Carbon Offroad (KPD Industries Pty Ltd) |
| Technical lead (implements and documents controls) | Rich with Claude Code |
| Independent reviewer | **To be named.** Must be someone who didn't build it (decision S2) |

## 3. Non-negotiable build rules

Every phase follows these. Each rule cites its source in the framework.

**Access control and data (controls 04 and 10, section 4)**
- RLS on every table, deny by default. UI visibility is never evidence of access control.
- Every Server Action and Route Handler is a public endpoint. Each one authenticates, authorises, validates with Zod and returns minimal data itself. A page-level check doesn't cover the actions in it.
- Middleware (`proxy.ts` in Next.js 16) is for redirects and headers only, never the only access check (CVE-2025-29927).
- All database access goes through server-only modules (`import 'server-only'`) that return DTOs with just the fields the UI needs. Never pass whole database rows to Client Components.

**Secrets (control 10)**
- `NEXT_PUBLIC_` variables hold only public values: the site URL, the Supabase URL and the publishable key.
- The Supabase secret key, Vimeo token and SMTP credentials are server-only. They're scoped per Netlify context (production, deploy previews, branch deploys) and never committed.
- **Preview builds use a non-production Supabase project and test data** (section 4, Environment variables).

**Queries (control 06)**
- Use supabase-js query builders and parameterised SQL in database functions. Never build SQL by string interpolation, including in `execute` or `format()` without `%L` or `%I`.
- Allowlist sort and filter identifiers.
- Neutralise formula injection (values starting with `=`, `+`, `-` or `@`) in every CSV export (Phase 6 reports).
- Database functions callable with the publishable key use `security definer` only when they must write on the visitor's behalf (like `log_qr_scan`). Each one:
  - sets `search_path = ''`
  - validates every argument
  - writes only explicit columns
  - has `execute` granted only to the roles that need it, and revoked from `public`
  - is covered by DB tests, including a mutation check on any limit it enforces

**Output (control 07)**
- Never use `dangerouslySetInnerHTML`.
- Validate every stored URL (warranty URL, QR targets, Vimeo IDs) as `https:` on an allowlisted host before it's rendered into `href` or `src`.

**Headers (control 11)**
- Static headers come from `next.config.ts`: HSTS, nosniff, Referrer-Policy and Permissions-Policy.
- Set `poweredByHeader: false` and `productionBrowserSourceMaps: false`.
- CSP starts in Report-Only mode:
  - An allowlist CSP for public pages (Phase 1).
  - A **nonce-based CSP for authenticated areas** (`/dashboard`, `/admin`, from Phase 3).

**Caching (control 14)**
- With Next.js 16 Cache Components, `'use cache'` is a shared cache. Only public content goes inside it, never anything read from cookies or a session.
- Authenticated or user-specific responses are never shared-cached. Set `Cache-Control: private, no-store` and render them dynamically.
- Keep tokens and personal information out of URLs and cache keys.
- Protect revalidation endpoints with a secret compared in constant time.

**Errors and logging (control 15)**
- `error.tsx` shows generic copy only. No stack traces or internals reach users.
- Never log passwords, tokens, magic links, email addresses in full, or quiz answers.

**Supply chain and CI/CD (control 13)**
- Lockfile committed. Dependabot covers npm and GitHub Actions.
- Third-party actions are pinned to a commit SHA, and workflows have read-only default permissions.
- Secret, dependency and SAST scans run on every PR. A Critical finding blocks the merge.
- The protected `main` branch needs a PR with at least one reviewer.
- Subscribe to Next.js, React and Supabase security advisories. Framework vulnerabilities are treated as Critical: patch within 48 hours (section 8).
- **Dependabot and `npm audit` don't see the React that Next.js bundles.** Assess every Next.js and React advisory by hand, and record it in `docs/security/VULNERABILITIES.md`.
- Dependabot waits 14 days before proposing routine updates; security updates come straight away. Action updates are grouped, and the TypeScript and `@types/node` major versions are ignored.

**Images (section 4)**
- `images.remotePatterns` lists exact hosts only (for example Vimeo thumbnails), never wildcards.

**Forms and email (control 19)**
- Forms collect structured fields only: first name, last name, email, store code and consent flags. **No free-text fields**, which also keeps the Academy out of the Highly Sensitive data class.
- Bot protection, server-side validation, a collection notice and a privacy link at the point of collection.
- Email comes from an SPF, DKIM and DMARC-aligned domain. User input never sets mail headers.

**Third-party scripts (control 20)**
- Every script is in the tag inventory: GA4, and the Vimeo player.
- No personal information or form values in analytics events or URLs, and no analytics on `/dashboard`, `/admin` or `/join`.

**AI (control 21)**
- Not applicable. The Academy has no AI features. If one is added, control 21 applies in full.

## 4. Controls mapped to phases

| Control | Academy implementation | Phase |
|---|---|---|
| 01 HTTPS and TLS | Netlify-managed TLS; HTTPS redirect; HSTS header (no `includeSubDomains` until the domain is confirmed); CAA on carbonoffroad.com.au | 1 (header), 7 (domain, CAA) |
| 02 Authentication and recovery | Supabase Auth magic link (single-use, time-limited); neutral "check your email" response whether or not an account exists; rate limits; email-change notification; admin recovery logged against a named operator | 3 |
| 03 MFA and step-up | MFA on every infrastructure account (Phase 0). **Admins enrol TOTP or passkey MFA, enforced server-side (`aal2` in RLS and checks)**. Step-up for role changes, store-code regeneration, certificate revocation, CSV exports and settings changes | 0, 6 |
| 04 Authorisation | RLS deny-by-default; permissions matrix; server-side tests for every allowed and denied cell that matters, including direct calls to Server Actions and Route Handlers | 1 onwards |
| 05 Input validation | Zod in every Server Action and Route Handler; fail closed. No uploads (if one is added, the full upload rules apply) | 3 onwards |
| 06 Injection | Query builders only; allowlisted identifiers; CSV formula neutralisation | 1 onwards, 6 |
| 07 XSS | React escaping; no `dangerouslySetInnerHTML`; URL validation; CSP | 2 onwards |
| 08 CSRF and CORS | Server Actions' origin check (no `allowedOrigins` widening); `SameSite` cookies; no CORS on state-changing routes; `/api/certified-stores` is read-only GET | 3, 5 |
| 09 Sessions | Supabase SSR cookies: Secure, appropriate SameSite, refresh rotation; sign-out revokes; sessions re-evaluated after an email change. Cookie attributes reviewed against control 09 in Phase 3 | 3 |
| 10 Secrets and keys | `server-only` modules; Netlify context-scoped env vars; client-bundle secret scan; key inventory below | 1 onwards |
| 11 Browser headers | Static headers + Report-Only allowlist CSP (Phase 1); nonce CSP on authenticated routes (Phase 3); enforce after clean reports | 1, 3, 7 |
| 12 APIs and outbound | Fixed outbound hosts only (Supabase, Vimeo API); no user-supplied fetch URLs; rate limits on join, sign-in, quiz and `/go`; exact `remotePatterns` | 2 onwards |
| 13 Supply chain and CI/CD | Dependabot; SHA-pinned actions; CodeQL, gitleaks, `npm audit`; branch protection; SBOM at launch | 1, 7 |
| 14 Hosting and caching | Password-protected deploy previews on a staging Supabase project; no source maps; dynamic, `no-store` authenticated pages; rollback documented | 1, 3, 7 |
| 15 Logging and errors | Generic error pages (Phase 1); auth and admin audit events with an `admin_audit_log` table (Phase 6); redaction | 1, 3, 6 |
| 16 Testing and backups | Unit, RLS and integration tests in CI; Supabase Pro daily backups plus an isolated copy outside the production project; restore rehearsal; pen test | 7 |
| 17 Agency access | All accounts owned by Carbon Offroad (Phase 0); access register; named accounts only; business password manager; offboarding within one business day | 0 |
| 18 Domain, DNS and email | `academy` CNAME; no dangling records; SPF, DKIM and DMARC for the Academy sender, with DMARC moving to `p=reject` | 7 |
| 19 Forms and outbound email | Join and sign-in forms: structured fields, bot protection, collection notice; magic-link and certificate emails with no sensitive content | 3, 5 |
| 20 Third-party scripts | Tag inventory (GA4, Vimeo player); `next/script` with lazy strategies; no personal-information signals | 2, 7 |
| 21 AI features | Not applicable | — |
| 22 Availability and disclosure | Netlify CDN; rate limiting; external uptime and certificate monitoring alerting a named person; `/.well-known/security.txt` | 1 (security.txt), 7 |

## 5. Data classification and retention (draft for approval, section 5)

| Data | Class | System | Retention (proposed) | Deletion |
|---|---|---|---|---|
| Lessons, categories, settings, certified-store feed | Public | Supabase | Life of the Academy | Admin unpublish or delete |
| Certificate verification page (first name, last initial, store, dates) | Public, by design | Supabase | Certificate expiry + 12 months | Daily job |
| Quiz questions and correct answers | Internal (integrity-critical; answers never sent to the browser) | Supabase | Life of the lesson | Admin |
| Learner profile (name, email, store, role, consent flags) | Confidential | Supabase Auth and `profiles` | While active + 24 months of inactivity | Scheduled deletion, plus on request |
| Lesson progress, quiz attempts, certificates | Confidential | Supabase | As for the profile | Cascades with the profile |
| QR scans (slug, UTM values, timestamp; no IP stored) | Internal | Supabase | 24 months | Scheduled job |
| Store codes | Confidential (they grant store membership) | Supabase | Until regenerated | Admin regenerates |
| Auth and admin audit logs | Confidential | Supabase | 12 months | Scheduled job |
| Secrets and keys | Highly Sensitive | Netlify env vars, password manager | Rotated per the key inventory | Revoke at the provider |

All retention periods are proposals. Rich approves them before Phase 3. Section 5 says Tier B/C projects don't launch with an undefined retention period for Confidential data.

## 6. Key inventory (control 10, Tier C)

| Key | Purpose | Where it lives | Rotation |
|---|---|---|---|
| Supabase publishable key | Public reads under RLS | Netlify env var (public) | When compromised |
| Supabase secret key | Admin actions, certificate issuing, scheduled jobs | Netlify env var, server-only, production context only | Every 12 months, and on staff change |
| Staging Supabase keys | Deploy previews | Netlify deploy-preview context | Every 12 months |
| Vimeo access token (read-only) | Video metadata | Netlify env var, server-only | Every 12 months |
| SMTP credentials | Transactional email | Supabase Auth SMTP settings | Every 12 months |

## 7. Australian obligations to confirm (section 6)

**Privacy Act and the APPs**
- Carbon Offroad is assumed to be an APP entity (turnover above A$3 million). Rich to confirm and record the basis.
- Requirements:
  - A collection notice (APP 5) at join and sign-in.
  - A privacy policy that meets APP 1, linked in the footer.
  - The overseas recipients disclosed (APP 8): Vimeo (US), Netlify edge and functions (check the functions region), the email provider and GA4.

**Automated decision-making (from 10 December 2026)**
- Certificates are issued automatically from quiz results.
- Rich to decide, with advice if needed, whether this "could reasonably be expected to significantly affect an individual's rights or interests". If so, the privacy policy discloses it.

**Other obligations**
- **Notifiable Data Breaches:** confirm whether Carbon Offroad is covered, and who assesses and notifies.
- **Spam Act:** the marketing opt-in is a separate, unticked box. Account emails are transactional only.
- **Ransomware payment reporting (Cyber Security Act 2024):** add to the incident playbook.

## 8. Security decisions

**Status:** Rich approved all nine recommendations on 29 October 2026. The actions that follow from them are tracked in `docs/BUILD_PLAN.md` Phase 0 (Security).

| # | Decision | Recommendation |
|---|---|---|
| S1 | Approve Tier C (ASVS Level 2) | Approve. The framework sets this as the minimum for accounts and roles |
| S2 | Name the independent reviewer and the penetration tester | An external reviewer for PRs and evidence; a pen test booked for Phase 7 |
| S3 | Admins need MFA on top of the magic link (changes PRD 5.6) | Yes, TOTP or passkey enforced server-side |
| S4 | A second Supabase project for staging and deploy previews | Yes. Free plan; Sydney region |
| S5 | Password-protect Netlify deploy previews | Yes (Netlify: Site configuration → Access and security → Password protection, non-production deploys) |
| S6 | A security.txt contact mailbox | A monitored `security@carbonoffroad.com.au` alias |
| S7 | A separate named GitHub account for Claude Code's PRs | Yes. GitHub won't let you approve your own PR, so PRs need a different author from the reviewer |
| S8 | Repo visibility and SAST | Make it private. CodeQL is free on public repos but needs paid GitHub Code Security on private ones. If private without that, use Semgrep Community Edition in CI. gitleaks needs a free licence key for organisation repos |
| S9 | Netlify functions region | Sydney (ap-southeast-2) if the plan allows. Otherwise disclose US processing (APP 8) |

## 9. How to check work against the framework

Before calling any phase done:

1. List the controls the phase touches (table in section 4 above) and record evidence in `docs/security/EVIDENCE.md`.
2. Re-read those controls in the framework document, not just this extract. Then confirm each verification procedure has been done, and cite the control numbers in the PR description.
3. Flag anything the framework requires that isn't done yet, with its owner and target phase. Exceptions need a justification, compensating controls, an expiry date and Rich's written approval (section 1).

To read the framework as text on this machine, unzip `word/document.xml` from the .docx with PowerShell's `System.IO.Compression.ZipFile` and strip the tags. There's no Word or Python here.
