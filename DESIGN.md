# Design System — Political Voting Record Analyzer

The starting point for a visual makeover. It documents the design language as named tokens and
component specs so you can reproduce it in a design tool, tweak it, and map changes back to code.
**The single source of truth in code is [lib/theme.ts](lib/theme.ts)** — colors, spacing, radius,
type, and shadow are all token objects there, and every screen/component consumes them. Change a
token value and the whole app shifts with it.

> **How to use this:** treat `lib/theme.ts` as the editable layer. In Claude design, build the
> screens from these tokens; when you change a token's value, change it in `lib/theme.ts` and the
> whole app follows.

---

## 1. Color tokens

All defined in `lib/theme.ts` as `colors.*`.

### Brand & surface
| Token | Hex | Use |
|-------|-----|-----|
| `primary` | `#4f46e5` | Primary actions (Search button), active chips, accents, links |
| `primaryDark` | `#3730a3` | Chip text, home icon, secondary-link text |
| `title` | `#312e81` | Page titles, card/result headings |
| `subtitle` | `#6366f1` | Subtitles / supporting headline text |
| `text` | `#1f2937` | Body copy |
| `muted` | `#6b7280` | Meta text, placeholders, captions |
| `card` | `#ffffff` | Card / input backgrounds |
| `border` | `#e7e8f0` | Hairline borders on cards, inputs, dropdowns |
| `shadow` | `rgba(49,46,129,0.08)` | Soft indigo-tinted elevation |
| `bgGradient` | `#eef2ff → #f7f8ff → #ffffff` | App background (top→bottom, in `_layout.tsx`) |
| `evidenceBg` | `#eef2ff` | Tinted inset panels, chip backgrounds, hover rows |

### Semantic — vote / stance
| Meaning | bg | text |
|---------|----|----|
| Yea / supportive | `yeaBg #dcfce7` | `yeaText #15803d` |
| Nay / opposed | `nayBg #fee2e2` | `nayText #b91c1c` |
| Neutral / other | `neutralBg #e5e7eb` | `neutralText #4b5563` |
| Mixed / note | `noteBg #fffbeb` (border `#fde68a`) | `noteText #92400e` |

These are applied by helper functions, not raw values — keep using them so new UI stays consistent:
- `castColors(cast)` → Yea/Nay/other vote pills
- `stanceColors(label)` → supportive / opposed / mixed stance badges
- `tempColors(label)` → partisan-temperature scale (4 steps below)

### Semantic — partisan temperature (gauge scale)
| Label | bar | text |
|-------|-----|------|
| Party-line | `#ef4444` | `#b91c1c` |
| Leans | `#f97316` | `#c2410c` |
| Mostly bipartisan | `#14b8a6` | `#0f766e` |
| Bipartisan | `#22c55e` | `#15803d` |

---

All tokens below live in `lib/theme.ts` as `space`, `radius`, `fontSize`, `fontWeight`,
`lineHeight`, `shadow`, and `maxWidth`.

## 2. Typography

System font stack (React Native default — SF Pro / Roboto). Sizes are `fontSize.*`, weights
`fontWeight.*`, line heights `lineHeight.*` (kept 1:1 with the original design — not snapped):

| Role | Size | Weight | Color | Notes |
|------|------|--------|-------|-------|
| Display / page title | 34 | 800 | `title` | `letterSpacing: -0.5`, centered on landing |
| Subtitle | 16 | 400 | `subtitle` | |
| Card / result heading | 17 | 700 | `title` | |
| Autocomplete name | 15 | 700 | `title` | |
| Body | 16 | 400 | `text` | |
| Button label | 16 | 700 | `#fff` | |
| Meta / caption | 13–15 | 400–600 | `muted` | filters, footnotes, vote meta |
| Chip label | 13 | 600 | `primaryDark` / `#fff` (active) | |

No defined line-height scale yet — a makeover candidate.

---

## 3. Spacing, radius, elevation

**Spacing** — `space.*`, a 4px grid: `xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32, huge:48,
mega:64, giant:96`. The original ad-hoc values were snapped to this grid (so a few paddings shifted
by 2–8px — expected when imposing a system).

**Radius** — `radius.*`: `sm:8, md:12, lg:16, xl:20, pill:999`. Cards use `lg`, inputs/buttons `md`,
chips/pill-inputs `pill`. Circular avatars/dots and thin progress bars keep literal radii tied to
their fixed size (not from the scale).

**Elevation** — `shadow.*` presets (indigo-tinted), spread into a style:
`card` (standard), `raised` (prominent cards), `dropdown` (autocomplete), `floating` (chat panel),
`fab` (chat button). Cards float on the gradient with no hard edges.

**Layout** — `maxWidth.*`: `narrow:820, default:860, wide:1080`.

---

## 4. Layout & responsiveness

- **Content shell**: centered, `width: 100%` with a `maxWidth` cap — `860` (home/bills), `1080` (member).
- **Breakpoints** via `useWideLayout(px)` ([lib/useWideLayout.ts](lib/useWideLayout.ts)) — **not** raw
  `useWindowDimensions` (see CLAUDE.md for why). Current thresholds: **720** (home, bills, chat) and
  **920** (member profile two-column).
- **Wide → narrow behavior**: rows collapse to columns (search input + button stack), the member
  profile drops from two columns to stacked, the chat panel becomes a near-fullscreen sheet.

---

## 5. Component inventory

Specs reflect current code; use these as the components to recreate/restyle in the design tool.

- **Primary button** — `primary` bg, white 700 label, radius 12, padding `14×26`. (e.g. Search)
- **Filter chip** — pill (radius 20), `evidenceBg` bg + `primaryDark` text; **active** = `primary` bg + white text.
- **Text input** — white bg, `border` hairline, radius 12, padding `14×16`, 16px text, `muted` placeholder. State input is the pill variant (radius 20, smaller).
- **Card** — white, radius 18, padding 18, hairline border, soft shadow. Variants: search card, info card (centered), result row (with `›` chevron), evidence/citation card.
- **Autocomplete dropdown** — absolutely-positioned white panel under the input, radius 12, shadow, `maxHeight 300`, rows with hover tint (`evidenceBg`); high `zIndex` to float over siblings.
- **Badges/pills** — stance badge, vote cast pill, temperature label — all from the semantic helpers.
- **Temperature gauge** — horizontal bar colored by `tempColors().bar` over a track, with a label.
- **Chat bubble** — floating FAB (60×60 circle, `primary`) that expands to a side panel (wide) or sheet (narrow); used for the AI Q&A on member pages.
- **Top bar** — right-aligned auth button; transparent header with a home icon on inner screens.

---

## 6. Makeover levers (where to start tweaking)

Highest-leverage changes, roughly in order:

1. **Recolor the brand.** Swap `primary` / `primaryDark` / `title` / `subtitle` / `bgGradient` in
   `lib/theme.ts`. Everything (buttons, chips, links, headings, background) follows. Keep the
   semantic vote/stance/temperature colors distinct from brand so meaning stays legible.
2. **Reshape spacing/radius.** Edit the `space` and `radius` scales in `lib/theme.ts` — e.g. a
   roomier grid (`md:16, lg:24`) or sharper corners (`md:6, lg:10`) re-flows the whole app at once.
3. **Type system.** Adjust the `fontSize` / `fontWeight` / `lineHeight` scales, and decide on a
   custom font (load via `expo-font`) — the app currently uses the platform default.
4. **Elevation & shape language.** Tune the `shadow` presets; a makeover might flatten to bordered
   cards or introduce a stronger 2-tier elevation contrast.
5. **Dark mode.** `app.json` already sets `userInterfaceStyle: "automatic"`, but the palette is
   light-only. A dark theme means a parallel `colors` set + a `useColorScheme()` switch.

### Suggested screens to mock up
Landing/search, search results, **member profile** (two-column: record + AI), **bill detail**
(temperature gauge + who-voted list), and the **chat panel** (expanded + collapsed). These five cover
every component above.

---

## 7. Keeping design and code in sync

- Everything — color, spacing, radius, type, shadow, max-width — is a token object in
  `lib/theme.ts`. Edit values there and every screen/component follows; no per-file hunting.
- Component-specific fixed dimensions (avatar/headshot/FAB sizes, circular radii, thin progress-bar
  radii, the chat panel's fixed width) remain literals by design — they're tied to specific pixels,
  not the scale.
- Update this file when a token's meaning or value changes so it stays the source of truth.
