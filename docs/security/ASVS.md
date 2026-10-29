# OWASP ASVS 5.0.0 Level 2 register (Tier C, security framework section 1)

Started 29 October 2026 for Phase 3 (accounts and progress). Requirement IDs and levels come from the OWASP ASVS repository (`5.0/en`, master branch, read 29 October 2026). The summaries are ours; the ASVS text is the authority.

**Status values:**
- **Met:** implemented and verified, with evidence
- **Planned (Task N):** designed in the Phase 3 plan, not built yet
- **Partial:** meets part of the requirement; the gap is stated
- **Exception:** a documented deviation with Rich's written approval (`EVIDENCE.md`)
- **N/A:** doesn't apply, with the reason
- **Phase N:** due in a later phase

Phase 3 plan: `docs/superpowers/plans/2026-10-29-phase-3-accounts-and-progress.md`.

## V2 Validation and Business Logic

| ID | Level | Summary | How the Academy meets it | Status |
|---|---|---|---|---|
| 2.1.1 | 1 | Validation rules documented per data item | Zod schemas in `src/lib/validation/` (email, names, store code, slugs, UTMs) are the documentation, and each has a comment | Met (local tests, 29 Oct 2026) |
| 2.1.2 | 2 | Rules for combined data items documented | A store code must resolve to an active store before a join is accepted; there are no other combined fields | Met (local tests, 29 Oct 2026) |
| 2.1.3 | 2 | Business limits documented, per user and global | Plan decisions 4 and 5, and the function comments: one save every 2 s per learner per lesson, edge limits per IP, 60 QR scans per link per minute | Met (local tests, 29 Oct 2026) |
| 2.2.1 | 1 | Positive (allowlist) validation | Regex allowlists for names, codes and slugs; enums for UTMs; `safeNextPath` allowlist | Met (local tests, 29 Oct 2026) |
| 2.2.2 | 1 | Validation enforced server-side | Every Server Action and Route Handler parses with Zod; the database re-checks with constraints and functions | Met (local tests, 29 Oct 2026) |
| 2.2.3 | 2 | Related items are consistent | The trigger ignores a code that doesn't match an active store; progress position is clamped to the lesson's duration | Met (local tests, 29 Oct 2026) |
| 2.3.1 | 1 | Flows run in order, with no skipped steps | Sign-in needs a valid token; join needs a valid code or none; change store needs a session and a code | Met (local tests, 29 Oct 2026) |
| 2.3.2 | 2 | Business limits implemented | As in 2.1.3 | Met (local tests, 29 Oct 2026) |
| 2.3.3 | 2 | Operations are all-or-nothing (transactions) | Each write is a single database function call, so it runs in one transaction | Met (local tests, 29 Oct 2026) |
| 2.3.4 | 2 | Locking for limited resources | N/A: no limited-quantity resources | N/A |
| 2.4.1 | 2 | Anti-automation against excessive calls | Netlify edge rate limits; honeypot; Supabase email limits; per-learner save throttle | Met (edge limits on preview 15; Supabase limits local and staging) |

## V3 Web Frontend Security

| ID | Level | Summary | How the Academy meets it | Status |
|---|---|---|---|---|
| 3.2.1 | 1 | Content can't render in the wrong context | `nosniff` on every response; no user uploads; JSON comes only from Server Actions | Met (headers captured 29 Oct 2026, Phase 1) |
| 3.2.2 | 1 | Text rendered as text, not HTML | React escaping; no `dangerouslySetInnerHTML` | Met (Phase 2, control 07) |
| 3.3.1 | 1 | Cookies `Secure`, with a `__Host-` or `__Secure-` prefix | `__Host-sb-auth`, `Secure`, on HTTPS. Plain-http local development only uses the unprefixed name | Met (deploy preview 15, read by Rich in DevTools, 29 Oct 2026: `__Host-sb-auth`, HttpOnly, Secure, SameSite=Lax) |
| 3.3.2 | 2 | `SameSite` set per cookie's purpose | `Lax`: a learner arriving from an email link should land signed in, and state changes are POST-only with an Origin check | Met (local tests, 29 Oct 2026) |
| 3.3.3 | 2 | `__Host-` prefix unless deliberately shared | As 3.3.1 | Met (deploy preview 15, read by Rich in DevTools, 29 Oct 2026: `__Host-sb-auth`, HttpOnly, Secure, SameSite=Lax) |
| 3.3.4 | 2 | `HttpOnly` on cookies scripts don't need | `HttpOnly`: there is no browser Supabase client | Met (local: no session cookie visible to scripts) |
| 3.4.1 | 1 | HSTS on all responses, at least a year, and subdomains at L2 | Netlify serves `max-age=31536000; includeSubDomains; preload` on `*.netlify.app`. The app's own header lacks `includeSubDomains` until the academy domain is live | Partial (Phase 7: add `includeSubDomains` with the domain) |
| 3.4.2 | 1 | Fixed CORS `Access-Control-Allow-Origin` | No CORS headers are sent; Server Actions are same-origin | Met (no CORS) |
| 3.4.3 | 2 | CSP with `object-src 'none'` and `base-uri 'none'`, plus an allowlist or nonces | Public pages: allowlist CSP. Account pages: nonce CSP. Both set `object-src 'none'` and `base-uri 'none'` (review L1). **Both Report-Only** until the Phase 7 gate (decision 10, as control 11 requires) | Partial (enforced at Phase 7) |
| 3.4.4 | 2 | `nosniff` on all responses | `next.config.ts` headers on every path | Met (Phase 1 capture) |
| 3.4.5 | 2 | Referrer policy | `strict-origin-when-cross-origin` everywhere; `no-referrer` on `/auth/*` | Met (production-build header matrix, 29 Oct 2026) |
| 3.4.6 | 2 | CSP `frame-ancestors` on every response | In both CSPs, but Report-Only; `X-Frame-Options: DENY` is enforced meanwhile | Partial (Phase 7) |
| 3.5.1 | 1 | Cross-origin requests to sensitive functions are validated (CSRF) | Next.js Server Actions compare `Origin` with the host; `SameSite=Lax` | Met (forged-origin post refused, local production build) |
| 3.5.2 | 1 | If relying on CORS preflight, it can't be bypassed | N/A: CORS preflight isn't relied on | N/A |
| 3.5.3 | 1 | Sensitive functions use POST, not GET | Sign-in confirm, sign-out, join, change store and progress are all POST (Server Actions). The confirm page's GET only renders a button (T-12) | Met (local tests, 29 Oct 2026) |
| 3.5.4 | 2 | Separate apps on separate hostnames | The Academy will be its own host (`academy.carbonoffroad.com.au`). The subdomain isn't set up yet; today it runs on `carbonoffroadacademy.netlify.app` | Phase 7 (domain) |
| 3.5.5 | 2 | `postMessage` origins checked | The Vimeo player SDK handles `postMessage` with `player.vimeo.com` only; the app adds no listeners of its own | Met (Phase 2) |
| 3.7.1 | 2 | Only supported client-side technology | React 19, Next.js 16, no plugins or Flash | Met |
| 3.7.2 | 2 | Auto-redirects off-site only to allowlisted destinations | `/go` uses relative paths only; `safeNextPath` stays on site | Met (local tests, 29 Oct 2026) |

## V6 Authentication

The Academy's only learner authentication is an **email magic link**. ASVS 5.0 treats email as an unsafe out-of-band mechanism (V6.6 introduction) and expects MFA or a combination of factors at Level 2 (6.3.3). That deviation is **exception EX-02**, approved by Rich on 29 October 2026, in `EVIDENCE.md`. It covers 6.3.3, 6.5.2, 6.6.2, 7.5.2 and the NIST SP 800-63B email deviation noted under 7.1.1. Admin accounts (Phase 6) must use MFA (control 03).

| ID | Level | Summary | How the Academy meets it | Status |
|---|---|---|---|---|
| 6.1.1 | 1 | Anti-automation and lockout controls documented | Threat model T-10 and T-11, plan decision 4. There's no lockout, because there are no passwords to guess; links are rate limited per IP and per address | Met (documented: threat model T-10, T-11, T-28) |
| 6.1.2 | 2 | Context-specific banned password words | N/A for the app (no passwords). The Auth API password pathway uses Supabase leaked-password protection and a 15-character minimum (6.1.3) | N/A |
| 6.1.3 | 2 | Every authentication pathway documented | (1) Magic link through the app. (2) **Supabase Auth API, called directly with the publishable key:** magic link; the bare one-time code at `/verify` (10 characters, `token_verifications` 10 per 5 minutes per IP); and email and password at sign-up, which the email provider can't switch off separately. Password sign-ups need the mailbox (confirm email on), 15 characters and the leaked-password check. **No password can be set or changed afterwards** (`refuse_password_change` trigger, review H1). The same name check and profile rules apply on every pathway. (3) Admin MFA from Phase 6 | Met (documented; password change refused by DB test) |
| 6.2.1–6.2.12 | 1–2 | Password rules | N/A for the app: no passwords are set, entered or stored. For the API password pathway, see 6.1.3 | N/A |
| 6.3.1 | 1 | Credential-stuffing and brute-force controls implemented | Edge rate limits; Supabase per-address and hourly email limits; single-use, short-lived tokens | Met (edge and Supabase limits) |
| 6.3.2 | 1 | No default accounts | None are created. Test users are fictional, local or staging only, and deleted after use | Met (fictional test users only, removed after use) |
| 6.3.3 | 2 | MFA, or a combination of factors, to access the application | **Not met for learners:** a magic link is a single factor | **Exception EX-02** (approved 29 Oct 2026) |
| 6.3.4 | 2 | No undocumented pathways; consistent strength | As 6.1.3 | Met (documented; same DB rules on every pathway) |
| 6.4.1 | 1 | Activation codes are random, short-lived and single use | Supabase generates the token hashes; 10-minute expiry; single use | Met (local and staging, 29 Oct 2026) |
| 6.4.2 | 1 | No password hints or secret questions | None | Met |
| 6.4.3 | 2 | Secure account recovery that doesn't bypass MFA | No passwords to reset. A learner who loses their mailbox asks Rich. The runbook in `PERMISSIONS.md` covers: verify the person, change the email with the admin API, sign them out everywhere, notify both addresses, and log it against Rich by name (control 02, review M4) | Partial (manual runbook; no admin tooling until Phase 6) |
| 6.4.4 | 2 | Identity proofing when an MFA factor is lost | Phase 6 (admin MFA) | Phase 6 |
| 6.5.1 | 2 | Out-of-band codes usable once | Supabase magic links are single use; a reused link shows "expired or already used" | Met (local: reused link refused) |
| 6.5.2 | 2 | Low-entropy lookup secrets stored hashed, resistant to guessing | Supabase stores a hash of the email and the one-time code, not a salted slow hash. With `otp_length = 10` (about 33 bits), a 10-minute expiry and Supabase's verification limit, guessing is impractical, but this is still short of the requirement | **Exception EX-02** (approved 29 Oct 2026) |
| 6.5.3 | 2 | Codes generated with a CSPRNG | Supabase Auth | Met (provider) |
| 6.5.4 | 2 | At least 20 bits of entropy | `otp_length = 10`, the maximum Supabase allows, gives about 33 bits. The token hash is derived from this code, so it adds no entropy of its own (review M1) | Met (code length 10 on local and staging) |
| 6.5.5 | 2 | Out-of-band requests expire within 10 minutes | **10 minutes** (`otp_expiry = 600`). Tightened from the approved 15 minutes on 29 Oct 2026 to meet this requirement | Met (local and staging, 29 Oct 2026) |
| 6.6.1 | 2 | Phone and SMS OTP only for verified numbers | N/A: no SMS or phone | N/A |
| 6.6.2 | 2 | Out-of-band tokens bound to the original request | **Not met:** the token-hash link works in any browser, so staff can open it on the store device or their phone. PKCE would bind it to the requesting browser but break that cross-device use | **Exception EX-02** (approved 29 Oct 2026) |
| 6.6.3 | 2 | Brute-force protection on code-based out-of-band auth | Supabase `token_verifications` limit (10 per 5 minutes per IP), which also covers direct API calls that skip Netlify; 10-character code; 10-minute expiry; `/auth/*` limited at the edge too | Met (local and staging, 29 Oct 2026) |
| 6.8.1–6.8.4 | 2 | External identity providers | N/A: no SSO, SAML or external IdPs | N/A |

## V7 Session Management

| ID | Level | Summary | How the Academy meets it | Status |
|---|---|---|---|---|
| 7.1.1 | 2 | Idle and absolute timeouts documented and justified against NIST SP 800-63B | 7-day inactivity and 30-day absolute (decision 3); the idle limit is tight because of shared store devices. **Deviation:** NIST SP 800-63B doesn't accept email as an out-of-band authenticator, so these lifetimes rest on a mechanism NIST excludes. Recorded in EX-02 | Met (documented); NIST email deviation in EX-02 |
| 7.1.2 | 2 | Concurrent sessions documented | Unlimited (staff use the store device and their own phone); "Sign out on all devices" ends them all | Met (documented) |
| 7.1.3 | 2 | Federated session management documented | N/A: no federation | N/A |
| 7.2.1 | 1 | Session tokens verified by a trusted backend | `getUser()` on pages; `getClaims()` (signature checked) in actions; Postgres checks the JWT and `auth.sessions` | Met (local tests, 29 Oct 2026) |
| 7.2.2 | 1 | Dynamically generated tokens, not static keys | Supabase JWTs and refresh tokens | Met (provider) |
| 7.2.3 | 1 | Reference tokens are CSPRNG with enough entropy | Supabase refresh tokens | Met (provider) |
| 7.2.4 | 1 | New token on every authentication; the old one ends | `verifyOtp` issues a new session; `confirmSignIn` signs out any existing session on the device first | Met (local tests, 29 Oct 2026) |
| 7.3.1 | 2 | Inactivity timeout enforced | Supabase `inactivity_timeout = 168h`. Supabase Auth enforces it when the access token is refreshed (checked on staging 29 Oct 2026: `auth.sessions.not_after` stays empty for magic-link sessions). So a session that has passed the limit keeps working for at most one access-token lifetime (1 hour, `jwt_expiry = 3600`) | Met, with up to 1 hour of lag (local and staging settings) |
| 7.3.2 | 2 | Absolute lifetime enforced | Supabase `timebox = 720h`. Supabase Auth enforces it when the access token is refreshed (checked on staging 29 Oct 2026: `auth.sessions.not_after` stays empty for magic-link sessions). So a session that has passed the limit keeps working for at most one access-token lifetime (1 hour, `jwt_expiry = 3600`). The `not_after` check in `current_learner()` only applies to session types that set it | Met, with up to 1 hour of lag (local and staging settings) |
| 7.4.1 | 1 | After logout or expiry, the session can't be used | Sign-out ends the Supabase session. `current_learner()` checks `auth.sessions`, so a copied access token stops working at the database at once | Met (DB test: copied token refused after sign-out) |
| 7.4.2 | 1 | Sessions end when an account is disabled or deleted | Deleting the user removes its sessions. A deactivated profile gets nothing from `current_learner()`, and the app treats it as signed out. Phase 6's admin deactivation must also call the admin API to delete the sessions | Met (DB test); Phase 6 admin action still to call the admin sign-out |
| 7.4.3 | 2 | Option to end other sessions after an authentication factor changes | Passwords can't be set. The email (the only factor) can change only with confirmation from both addresses. Learners get an email-changed notice, and "Sign out on all devices" is always on the dashboard | Met (local tests, 29 Oct 2026) |
| 7.4.4 | 2 | Visible logout on every authenticated page | Dashboard, and the signed-in join and change-store views | Met (local: dashboard and signed-in join pages) |
| 7.4.5 | 2 | Admins can end a user's or everyone's sessions | Phase 6 (admin area) | Phase 6 |
| 7.5.1 | 2 | Re-authentication before changing sensitive attributes | Email change through the Auth API needs confirmation links from both the old and new addresses (`double_confirm_changes`), so control of the current mailbox is proven again. Passwords can't be set. The app offers no email-change screen | Met (local and staging, 29 Oct 2026) |
| 7.5.2 | 2 | Users can view and end their active sessions | **Partly:** "Sign out on all devices" ends them all, but there's no list of sessions | **Exception EX-02** (approved 29 Oct 2026) |
| 7.6.1 | 2 | RP and IdP session lifetimes | N/A: no federation | N/A |
| 7.6.2 | 2 | A session is created only by explicit user action | The magic link opens a confirm page; the session starts only when the learner presses Continue (POST) | Met (local and staging preview: Continue required) |

## V8 Authorization

| ID | Level | Summary | How the Academy meets it | Status |
|---|---|---|---|---|
| 8.1.1 | 1 | Function- and data-level rules documented | `docs/security/PERMISSIONS.md` | Met (documented 29 Oct 2026); tests in Task 3 |
| 8.1.2 | 2 | Field-level rules documented | `PERMISSIONS.md`: `store_code` not readable by learners; `role` and `store_id` not writable | Met (documented) |
| 8.2.1 | 1 | Function-level access restricted | Grants on functions; `requireUser()` in actions | Met (local tests, 29 Oct 2026) |
| 8.2.2 | 1 | Data-level access restricted (IDOR) | RLS on `current_learner()`; functions take no user ID | Met (local tests, 29 Oct 2026) |
| 8.2.3 | 2 | Field-level access restricted | Column grant on `stores`; no update grants on `profiles` | Met (local tests, 29 Oct 2026) |
| 8.3.1 | 1 | Authorisation enforced server-side | Postgres RLS and functions; Server Actions re-check; `proxy.ts` is never the access check | Met (local tests, 29 Oct 2026) |
| 8.4.1 | 2 | Cross-tenant isolation | Stores act like tenants: learners see only their own store and partner, and can move only with a code | Met (local tests, 29 Oct 2026) |

## V16 Security Logging and Error Handling

| ID | Level | Summary | How the Academy meets it | Status |
|---|---|---|---|---|
| 16.1.1 | 2 | Log inventory | `docs/SECURITY.md` section 10 | Met (documented 29 Oct 2026) |
| 16.2.1 | 2 | Who, what, when and where in each entry | `logSecurityEvent`: event, user ID, error code, Netlify request ID, UTC time | Met (local tests, 29 Oct 2026) |
| 16.2.2 | 2 | Synchronised clocks; UTC timestamps | `toISOString()` (UTC); Netlify and Supabase clocks are provider-managed | Met (local tests, 29 Oct 2026) |
| 16.2.3 | 2 | Logs go only to documented places | Netlify function and edge logs, plus Supabase Auth, API gateway and Postgres logs (log inventory, `SECURITY.md` section 10) | Met (documented) |
| 16.2.4 | 2 | Logs in a common, readable format | One JSON object per line | Met (local tests, 29 Oct 2026) |
| 16.2.5 | 2 | Sensitive data logged by protection level | The logger's types allow IDs and codes only, never emails, names, form data or tokens (T-22). Magic-link tokens sit in the URL fragment, so request logs never see them. Store codes in `/join/CODE` paths do appear in request logs: accepted and recorded in the inventory | Met (local tests, 29 Oct 2026) |
| 16.3.1 | 2 | All authentication attempts logged, success and failure | Supabase Auth logs every sign-in; the app also logs `sign_in_succeeded` and `sign_in_failed` | Met (local: sign_in_succeeded logged) |
| 16.3.2 | 2 | Failed authorisation attempts logged | **Partly:** failed store moves and progress saves are logged with their error code. RLS denials return empty results and aren't logged by Postgres by default | Partial (review in Phase 7 with log alerting) |
| 16.3.3 | 2 | Documented security events and control bypass attempts logged | Honeypot trips, unknown store codes, failed sign-ins; edge 429s appear in Netlify logs | Met (local tests, 29 Oct 2026) |
| 16.3.4 | 2 | Unexpected errors and control failures logged | Server Action failures log their error code; `error.tsx` shows a generic page; Netlify captures uncaught exceptions | Met (local tests, 29 Oct 2026) |
| 16.4.1 | 2 | Log injection prevented | `JSON.stringify` encodes every value; no free text is logged | Met (local tests, 29 Oct 2026) |
| 16.4.2 | 2 | Logs protected from access and change | Netlify and Supabase logs are readable only by named team members with MFA (control 17 access register) | Partial (MFA audit in Phase 7, control 03) |
| 16.4.3 | 2 | Logs shipped to a separate system | **Not yet:** Netlify log drains need a higher plan, and Supabase log export is Phase 7 work | Phase 7 |
| 16.5.1 | 2 | Generic message on unexpected errors | "Something went wrong on our end" in forms; `error.tsx` | Met (local tests, 29 Oct 2026) |
| 16.5.2 | 2 | Secure operation when external services fail | Progress failures are silent and playback continues; Supabase failures show the generic error and deny (fail closed) | Met (local tests, 29 Oct 2026) |
| 16.5.3 | 2 | Fails securely, never open | Every validation, auth and database error ends in a refusal: profile trigger, functions, actions | Met (local tests, 29 Oct 2026) |

## Other chapters (to do by the Phase 7 gate)

- **V1** Encoding and Sanitization: CSV export in Phase 6 (formula injection, control 06)
- **V4** API and Web Service: the certified-stores JSON feed (Phase 5)
- **V5** File Handling: certificate PDFs (Phase 5); no uploads
- **V9** Self-contained Tokens: Supabase JWT validation (provider); checked at Phase 7
- **V10** OAuth and OIDC: N/A (no OAuth)
- **V11** Cryptography: provider-managed; certificate verification IDs (Phase 5)
- **V12** Secure Communication: TLS and HSTS (control 01), Phase 7 domain setup
- **V13** Configuration: secrets, headers, source maps (partly done, Phases 1 and 2)
- **V14** Data Protection: retention register approved 29 Oct 2026; deletion jobs before Phase 7
- **V15** Secure Coding and Architecture: dependencies (control 13), already in CI
- **V17** WebRTC: N/A
