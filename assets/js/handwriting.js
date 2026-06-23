/* =============================================================
   HAVEN — handwriting stroke-draw animation
   Reverse-engineered from haven-annecy.fr:
     OpenType.js parses a handwriting font → each character is
     emitted as an SVG <path>, then animated by tweening
     stroke-dashoffset from path-length → 0 with a staggered,
     slightly-overlapping delay (multiplier 0.65).
   Falls back to the plain styled text if the font/lib is
   unavailable, so headings stay readable with no JS.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  // A static (non-variable) handwriting TTF that OpenType.js can parse.
  var FONT_URL =
    "https://cdn.jsdelivr.net/gh/google/fonts/ofl/shadowsintolight/ShadowsIntoLight-Regular.ttf";
  var DELAY_MULTIPLIER = 0.65; // controls overlap between strokes
  var INITIAL_DELAY = 0.1; // seconds before the first stroke
  var SPEED_DIVISOR = 1400; // larger = slower drawing

  var targets = document.querySelectorAll(SELECTOR);
  if (!targets.length) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof window.opentype === "undefined") return; // keep fallback text

  window.opentype.load(FONT_URL, function (err, font) {
    if (err || !font) {
      // network/parse failure → leave the styled fallback text in place
      return;
    }
    init(font);
  });

  function init(font) {
    var observer = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-active");
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
    }

    targets.forEach(function (el) {
      build(el, font, observer);
    });
  }

  function build(el, font, observer) {
    var text = (el.textContent || "").trim();
    if (!text) return;

    var rendered = parseFloat(getComputedStyle(el).fontSize) || 80;
    // OpenType units: render glyphs large for crisp SVG, scale via CSS.
    var size = (rendered / 80) * 800;

    el.textContent = "";
    el.setAttribute("aria-label", text);

    var delay = INITIAL_DELAY;

    text.split(/\s+/).forEach(function (word) {
      var span = document.createElement("span");
      span.className = "handwriting-word";

      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      var x = 10;
      var baseline = size * 0.82;

      [].forEach.call(word, function (ch) {
        var glyph = font.charToGlyph(ch);
        var path = font.getPath(ch, x, baseline, size);
        var data = path.toPathData(2);

        var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", data);
        p.setAttribute("class", "draw-path");

        var len = getPathLength(p, data);
        var duration = Math.max(0.18, len / SPEED_DIVISOR);

        p.style.setProperty("--l", len.toFixed(2));
        p.style.setProperty("--t", duration.toFixed(2) + "s");
        p.style.setProperty("--d", delay.toFixed(3) + "s");

        x += (glyph.advanceWidth * size) / font.unitsPerEm;
        delay += DELAY_MULTIPLIER * duration;

        svg.appendChild(p);
      });

      svg.setAttribute("viewBox", "0 0 " + (x + 10) + " " + size);
      svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
      span.appendChild(svg);
      span.classList.add("is-ready");
      el.appendChild(span);

      // a trailing space between words keeps the baseline natural
      delay += DELAY_MULTIPLIER * 0.15;

      if (observer) {
        observer.observe(span);
      } else {
        span.classList.add("is-active");
      }
    });
  }

  // getTotalLength needs the node in the DOM; fall back to a temp SVG.
  function getPathLength(node, data) {
    if (typeof node.getTotalLength === "function") {
      try {
        var n = node.getTotalLength();
        if (n) return n;
      } catch (e) {
        /* not yet measurable */
      }
    }
    var tmp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tmp.setAttribute(
      "style",
      "position:absolute;width:0;height:0;overflow:hidden"
    );
    var tp = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tp.setAttribute("d", data);
    tmp.appendChild(tp);
    document.body.appendChild(tmp);
    var length = tp.getTotalLength();
    document.body.removeChild(tmp);
    return length;
  }
})();
