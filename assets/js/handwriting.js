/* =============================================================
   HAVEN — handwriting "write-on" for cursive headings
   You SEE a pen draw each letter (a stroke traced left-to-right,
   per glyph, in reading order), and solid ink fills in just behind
   the pen — so the finished word is solid and legible (filled),
   but the motion reads as real handwriting, not a wipe.
   OpenType.js (self-hosted) gives per-glyph order; the font + lib
   are local, so there's no CDN dependency. Falls back to plain
   styled script text without the library; reduced-motion shows the
   finished, filled text.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";
  var FONT_URL = "assets/fonts/dancingscript.ttf";

  // ---- Feel (gradual, defined) ----
  var INITIAL_DELAY = 0.25;
  var EM_SECONDS = 0.42;       // pen speed (seconds per em of path)
  var DELAY_MULTIPLIER = 0.5;  // overlap between letters (flowing)
  var WORD_GAP = 0.2;
  var MIN_DUR = 0.3;
  var MAX_DUR = 0.95;
  var PEN_RATIO = 0.03;        // a more defined pen line
  var INK_LAG = 0.4;           // ink fills just behind the pen

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
      var x = 10;
      var baseline = scaled * 0.78;

      for (var i = 0; i < word.length; i++) {
        var ch = word[i];
        var glyph = font.charToGlyph(ch);
        var d = font.getPath(ch, x, baseline, scaled).toPathData(2);

        var len = measure(d);
        var dur = Math.min(MAX_DUR, Math.max(MIN_DUR, (len / font.unitsPerEm) * EM_SECONDS));

        // solid ink, fades in just behind the pen
        var ink = document.createElementNS(NS, "path");
        ink.setAttribute("d", d);
        ink.setAttribute("class", "hw-ink");
        ink.setAttribute("fill", color);
        ink.style.setProperty("--fd", (delay + dur * INK_LAG).toFixed(3) + "s");
        ink.style.setProperty("--ft", Math.max(0.3, dur * 0.85).toFixed(2) + "s");
        svg.appendChild(ink);

        // the pen line that draws the letter
        var pen = document.createElementNS(NS, "path");
        pen.setAttribute("d", d);
        pen.setAttribute("class", "hw-stroke");
        pen.setAttribute("fill", "none");
        pen.setAttribute("stroke", color);
        pen.style.strokeWidth = penW.toFixed(1) + "px";
        pen.style.setProperty("--l", len.toFixed(2));
        pen.style.setProperty("--t", dur.toFixed(2) + "s");
        pen.style.setProperty("--d", delay.toFixed(3) + "s");
        svg.appendChild(pen);

        x += (glyph.advanceWidth * scaled) / font.unitsPerEm;
        delay += DELAY_MULTIPLIER * dur;
      }

      span.appendChild(svg);
      el.appendChild(span);

      // Width is per-word, but the VERTICAL box is fixed for every word
      // (based on the font baseline) so all words share one baseline and
      // line up. Tall flourishes overflow visibly rather than shifting.
      var bb;
      try { bb = svg.getBBox(); } catch (e) { bb = null; }
      var padX = scaled * 0.10;
      var vbX = bb ? bb.x - padX : 0;
      var vbW = bb ? bb.width + padX * 2 : x + 10;
      var vbY = -scaled * 0.22;   // room above the baseline (ascenders/loops)
      var vbH = scaled * 1.30;    // baseline (0.78) + descenders + padding
      svg.setAttribute("viewBox", vbX + " " + vbY + " " + vbW + " " + vbH);
      svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
      svg.style.display = "block";
      svg.style.height = fontSize * (vbH / scaled) + "px";
      svg.style.width = fontSize * (vbW / scaled) + "px";
      svg.style.maxWidth = "100%";
      svg.style.overflow = "visible";
      span.style.verticalAlign = "top";

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
