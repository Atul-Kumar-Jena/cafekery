/* =============================================================
   ATUL's CAFEkery — handwriting "write-on" for cursive headings
   Each .title-special is genuinely DRAWN by a pen: a single-stroke
   (monoline) cursive — Hershey "Script medium", whose letters are open
   strokes, not filled outlines — is laid out per word as one SVG path,
   then drawn with stroke-dashoffset (length -> 0). A multi-subpath path
   dash-draws its subpaths in order, so the letters appear one after
   another, like a hand writing. No fill, no clip, no nib: none of the
   outline-font failure modes (double lines, clipped capitals, unveil).
   Font data + GSAP are self-hosted (no CDN). Reduced-motion / no-JS
   shows the finished text.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";
  var FONT = window.HW_FONT;

  // ---- layout (Hershey units; y is screen-down, baseline ~22) ----
  var SPACE = 14;        // advance for a space
  var TRACK = 2.0;       // extra tracking between letters (legibility)
  var VBY = -10, VBH = 50, BASE_UNITS = 22;

  // ---- pacing ----
  var INITIAL_DELAY = 0.15;
  var SPEED = 210;       // pen speed: stroke units per second
  var MIN_DUR = 0.35, MAX_DUR = 1.7;
  var WORD_GAP = 0.05;   // brief pen lift between words

  var nodes = document.querySelectorAll(SELECTOR);
  if (!nodes.length || !FONT || !FONT.chars) return;

  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";

  var io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(function (entries, obs) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { activate(e.target); obs.unobserve(e.target); }
          });
        }, { threshold: 0.2 })
      : null;

  nodes.forEach(function (el) {
    build(el);
    prep(el);
    // hidden (e.g. a closed dialog) can't be observed for intersection and
    // would otherwise stay invisible — just show it fully written.
    if (reduce || !io || el.offsetParent === null) finish(el);
    else io.observe(el);
  });

  // translate one word's glyphs into a single combined path
  function wordPath(word) {
    var chars = FONT.chars, x = 0, d = "";
    for (var i = 0; i < word.length; i++) {
      var g = chars[word.charCodeAt(i) - 33];
      if (!g || !g.d) { x += SPACE; continue; }
      d += g.d.replace(/(-?\d+),(-?\d+)/g, function (m, a, b) { return ((+a) + x) + "," + b; }) + " ";
      x += g.o + TRACK;
    }
    return { d: d.trim(), w: x };
  }

  function build(el) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    var cs = getComputedStyle(el);
    var fontSize = parseFloat(cs.fontSize) || 64;
    var ppu = fontSize / BASE_UNITS;
    var sw = Math.max(2.2, fontSize * 0.04);

    el.setAttribute("aria-label", text);
    el.textContent = "";

    var paths = [];
    text.split(" ").forEach(function (word) {
      var lay = wordPath(word);
      if (!lay.w) return;
      var span = document.createElement("span");
      span.className = "handwriting-word";

      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 " + VBY + " " + lay.w.toFixed(1) + " " + VBH);
      svg.setAttribute("aria-hidden", "true");
      svg.style.display = "block";
      svg.style.height = (VBH * ppu).toFixed(1) + "px";
      svg.style.width = (lay.w * ppu).toFixed(1) + "px";
      svg.style.maxWidth = "100%";
      svg.style.overflow = "visible";

      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", lay.d);
      p.setAttribute("class", "hw-stroke");
      p.style.strokeWidth = sw.toFixed(1) + "px";
      svg.appendChild(p);
      span.appendChild(svg);
      el.appendChild(span);
      paths.push(p);
    });
    el.__hwPaths = paths;
  }

  // dash each path by its own length; hidden until activated
  function prep(el) {
    (el.__hwPaths || []).forEach(function (p) {
      var L = 0;
      try { L = p.getTotalLength(); } catch (e) {}
      L = L || 1;
      p.__len = L;
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = reduce ? 0 : L;
    });
  }

  function dur(p) {
    return Math.min(MAX_DUR, Math.max(MIN_DUR, p.__len / SPEED));
  }

  function finish(el) {
    (el.__hwPaths || []).forEach(function (p) { p.style.strokeDashoffset = 0; });
  }

  function activate(el) {
    if (reduce) return finish(el);
    var paths = el.__hwPaths || [];
    if (!paths.length) return;

    if (hasGsap) {
      var tl = window.gsap.timeline({ delay: INITIAL_DELAY });
      paths.forEach(function (p, i) {
        tl.to(p, { strokeDashoffset: 0, duration: dur(p), ease: "none" },
          i === 0 ? 0 : "+=" + WORD_GAP);
      });
    } else {
      var t = INITIAL_DELAY * 1000;
      paths.forEach(function (p) {
        var d = dur(p);
        (function (pp, delay, secs) {
          setTimeout(function () {
            pp.style.transition = "stroke-dashoffset " + secs + "s linear";
            pp.style.strokeDashoffset = 0;
          }, delay);
        })(p, t, d);
        t += (d + WORD_GAP) * 1000;
      });
    }
  }
})();
