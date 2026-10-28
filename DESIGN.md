# DsaKaro — Design Language & Design Doc

> **DsaKaro** ("DSA karo", Hindi for "do DSA"). Formerly the working name Upsolve. Domain: dsakaro.in.
> **Living reference:** [`design/preview.html`](design/preview.html) implements everything in this doc — tokens, components, charts, motion — in one file. When this doc and the preview disagree, fix one of them the same day.
>
> View it: `python -m http.server 4173 --directory design` → http://localhost:4173/preview.html

---

## 1. What it should feel like

DsaKaro is for college students who grind DSA at 1 a.m. It should feel like **a calm instrument panel, not a game and not a corporate tool**.

| Principle                                         | What it means in practice                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Calm by default, loud on purpose**              | 95% of the UI is neutral ink on dark/light surfaces. Colour is spent only on meaning: difficulty, verdict, today, streak.                  |
| **Numbers are the hero**                          | Big, tight, tabular numbers with muted context next to them (`412 / 1000`). If a card has a number, the number is the biggest thing in it. |
| **Every pixel is a problem**                      | The core motif is a square "pixel". In charts, one square = one problem or one day. It's the brand, the logo and the data at once.         |
| **Hatched = not yet**                             | Diagonal hatching always means "remaining / future / not done". Solid always means "done". Never use hatching as decoration.               |
| **Honest data**                                   | Never inflate. Show solo vs hint vs solution. Show idle time. The design must make honest stats look good, not hide them.                  |
| **Motion explains, never decorates** (in the app) | In the product, animation shows change: a number counting up, a bar filling, a pixel landing. The landing page is allowed more theatre.    |

---

## 2. Where it comes from

Seven Dribbble references were reviewed. One design language was made by taking one or two ideas from each and dropping the rest.

| Reference                                             | What we took                                                                                                                                                                                | What we left                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **FocusFlow** (Arounda)                               | Hatched bars for future/remaining, solid gradient bar for "now", lime accent pill, semicircle gauge, isometric product shot                                                                 | Periwinkle background everywhere, Gilroy (paid)                 |
| **Halden: Spending Pattern** (Nargela / Flair)        | Dot-matrix "pixel stack" chart, mono axis labels, stat row split by hairlines, one warm colour only for the exceptional value, dark tooltip                                                 | Fintech content                                                 |
| **Kora AI** (Barly / Uxerflow)                        | Serif display headlines, warm radial glow in hero, mono uppercase eyebrow chips, bento feature grid with corner glow, framed product screenshot, dark FAQ accordions                        | Orange as the brand colour (we keep it only for streak/"ember") |
| **Dew clinic dashboard** (Migulko)                    | Two-tone page title (`Rahul Sharma` / grey `Week 12 of 24`), huge numbers with muted secondary, segmented block progress bars, black pill primary button, generous whitespace in light mode | 3D head render                                                  |
| **Donezo task dashboard** (Fireart)                   | Capsule (pill-shaped) bar charts with hatched inactive bars, dark textured "Time Tracker" card with big mono timer, one inverted feature KPI card                                           | Green brand colour                                              |
| **Savium finance landing** (Outcrowd)                 | Floating stacked cards, centred section heads with a small pill above, giant fading wordmark in the footer                                                                                  | Purple-on-white everything                                      |
| **AI cybersecurity landing** (vino_costa / Roobinium) | Two-tone headline (grey first clause, white second), deep blue gradient hero light, blueprint grid lines, logo marquee strip                                                                | Isometric line illustrations (too much work for v1)             |

**The synthesis:** dark-first (Kora/Halden) with a full light theme (Dew). Indigo is the brand colour (FocusFlow/Sentry blue). Lime is the "signal" for today, live and primary CTAs (FocusFlow). Ember is used only for streaks and "weakest" (Kora). Pixels and hatching (Halden + FocusFlow/Donezo) are the signature motifs. Serif display type appears on marketing only (Kora). Two-tone numbers and titles appear everywhere (Dew).

---

## 3. Brand

### Logo

A tick drawn through graph nodes: a thick ink stroke with two hollow nodes at its joints, ending in a **signal lime** node. It reads as "solved" (Accepted), as a path through a graph, and as "karo": do it, done. The holes are masked, so the mark sits on any surface; app icons put it on a dark tile at 70% width, without holes at 16px. Wordmark: `Dsa` in Geist 650, tracking −3%, then `Karo` in Instrument Serif italic, the same sans + serif pairing as the page headlines. Source: `packages/ui/src/components/logo.tsx`; icons: `node scripts/gen-icons.mjs`.

- Minimum size: 16 px (favicon uses just the three pixels).
- Lime pixel is always lime, even in light mode.
- Clear space = one pixel width on all sides.

### Mascot

**Stacky**: a stack of three clay plates (the stack data structure) with a face on the top block. Its hollow ring eyes are the logo's graph nodes, and the lime bulb on its head is the stack's **top pointer**. It is shaded with SVG gradients to look 3D, with no WebGL, and moves with transform/opacity only; under reduced motion it holds still. Source: `packages/ui/src/components/stacky.tsx`; every mood is on `/styleguide`.

| Mood        | Use                                             |
| ----------- | ----------------------------------------------- |
| `idle`      | Nothing yet (first-run empty states)            |
| `accepted`  | All caught up, a solve landed                   |
| `due`       | A revision is waiting (bulb pulses)             |
| `streak`    | Streak moments (holds the ember flame)          |
| `thinking`  | No search match, errors, 404                    |
| `sleepy`    | Nothing due today                               |
| `celebrate` | Sheet complete (`push()`: a plate lands on top) |

- Use it through `EmptyState`/`ErrorState`'s `mascot` prop, at most one Stacky per view.
- Its colours are fixed in both themes, like the logo's lime node. Lime stays on the bulb; ember appears only with `streak`.

### Voice

- Short, direct, a bit dry. Talk like a senior who has already been through placements.
- Use the words students use: _upsolve, grind, sheet, TLE, WA, rating, streak_.
- Headlines follow **two-tone pattern**: muted setup + italic punchline. `Not another counter.` _`A coach.`_
- Numbers over adjectives: "68% solo" not "great independence".
- Never shame. "7 due" not "You're behind!". Streak freeze exists for exams.

---

## 4. Tokens

All tokens are CSS custom properties on `:root[data-theme]`. Components never use raw hex.

### 4.1 Colour

| Token                            | Dark                              | Light                             | Use                                                                                                                     |
| -------------------------------- | --------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--bg`                           | `#09090C`                         | `#F4F4F1`                         | Page background                                                                                                         |
| `--bg-2`                         | `#0E0E13`                         | `#ECECE7`                         | App shell, alternate sections                                                                                           |
| `--surface`                      | `#131319`                         | `#FFFFFF`                         | Cards                                                                                                                   |
| `--surface-2`                    | `#1A1A22`                         | `#F6F6F3`                         | Inputs, nested blocks, chips                                                                                            |
| `--surface-3`                    | `#22222C`                         | `#EDEDE9`                         | Tooltips, inactive bars                                                                                                 |
| `--line`                         | `rgba(255,255,255,.07)`           | `rgba(14,14,22,.08)`              | Card borders, dividers                                                                                                  |
| `--line-2`                       | `rgba(255,255,255,.13)`           | `rgba(14,14,22,.14)`              | Stronger borders, dashed separators                                                                                     |
| `--ink`                          | `#F4F4F6`                         | `#0E0E12`                         | Primary text, "done" fills                                                                                              |
| `--ink-2`                        | `#A3A3B0`                         | `#545466`                         | Body / secondary text                                                                                                   |
| `--ink-3`                        | `#686876`                         | `#8C8C99`                         | Muted text, the grey half of two-tone                                                                                   |
| `--primary`                      | `#6E7BFF`                         | `#4B57F5`                         | Brand indigo: heatmap, active nav, links, gauge                                                                         |
| `--primary-2`                    | `#4F5BF0`                         | `#3843D9`                         | Hover / gradient end                                                                                                    |
| `--primary-soft`                 | indigo 14%                        | indigo 10%                        | Focus rings, spotlight                                                                                                  |
| `--signal`                       | `#D7FF3A`                         | `#D7FF3A`                         | Main CTA, "today", live, due count. **Text on it is always `--signal-ink` `#0B0B0F`.**                                  |
| `--signal-text`                  | `#D7FF3A`                         | `#4E6A00`                         | When lime has to be a line/text on the background                                                                       |
| `--ember`                        | `#FF7A45`                         | `#F2622E`                         | Streak, "weakest topic", hero glow. Nothing else.                                                                       |
| `--easy` / `--medium` / `--hard` | `#2BD4B4` / `#FFB938` / `#FF5470` | `#0EA58C` / `#D99100` / `#E3385A` | Difficulty. Same meaning on every platform (Codeforces ratings are bucketed: <1400 easy, 1400–1899 medium, ≥1900 hard). |
| `--ok` / `--warn` / `--bad`      | green / amber / rose              | darker variants                   | Verdicts: Accepted / TLE·MLE / WA·RE                                                                                    |
| `--hatch`                        | white 9%                          | ink 10%                           | Hatching stripes                                                                                                        |
| `--pixel-off`                    | white 5%                          | ink 6%                            | Empty pixel                                                                                                             |

**Colour budget per screen:** at most **one** lime element that isn't data (usually the primary CTA or the "today" marker), and ember only where a streak or weakness is shown. If a screen feels colourful, something is wrong.

**Contrast:** all text pairs ≥ 4.5:1. `--ink-3` is for ≥ 12 px labels and non-essential text only. Never put white text on lime.

### 4.2 Type

| Role                   | Family               | Size / weight                                             | Notes                                               |
| ---------------------- | -------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| Display (marketing H1) | **Instrument Serif** | 46–104 px, 400, lh .98, tracking −2%                      | Italic for the punchline. Marketing pages only.     |
| Section H2 (marketing) | Instrument Serif     | 36–64 px                                                  | Same two-tone + italic rule                         |
| Big number             | **Geist**            | 40–64 px, 500, tracking −4%, `tnum`                       | Secondary unit in `<small>` at 42%, `--ink-3`       |
| App page title         | Geist                | 26–38 px, 550, tracking −4%                               | Two-tone: name / grey context                       |
| Card title             | Geist                | 14 px, 550                                                | Paired with a 24 px icon tile                       |
| Body                   | Geist                | 14–15 px, 400, lh 1.55                                    | `--ink-2`                                           |
| Label / axis / meta    | **Geist Mono**       | 10.5–12 px, 400–500, uppercase for labels, tracking 2–10% | Eyebrows, chart axes, IDs (`LC 875`), timers, dates |
| Timer                  | Geist Mono           | 44–64 px, 500, tracking −5%                               | Tabular digits always                               |

Fonts load through `next/font` in the app (Geist from the `geist` package, Instrument Serif from Google). Fallbacks: `system-ui`, `ui-monospace`, `Georgia`.

### 4.3 Space, radius, elevation, layout

- **Spacing:** 4 px base → 4, 8, 12, 14, 18, 22, 28, 48, 64, 120. Card padding 18 px in the app and 22 px in marketing. Grid gap is 14 px everywhere.
- **Radius:** `xs 6` (pixels, kbd), `sm 10` (inputs, tooltips), `md 14` (nested blocks), `lg 20` (cards), `xl 28` (app shell, product frame), `pill` (buttons, chips, bars).
- **Elevation:** cards use a 1 px border plus `--shadow` (a subtle inner top highlight with a soft drop shadow). Only the product frame and app shell use `--shadow-lg`. No other shadows.
- **Layout:** marketing container `min(1200px, 100% − 32px)`. The app is a 12-column grid with a 220 px sidebar. Breakpoints: 620 / 900 / 1080 px.
- **Z-index:** content 0 · sticky header 50 · tooltip 80 · modal 90 · toast 100.

### 4.4 Motion tokens

| Token           | Value                          | Use                             |
| --------------- | ------------------------------ | ------------------------------- |
| `--ease-out`    | `cubic-bezier(.22,1,.36,1)`    | Default for everything entering |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)`    | Looping ambient motion (glows)  |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | Pixels, chips popping in        |
| `--d-1` 120 ms  | tooltips, hover colour         |
| `--d-2` 240 ms  | buttons, toggles, press        |
| `--d-3` 480 ms  | spotlight, cards, theme switch |
| `--d-4` 800 ms  | reveals, headline words        |

---

## 5. Signature motifs

| Motif                 | Rule                                                                                                                                               | Where                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Pixel**             | Square, radius 2 px, 3–4 px gap. One pixel = one problem (stack chart) or one day (heatmap). Empty = `--pixel-off`.                                | Heatmaps, 30-day stack chart, logo, loading skeletons            |
| **Hatch**             | 135°, 2 px stripe / 5–7 px gap, `--hatch`. Means _remaining / future / goal not met_. Animates ("marching") only when the thing is live right now. | Bar tracks, gauge track, sheet segments, "saw solution" share    |
| **Two-tone**          | First clause `--ink-3`, second clause `--ink` (and italic serif on marketing).                                                                     | Every H1/H2, page titles, numbers with units                     |
| **Eyebrow chip**      | Mono, uppercase, 11 px, pill, 1 px `--line-2`, optional live dot.                                                                                  | Above every section head; status labels                          |
| **Glow**              | Two or three blurred radial blobs (indigo + ember) drifting slowly.                                                                                | **Marketing hero and bento corners only.** Never inside the app. |
| **Blueprint grid**    | 64 px grid lines in `--line`, radially masked.                                                                                                     | Marketing hero background only                                   |
| **Segmented bar**     | N equal blocks (20–30). Solid = done, grey = partial, hatched = remaining.                                                                         | Sheet progress, volume plans                                     |
| **Dashed separators** | 1 px dashed `--line-2` between rows inside a card.                                                                                                 | Lists inside cards (topics, revision, contests)                  |

---

## 6. Motion system

**Rule of thumb:** _one entrance per element, at most one ambient loop per viewport, and nothing that runs while the user is reading or typing._

| Name               | Spec                                                                                                  | Where                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Reveal**         | opacity 0→1, y 18→0, blur 8→0 px · 800 ms `--ease-out` · 70 ms stagger · fires once at 12% visible    | Every section and card on marketing; app cards on first load only |
| **Headline words** | Each word: y .35em→0, blur 10→0 · 80 ms per word                                                      | Hero H1                                                           |
| **Frame flatten**  | Product frame `rotateX(22°) scale(.93)` → flat, linked to scroll over the first 55% of the viewport   | Hero product shot (FocusFlow iso → Kora flat)                     |
| **Glow drift**     | Blobs translate/scale over 18–26 s, alternate                                                         | Hero                                                              |
| **Count-up**       | 0 → value, 1.2 s, ease-out-quart, thousands separators                                                | Every big number when first visible, and after data changes       |
| **Pixel wave**     | Pixels scale .4→1 with spring, delay = column × 18–22 ms (+ row × 30 ms in stack chart)               | Heatmaps, stack chart                                             |
| **Bar fill**       | height/width 0 → value, 1–1.1 s, stagger 70–80 ms                                                     | Weekly bars, topic mastery, split bar                             |
| **Gauge draw**     | stroke-dashoffset 100 → value, 1.4 s                                                                  | Readiness gauge                                                   |
| **Spotlight**      | radial indigo glow follows cursor inside card, fades in 480 ms                                        | Bento cards, KPI cards                                            |
| **Chip pop**       | y 6→0, scale .9→1, spring                                                                             | Verdict chips arriving, toasts                                    |
| **Live**           | Ping ring on live dot (1.8 s), recording dot blink, marching hatch on today's bar, ticking mono timer | Anything that is live _right now_                                 |
| **Press**          | scale .97, 240 ms                                                                                     | All buttons                                                       |
| **Theme switch**   | All colour transitions to 480 ms for one switch                                                       | Theme toggle                                                      |
| **Marquee**        | Platform names scroll 38 s linear, edge-masked                                                        | Landing only                                                      |

**Reduced motion:** with `prefers-reduced-motion: reduce`, every animation duration becomes ~0. Reveals and words are shown immediately, the frame is flat, and timers still tick (they are information, not decoration).

**Performance:** animate only `transform`, `opacity` and `filter`. Scroll-linked work runs in a single `requestAnimationFrame`. Use `IntersectionObserver`, never scroll listeners per element. Blur reveals are capped at about 30 elements per viewport.

**In React:** use `motion` (`motion/react`) for entrance and layout animation, CSS for loops, and plain CSS transitions for hover and press. Keep a `<Reveal>` wrapper and a `useCountUp()` hook so every screen animates the same way.

---

## 7. Components

Each component lists its variants and states. All have hover, focus-visible (4 px `--primary-soft` ring) and disabled (40% opacity, no pointer) states.

| Component             | Variants / anatomy                                                                                                                                                                             | Notes                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Button**            | `signal` (lime, main CTA — max 1 per view) · `primary` (ink on bg) · `indigo` · `secondary` (surface-2 + border) · `ghost`. Sizes 34 / 42 px. Optional trailing `→` that nudges 3 px on hover. | Pill radius. Press scale .97.                        |
| **Icon button**       | 34 px circle, border `--line-2`                                                                                                                                                                | Theme toggle, notifications                          |
| **Tag**               | neutral · `easy` `medium` `hard` (dot + label) · `ac` `wa` `tle` (mono) · `signal` (count)                                                                                                     | Tinted 12% background, no border                     |
| **Delta**             | `up` / `down`, mono 11.5 px                                                                                                                                                                    | Next to KPI titles                                   |
| **Eyebrow**           | mono uppercase pill, optional live dot                                                                                                                                                         | Section heads                                        |
| **Card**              | header (icon tile + title, right slot: tag / sub / action) · body · optional footer                                                                                                            | Radius 20, border + shadow, optional `spot`          |
| **KPI card**          | title row, big number + unit, foot line. `feature` variant = indigo gradient + faded hatch (one per row max)                                                                                   | Donezo / Dew                                         |
| **Session card**      | Always dark (even in light theme), indigo corner light, ring texture, problem title, difficulty + topic tags, big mono timer, verdict chips, Pause / Mark solved                               | The one "hero" card in the app                       |
| **Input**             | 42 px, radius 10, surface-2, focus ring indigo                                                                                                                                                 |                                                      |
| **Combobox**          | Input + floating list; used for **college picker** (search across the colleges list) and target companies (multi)                                                                              | Keyboard first                                       |
| **Segmented control** | Pill track with a sliding surface pill (480 ms)                                                                                                                                                | Week / Month / Year ranges                           |
| **Tabs**              | Underline-free; same sliding pill as segmented                                                                                                                                                 | Page sub-nav                                         |
| **Tooltip**           | surface-3, radius 10, mono date line, big value, mono detail line                                                                                                                              | All charts                                           |
| **Modal / Sheet**     | Centre modal ≤ 520 px on desktop, bottom sheet on mobile; backdrop `bg` 60% + blur 8 px                                                                                                        |                                                      |
| **Toast**             | Bottom-centre pill, chip-pop entrance, auto-dismiss 4 s                                                                                                                                        | "Accepted · logged 23m"                              |
| **Command palette**   | ⌘K / Ctrl K: search problems, sheets, topics, actions ("start interview mode")                                                                                                                 | Search bar in top bar opens it                       |
| **Skeleton**          | Pixel grid shimmer (pixels fade between `--pixel-off` and `--line-2` in a diagonal wave)                                                                                                       | Not grey boxes                                       |
| **Empty state**       | One hatched illustration block, a one-line two-tone sentence, one button                                                                                                                       | e.g. "No sessions yet. _Open any LeetCode problem._" |
| **Avatar**            | 34 px circle, indigo → ember gradient with initials as fallback                                                                                                                                |                                                      |
| **Progress**          | `segmented` (sheets) · `bar` (topics, 6 px, hatched track) · `split` (solo / hint / solution) · `gauge` (readiness)                                                                            | Hatched = remaining                                  |
| **Nav (marketing)**   | Floating pill, glass (`bg` 66% + blur 16), gets a border and shadow after 10 px scroll                                                                                                         |                                                      |
| **Sidebar (app)**     | 220 px, mono group labels, active item = surface + lime 3 px left marker, count badge in indigo, upsell card at bottom                                                                         | Collapses to bottom tab bar under 900 px             |

---

## 8. Data visualisation

| Data                        | Chart                                                                                                                                              | Rules                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Problems per day (30 days)  | **Pixel stack** — one square per problem, coloured by difficulty, sorted E→M→H bottom-up, max 8 rows + faded empty slots, today outlined in signal | Halden. Tooltip: date · count · E/M/H split · time |
| Activity (year)             | **Pixel heatmap** — 7 rows × N weeks, 4 indigo levels, today = lime                                                                                | Merged across platforms                            |
| Focus hours (week)          | **Capsule bars** on hatched goal tracks; met goal = ink, today = indigo + lime value pill + marching hatch                                         | FocusFlow/Donezo                                   |
| Topic mastery               | **Horizontal bars** (6 px) on hatched track, score at right in mono, weakest in ember with `WEAKEST` label                                         | Dew "zones"                                        |
| Readiness                   | **Semicircle gauge**, indigo arc on hatched track, big number centred, gaps listed below                                                           | FocusFlow/Donezo                                   |
| Sheet progress              | **Segmented bar** + mono `212 / 455 · est. 9 Jan`                                                                                                  | Dew                                                |
| Honest count                | **Split bar** solo / hint / solution (hatched)                                                                                                     | —                                                  |
| Contest rating              | **Sparkline** per platform + big current rating; full page uses a line chart with rank-colour bands                                                | —                                                  |
| Time per difficulty / topic | Box-ish **range strips** (min–median–max)                                                                                                          | Analytics page                                     |

General rules:

- Axis labels are mono 10.5 px `--ink-3`. Only 3 ticks per axis: min, mid, max/today.
- Never use a legend when direct labels fit.
- Colour encodes **difficulty or state only**, never series identity (use position and labels).
- Every chart has a hover tooltip and an accessible table fallback (`<table class="sr-only">`).
- Empty data shows the chart with all pixels off and the line "Nothing yet. Solve one to light this up."

---

## 9. Screen blueprints

### 9.1 Marketing site

1. **Nav**: floating glass pill.
2. **Hero**: eyebrow chip with live dot · two-tone serif H1 with word reveal · lede · lime CTA "Add to Chrome — it's free" + secondary · mono line listing supported sheets · product frame that flattens on scroll · glow + blueprint grid.
3. **Platform marquee** (text wordmarks; no third-party logos without permission).
4. **Bento features** (5 cards): auto timer · merged heatmap · honest count · proven revision · auto-ticked sheets.
5. **How it works**: 3 numbered steps (Install → Connect handles → Just solve).
6. **Dashboard showcase**: the real app shell, interactive.
7. **For colleges**: placement-cell pitch with a batch-readiness mock.
8. **Pricing**: Free / Pro / College.
9. **FAQ**: Kora-style dark accordions (privacy questions first).
10. **Footer**: two-tone CTA + links + giant fading `dsakaro` wordmark.

### 9.2 Onboarding (5 steps, progress = segmented bar at top)

1. Sign up (Google or email).
2. **About you**: name · college (combobox) · branch · graduation year · current year. _(Ask for graduation year, not age or date of birth.)_
3. **Goal**: internship / placements / FAANG / competitive programming · target companies (multi) · main language · daily goal (30 / 60 / 120 min, or custom).
4. **Connect platforms**: one row per platform → enter handle → "Paste `dsakaro-7Q2X` into your bio" → verify (green tick pop). Skip allowed.
5. **Install extension**: detect whether it's installed; show a live "waiting for first problem…" pulse that turns into confetti pixels when the first session arrives.

### 9.3 App

| Page                           | Layout                                                                                                                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**                   | Two-tone title (name / week N of M) + meta (college, batch, goal) → 4 KPI cards (1 feature) → 30-day pixel stack (8) + live session (4) → focus bars / topic mastery / readiness (4·4·4) → sheets (6) + revision (6) → year heatmap (8) + contest ratings (4). Matches the preview. |
| **Sessions**                   | Table of sessions: problem, platform, difficulty, active time, idle time, submits, verdict chain, independence, notes. Filters. Row opens a side sheet.                                                                                                                             |
| **Problem detail**             | Title + platform links (all platforms where it exists) · your attempts timeline · notes (markdown) · mistake tags · review schedule · similar problems                                                                                                                              |
| **Revision**                   | "Due today" list (big), "Upcoming" calendar strip, history. Start review = opens problem with timer in review mode.                                                                                                                                                                 |
| **Sheets**                     | Sheet cards → sheet page with sections, segmented bar per section, problem rows with status pixel                                                                                                                                                                                   |
| **Analytics**                  | Range control → time per difficulty, time per topic, first-try AC rate, verdict mix, best hours of day, consistency vs intensity                                                                                                                                                    |
| **Contests**                   | Rating chart per platform, contest list, auto upsolve list                                                                                                                                                                                                                          |
| **Groups / College**           | Leaderboard (weekly, by honest solved count and focus hours, not just totals), members, "solving now" presence                                                                                                                                                                      |
| **Study rooms**                | Grid of live avatars with current problem + timer; join button                                                                                                                                                                                                                      |
| **Public profile** `/u/handle` | Marketing styling (serif name), verified platform badges, heatmap, top topics, sheets, share-card generator (1200×630 PNG)                                                                                                                                                          |
| **Settings**                   | Profile · platforms · extension · privacy (public/private per section) · notifications · data export/delete                                                                                                                                                                         |
| **College admin** (paid)       | Batch readiness distribution, topic gaps heatmap (topic × section), inactive students, CSV export                                                                                                                                                                                   |

### 9.4 Extension

- **Popup (360 × 520)**: two-tone header (today's count / goal), live session card (same as app, compact), today's list, "Open dashboard".
- **In-page pill** (on problem pages, bottom-right, Shadow DOM so site CSS can't leak in): `● 18:42` mono pill. Click to expand into a small card: pause, reset, notes. Draggable, remembers position, can be hidden per site.
- **After Accepted**: the pill expands with a chip-pop into a three-button prompt **Solo · Hint · Saw solution**, plus an optional mistake tag and a one-line note. Auto-dismisses after 12 s (defaults to "solo" only if the user picked solo on their last 3 solves; otherwise left blank).
- Uses the same tokens; follows the site's light/dark theme where it can be detected.

### 9.5 Emails & share card

- Weekly email: dark header with week numbers, 30-day pixel strip rendered as an image, 3 insights, 1 CTA.
- Share card: dark, serif name, heatmap, 3 big numbers, lime pixel logo.

---

## 10. Responsive

- **≥ 1080 px:** full 12-column grid.
- **900–1080 px:** KPI cards 2 per row; 8/4 splits go full width.
- **< 900 px:** the sidebar becomes a bottom tab bar (Overview, Revision, Sheets, Analytics, More).
- **< 640 px:** everything stacks into one column. The pixel stack drops to 14 days and the heatmap to 16 weeks.
- No horizontal page scroll at 360 px (verified in the preview at 375 px). Side gutters are always 16 px.

## 11. Accessibility

- Semantic landmarks, one H1 per page, visible focus ring everywhere.
- Colour never carries meaning alone: difficulty tags have text, verdict chips have text, and the weakest topic has a label.
- Charts have tooltips, keyboard focus on columns, and an `sr-only` table.
- Timer announcements use `aria-live="polite"` only on state change (started, paused, solved), never every second.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`, and keep a manual theme toggle that persists.
- Tap targets are ≥ 40 px on touch.

## 12. Implementation notes

- **Tailwind v4**: put tokens in `packages/ui/styles/tokens.css` as CSS variables per theme, and map them in `@theme` (`--color-surface: var(--surface)` and so on) so utilities like `bg-surface text-ink-2` work.
- **shadcn/ui** as the base for Dialog, Popover, Command, Tooltip and Select, restyled with our tokens. Don't ship the default look.
- **Charts**: pixel stack, heatmap, bars and gauge are custom SVG/CSS components (they're simple and they _are_ the brand). Use Recharts only for line charts (ratings) and analytics.
- **Icons**: Lucide, 16 px, 1.75 stroke.
- **Fonts**: `geist` package (Geist, Geist Mono) and `next/font/google` (Instrument Serif).
- **Motion**: `motion/react` for `<Reveal>`, `<CountUp>`, `<PixelWave>` and layout transitions. CSS keyframes for loops.
- Port `design/preview.html` piece by piece into `packages/ui` components. It's the visual spec.

## 13. Do / Don't

| Do                                 | Don't                                               |
| ---------------------------------- | --------------------------------------------------- |
| One lime thing per screen          | Lime text on white, or multiple lime buttons        |
| Hatch for "remaining"              | Hatch as background decoration                      |
| Big number + muted unit            | Big number + big unit                               |
| Serif on marketing headlines       | Serif inside the app                                |
| Glow in the hero                   | Glow inside dashboards                              |
| Mono for labels, IDs, timers, axes | Mono for paragraphs                                 |
| Animate on change                  | Loop animations next to text people read            |
| Platform names as text             | Third-party logos without checking brand guidelines |

## 14. Open questions

1. Final name and domain.
2. Should the app default to dark, or follow the OS? (Current choice: follow the OS, falling back to dark.)
3. Should the session card stay dark in light mode? (Current choice: yes. It's the one "hero" object.)
4. Should the college leaderboard rank by honest count, focus hours or a blend? Test with real users.
