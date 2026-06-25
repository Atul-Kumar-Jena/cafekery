/* =============================================================
   ATUL's CAFEkery — Apple-style handwriting for cursive headings
   The real Parisienne glyph OUTLINES are read with opentype.js and a
   pen draws them: each letter's stroke grows along its path with
   stroke-dashoffset (length -> 0), in reading order, line by line —
   the Apple "hello" effect. When a heading finishes drawing, the pen
   strokes crossfade into the solid filled Parisienne letters.

   Trigger is a getBoundingClientRect scroll check (not
   IntersectionObserver — the page's GSAP/ScrollTrigger ancestors make
   IO misreport visibility here) with a safety timer so a heading can
   never stay hidden. Reduced-motion shows the finished text. If the
   font can't be read (no opentype / load error), the plain Parisienne
   text is left untouched, so headings are always legible.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";
  var FONT_URL = "assets/fonts/parisienne.ttf";

  // pacing — total write time for a heading is clamped; the pen moves at a
  // constant speed across glyphs so each letter takes time ∝ its stroke length
  var MIN_DUR = 1.2, MAX_DUR = 2.8;
  var GLYPH_GAP = 0.012; // tiny lift between letters
  var SAFETY_MS = 4500;

  var els = [].slice.call(document.querySelectorAll(SELECTOR));
  if (!els.length) return;

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof window.opentype === "undefined") return; // plain text stays
  var hasGsap = typeof window.gsap !== "undefined";

  // fetch + parse (opentype.load's callback form is deprecated and may not fire)
  fetch(FONT_URL)
    .then(function (r) { return r.arrayBuffer(); })
    .then(function (buf) {
      var font = window.opentype.parse(buf);
      if (!font || !font.unitsPerEm) return; // leave plain text
      var items = [];
      els.forEach(function (el) {
        try {
          var it = build(el, font);
          if (it) items.push(it);
        } catch (e) { /* leave this heading as plain text */ }
      });
      if (items.length) schedule(items);
    })
    .catch(function () { /* leave plain text */ });

  // ---- build the SVG (pen path + metrics) for one heading -------------
  function build(el, font) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return null;

    var cs = getComputedStyle(el);
    var fs = parseFloat(cs.fontSize) || 56;
    var centered = cs.textAlign === "center";
    var upm = font.unitsPerEm;
    var ascent = (font.ascender / upm) * fs;
    var descent = (Math.abs(font.descender) / upm) * fs;
    var lineH = fs * 1.06;

    // available width: the element's content box (fall back to parent)
    var maxW = el.clientWidth || (el.parentNode && el.parentNode.clientWidth) || 0;
    if (!maxW) maxW = Math.min(window.innerWidth * 0.9, 900);

    var adv = function (s) { return font.getAdvanceWidth(s, fs); };

    // greedy word-wrap to maxW
    var words = text.split(" ");
    var lines = [], cur = "";
    words.forEach(function (w) {
      var trial = cur ? cur + " " + w : w;
      if (cur && adv(trial) > maxW) { lines.push(cur); cur = w; }
      else cur = trial;
    });
    if (cur) lines.push(cur);

    // widest line sets the SVG width; flourishes get a little side padding
    var padX = fs * 0.22;
    var lineW = lines.map(adv);
    var contentW = Math.max.apply(null, lineW);
    var svgW = contentW + padX * 2;
    var topPad = fs * 0.30, botPad = descent + fs * 0.12;
    var svgH = topPad + ascent + (lines.length - 1) * lineH + botPad;

    el.setAttribute("aria-label", text);
    el.textContent = "";
    el.classList.add("hw-ink");

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "hw-svg");
    svg.setAttribute("viewBox", "0 0 " + svgW.toFixed(1) + " " + svgH.toFixed(1));
    svg.setAttribute("width", svgW.toFixed(1));
    svg.setAttribute("height", svgH.toFixed(1));
    svg.setAttribute("aria-hidden", "true");

    var sw = Math.max(1.4, fs * 0.018).toFixed(2) + "px";

    // one <path> per glyph so the pen draws them one after another (a single
    // multi-glyph path can't: stroke-dasharray restarts at every subpath, so
    // all letters would reveal at once). getPaths gives positioned glyph paths.
    var glyphs = [];
    var total = 0;
    lines.forEach(function (line, i) {
      var x = padX + (centered ? (contentW - lineW[i]) / 2 : 0);
      var y = topPad + ascent + i * lineH;
      font.getPaths(line, x, y, fs).forEach(function (gp) {
        var d = gp.toPathData(2);
        if (!d) return;
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", d);
        path.style.strokeWidth = sw;
        svg.appendChild(path);
        var L = 1;
        try { L = path.getTotalLength() || 1; } catch (e) {}
        if (reduce) { path.classList.add("inked"); }
        else { path.style.strokeDasharray = L; path.style.strokeDashoffset = L; }
        glyphs.push({ path: path, len: L });
        total += L;
      });
    });
    el.appendChild(svg);

    if (reduce || !glyphs.length) return null;
    return { el: el, glyphs: glyphs, total: total, started: false };
  }

  // ---- scheduling: draw when scrolled into view -----------------------
  function draw(item) {
    if (item.started) return;
    item.started = true;

    // constant pen speed: total write time clamped, each glyph ∝ its length
    var totalDur = Math.min(MAX_DUR, Math.max(MIN_DUR, item.total / 1600));
    var speed = item.total / totalDur; // px per second

    var tl = hasGsap ? window.gsap.timeline() : null;
    var at = 0;
    item.glyphs.forEach(function (g, i) {
      var d = Math.max(0.04, g.len / speed);
      var ink = function () { g.path.classList.add("inked"); };
      if (tl) {
        tl.to(g.path, { strokeDashoffset: 0, duration: d, ease: "none", onComplete: ink },
          i === 0 ? 0 : "+=" + GLYPH_GAP);
      } else {
        (function (path, delay, secs, fill) {
          window.setTimeout(function () {
            path.style.transition = "stroke-dashoffset " + secs + "s linear";
            path.style.strokeDashoffset = 0;
            window.setTimeout(fill, secs * 1000);
          }, delay * 1000);
        })(g.path, at, d, ink);
        at += d + GLYPH_GAP;
      }
    });
  }

  function schedule(items) {
    function inView(el) {
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      return r.top < vh * 0.86 && r.bottom > 0;
    }
    var ticking = false;
    function check() {
      ticking = false;
      items = items.filter(function (it) {
        if (it.el.offsetParent === null) return true; // hidden (closed dialog)
        if (inView(it.el)) { draw(it); return false; }
        return true;
      });
      if (!items.length) teardown();
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      (window.requestAnimationFrame || window.setTimeout)(check);
    }
    function teardown() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    check();
    window.setTimeout(function () { items.forEach(draw); teardown(); }, SAFETY_MS);
  }
})();
