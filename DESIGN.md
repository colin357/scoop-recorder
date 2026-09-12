# Scoop design language

Everything visual derives from Rocky, the blue merle Aussie mascot: his merle blue, copper points, cream and pink, set on warm paper. The construction is modern and quiet (hairline edges, soft layered shadows, generous radii) so the illustration and the copper accent do the talking.

## Palette (Tailwind tokens in `src/app/globals.css`)

| Token | Hex | Use |
|---|---|---|
| `ink` | #171b26 | Outlines, text, hard shadows |
| `ink-soft` / `muted` | #3d4454 / #7a8394 | Secondary text |
| `cream` | #fbf7f0 | Page background (with a faint dot grid) |
| `paper` / `paper-2` | #ffffff / #f4efe6 | Cards / recessed panels |
| `merle` / `merle-deep` | #3b5b85 / #22344f | Primary actions, active nav, links |
| `sky` / `sky-soft` | #dce7f5 / #eef3fa | Tints for selected and informational states |
| `copper` / `copper-deep` | #e19a46 / #b8752b | Accent CTAs ("Record a meeting"), eyebrows |
| `butter` / `butter-soft` | #f6d27a / #fdf3d6 | Highlights, warnings, icon chips |
| `pink` / `pink-soft` | #f27daa / #fde4ee | Playful accents, drafts, step numbers |
| `grass` / `grass-soft` | #3fa66b / #e2f4e9 | Success, done |
| `clay` / `clay-soft` | #d9574b / #fbe5e2 | Errors, overdue, recording |

## Shape and depth

- Cards: `card` = 16px radius, 1px `edge` border (ink at 10%), soft layered shadow (`shadow-soft`). Hover on interactive cards: lift 2px with `shadow-lift`.
- Buttons: `btn-primary` (merle), `btn-accent` (copper, for the one action we most want on a screen), `btn-secondary` (paper with a hairline edge), `btn-ghost`. Soft shadow, 1px press on click. No black frames.
- Inputs: hairline edge, merle border with a sky focus ring.
- Badges: pill, no border, display font, soft-token fill. Solid fills only for terminal states (done, recording, urgent).
- Heroes: flat sky-to-sky-soft gradient. No blobs or dot grids on product screens.
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
