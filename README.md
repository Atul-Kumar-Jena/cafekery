# HAVEN — Café &amp; Brunch (cafekery)

A static marketing website for **HAVEN**, a specialty-coffee café and all-day
brunch house in Annecy, France. The design system and signature interactions
are reverse-engineered from [haven-annecy.fr](https://haven-annecy.fr/en) based
on the forensic audit brief in `/docs`.

## Highlights

- **Handwriting stroke-draw animation** — headings tagged `.title-special` are
  turned into per-character SVG paths with [OpenType.js](https://opentype.js.org)
  and animated by tweening `stroke-dashoffset` (path length → 0) with a
  staggered, slightly-overlapping delay. Degrades gracefully to the plain
  styled text when JS, the library, or the font is unavailable.
- **Sticky header** that turns fixed and slides in once the hero banner leaves
  the viewport (IntersectionObserver).
- **Scroll-reveal** for sections and staggered lists.
- **Infinite loop carousel** (marquee) that scrolls at a constant ~0.9px/frame.
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
| Handwriting | Shadows Into Light (With Hearty stand-in) |

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
