/* =============================================================
   ATUL's CAFEkery — handwriting "write-on" for cursive headings
   Each .title-special is rebuilt with OpenType.js as word spans of
   FILLED glyph shapes (solid, defined letters — not hollow strokes).
   Every letter is then REVEALED left-to-right in reading order with
   its own clip mask, sequenced with a little overlap, so the word
   flows out exactly as a hand writes connected cursive — not a single
   curtain wipe, and no random stroke start/end. Uses Dancing Script,
   a connected handwriting font: because the letters are FILLED, the
   joins simply merge like real writing (overlap never glitches).
   Self-hosted font + lib (no CDN). Reduced-motion shows finished text.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";
  var FONT_URL = "assets/fonts/dancingscript.ttf";

  // ---- Feel (genuine handwriting pace) ----
  var INITIAL_DELAY = 0.15;
  var PER_EM = 0.85;   // pen speed: seconds to sweep one em of letter width
  var OVERLAP = 0.72;  // start next letter before the previous finishes
  var WORD_GAP = 0.16;
  var MIN_DUR = 0.18;
  var MAX_DUR = 0.7;

  var nodes = document.querySelectorAll(SELECTOR);
  if (!nodes.length) return;

  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof window.opentype === "undefined" || !window.fetch) return;

  // wait for the webfont (so the static fallback matches), then parse
  var waits = [];
  if (document.fonts && document.fonts.load) {
    try { waits.push(document.fonts.load('700 1em "Dancing Script"')); } catch (e) {}
  }
  Promise.all(waits).catch(function () {}).then(function () {
    fetch(FONT_URL)
      .then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(function (buf) { var f = window.opentype.parse(buf); if (f) init(f); })
      .catch(function () {});
  });

  var uid = 0;

  function init(font) {
    var io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (e) {
              if (e.isIntersecting) { activate(e.target); obs.unobserve(e.target); }
            });
          }, { threshold: 0.25 })
        : null;
    nodes.forEach(function (el) {
      build(el, font);
      if (reduce || !io) activate(el);
      else io.observe(el);
    });
  }

  function activate(el) {
    var anims = el.__hwAnims || [];
    // kick each letter's reveal at its cumulative delay -> sequential writing
    anims.forEach(function (a) {
      try { a.el.beginElementAt(a.delay); }
      catch (e) { try { a.el.beginElement(); } catch (_) {} }
    });
  }

  function build(el, font) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    var cs = getComputedStyle(el);
    var fontSize = parseFloat(cs.fontSize) || 80;
    var scaled = (fontSize / 80) * 800;
    var upm = font.unitsPerEm;

    // one shared vertical box -> every word sits on a single baseline
    var baseline = scaled * 0.72;
    var vbY = -scaled * 0.46;
    var vbH = scaled * 1.55;

    el.setAttribute("aria-label", text);
    el.textContent = "";

    var anims = [];
    var delay = INITIAL_DELAY;
    var words = text.split(" ");

    words.forEach(function (word, wi) {
      var span = document.createElement("span");
      span.className = "handwriting-word";

      var svg = document.createElementNS(NS, "svg");
      var defs = document.createElementNS(NS, "defs");
      svg.appendChild(defs);
      var x = 8;

      for (var i = 0; i < word.length; i++) {
        var ch = word[i];
        var glyph = font.charToGlyph(ch);
        var adv = (glyph.advanceWidth * scaled) / upm;
        var path = font.getPath(ch, x, baseline, scaled);
        var d = path.toPathData(2);

        // reveal extent = glyph's own ink box (covers tails/overhangs)
        var bb = null;
        try { bb = path.getBoundingBox(); } catch (e) {}
        var hasInk = bb && isFinite(bb.x1) && bb.x2 > bb.x1;
        var startX = hasInk ? bb.x1 - scaled * 0.02 : x;
        var endX = hasInk ? bb.x2 + scaled * 0.05 : x + adv;
        var revealW = Math.max(endX - startX, adv * 0.6);
        var dur = Math.min(MAX_DUR, Math.max(MIN_DUR, (revealW / upm) * PER_EM));

        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("class", "hw-glyph");

        if (hasInk) {
          // clip rect sweeps left->right across this glyph as it's "written"
          var cpId = "hwc" + (++uid);
          var cp = document.createElementNS(NS, "clipPath");
          cp.setAttribute("id", cpId);
          cp.setAttribute("clipPathUnits", "userSpaceOnUse");
          var rect = document.createElementNS(NS, "rect");
          rect.setAttribute("x", startX.toFixed(1));
          rect.setAttribute("y", vbY.toFixed(1));
          rect.setAttribute("height", vbH.toFixed(1));
          rect.setAttribute("width", reduce ? (endX - startX).toFixed(1) : "0");
          if (!reduce) {
            var an = document.createElementNS(NS, "animate");
            an.setAttribute("attributeName", "width");
            an.setAttribute("from", "0");
            an.setAttribute("to", (endX - startX).toFixed(1));
            an.setAttribute("dur", dur.toFixed(2) + "s");
            an.setAttribute("fill", "freeze");
            an.setAttribute("begin", "indefinite");
            an.setAttribute("calcMode", "spline");
            an.setAttribute("keyTimes", "0;1");
            an.setAttribute("keySplines", "0.45 0 0.25 1");
            rect.appendChild(an);
            anims.push({ el: an, delay: delay });
          }
          cp.appendChild(rect);
          defs.appendChild(cp);
          p.setAttribute("clip-path", "url(#" + cpId + ")");
          delay += OVERLAP * dur;
        }

        svg.appendChild(p);
        x += adv;
      }

      var vbW = x + 8;
      svg.setAttribute("viewBox", "0 " + vbY.toFixed(1) + " " + vbW.toFixed(1) + " " + vbH.toFixed(1));
      svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
      svg.style.display = "block";
      svg.style.width = fontSize * (vbW / scaled) + "px";
      svg.style.height = "auto";   // keeps aspect -> no mobile squish
      svg.style.maxWidth = "100%";
      svg.style.overflow = "visible";

      span.appendChild(svg);
      el.appendChild(span);

      if (wi < words.length - 1) delay += OVERLAP * WORD_GAP;
    });

    el.__hwAnims = anims;
  }
})();
