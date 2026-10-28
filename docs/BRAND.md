# Carbon Offroad Academy: Brand Reference

Build-ready extract from the **Carbon Offroad Brand Guidelines v1.0 (October 2026)**. The guidelines are the source of truth. If anything here conflicts with them, the guidelines win. All public-facing designs are approved by the Sales and Marketing Manager.

---

## Golden rules

1. The logo is black or white. Always. Never recolour it, never remove the badge, never stretch it.
2. Carbon Cyan `#00A4C7` is the only accent colour. Use it for about 10% of any layout.
3. Eurostile is the typeface. Extended Black for headlines, Bold for subheads, Regular for body. Arial only where Eurostile can't be used.
4. "Australian engineered, field tested." Never "Australian made".
5. Safety is never a joke. No unsafe recoveries in imagery, video or copy.

## Colour tokens

| Token | Hex | Use | Never |
|---|---|---|---|
| `carbon-black` | `#111111` | Body text, headlines, dark backgrounds | — |
| `carbon-white` | `#FFFFFF` | Backgrounds, text on dark | — |
| `carbon-cyan` | `#00A4C7` | Primary buttons, links, active states, progress bars, the slash, icons, key-figure highlights | Body text on white; large background areas; the logo |
| `gunmetal` | `#303030` | Footer, secondary dark panels | Small text on black |
| `concrete` | `#909090` | Captions on black, dividers, disabled states | Body text on white |
| `dust` | `#E6E6E6` | Light panels, table stripes, form fields, section backgrounds | Text |
| `logo-black` | `#000000` | Logo only | — |

**Balance:** 60% black and white, 30% greys, 10% cyan. If a screen looks blue, there's too much cyan.

**Do not use:** red, orange or yellow as brand colours (red is allowed only for genuine safety warnings and form error states), gradients, neon, metallic effects, camo, tints of cyan or other blues.

### Approved contrast pairs (WCAG 2.1)

| Pair | Ratio | Use |
|---|---|---|
| Black on white | 18.9:1 | All text |
| White on black | 18.9:1 | All text |
| White on Gunmetal | 13.2:1 | All text |
| Black on Dust | 15.1:1 | All text |
| Cyan on black | 6.4:1 | Text OK |
| Black on cyan | 6.4:1 | Button labels |
| White on Concrete | 3.2:1 | Large text only |
| Cyan on white | 2.9:1 | **Fails for text.** Graphics, icons, slash and large shapes only |

Links on white backgrounds: Carbon Black text with a cyan underline (not cyan text).

## Typography

Font stack: `font-family: "Eurostile Extended", "Eurostile", Arial, sans-serif;`

| Level | Desktop | Mobile | Font | Case |
|---|---|---|---|---|
| H1 | 44–56 px | 30–36 px | Eurostile Extended Black | UPPERCASE |
| H2 | 30–36 px | 24–28 px | Eurostile Extended Black | UPPERCASE |
| H3 | 20–24 px | 18–20 px | Eurostile Bold | Sentence case |
| Body | 16–18 px, line height 1.5 | 16 px, line height 1.5 | Eurostile Regular | Sentence case |
| Small / meta | 13–14 px | 13–14 px | Eurostile Regular | Sentence case |
| Buttons | 14–16 px, +5% tracking | 14–16 px | Eurostile Bold or Extended Black | UPPERCASE |

Rules: left-align by default; body lines 45–80 characters; one H1 per page; cyan may highlight one key word in a headline (on dark backgrounds only); no letterspacing on lowercase; no other typefaces.

**Licensing (blocker for launch):** Eurostile is a commercial typeface. Web use needs a web font licence, and embedding in PDF certificates needs a licence that allows it. The font files currently in the Carbon asset folder are of unknown origin and **must not be committed or shipped**. Until licensed web fonts are in place, build with the Arial fallback.

## Logo

- Use the master SVG files from the Carbon Offroad asset library (Logos and Branding folder). Never redraw, retype or recreate the logo in code or a font. Never generate it with AI.
- Header: full (horizontal) logo, top left. Black on white header, or white-on-black badge on a black header.
- Favicon: icon only, 32×32 and 180×180 (Apple touch).
- Minimum sizes: full logo 120 px wide; compact 60 px; icon 32 px (favicon 16 px).
- Clear space: X on all sides, where X = height of the C in CARBON.
- One logo per page. Nothing (including the slash) inside the clear space.
- On concrete texture or photography, always use the white-on-black badge, never the outline logo.

Files needed in `/public/brand/`:
- `logo-full-black-transparent.svg`
- `logo-full-white-on-black.svg`
- `logo-compact-white-on-black.svg`
- `icon.svg`, `favicon-32.png`, `apple-touch-icon-180.png`
- `concrete-texture.jpg` (from the master wrap artwork, web-optimised)

## UI components

### Buttons
- **Primary:** cyan fill, Carbon Black uppercase text.
- **Secondary:** black outline, black text (white outline and text on dark backgrounds).
- Minimum height 44 px.
- **Square or angled corners only. No pills, no rounded corners.** Don't mix rounded and angled corners on one screen.
- Angled variant: a single cut corner, or a parallelogram matching the badge angle.

### Layout
- Backgrounds: white and Dust. Carbon Black text. Gunmetal footer.
- Hero and section headers may use the concrete texture with a 40–60% Carbon Black overlay when text sits on top.
- Lead with one strong image, one headline, one action.

### The slash
- The diagonal slash matches the angle of the logo badge. Never invent a new angle.
- Single slash: one cyan bar. Double slash: cyan + black (or cyan + white on dark). Gap = half a bar width.
- Use as a divider, image edge, corner accent or page-transition wipe.
- **One slash motif per screen.** Never behind or through the logo.

### Icons
- Simple solid or 2 px line icons with squared ends. Black, white or cyan only. One icon style throughout.

### Progress and certification
- Progress bars and completion ticks: cyan on black or Gunmetal; Concrete for incomplete.
- Certified badge: black badge shape with white text and a cyan slash. Must not resemble or alter the Carbon Offroad logo.

### Video player
- Vimeo player colour set to `#00A4C7`.
- Videos follow the guidelines' video section: optional double-slash intro sting, white-on-black watermark top right, lower thirds as black bar with cyan edge, end card with compact logo and LIGHTER | FASTER | STRONGER.

## Certificate PDF

- A4 landscape (or portrait, design TBC). White background, Carbon Black text.
- Full logo, black on transparent, top left, 50–60 mm wide.
- Title in Eurostile Extended Black uppercase (Arial Bold if no PDF-embedding licence).
- Cyan rule or slash accent; one only.
- Footer: Carbon Offroad | KPD Industries Pty Ltd | ABN 80 142 983 382 | 1300 780 141 | carbonoffroad.com.au
- Certificate number and verification URL.

## Email (magic link, certificate issued)

- 600 px max width, single column.
- Header: black bar, full logo white-on-black centred, 160–200 px wide.
- Body: Arial 16 px, line height 1.5, `#111111` on white.
- CTA: cyan `#00A4C7` button, `#111111` bold uppercase text, min 44 px tall.
- Footer: `#303030` background with address and phone in white.
- Every image has alt text. Test on mobile and in dark mode.

## Voice and microcopy

Straight-talking, confident, practical. "We" for Carbon Offroad, "you" for the learner. Humour off for safety and how-to content.

| Context | Example |
|---|---|
| Primary CTA | START LESSON / TAKE THE QUIZ / GET CARBON CERTIFIED |
| Quiz pass | Nailed it. That's one more lesson done. |
| Quiz fail | 2 of 3 correct. Have another look at the video and try again. |
| Certified | You're Carbon Certified. Your certificate is ready to download. |
| Empty state | No lessons started yet. Pick one below and get going. |
| Error | Something went wrong on our end. Give it another go in a minute. |
| Join page | You're joining BCF Robina. Enter your details and we'll email you a sign-in link. |

### Writing rules
- Australian English (colour, tyre, organise, centre, licence).
- "Carbon Offroad", two words. "Carbon" alone is fine after first mention.
- Product names exactly as on the website, including version: Carbon 12K V3X, Scout Pro 10K V3.
- Specs as figures with a space before the unit, metric first: 5,443 kg (12,000 lb).
- Sentence case for body and subheads. Uppercase only for Eurostile Extended headlines and buttons.
- No exclamation marks in headlines.
- Never: mate, cheap, budget, unbreakable, indestructible, bulletproof, game-changer, revolutionary, next-level, send it, full send, YOLO.
- Never name competitors. Never show or describe unsafe recovery practice.
- Warranty wording, if used, must match the official terms exactly: lifetime mechanical warranty; 5 years electrical and water ingress, extended to 7 years when registered within 90 days.
- No pricing anywhere in the Academy.

## Imagery

- Real rigs, real recoveries, real Australian terrain. No stock photos of generic 4x4s.
- Correct, safe technique visible in every recovery image.
- Carbon Offroad gear clearly in frame; no competitor branding.
- Natural light, slightly desaturated, no heavy filters or HDR.
- No AI-generated images presented as real recoveries, customers or products.
