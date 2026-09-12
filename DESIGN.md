# Scoop design language — "Sticker"

Everything visual derives from Rocky, the blue merle Aussie mascot: flat fills, thick ink outlines, a warm paper background. The UI should feel like die-cut stickers on cream paper: friendly, tactile, unmistakably ours.

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

- Cards: `card` = 2px ink border, 16px radius, hard 4px offset shadow. No blur, no gradients on surfaces.
- Buttons: `btn-primary` (merle), `btn-accent` (copper, for the one action we most want), `btn-secondary` (paper), `btn-ghost`. All have the 2px border + 3px offset shadow and press down 2px on click.
- Inputs: 2px ink border, 2px offset shadow, merle on focus.
- Badges: pill, thin ink border, display font, filled with a soft token.
- Hover on cards: lift 2px and grow the shadow to 6px.

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
