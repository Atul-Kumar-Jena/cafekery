/* =============================================================
   HAVEN — handwriting "draw-in" for cursive headings
   Per-glyph, left-to-right writing with OpenType.js:
     each .title-special is rebuilt as word spans of SVG glyph
     paths; every character is drawn in reading order by tweening
     stroke-dashoffset (CSS), with a small overlap so the pen
     flows continuously — slow and deliberate, like Apple's boot
     "hello". Triggers once on scroll.
   Self-hosted font + library => no CDN dependency.
   Falls back to the plain styled script text if the library is
   unavailable, and shows the finished text under reduced-motion.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";
  var FONT_URL = "assets/fonts/parisienne.ttf";

  // ---- Feel (slow + deliberate, but flowing ~7-8s) ----
  var INITIAL_DELAY = 0.3; // s before the first stroke
  var EM_SECONDS = 0.42; // seconds to draw one em of path length (bigger = slower)
  var DELAY_MULTIPLIER = 0.5; // <1 overlaps strokes for a continuous flowing hand
  var WORD_GAP = 0.22; // extra delay (s) between words
  var MIN_DUR = 0.36;
  var MAX_DUR = 1.1;
  var STROKE_RATIO = 0.03; // stroke width relative to glyph scale

  var nodes = document.querySelectorAll(SELECTOR);
  if (!nodes.length) return;

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No library (e.g. blocked) -> keep the readable, styled script text.
  if (typeof window.opentype === "undefined" || !window.fetch) return;

  // Fetch + parse directly (more reliable than opentype.load across builds).
  fetch(FONT_URL)
    .then(function (resp) {
      if (!resp.ok) throw new Error("font " + resp.status);
      return resp.arrayBuffer();
    })
    .then(function (buf) {
      var font = window.opentype.parse(buf);
      if (font) init(font);
    })
    .catch(function () {
      /* leave the styled fallback text in place */
    });

  function init(font) {
    var io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            function (entries, obs) {
              entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                  activate(entry.target);
                  obs.unobserve(entry.target);
                }
              });
            },
            { threshold: 0.35 }
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
    var fontSize = parseFloat(cs.fontSize) || 80;
    var scaled = (fontSize / 80) * 800; // large glyphs => crisp SVG
    var strokeW = scaled * STROKE_RATIO;
    var vbTop = -scaled * 0.4;
    var vbH = scaled * 1.6;
    var pxH = fontSize * 1.6;

    el.setAttribute("aria-label", text);
    el.textContent = "";

    var delay = INITIAL_DELAY;
    var words = text.split(" ");

    words.forEach(function (word, wi) {
      var span = document.createElement("span");
      span.className = "handwriting-word";
      span.style.verticalAlign = "middle";
      span.style.marginRight = "0.14em";

      var svg = document.createElementNS(NS, "svg");
      var x = 10;
      var baseline = scaled * 0.78;

      for (var i = 0; i < word.length; i++) {
        var ch = word[i];
        var glyph = font.charToGlyph(ch);
        var path = font.getPath(ch, x, baseline, scaled);
        var d = path.toPathData(2);

        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("class", "draw-path");
        p.style.strokeWidth = strokeW.toFixed(1) + "px";

        var len = measure(p, d);
        var dur = Math.min(
          MAX_DUR,
          Math.max(MIN_DUR, (len / font.unitsPerEm) * EM_SECONDS)
        );

        p.style.setProperty("--l", len.toFixed(2));
        p.style.setProperty("--t", dur.toFixed(2) + "s");
        p.style.setProperty("--d", delay.toFixed(3) + "s");

        x += (glyph.advanceWidth * scaled) / font.unitsPerEm;
        delay += DELAY_MULTIPLIER * dur;

        svg.appendChild(p);
      }

      var totalAdv = x + 10;
      svg.setAttribute("viewBox", "0 " + vbTop + " " + totalAdv + " " + vbH);
      svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
      svg.style.display = "block";
      svg.style.height = pxH + "px";
      svg.style.width = pxH * (totalAdv / vbH) + "px";
      svg.style.maxWidth = "100%";
      svg.style.overflow = "visible";

      span.appendChild(svg);
      el.appendChild(span);

      if (wi < words.length - 1) delay += DELAY_MULTIPLIER * WORD_GAP;
    });
  }

  // getTotalLength needs measuring; works on detached nodes in most
  // engines, with a temp-SVG fallback.
  function measure(node, d) {
    if (typeof node.getTotalLength === "function") {
      try {
        var n = node.getTotalLength();
        if (n) return n;
      } catch (e) {}
    }
    var tmp = document.createElementNS(NS, "svg");
    tmp.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    var tp = document.createElementNS(NS, "path");
    tp.setAttribute("d", d);
    tmp.appendChild(tp);
    document.body.appendChild(tmp);
    var l = tp.getTotalLength();
    document.body.removeChild(tmp);
    return l;
  }
})();
