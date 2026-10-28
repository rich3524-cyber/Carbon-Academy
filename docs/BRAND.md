# Carbon Offroad Academy: Brand Reference

Build-ready extract from the **Carbon Offroad Brand Guidelines v1.0 (October 2026)**. The PDF is internal and partner use only, so it is not committed: keep a local copy at `docs/brand/Carbon_Offroad_Brand_Guidelines_v1.0.pdf` (git-ignored; see `docs/brand/README.md`). The guidelines are the source of truth. If anything here conflicts with them, the guidelines win. Page references (p.N) point to the PDF. All public-facing designs are approved by the Sales and Marketing Manager (p.4, p.69).

Items marked **[Academy decision]** are not in the guidelines. Items marked **[Approved]** were decided by the brand owner on 28 October 2026. All decisions are listed at the end.

---

## Golden rules (p.4)

1. The logo is black or white. Always. Never recolour it, never remove the badge, never stretch it.
2. Carbon Cyan `#00A4C7` is the only accent colour. Use it for about 10% of any layout.
3. Eurostile is the typeface. Extended Black for headlines, Bold for subheads, Regular for body. Arial only where Eurostile can't be used.
4. "Australian engineered, field tested." Never "Australian made".
5. Safety is never a joke. No unsafe recoveries in imagery, video or copy.

## Colour tokens (p.24–26)

| Token | Hex | RGB | Use | Never |
|---|---|---|---|---|
| `carbon-black` | `#111111` | 17/17/17 | Body text, headlines, dark backgrounds | — |
| `carbon-white` | `#FFFFFF` | 255/255/255 | Backgrounds, text on dark, breathing space | — |
| `carbon-cyan` | `#00A4C7` | 0/164/199 | Primary buttons, CTAs, links, active states, progress bars, the slash, icons, badges, key-figure highlights | Body text on white; large background areas; the logo |
| `gunmetal` | `#303030` | 48/48/48 | Footer, secondary dark panels, dark UI, video lower thirds | Small text on black |
| `concrete` | `#909090` | 144/144/144 | Captions on black, dividers, textures, disabled states | Body text on white |
| `dust` | `#E6E6E6` | 230/230/230 | Light panels, table stripes, form fields, section backgrounds | Text |
| `logo-black` | `#000000` | 0/0/0 | Logo only (the logo is always pure black or pure white) | — |
| `error-red` | `#C62828` | 198/40/40 | Form error states and genuine safety warnings only **[Approved]** | Decoration, buttons, headings, large areas, anything that isn't an error or a safety warning |

**Balance:** 60% black and white, 30% greys, 10% cyan. "If a layout looks blue, there is too much cyan." (p.24)

**Do not use (p.25):** red, orange or yellow as brand colours ("red is acceptable only for genuine safety warnings"), gradients, camo, neon, metallic effects, tints of cyan (light blues) or other blues. If you need a lighter tone, use Dust.

**Form errors [Approved]:** red is approved for form error states as well as safety warnings.
- Use `error-red` for the error message text and a 2 px field border, with an error icon. Colour is never the only signal (WCAG 1.4.1).
- Contrast: `#C62828` is 5.6:1 on white and 4.5:1 on Dust, so put error text on white below the field, not inside a Dust field.
- Red stays out of the brand palette otherwise.

### Approved contrast pairs (WCAG 2.1, p.25)

AA needs 4.5:1 for normal text and 3:1 for large text (24 px+, or 18.5 px+ bold).

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

Links on white backgrounds: Carbon Black text with a cyan underline, not cyan text. This follows from the cyan-on-white rule; the guidelines just say cyan is used for links (p.25, p.45).

## Typography (p.28–30)

Font stack: `font-family: "Eurostile Extended", "Eurostile", Arial, sans-serif;`

### Web and digital (p.29)

| Level | Desktop | Mobile | Font | Case |
|---|---|---|---|---|
| H1 | 44–56 px | 30–36 px | Eurostile Extended Black | UPPERCASE |
| H2 | 30–36 px | 24–28 px | Eurostile Extended Black | UPPERCASE |
| H3 | 20–24 px | 18–20 px | Eurostile Bold | Sentence case |
| Body | 16–18 px, line height 1.5 | 16 px, line height 1.5 | Eurostile Regular | Sentence case |
| Small / meta | 13–14 px | 13–14 px | Eurostile Regular | Sentence case |
| Buttons | 14–16 px, +5% tracking | 14–16 px | Eurostile Bold or Extended Black | UPPERCASE |

### Print and documents (p.29), used for the certificate PDF

| Level | Font | Size / leading | Case |
|---|---|---|---|
| H1 / title | Extended Black | 28–36 pt / 1.1 | UPPERCASE, one per page |
| H2 / section | Extended Black | 18–22 pt / 1.2 | UPPERCASE, cyan rule or slash allowed beneath |
| H3 / subhead | Bold | 12–14 pt / 1.25 | Sentence case, Gunmetal or black |
| Body | Regular | 9.5–11 pt / 1.35–1.45 | Sentence case, left aligned, ragged right |
| Caption / label | Regular | 7.5–9 pt / 1.3 | Sentence case, Concrete or Gunmetal |

### Rules (p.29, p.65)

- **Do:** left-align by default; ragged right; body lines 45–80 characters; one H1 per page; cyan may highlight one key word in a headline (on dark backgrounds only, because cyan on white fails contrast).
- **Don't:**
  - use any other typeface;
  - set body copy in Extended Black or all caps;
  - stretch, condense, outline or add effects to type;
  - letterspace lowercase or body text;
  - centre long paragraphs.
- **Never mix Arial and Eurostile in the same document** (p.28, p.65). On the web the font stack falls back as a whole. A PDF or email must use one family throughout: all Eurostile, or all Arial.

**Licensing (blocker for launch, p.30):** Eurostile is a commercial typeface. Web use needs a web font licence, and app licences are separate. PDF embedding isn't mentioned in the guidelines, so check it with the foundry. The font files in the Carbon asset folder include "conversions of unknown origin", and the guidelines say not to distribute font files to third parties. They **must not be committed or shipped**. Until licensed web fonts are in place, build with the Arial fallback.

**Asset folder fonts, checked 28 October 2026.** None of these is usable. They are old desktop fonts or conversions, with no web licence and no licence metadata:

| File | Embedded metadata |
|---|---|
| `Eurostile-Black-DTC.ttf` | "Converted by ALLTYPE" |
| `Eurostile-Bold Regular.ttf` | Copyright field blank (conversion) |
| `Eurostile Extended #2 Bold.otf` | Adobe, 1989–90. Extended **Bold**, not Extended Black |
| `eurostile.TTF` | URW / Microsoft, 1992 |
| `EurostileExtendedBlack.ttf` | Digital Typeface Corp, 1991; the internal face name is "Bold" |

Buy current Eurostile Extended Black, Eurostile Bold and Eurostile Regular from an authorised foundry, with web and PDF-embedding rights. Then add the WOFF2 files to `public/fonts/` and record the licence here.

## Logo (p.20–22, p.66)

### Versions and colourways (p.20)

- **Full (horizontal):** the default. Website header, email header, documents.
- **Compact (stacked):** square and tall spaces, end cards.
- **Icon only:** only where the full name appears nearby or space is tiny. Avatars, favicons, video watermarks.
- Each version comes in three colourways:
  - **Black on white**
  - **Black on transparent**: for white, Dust and light backgrounds.
  - **White on black (badge)**: for black, dark, cyan, busy or photographic backgrounds.

### Approved backgrounds (p.21)

- Black logo on white or Dust.
- White-on-black badge on Carbon Black, Carbon Cyan, the concrete texture or busy photography.
- Never put the outline (black-on-transparent) logo on the texture or busy images.

### Clear space and size (p.20–22)

- **Clear space:** X on all sides, where X is the height of the C in CARBON. Nothing may enter it: no text, images, edges, other logos or the slash.
- **Minimum sizes (p.21):**

  | Version | Digital | Print |
  |---|---|---|
  | Full | 120 px | 30 mm |
  | Compact | 60 px | 15 mm |
  | Icon | 32 px (favicon 16 px) | 8 mm |

- **Width in layouts (p.22):** 25–35% of layout width for ads and social; 30–40% for documents; up to 60% for end cards. The document page setup (p.48) gives 50–60 mm on A4.
- **Margin:** at least 6% of the shortest side from the trim edge.
- **One logo per page or layout.**

### Placement (p.21, p.45)

- Top left is the default for web headers, documents and presentations.
- Bottom right is the alternative.
- Centred is reserved for covers, end cards, avatars and signage.
- Email headers are centred (see Email).

### Misuse (p.22, p.66)

The logo is "reproduced from the master files. Never redraw, retype, edit or recreate it." Never generate or alter it with AI (p.61). Never:

- stretch, squash, rotate or tilt it;
- recolour it, including in cyan;
- add shadows, glows, bevels or outlines (this includes CSS `filter`, `drop-shadow` and `text-shadow`);
- crop or remove the badge;
- rearrange the mark and wordmark;
- set "Carbon Offroad" in a font next to the icon;
- put it inside another shape, sticker or frame;
- animate it by distorting it;
- use old, low-resolution or screenshot versions.

Seasonal logos are never used on documents or partner material (p.22). That rules them out for certificates.

### File formats (p.22)

- SVG for web: "first choice for digital".
- PNG (2000 px masters) for email, because many email clients don't render SVG.
- PDF/EPS vector for print.
- **Never JPG for logos.**

### Files in `/public/brand/`

Master SVGs from the asset library (Logos and Branding folder), renamed for the web:

| File | Master |
|---|---|
| `logo-full-black-transparent.svg` | `carbon offroad logo_full_black on transparent.svg` |
| `logo-full-black-on-white.svg` | `carbon offroad logo_full_black on white.svg` |
| `logo-full-white-on-black.svg` | `carbon offroad logo_full_white on black.svg` |
| `logo-compact-black-transparent.svg` | `carbon offroad logo_compact_black on transparent.svg` |
| `logo-compact-black-on-white.svg` | `carbon offroad logo_compact_black on white.svg` |
| `logo-compact-white-on-black.svg` | `carbon offroad logo_compact_white on black.svg` |
| `logo-full-white-on-black-2000.png` | `favicon / carbon offroad logo_full_white on black 2000x1000.png` (2000 × 1000, 106 KB). **Opaque white background around the badge.** Works on white only |
| `logo-full-white-on-black-transparent-2000.png` | Exported 28 October 2026 from the 2000 px master. Only the white surround connected to the image edge was cleared; the lettering and the anti-aliased edge were kept. Cropped tight to the badge: 1996 × 406, 60 KB. Pixels unchanged otherwise **[Approved]** |
| `logo-full-white-on-black-transparent-email.png` | The same export at 400 × 81 (7 KB), for the email header shown at 200 px wide (2× for high-density screens) |
| `concrete-texture.jpg` | `Vinyl wrap (1).png` (10131 × 7596, 88.7 MB), resized to 2400 × 1799 JPG at quality 78 (about 1.1 MB). The master isn't committed; Next.js `<Image>` serves smaller sizes and formats from this file |

### Concrete texture (wrap artwork, p.32, p.55)

- This is the master wrap artwork: grunge concrete with the cyan and black slash stripes. Never create or download other grunge textures.
- **It counts as the layout's one slash motif.** A screen that uses it has no other slash: no divider slash, no corner accent, no double slash.
- **Overlay (measured on this file):** the concrete is mid-light grey.
  - **60% Carbon Black** where body text sits: white text stays at 6.1:1 or better on the lightest patches.
  - **40%** only behind large headline text (24 px+, or 18.5 px+ bold), where it's about 3.4:1.
  - Never less than 40%.
- Only the white-on-black badge logo goes on the texture, never the outline logo.
- Use it on the hero and section headers only. It's a big image, so it's not for every page, and the cyan stripes count towards the 10% cyan limit.

Still needed from the asset library (p.68). Request them, never recreate them:

- Icon: `favicon / carbon compact logo no text.png` and `...inverted.png`. An SVG icon if one exists. Used to make `favicon-32.png`, `apple-touch-icon-180.png` (p.45) and `icon.svg`.
- QR master: `qr codes / carbonoffroad QR.svg`, for the house QR style.

## UI components

### Buttons (p.32, p.45)

- **Primary:** cyan fill, Carbon Black uppercase text.
- **Secondary:** black outline, black text (white outline and text on dark backgrounds).
- Minimum height 44 px.
- **Square or angled corners only. No pills, no rounded corners.** Never mix rounded and angled corners in one layout.
- Angled variant: a single cut corner, or a parallelogram matching the badge angle.

### Layout (p.32–33, p.45)

- White and Dust backgrounds, Carbon Black text, Gunmetal footer.
- Hero and section headers may use the concrete texture with a Carbon Black overlay when text sits on top: 60% for body text, 40% minimum for large headlines only (see Concrete texture). Keep the texture subtle behind text.
- Lead with one strong image, one headline and one action. "If a layout needs more than that, it probably needs two layouts."
- Generous white space between sections.
- WCAG 2.1 AA. Alt text on every image. "Never put essential information only in images." (p.45)

### Forms (p.49)

Clear headings, Dust field backgrounds, cyan submit button.

### The slash (p.32)

- The diagonal slash matches the angle of the logo badge. Never invent a new angle. The guidelines give no number, so measure it from the master SVG.
- Single slash: one cyan bar. Double slash: cyan + black (or cyan + white on dark). Gap = half a bar width.
- Use as a divider, image edge, corner accent, transition wipe or sticker shape.
- **One slash motif per layout.** Never behind or through the logo.

### Icons (p.33)

Simple solid or 2 px line icons with squared ends. Black, white or cyan only. One icon style throughout. No clip art, emoji-style or 3D icons.

### Charts and reports (p.49–50), for dashboards and admin reports

- Series colour order: Carbon Black, Cyan, Gunmetal, Concrete, Dust.
- Cyan for the number that matters; everything else neutral.
- Label directly; remove gridlines and borders where possible.
- Source and date under every chart.
- No 3D charts, and no pie charts with more than four slices.

### Progress and certification [Academy decision]

- Progress bars and completion ticks: cyan on black or Gunmetal, Concrete for incomplete.
- Certified badge: black badge shape with white text and a cyan slash. Must not resemble or alter the Carbon Offroad logo.
- **"Carbon Certified" and "Carbon Certified Store" [Approved]**, as an addition to the partner wording on p.63. Write them exactly like that: two words, title case, no "Carbon Offroad Certified".
- If store logos appear beside the Carbon logo: same baseline, equal visual weight, at least 2X clear space or a thin divider, never a merged mark (p.63).

### Video player and lesson videos (p.25, p.58–59)

- Vimeo player colour set to `#00A4C7` [Academy decision; the guidelines don't cover players].
- **Intro sting:** optional, 0.5–1.5 s, a double slash (cyan + white) wiping across black.
- **Watermark [Approved]:** used on Academy videos as well as YouTube long-form. Icon or full logo (white-on-black badge), top right, 60–80% opacity, inside the safe zone.
- **Lower thirds [Approved]:** black bar with a cyan edge (p.58), not Gunmetal. Name in Extended Black, role in Regular, 4–6 s on screen.
- **On-screen text:** white; Extended Black for headlines, Bold for supers; a 60% black box on busy backgrounds; max 6 words per super.
- **Captions:** Eurostile Bold, white on a black box, centred, Australian English. The Academy requires captions on every video.
- **Spec callouts:** a thin cyan line to a Bold label, animated along the slash angle.
- **End card:** 3–5 s, black, compact logo centred, LIGHTER | FASTER | STRONGER in cyan, URL.
- **Logo animation:**
  - Either a single fast slide along the badge angle, or a double-slash wipe reveal, under 1 s. Then the logo holds still and legible for at least 1.5 s.
  - Never spin, bounce, distort, glitch or 3D-rotate it. This applies to web animation too.
- **Specs:** 16:9 at 1920 × 1080, 25 fps. Licensed music only. A calm, natural Australian voiceover. Every recovery shows correct technique, with safety supers where useful.

### QR codes (p.52, p.55, p.68)

- Every QR touchpoint carries UTM tracking.
- QR codes on packaging and inserts point to fitting videos and warranty registration, which is the Academy's `/go/[slug]` use case.
- The guidelines give no QR size, colour or quiet-zone rules. Match the master `carbonoffroad QR.svg` style.
- Default **[Academy decision]**: black on white, 4-module quiet zone, at least 20 mm printed.

## Certificate PDF

Based on the document page setup (p.48) and export settings (p.50). The guidelines have no certificate template.

- **Page:** A4 white, 20 mm margins on all sides. **Landscape [Approved]**, as an exception to the portrait document standard (p.48). "No coloured page backgrounds except covers."
- **Logo:** full logo, black on transparent, top left. Use the vector master, not a raster. Size it to 30–40% of the page width (p.22), which is 89–119 mm on landscape A4. The 50–60 mm in p.48 assumes portrait letterhead.
- **Title:** Eurostile Extended Black uppercase. **The whole certificate uses one family:** all Eurostile if a PDF-embedding licence exists, otherwise all Arial (Arial Bold for headings).
- **Accent:** one cyan rule or slash only.
- **Footer:** Carbon Offroad | KPD Industries Pty Ltd | ABN 80 142 983 382 | 1300 780 141 | carbonoffroad.com.au.
- **Verification:** certificate number and verification URL.
- **Export:** RGB, fonts embedded, under 10 MB. Set the PDF title property to the document name.
- **Download filename** follows the naming convention (p.50): `CarbonOffroad_Certificate_[CertificateNumber]_v1_[YYYYMMDD].pdf`. No spaces.

## Email (magic link, certificate issued; p.45)

- 600 px max width, single column.
- **Header [Approved]:** black bar, full logo white-on-black, **centred** (p.45, over the p.21 top-left default), 160–200 px wide, linked to the Academy home. Use `logo-full-white-on-black-transparent-email.png` with `width="200"`, never SVG and never the white-background PNG.
- **Headline:** Arial Bold 26–28 px live text (or a Eurostile image with alt text).
- **Body:** Arial 16 px, line height 1.5, `#111111` on white, 50–125 words. One primary CTA.
- **CTA:** cyan `#00A4C7` button, `#111111` bold uppercase text, min 44 px tall.
- **Footer:** `#303030` background, white text: company name, physical address and phone.
  - The address comes from `settings`, not hard-coded. Head office is Unit 1a, 1 Waterway Drive, Coomera QLD 4209, relocating to 11 Blanck Street, Ormeau QLD 4208 from February 2027 (p.69).
  - Marketing emails also need an unsubscribe link and the reason for receiving (Spam Act 2003).
- **Sending:** subject under 45 characters; preview text always written; From name "Carbon Offroad"; reply-to monitored. Max one exclamation mark per email (p.16).
- Every image has alt text. Test on mobile and in dark mode; the white-on-black badge works in both.

## Voice and microcopy (p.12, p.15–18)

Straight-talking, confident, practical. "We" for Carbon Offroad, "you" for the learner. Two tones apply (p.15):

- **Safety and how-to** (most lesson content): authoritative, careful, step-by-step. Humour off, precision up.
- **B2B and dealer:** professional. Data up, slang off.

The test for plain language (p.15): "If a 10-year-old and an engineer could both understand it, it is right."

| Context | Example |
|---|---|
| Primary CTA | START LESSON / TAKE THE QUIZ / GET CARBON CERTIFIED |
| Quiz pass | Nailed it. That's one more lesson done. |
| Quiz fail | 2 of 3 correct. Have another look at the video and try again. |
| Certified | You're Carbon Certified. Your certificate is ready to download. |
| Empty state | No lessons started yet. Pick one below and get going. |
| Error | Something went wrong on our end. Give it another go in a minute. |
| Join page | You're joining BCF Robina. Enter your details and we'll email you a sign-in link. |

### Taglines and messages (p.15–16, p.61)

- **LIGHTER | FASTER | STRONGER:** the primary line. Always uppercase, vertical bars with a space either side.
- Other lines: "Australian engineered, field tested.", "Get a winch you can trust.", "The Backup Plan Bolted To Your Bar" (Title Case as written), "No signal. No backup."
- Core messages: Built for life; Lighter, faster, stronger; Backed like family; Everything you need in the box; Australian engineered, field tested.

### Writing rules (p.16–18)

- **Spelling:** Australian English, Macquarie (colour, tyre, organise, centre, licence).
- **Brand name:** "Carbon Offroad", two words. Never CarbonOffroad, Carbon Off Road or Carbon Off-Road. "Carbon" alone is fine after first mention.
- **Product names:** exactly as on the website, including version: Carbon 12K V3X, Scout Pro 10K V3.
- **Specs [Approved]:** figures, comma thousands, a space before the unit, **metric first**: 5,443 kg (12,000 lb), 12 V (p.10, p.16). Ignore the imperial-first example in the p.61 AI prompt.
- **Dates and times:** 26 October 2026; 9am, 4.30pm; AEST / AEDT where needed.
- **Ampersands:** "and" in body copy; "&" only in tight headlines.
- **Capitals:** sentence case for body and subheads. Uppercase only for Eurostile Extended headlines, taglines and buttons.
- **Punctuation:** no exclamation marks in headlines.
- **Emojis:** none in the Academy. The guidelines allow them on social and SMS only.
- **Never use (p.17):**
  - mate, cheap, budget (say "value");
  - unbreakable, indestructible, bulletproof;
  - game-changer, revolutionary, next-level;
  - send it, full send, YOLO;
  - unexplained jargon or acronyms.
- Never name competitors. Never show or describe unsafe recovery practice.
- **Safe technique, always (p.18, p.35):** rated recovery points, tree trunk protectors, line dampers, clear exclusion zones, gloves, no shackles on tow balls.
- **Specs** must match current official product data; check with the product team. Never invent them; use `[SPEC TBC]`.
- **Warranty wording** must match the official terms exactly: lifetime mechanical warranty; 5 years electrical and water ingress, extended to 7 years when registered within 90 days.
- No pricing anywhere in the Academy.

## Imagery (p.35–36)

- Real rigs, real recoveries, real Australian terrain. No stock photos of generic 4x4s.
- Correct, safe technique visible in every recovery image.
- Carbon Offroad gear clearly in frame; no competitor branding.
- Natural light, slightly desaturated, true earth tones. No heavy filters or HDR.
- No AI-generated images presented as real recoveries, customers or products (p.36, p.61).
- UGC needs written permission and a credit. Never edit out a safety issue; just don't use the image.

## AI-assisted content (p.61)

This applies to Claude Code drafting lesson copy, quiz questions or microcopy:

- A human from the Carbon Offroad team reviews everything before it's published.
- AI never invents specs, reviews, testimonials or warranty terms.
- Never paste customer or confidential data into public AI tools.
- Never generate or alter the logo.

## Approvals (p.4, p.69)

Anything public goes to the Sales and Marketing Manager before it goes live (sales@carbonoffroad.com.au). Allow two business days. Name files to convention (p.50): `CarbonOffroad_[Type]_[Channel]_[Description]_[Size]_v[N]_[YYYYMMDD].[ext]`.

## Brand owner decisions (28 October 2026)

Decided by Rich, Sales and Marketing Manager, where the guidelines were silent or contradicted themselves.

| # | Question | Decision |
|---|---|---|
| 1 | Email header logo: centred (p.45) or top left (p.21)? | **Centred** |
| 2 | Lower thirds: cyan edge (p.58) or Gunmetal (p.25)? | **Black bar with cyan edge** |
| 3 | Certificate orientation (documents are portrait, p.48) | **Landscape is fine** |
| 4 | Watermark on Academy videos (p.58 says YouTube only) | **Yes** |
| 5 | Red for form errors | **Yes**, as `error-red` `#C62828`, also for safety warnings |
| 6 | "Carbon Certified" and "Carbon Certified Store" | **Both approved** |
| 7 | Spec unit order | **Metric first** |
| 8 | Vector icon master | **TBA.** Until one arrives, favicons are made from the icon PNG masters |
| 9 | Transparent email logo | **Exported** from the 2000 px master (`logo-full-white-on-black-transparent-*.png`) |

To raise with the next guidelines update (v1.1): document decisions 1–7 in the PDF, and fix the imperial-first example in the p.61 AI prompt.
