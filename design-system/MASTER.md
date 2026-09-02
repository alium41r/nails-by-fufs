# Design System: MASTER (`design-system/MASTER.md`)

> **Canonical Visual & Interaction Implementation System for Nails by Fufs**  
> Subordinate to `brain.md` §9 (Brand Intent). Governs global UI tokens, typography, spacing, and component behaviors.

---

## 1. Color Palette & Semantic Tokens

### Light Theme
- `--background`: `#FCEEF2` (Soft Cashmere Rose / Petal Blush Foundation)
- `--foreground`: `#22141B` (Deep Espresso Plum Neutral — 14.6:1 WCAG AAA Contrast)
- `--surface`: `#FFF7F9` (Luminous Pearl Pink Card / Surface Layer)
- `--surface-subtle`: `#F7E2EB` (Soft Rosy Blush Wash for Placeholders & Accents)
- `--muted`: `#F2DAE5` (Muted Dusty Rose Fill)
- `--muted-foreground`: `#7E636E` (Deep Mauve Rosewood for Body/Subtext — 5.1:1 Contrast)
- `--border`: `#E8CCD8` (Hairline Rose-Quartz Border)
- `--border-subtle`: `#F3DEE8`
- `--accent`: `#942948` (Deep Dark Cherry Burgundy — 6.6:1 WCAG AA Contrast)
- `--accent-hover`: `#7D1A36` (Deeper Cherry Wine)
- `--accent-foreground`: `#FFF7F9`
- `--accent-subtle`: `#FBDCE7` (Soft Petal Pink Highlight Wash)
- `--ring`: `#942948`

### Dark Theme
- `--background`: `#171214` (Deep Warm Espresso Charcoal)
- `--foreground`: `#F6EFEA` (Warm Ivory Text)
- `--surface`: `#221B1E` (Dark Warm Surface)
- `--surface-subtle`: `#2C2226`
- `--muted`: `#271E22`
- `--muted-foreground`: `#A69B9E`
- `--border`: `#3B2E33`
- `--border-subtle`: `#2F2428`
- `--accent`: `#E8829C` (Luminous Modern Rose Highlight, > 7.5:1 Contrast)
- `--accent-hover`: `#F2A3B8`
- `--accent-foreground`: `#171214`
- `--accent-subtle`: `#311620`
- `--ring`: `#E8829C`

---

## 2. Typography System

- **Display Serif**: `var(--font-display)` -> *Cormorant Garamond* (Light weight, tracking tight, italic accentuation)
- **Body Sans**: `var(--font-sans)` -> *Plus Jakarta Sans* / *Inter* (Clean, legible, modern geometric)
- **Eyebrow Utility**: `.eyebrow` -> `0.6875rem (11px)`, `font-weight: 500`, `letter-spacing: 0.2em`, uppercase.

---

## 3. Image Aspect Ratio Standards
- `portrait` -> `4:5` (`aspect-[4/5]` for products & editorial hand shots)
- `wide` -> `16:9` (`aspect-[16/9]` for collection lookbooks & banners)
- `classic` -> `3:2` (`aspect-[3/2]` for studio & bespoke archives)
- `square` -> `1:1` (`aspect-square` for macro detail & texture shots)

---

## 4. Section Rhythm & Composition Standards
- **Varied Flow**: Asymmetrical split hero → Full-width lookbook → 4-product discovery grid → Bespoke commission split → Airy process sequence → Visual archive lookbook → Spacious final CTA → Newsletter.
- **Anti-"Card-Grid-Everywhere"**: Use whitespace, hairline dividers, and scale shifts rather than boxing every item inside identical cards.
- **Touch Targets**: All interactive elements (buttons, links, drawer triggers) >= `44px` height/width.
- **Text Wrap**: Always apply `text-balance` on headings to avoid orphan words.
- **Factual Boundaries**: No invented review scores, fake customer counts, or synthetic nail photography.
