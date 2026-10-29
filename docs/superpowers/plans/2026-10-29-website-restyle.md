# Website Restyle Plan

**Goal:** make the Academy look like carbonoffroad.com.au.

**Source:**
- the website's Shopify theme export ("King" 2.0.8 by Shine Dezign Infonet, downloaded by Rich on 29 Oct 2026)
- the live site, inspected 29 Oct 2026

**Decisions (Rich, 29 Oct 2026):**
- Use Saira.
- Match the website's rounded corners and pill buttons.
- Match the website's cyan header and footer, with a black top bar.
- Keep 16 px body text.
- No gradients.
- No shop features (no cart, search, payment icons or newsletter).

## Ground rules

- **Rebuild the look, don't copy the theme.** The theme is a paid licence for one Shopify store. Nothing from it (Liquid, CSS, JS, images or icons) goes into the repo. We recreate the look from the measurements below in our own Tailwind components.
- **Self-host the fonts.** Saira is a free Google font under the SIL Open Font Licence. It's loaded with `next/font/google`, which bundles the files into our own build. Browsers never contact Google, so there's no new vendor and the CSP stays `font-src 'self'`.
- **Accessibility wins over a pixel match.**
  - Text on cyan is black: 6.4:1 contrast (p.25). White on cyan is only 2.9:1, which fails WCAG AA for normal text, so the footer uses black text even though the website uses white.
  - Body text stays at 16 px; the website uses 14 px.
  - Focus states stay visible.
- **BRAND.md is updated to record Rich's approval.** Online, the website's look overrides p.32 and p.45 (square corners, ~10% cyan) and the Eurostile/Arial rule. Print, PDF, email and video keep following the guidelines.

## What the website uses (measured)

| Element | Website | Academy after the restyle |
|---|---|---|
| Font | Saira; headings weight 800, uppercase, letter-spacing about -0.02em; body 400 | The same, at 16 px for body |
| Page background | `#EEEEEE` | New `page` token |
| Top bar | Black, with social icons and the sales email on the left and an announcement centred | The same. Announcement: "GET CARBON CERTIFIED" linking to `/certified` (copy for approval) |
| Header | Full-width cyan; white-on-black logo badge on the left; bold uppercase black menu in the centre; icons on the right | The same. Menu: Lessons, Get certified, My Academy. Right side: an account icon to `/dashboard` and "Shop" to carbonoffroad.com.au. On phones, a menu button that opens the links |
| Buttons | Cyan pills (50 px radius), black text | Pills; primary stays cyan with black text; minimum 44 px tall |
| Cards | White, 25 px radius, on the grey page | White, 25 px radius |
| Form fields | 8 px radius | White, 8 px radius, Concrete border; error red as now |
| Footer | Cyan; white logo; columns for the ABN, quick links and contact; social icons | Cyan, white-on-black logo badge, black text: "KPD Industries Pty Ltd, ABN 80 142 983 382"; Academy links and privacy; contact (address, sales email, 1300 780 141, Mon–Fri 9am–5pm AEST); social icons |

Social links, taken from the theme settings:
- Facebook: `facebook.com/CarbonOffroadAU`
- Instagram: `instagram.com/carbonoffroad_australia`
- YouTube: `youtube.com/@carbonoffroad`
- TikTok: `tiktok.com/@carbonoffroad_au`

They open in a new tab with `rel="noopener noreferrer"` and no tracking. The icons are simple SVGs drawn for the Academy, not taken from the theme.

## Tasks

1. **BRAND.md and the brand guard.** Add a "Website style (approved 29 Oct 2026)" section with the table above. Update `tests/brand/guard.test.ts` so it allows only the named radius tokens (`rounded-pill`, `rounded-card`, `rounded-field`, `rounded-tile`) and still fails Tailwind's defaults (`rounded`, `rounded-lg` and so on). Add tokens to `globals.css`: `page`, `pill`, `card` (25 px), `field` (8 px), `tile` (10 px).
2. **Typography.** Load Saira (400, 600, 800) with `next/font/google`, keeping Arial as the fallback. Headings become uppercase and weight 800 with slightly tight letter-spacing.
3. **Header.** Add the black top bar and the cyan main bar. The mobile menu opens with a native `<details>` element, so there's no extra JavaScript, and it's keyboard-accessible. Run the header tests.
4. **Footer.** The cyan footer, its columns and social links, plus a test that every outbound link has `rel="noopener noreferrer"`.
5. **Components.** Button pills, Badge, Card, Field, FormMessage, ProgressBar, the video play facade, lesson cards and the home hero all get rounded corners and the new card and page surfaces. Keep one slash per screen, at the badge angle.
6. **Check every page** at 375 px and 1280 px, side by side with the website:
   - home, lessons, a category, a lesson and certified
   - sign-in, join, confirm and dashboard
   - privacy and 404

   Also contrast-check every text and background pair, run Lighthouse on home and a lesson, run the full suite and the header matrix (the CSP shouldn't change), and do a brand check.
7. **Commit on a branch** and write up a PR for Rich. The deploy preview is the sign-off.

## Not changing

- The magic-link email: Arial, as BRAND.md's email rules require, and already matching the website's email header.
- Certificates (Phase 5), which follow the print guidelines.
- Security behaviour: no CSP, cookie or Server Action changes.
