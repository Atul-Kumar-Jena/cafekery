# HAVEN — Café &amp; Brunch (cafekery)

A static marketing website for **HAVEN**, a specialty-coffee café and all-day
brunch house in Annecy, France. The design system and signature interactions
are reverse-engineered from [haven-annecy.fr](https://haven-annecy.fr/en) based
on the forensic audit brief in `/docs`.

## Highlights

- **Food-filled wordmark hero** — a giant `HAVEN` whose letters are clipped to
  food photography via `background-clip: text`, with a warm food-coloured
  gradient layered underneath as an automatic fallback if the photo fails.
- **Flowing line-art** — a continuous single-line SVG illustration that draws
  itself in across the hero (`stroke-dashoffset`).
- **Signature handwriting stroke-draw animation** — cursive phrases tagged
  `.title-special` (e.g. *“Not Heaven, but pretty close!”*) are turned into
  per-character SVG paths with [OpenType.js](https://opentype.js.org) using a
  script font, then drawn by tweening `stroke-dashoffset` (path length → 0)
  with a staggered, overlapping delay. Degrades to the plain styled script
  text when JS, the library, or the font is unavailable.
- **Giant typographic sections** — oversized `BRUNCH` / `COFFEE` words with
  script overlays (*9am – 2pm*, *from 8am*).
- **Sticky header** that turns fixed and slides in once the hero leaves the
  viewport (IntersectionObserver); **scroll-reveal** for sections and lists;
  **infinite loop carousel** at a constant ~0.9px/frame.
- Responsive layout with a full-screen mobile menu, accessible forms, and
  `prefers-reduced-motion` support throughout.

## Design tokens

| Token | Value |
| --- | --- |
| Terracotta | `#c1643b` |
| Cream | `#fffaf7` |
| Sand | `#efdacc` |
| Cocoa | `#2b1a12` |
| Sans | Archivo (DIN-2014 stand-in) |
| Script / handwriting | Sacramento (With Hearty stand-in) |

## Structure

```
index.html        Homepage — hero, intro, menu showcase, loop carousel, values, CTA
about.html        Story, sourcing and values
menu.html         Full menu (brunch, sweet, pastry, coffee, cold)
contact.html      Hours, location, map and a reservation form
assets/css/style.css
assets/js/main.js          Header, scroll-reveal, mobile menu, loop carousel, forms
assets/js/handwriting.js   OpenType.js handwriting animation
docs/             Original forensic-audit briefs
```

## Running locally

No build step — it's plain HTML/CSS/JS. Serve the folder over HTTP so the
OpenType font and fonts load correctly:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

OpenType.js and the handwriting/Google fonts are loaded from CDNs.

## Notes

Food imagery is rendered as warm gradient tiles so the site is fully
self-contained; swap the `.foodtile` elements for real `<img>` photography
(e.g. the `ss25-menu-haven-*` shots) when assets are available.
