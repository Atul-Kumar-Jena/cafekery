/* =============================================================
   HAVEN — handwriting "write-on" for cursive headings
   Per-glyph PEN STROKE: each .title-special is rebuilt with
   OpenType.js as word spans of SVG glyph paths, and every letter
   is DRAWN in reading order (stroke-dashoffset), so it reads as a
   pen writing — not a wipe/unveil. Uses Caveat, a monoline
   handwriting font whose letters don't fuse, so per-glyph drawing
   stays clean (no overlap/glitch, no double lines). Every word
   shares one vertical box, so the line sits on a single baseline.
   Self-hosted font + lib (no CDN). Falls back to plain styled text
   without the library; reduced-motion shows the finished text.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";
  var FONT_URL = "assets/fonts/caveat.ttf";

  // ---- Feel (genuine handwriting pace) ----
  var INITIAL_DELAY = 0.18;
  var EM_SECONDS = 0.55;       // pen speed (seconds per em of stroke length)
  var DELAY_MULTIPLIER = 0.62; // overlap between letters (flowing)
  var WORD_GAP = 0.22;
  var MIN_DUR = 0.28;
  var MAX_DUR = 0.95;
  var PEN_RATIO = 0.05;        // stroke width relative to glyph scale

  var nodes = document.querySelectorAll(SELECTOR);
  if (!nodes.length) return;

  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof window.opentype === "undefined" || !window.fetch) return;

  // wait for the webfont (so the static fallback matches), then parse
  var waits = [];
  if (document.fonts && document.fonts.load) {
    try { waits.push(document.fonts.load('600 1em "Caveat"')); } catch (e) {}
  }
  Promise.all(waits).catch(function () {}).then(function () {
    fetch(FONT_URL)
      .then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(function (buf) { var f = window.opentype.parse(buf); if (f) init(f); })
      .catch(function () {});
  });

  function init(font) {
    var io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (e) {
              if (e.isIntersecting) { activate(e.target); obs.unobserve(e.target); }
            });
          }, { threshold: 0.3 })
        : null;
    nodes.forEach(function (el) {
      build(el, font);
      if (reduce || !io) activate(el);
      else io.observe(el);
    });
  }

  function activate(el) {
    el.querySelectorAll(".handwriting-word").forEach(function (w) {
      w.classList.add("is-active");
    });
  }

  function build(el, font) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    var cs = getComputedStyle(el);
    var fontSize = parseFloat(cs.fontSize) || 80;
    var scaled = (fontSize / 80) * 800;
    var penW = scaled * PEN_RATIO;

    // one shared vertical box -> one baseline for every word
    var baseline = scaled * 0.74;
    var vbY = -scaled * 0.34;
    var vbH = scaled * 1.34;

    el.setAttribute("aria-label", text);
    el.textContent = "";

    var delay = INITIAL_DELAY;
    var words = text.split(" ");

    words.forEach(function (word, wi) {
      var span = document.createElement("span");
      span.className = "handwriting-word";
      span.style.verticalAlign = "top";
      span.style.marginRight = "0.16em";

      var svg = document.createElementNS(NS, "svg");
      var x = 6;

      for (var i = 0; i < word.length; i++) {
        var ch = word[i];
        var glyph = font.charToGlyph(ch);
        var d = font.getPath(ch, x, baseline, scaled).toPathData(2);
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("class", "draw-path");
        p.style.strokeWidth = penW.toFixed(1) + "px";
        var len = measure(d);
        var dur = Math.min(MAX_DUR, Math.max(MIN_DUR, (len / font.unitsPerEm) * EM_SECONDS));
        p.style.setProperty("--l", len.toFixed(2));
        p.style.setProperty("--t", dur.toFixed(2) + "s");
        p.style.setProperty("--d", delay.toFixed(3) + "s");
        x += (glyph.advanceWidth * scaled) / font.unitsPerEm;
        delay += DELAY_MULTIPLIER * dur;
        svg.appendChild(p);
      }

      var vbW = x + 6;
      svg.setAttribute("viewBox", "0 " + vbY + " " + vbW + " " + vbH);
      svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
      svg.style.display = "block";
      svg.style.width = fontSize * (vbW / scaled) + "px";
      svg.style.height = "auto"; // equals hPx when not width-capped; never squishes
      svg.style.maxWidth = "100%";
      svg.style.overflow = "visible";

      span.appendChild(svg);
      el.appendChild(span);

      if (wi < words.length - 1) delay += DELAY_MULTIPLIER * WORD_GAP;
    });
  }

  function measure(d) {
    var tmp = document.createElementNS(NS, "svg");
    tmp.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    tmp.appendChild(p);
    document.body.appendChild(tmp);
    var l = 0;
    try { l = p.getTotalLength(); } catch (e) {}
    document.body.removeChild(tmp);
    return l || 1;
  }
})();
