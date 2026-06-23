# HAVEN — Australian Brunch &amp; Coffee Shop (cafekery)

A static website for **HAVEN**, an Australian brunch &amp; coffee shop in Annecy,
France, with a **QR table-ordering** flow. The design system and signature
interactions are reverse-engineered from
[haven-annecy.fr](https://haven-annecy.fr/en) based on the forensic brief in
`/docs`. Everything is self-hosted — **no CDN dependencies**.

## Highlights

- **Food-filled wordmark hero** — a giant `HAVEN` whose letters are clipped to a
  bundled illustrated food collage (`background-clip: text`) with a warm
  gradient fallback; painted in left→right on load.
- **Flowing line-art** — a continuous single-line SVG that slowly draws itself
  across the hero (measured `stroke-dashoffset`, ~9s).
- **Handwriting stroke-draw** — cursive phrases tagged `.title-special` (e.g.
  *“Not Heaven, but pretty close!”*) are rebuilt as **per-letter** SVG glyph
  paths with [OpenType.js](https://opentype.js.org) (Parisienne) and drawn in
  reading order via `stroke-dashoffset` — a deliberate, Apple-style write.
  Degrades to plain styled script text without JS.
- **GSAP scroll choreography** — *The View* is a pinned **horizontal
  side-scroll** (`ScrollTrigger` pin + scrub) that stacks on mobile; the menu
  uses `ScrollTrigger.batch` staggered reveals; a full-screen handwriting
  **signature overlay** writes near the footer.
- **QR table ordering** (`order.html?t=N`) — scan → menu with a *Table N* badge
  → cart persisted in `localStorage` (survives refresh) → send → confirmation
  with a prep timer. Offline-safe **outbox** queue with auto-retry + duplicate
  guard. A live **kitchen board** (`kitchen.html`) reads new tickets and chimes.
- **Giant typographic sections** (`BRUNCH` / `COFFEE`), sticky slide-in header,
  infinite loop marquee, branded selection/focus states, back-to-top.
- Responsive throughout, with a full-screen mobile menu, accessible forms, and
  `prefers-reduced-motion` support.

## Design tokens

| Token | Value |
| --- | --- |
| Terracotta | `#c1643b` |
| Cream | `#fffaf7` |
| Sand | `#efdacc` |
| Cocoa | `#2b1a12` |
| Sans | Archivo (DIN-2014 stand-in) |
| Script / handwriting | Parisienne (With Hearty stand-in) |

## Structure

```
index.html        Home — hero, spring feature, BRUNCH/COFFEE, menu showcase,
                  loop marquee, The View (side-scroll), QR ordering, signature
about.html        Story, sourcing and values
menu.html         Full menu (GSAP batch reveals)
contact.html      Hours, location, map, reservation form, gifting
order.html        QR table-ordering app (reads ?t=<table>)
kitchen.html      Live kitchen board (reads orders from localStorage)
assets/css/style.css
assets/js/main.js          Header, reveals, mobile menu, loop carousel, forms, back-to-top
assets/js/handwriting.js   Per-letter OpenType handwriting
assets/js/scroll.js        GSAP side-scroll + menu batch reveals
assets/js/qr.js            Renders scannable QR (origin-aware)
assets/js/order.js         Ordering cart/outbox/confirmation logic
assets/js/vendor/          opentype.min.js, gsap.min.js, ScrollTrigger.min.js, qrcode-generator.js
assets/fonts/              Archivo + Parisienne (self-hosted)
assets/img/haven-food.svg  Illustrated food collage for the wordmark
docs/                      Original forensic-audit briefs
```

## QR ordering — how it works

1. Each table has a QR sticker pointing to `…/order.html?t=12`.
2. The order page opens with the menu and a floating **Table 12** badge.
3. Items add to a cart saved in `localStorage` (recovered on refresh/reopen).
4. **Send** queues the order in an outbox, then flushes it to the shared order
   list. If offline, it stays queued and auto-retries on reconnect; a unique
   `clientOrderId` prevents duplicates.
5. `kitchen.html` (counter tablet) polls the list, shows tickets per table, and
   chimes on new orders. *Mark ready* clears a ticket.

This is a **front-end demo** (orders live in `localStorage`, same-device). To go
live, point the outbox flush at a backend (Supabase/Firebase/Node) and have the
kitchen board subscribe — the data shapes already match.

## Running locally

No build step — plain HTML/CSS/JS, everything self-hosted:

```bash
python3 -m http.server 8000
# open http://localhost:8000  (try /order.html?t=12 and /kitchen.html)
```

## Notes

Food imagery is an illustrated SVG collage + gradient tiles so the site is fully
self-contained; swap in real photography (e.g. `ss25-menu-haven-*`) when
available. The site uses the real HAVEN name/trade dress — rebrand before any
public/commercial use.
