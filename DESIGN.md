# Design

Source of truth: the approved prototype in `docs/prototype/` and tokens in `src/styles/tokens.css` (ported from `docs/design/site-tokens.css`).

## Visual theme
Dark olive-charcoal ground under a scrimmed, fixed background photograph (`image06_litter-rigging-overlook`), with a fine grain texture. Frosted panels (78% night fill, grain, 0.75rem backdrop blur) carry the important content, each topped with a 3px ember rule. Square corners everywhere.

Physical scene: someone on a phone in the evening, deciding whether to bring their teenager to a Wednesday class; dark ground with bone type reads like a headlamp-lit map case.

## Color (Committed to a dark ground, one signal)
| Token | Value | Role |
|---|---|---|
| `--night` | `#13150f` | Ground, text on ember |
| `--ink` | `#ede7da` | Primary text, outlines |
| `--ink-muted` | `#b8b0a0` | Secondary text, notes |
| `--signal` | `#e2863a` | Ember: eyebrows, links, solid buttons, focus, panel rule |
| `--scrim` / `--panel` | night at 72% / 78% | Photo scrim, frosted panel fill |
| `--line-*` | ink at 18–60% | Hairlines, input borders |

Ember on night is about 6.7:1. Never use ember for long body text.

## Typography
- Display and labels: **Barlow Condensed** 600/700, uppercase, tracked (0.02em titles, 0.16–0.22em labels).
- Body: **Barlow** 400/500/600, 1.125rem, line-height 1.75 (1.65 tight).
- Scale: display 6.5rem → section title 3rem → tier 2.25rem → item 1.375rem → body 1.125rem → label 0.875rem. At 736px: display 3.5rem, section 2.25rem.
- Body measure capped around 65–75ch.

## Components
- **Button**: 3.75rem tall, 2px ink outline, condensed uppercase label. `solid` = ember fill, night text; hover flips to ink fill. Optional trailing down-arrow for in-page links.
- **TextField**: condensed uppercase label over a 1px outlined, transparent, square input.
- **Panel**: `frosted` or `clear`.
- **SectionHeader**: ember eyebrow over condensed uppercase title; `section` or `tier`.
- **CourseItem**: condensed uppercase name over body description.
- **Fact**: eyebrow label + item value with a hairline top border.
- **Date pill**: outlined toggle; selected = ember fill, `aria-pressed`.
- **Checkbox**: 2rem square, ember fill with night inset when checked.

## Layout
72rem max width, 5rem side gutters (1.5rem at 736px). Sections separated by 4–7rem; content within groups by 1–2rem. Flex-wrap two-column splits that collapse naturally.

## Motion
One staggered fade-and-rise on first paint of each page's lead content (ease-out-quart, 600ms), disabled under `prefers-reduced-motion`. Color transitions 200ms on interactive elements. No scale or bounce.
