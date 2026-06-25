/* =============================================================
   ATUL's CAFEkery — handwriting "write-on" for cursive headings
   Each .title-special is rebuilt with OpenType.js into FILLED
   connected-cursive glyphs (Dancing Script). Each letter's ink is then
   revealed left-to-right in reading order via its own clip mask, driven
   by a single GSAP timeline with a little overlap — so the word writes
   itself out letter by letter, not as one curtain wipe. Letters are
   filled, so cursive joins merge cleanly (no random stroke start/end,
   no double lines, no overlap glitch, no stray pen artifacts).
   Self-hosted font + lib. Reduced-motion / no-GSAP -> finished text.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";
  var FONT_URL = "assets/fonts/dancingscript.ttf";

  // ---- Feel (genuine handwriting pace) ----
  var INITIAL_DELAY = 0.12;
  var PER_EM = 0.95;   // pen speed: seconds to write one em of letter width
  var OVERLAP = 0.6;   // start next letter while the previous still finishing
  var WORD_GAP = 0.18; // pause as the hand lifts between words
  var MIN_DUR = 0.16;
  var MAX_DUR = 0.62;

  var nodes = document.querySelectorAll(SELECTOR);
  if (!nodes.length) return;

  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";

  if (typeof window.opentype === "undefined" || !window.fetch) return;

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
          }, { threshold: 0.2 })
        : null;
    nodes.forEach(function (el) {
      build(el, font);
      if (reduce || !hasGsap || !io) finish(el);
      else io.observe(el);
    });
  }

  // jump straight to finished (reduced-motion / no GSAP / no observer)
  function finish(el) {
    (el.__hwLetters || []).forEach(function (L) {
      L.rect.setAttribute("width", (L.endX - L.startX).toFixed(1));
    });
  }

  // one continuous GSAP timeline: each letter's ink is revealed L->R in
  // reading order with a little overlap, so the word writes itself out
  // letter by letter (no separate pen element to glitch / strand).
  function activate(el) {
    var words = el.__hwWords || [];
    var tl = window.gsap.timeline();
    var t = INITIAL_DELAY;

    words.forEach(function (W) {
      if (!W.letters.length) return;
      var wordStart = t;
      W.letters.forEach(function (L) {
        tl.to(L.rect, { attr: { width: (L.endX - L.startX).toFixed(1) }, duration: L.dur, ease: "power1.out" }, t);
        t += L.dur * OVERLAP;
      });
      t = wordStart + sumDur(W.letters) + WORD_GAP;
    });
  }

  function sumDur(letters) {
    var t = 0;
    for (var i = 0; i < letters.length; i++) {
      t += i < letters.length - 1 ? letters[i].dur * OVERLAP : letters[i].dur;
    }
    return t;
  }

  function build(el, font) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    var cs = getComputedStyle(el);
    var fontSize = parseFloat(cs.fontSize) || 80;
    var scaled = (fontSize / 80) * 800;
    var upm = font.unitsPerEm;

    // shared vertical box -> every word sits on one baseline
    var baseline = scaled * 0.72;
    var vbY = -scaled * 0.46;
    var vbH = scaled * 1.55;

    el.setAttribute("aria-label", text);
    el.textContent = "";

    var wordsMeta = [];
    var lettersAll = [];

    text.split(" ").forEach(function (word) {
      var span = document.createElement("span");
      span.className = "handwriting-word";

      var svg = document.createElementNS(NS, "svg");
      var defs = document.createElementNS(NS, "defs");
      svg.appendChild(defs);
      var x = 8;
      var letters = [];

      for (var i = 0; i < word.length; i++) {
        var ch = word[i];
        var glyph = font.charToGlyph(ch);
        var adv = (glyph.advanceWidth * scaled) / upm;
        var path = font.getPath(ch, x, baseline, scaled);
        var d = path.toPathData(2);

        var bb = null;
        try { bb = path.getBoundingBox(); } catch (e) {}
        var hasInk = bb && isFinite(bb.x1) && bb.x2 > bb.x1;

        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("class", "hw-glyph");

        if (hasInk) {
          var startX = bb.x1 - scaled * 0.03;
          var endX = bb.x2 + scaled * 0.04;
          var revealW = Math.max(endX - startX, adv * 0.6);
          var dur = Math.min(MAX_DUR, Math.max(MIN_DUR, (revealW / upm) * PER_EM));

          var cpId = "hwc" + (++uid);
          var cp = document.createElementNS(NS, "clipPath");
          cp.setAttribute("id", cpId);
          cp.setAttribute("clipPathUnits", "userSpaceOnUse");
          var rect = document.createElementNS(NS, "rect");
          rect.setAttribute("x", startX.toFixed(1));
          rect.setAttribute("y", vbY.toFixed(1));
          rect.setAttribute("height", vbH.toFixed(1));
          rect.setAttribute("width", reduce || !hasGsap ? (endX - startX).toFixed(1) : "0");
          cp.appendChild(rect);
          defs.appendChild(cp);
          p.setAttribute("clip-path", "url(#" + cpId + ")");

          var meta = { rect: rect, startX: startX, endX: endX, dur: dur };
          letters.push(meta);
          lettersAll.push(meta);
        }
        svg.appendChild(p);
        x += adv;
      }

      var vbW = x + 8;
      svg.setAttribute("viewBox", "0 " + vbY.toFixed(1) + " " + vbW.toFixed(1) + " " + vbH.toFixed(1));
      svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
      svg.style.display = "block";
      svg.style.width = fontSize * (vbW / scaled) + "px";
      svg.style.height = "auto";
      svg.style.maxWidth = "100%";
      svg.style.overflow = "visible";

      span.appendChild(svg);
      el.appendChild(span);

      wordsMeta.push({ letters: letters });
    });

    el.__hwWords = wordsMeta;
    el.__hwLetters = lettersAll;
  }
})();
