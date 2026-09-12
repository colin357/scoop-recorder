# Scoop design language

Two palettes share one set of token names.

- **App (product screens):** Blazing Flame `#F15025`, White `#FFFFFF`, Alabaster Grey `#E6E8E6`, Dust Grey `#CED0CE`, Carbon Black `#191919`. Carbon for text and primary actions, flame for the single accent that matters on a screen ("Record a meeting", eyebrows, the active recording state), greys for ground, lines and recessed panels. Functional green and red are muted so flame stays the only loud colour.
- **Marketing site (landing, privacy, terms):** the original Rocky palette (merle blue, copper, cream, pink), applied by the `.theme-landing` scope on those pages' `<main>`. Nothing else changes between the two: components use the same token names and pick up whichever palette wraps them.

## Palette (Tailwind tokens in `src/app/globals.css`)

| Token | App | Landing | Use |
|---|---|---|---|
| `ink` | #191919 | #171b26 | Text, primary buttons, active nav |
| `ink-soft` / `muted` | #3f3f3f / #6b6e6b | #3d4454 / #7a8394 | Secondary text |
| `cream` | #e6e8e6 | #fbf7f0 | Page background |
| `paper` / `paper-2` | #ffffff / #f2f3f2 | #ffffff / #f4efe6 | Cards / recessed panels, chips, hover rows |
| `line` | #ced0ce | #d9d4c9 | Dividers |
| `merle` / `merle-deep` | #191919 / #000000 | #3b5b85 / #22344f | Primary actions (`btn-primary`) |
| `sky` / `sky-soft` | #e6e8e6 / #f2f3f2 | #dce7f5 / #eef3fa | Selected / informational tints |
| `copper` / `copper-deep` | #f15025 / #d13d14 | #e19a46 / #b8752b | Accent CTA (`btn-accent`), eyebrows, recording |
| `butter` / `butter-soft` | flame tints | #f6d27a / #fdf3d6 | Highlights, warnings, high priority |
| `grass` / `grass-soft` | #1f8a4c / #e4f2e9 | #3fa66b / #e2f4e9 | Success, done, joined |
| `clay` / `clay-soft` | #b42318 / #fbe9e7 | #d9574b / #fbe5e2 | Errors, overdue, destructive |

Focus rings use `--ring` (flame at 22% in the app, sky on the landing). Native `<select>` elements get a drawn chevron and no OS chrome.

## Shared pieces (`src/components/ui.tsx`)

- `PageHeader`: title, optional count pill, one-line description, actions on the right. Every list and settings page starts with one.
- `SectionHeader`: bold label with a "View all ›" link, for dashboard sections.
- `Avatar` / `AvatarGroup`: initials on a deterministic tone; used for people everywhere (nav footer, team, assignees, transcript speakers).
- `IconChip`: icon in a soft rounded square for stats and list rows.
- `Empty`: Rocky, a one-line title, a hint, and an action button. `compact` for in-page sections.
- `StatusBadge` / `PriorityBadge` / `DueBadge` / `ProjectChip` / `Notice`.
- Dashboard hero is `hero-dark`: carbon panel with a flame glow, white type, flame accent button.
- `loading.tsx` skeletons and a Rocky `not-found` page inside the app shell and at the root.

## Shape and depth

- Cards: `card` = 16px radius, 1px `edge` border (ink at 10%), soft layered shadow (`shadow-soft`). Hover on interactive cards: lift 2px with `shadow-lift`.
- Buttons: `btn-primary` (carbon in the app, merle on the landing), `btn-accent` (flame, white text, for the one action we most want on a screen), `btn-secondary` (paper with a hairline edge), `btn-ghost`. Soft shadow, 1px press on click.
- Inputs: hairline edge, merle border with a sky focus ring.
- Badges: pill, no border, display font, soft-token fill. Solid fills only for terminal states (done, recording, urgent).
- Heroes: the dashboard uses `hero-dark`; secondary heroes (onboarding, billing) use the flat `hero` tint. No blobs or dot grids on product screens.
- Landing page: near-white ground, oversized tightly tracked display headline, black pill CTAs, Rocky on a merle-to-pink-to-butter gradient panel, real product mockups in window frames, and short sentence headlines ("The follow-through, handled.").

## Type

- Display: **Outfit** 600–700 for headings, buttons, badges, nav.
- Body: **DM Sans** 400–600.
- `eyebrow`: 11px uppercase copper, letter-spaced, for section labels ("Today", "Last step", "Settings").

## Icons and illustration

- Icons: `src/components/icons.tsx`, 24px grid, 2px stroke, rounded caps, drawn in ink. Wrap in a 44px rounded chip with an ink border and a soft fill (sky, butter, clay-soft) when used as a feature or stat marker.
- Rocky (`src/components/mascot.tsx`, artwork in `public/mascot/`) carries emotion: wave for greetings, listen for recording, think for empty or working states, celebrate for completion, sleep for nothing-yet, write for AI drafting.
- No emoji in product UI.

## Voice

Short, warm, direct. Rocky speaks in first person in the chat and pop-ups ("Want me to record this one?"). Headings are sentences, not labels, when the moment is personal ("Hey Priya.").
