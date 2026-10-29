# Threat model (STRIDE, security framework section 5)

Tier C: documented and independently reviewed before Phase 3 (accounts). Phase 2 entries are below.

A threat closes when its control is implemented **and** verified.

## Entry points (Phase 2)

| Entry point | Who | Data |
|---|---|---|
| Public pages (`/`, `/lessons`, `/lessons/*`, `/certified`) | Anyone | Public content only, read through RLS with the publishable key |
| `/go/[slug]` | Anyone (QR codes) | Writes one scan row (slug, up to three UTM values, time) through `log_qr_scan()` |
| Vimeo iframe | Anyone who presses play | Third-party frame, `player.vimeo.com` only |

## Threats

| ID | Asset / flow | Threat / abuse case | STRIDE | Control | Status |
|---|---|---|---|---|---|
| T-01 | `/go` → `log_qr_scan` | SQL injection through the slug or UTM values | Tampering, EoP | Zod slug validation; UTM allowlist and character set; parameterised plpgsql; `search_path = ''` | Verified (DB tests, 29 Oct 2026) |
| T-02 | `/go` | Scan flooding to inflate counts or grow the table | DoS | Cap of 60 scans per link per minute in the function (mutation-checked); optional Netlify Traffic Rule; 24-month retention (data register) | Cap verified; Netlify rule pending |
| T-03 | `/go` | Open redirect to another site | Spoofing | Redirect built only from database slugs on the same origin | Verified (curl, 29 Oct 2026) |
| T-04 | `qr_links`, `qr_scans` | Reading or editing QR data with the publishable key | Information disclosure, Tampering | RLS on; all privileges revoked from anon and authenticated | Verified (DB tests) |
| T-05 | `/go` | Personal data in URLs reaching our database (for example `?email=`) | Information disclosure | Only five known UTM keys pass, and only three are stored; no IP stored | Verified (unit tests and curl) |
| T-06 | Lesson page | A malicious `vimeo_id` or warranty URL rendered into `src` or `href` | Tampering (XSS) | `isVimeoId` and `safeHttpsUrl` with a host allowlist; CSP `frame-src` allows Vimeo only | Verified (unit tests) |
| T-07 | Vimeo iframe | Third-party tracking of visitors | Information disclosure | Click-to-play; `dnt=1`; tag inventory; APP 8 disclosure | Implemented |
| T-08 | QR counts | Link scanners and bots open QR links ahead of the user, inflating counts | Repudiation (data quality) | Accepted: counts are indicative, not billing data | Accepted (29 Oct 2026) |

## Supabase security advisor review

Run on staging after the Phase 2 migration, 29 October 2026.

| Finding | Level | Decision |
|---|---|---|
| `rls_enabled_no_policy` on `qr_links`, `qr_scans` | INFO | **Intended.** Deny-all: no role reads or writes these tables directly. |
| `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable` on `log_qr_scan` | WARN | **Intended, by design.** The public `/go` route must record scans, and this function is the narrowest write path: one validated, capped insert with an empty `search_path` (T-01, T-02). The alternatives are worse: granting anon direct insert on `qr_scans` (more surface), or using the secret key on every public `/go` request. Re-review whenever the function changes. |
