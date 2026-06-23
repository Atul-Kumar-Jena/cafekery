/* =============================================================
   HAVEN — handwriting "write-on" for cursive headings
   FILLED + pen-drawn: each .title-special is rebuilt per glyph with
   OpenType.js. Every letter is a SOLID fill, revealed by a thick
   pen stroke travelling along the glyph (an SVG mask whose
   stroke-dashoffset animates). The ink therefore appears as if
   written by a pen, in reading order — and stays solid and legible
   (no hollow outlines, no double lines).
   Self-hosted font + library => no CDN dependency. Falls back to
   the plain styled script text without the library; reduced-motion
   shows the finished, filled text.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";
  var FONT_URL = "assets/fonts/parisienne.ttf";

  // ---- Feel (deliberate, flowing) ----
  var INITIAL_DELAY = 0.35;
  var EM_SECONDS = 0.5;       // seconds to draw one em of pen length
  var DELAY_MULTIPLIER = 0.55; // <1 overlaps strokes -> continuous hand
  var WORD_GAP = 0.22;
  var MIN_DUR = 0.34;
  var MAX_DUR = 1.05;
  var PEN_RATIO = 0.085;      // pen thickness relative to glyph scale

  var nodes = document.querySelectorAll(SELECTOR);
  if (!nodes.length) return;

  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof window.opentype === "undefined" || !window.fetch) return;

  fetch(FONT_URL)
    .then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
    .then(function (buf) {
      var font = window.opentype.parse(buf);
      if (font) init(font);
    })
    .catch(function () { /* keep styled fallback text */ });

  var uid = 0;

  function init(font) {
    var io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            function (entries, obs) {
              entries.forEach(function (e) {
                if (e.isIntersecting) { activate(e.target); obs.unobserve(e.target); }
              });
            },
            { threshold: 0.3 }
          )
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
    var color = cs.color;
    var fontSize = parseFloat(cs.fontSize) || 80;
    var scaled = (fontSize / 80) * 800;
    var penW = scaled * PEN_RATIO;

    el.setAttribute("aria-label", text);
    el.textContent = "";

    var delay = INITIAL_DELAY;
    var words = text.split(" ");

    words.forEach(function (word, wi) {
      var span = document.createElement("span");
      span.className = "handwriting-word";
      span.style.verticalAlign = "middle";
      span.style.marginRight = "0.12em";

      var svg = document.createElementNS(NS, "svg");
      var maskId = "hwmask" + ++uid;
      var defs = document.createElementNS(NS, "defs");
      var mask = document.createElementNS(NS, "mask");
      mask.setAttribute("id", maskId);
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      var g = document.createElementNS(NS, "g");
      g.setAttribute("mask", "url(#" + maskId + ")");

      var x = 10;
      var baseline = scaled * 0.78;

      for (var i = 0; i < word.length; i++) {
        var ch = word[i];
        var glyph = font.charToGlyph(ch);
        var d = font.getPath(ch, x, baseline, scaled).toPathData(2);

        // solid ink
        var fill = document.createElementNS(NS, "path");
        fill.setAttribute("d", d);
        fill.setAttribute("fill", color);
        g.appendChild(fill);

        // pen that reveals it (white stroke in the mask)
        var pen = document.createElementNS(NS, "path");
        pen.setAttribute("d", d);
        pen.setAttribute("class", "hw-pen");
        pen.style.strokeWidth = penW.toFixed(1) + "px";
        var len = measure(d);
        var dur = Math.min(MAX_DUR, Math.max(MIN_DUR, (len / font.unitsPerEm) * EM_SECONDS));
        pen.style.setProperty("--l", len.toFixed(2));
        pen.style.setProperty("--t", dur.toFixed(2) + "s");
        pen.style.setProperty("--d", delay.toFixed(3) + "s");
        mask.appendChild(pen);

        x += (glyph.advanceWidth * scaled) / font.unitsPerEm;
        delay += DELAY_MULTIPLIER * dur;
      }

      defs.appendChild(mask);
      svg.appendChild(defs);
      svg.appendChild(g);
      span.appendChild(svg);
      el.appendChild(span);

      // size to the rendered glyphs (g must be in the DOM to measure)
      var bb;
      try { bb = g.getBBox(); } catch (e) { bb = null; }
      var pad = scaled * 0.22;
      var vbx = bb ? bb.x - pad : 0;
      var vby = bb ? bb.y - pad : -scaled * 0.4;
      var vbw = bb ? bb.width + pad * 2 : x + 10;
      var vbh = bb ? bb.height + pad * 2 : scaled * 1.6;

      mask.setAttribute("x", vbx);
      mask.setAttribute("y", vby);
      mask.setAttribute("width", vbw);
      mask.setAttribute("height", vbh);

      svg.setAttribute("viewBox", vbx + " " + vby + " " + vbw + " " + vbh);
      svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
      svg.style.display = "block";
      svg.style.height = fontSize * (vbh / scaled) + "px";
      svg.style.width = fontSize * (vbw / scaled) + "px";
      svg.style.maxWidth = "100%";
      svg.style.overflow = "visible";

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
