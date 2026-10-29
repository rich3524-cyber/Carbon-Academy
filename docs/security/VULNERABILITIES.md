# Vulnerability register (security framework section 5, Appendix A)

Every advisory that could affect the Academy, with how it was validated and closed. Severity follows the advisory unless our exposure changes it. Targets follow section 8: a critical framework vulnerability is assessed within 24 hours and patched or mitigated within 48 hours.

| ID | Source | Affected component | Severity | Exposure in the Academy | Owner | Status / evidence |
|---|---|---|---|---|---|---|
| V-01 | React GHSA-xqc2-xf4c-x3h3 (14 Oct 2026): unauthenticated RCE in React Server Components | `react-server-dom-turbopack` / `-webpack` 19.3.0 (Next.js bundles its own copy) | Critical | **Not exposed.** Next.js 16.4.1 (14 Oct 2026) was the coordinated security release for this issue (Next GHSA-673q-mjm6-r5xr); we run 16.4.3. The app also has no `'use cache'` function returning typed arrays | Rich | **Closed, 29 Oct 2026.** Assessed from the React and Next.js advisories and the 16.4.1 release notes. The bundled React version string still reads `19.3.0-canary-278794d7-20261002`, because Next patches its vendored copy without changing the label |
| V-02 | React GHSA-h3gv-c5rc-p453 (14 Oct 2026): DoS in Server Functions | Same as V-01 | High | **Not exposed.** Fixed in Next.js 16.4.1 ("Denial of Service in App Router using Server Actions", GHSA-p3m5-59mp-jv5r). No Server Actions yet (Phase 3 adds them) | Rich | **Closed, 29 Oct 2026** |
| V-03 | Next.js GHSA-2464-fhr4-w9xw (14 Oct 2026): RCE in Image Optimization with SVG | `next` < 16.4.1 | Critical | **Not exposed.** On 16.4.3. SVGs are served `unoptimized` and `images.remotePatterns` is empty | Rich | **Closed, 29 Oct 2026** |
| V-04 | Next.js GHSA-h694-7cp9-m8p3, GHSA-3w37-wq28-93x7 (30 Sep 2026): `use cache` leaks across root params or Draft Mode | `next` < 16.3.8 | Medium | **Not exposed.** On 16.4.3; no root params or Draft Mode | Rich | **Closed, 29 Oct 2026** |

## Monitoring (control 13)

- **Dependabot alerts cover declared packages only.** They don't see the React copy inside Next.js, and `npm audit` didn't flag V-01. Treat Next.js and React advisories as critical regardless of what Dependabot says.
- **Watch for advisories:** on GitHub, watch `vercel/next.js` and `facebook/react` with **Custom → Security alerts** (Rich). Assess each one within 24 hours and record it here.
- **Patch quickly:** keep Next.js on the latest patch release of its line. Security updates bypass the Dependabot cooldown.
