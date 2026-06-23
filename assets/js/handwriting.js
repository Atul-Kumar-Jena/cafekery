/* =============================================================
   HAVEN — handwriting "draw-in" for cursive headings
   Robust GSAP text-stroke technique (no per-glyph font parsing):
     each .title-special becomes an inline SVG <text> rendered in
     the script font, drawn by tweening stroke-dashoffset from the
     measured outline length to 0, then the ink fills in.
   - Waits for the font to load before measuring (correct geometry).
   - Dash length is measured per phrase, so timing is consistent
     whether the text is "from 8am" or a full sentence.
   - Plays once when scrolled into view (ScrollTrigger).
   - Honours prefers-reduced-motion and degrades to plain styled
     text if GSAP is unavailable.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---- Feel ----
  var STROKE_FACTOR = 2.4;  // advance-width -> approx outline length
  var PEN_SPEED = 600;      // user-units per second (smaller = slower)
  var MIN_DUR = 1.6;
  var MAX_DUR = 7;
  var EASE = "power1.inOut";

  var nodes = document.querySelectorAll(SELECTOR);
  if (!nodes.length) return;

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var hasGSAP = typeof window.gsap !== "undefined";

  // No GSAP (e.g. blocked) -> leave the readable, styled script text.
  if (!hasGSAP) return;

  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  // Build the SVG shells immediately so layout is stable, then
  // measure + animate once the font is ready.
  var items = [];
  nodes.forEach(function (el) {
    items.push(buildShell(el));
  });

  var ready = document.fonts && document.fonts.ready
    ? document.fonts.ready
    : Promise.resolve();

  // also explicitly request the script face so measuring is accurate
  if (document.fonts && document.fonts.load) {
    try { document.fonts.load("1em Sacramento"); } catch (e) {}
  }

  ready.then(function () {
    // a frame later, glyph metrics are final
    requestAnimationFrame(function () {
      items.forEach(activate);
    });
  });

  /* ---------- build an inline SVG <text> for one heading ------- */
  function buildShell(el) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    var cs = getComputedStyle(el);
    var color = cs.color;
    var fontSize = parseFloat(cs.fontSize) || 80;
    var strokeW = Math.max(1.4, fontSize / 60);

    el.setAttribute("aria-label", text);
    el.textContent = "";

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "hw-svg");
    svg.style.display = "inline-block";
    svg.style.verticalAlign = "middle";
    svg.style.overflow = "visible";
    svg.style.maxWidth = "100%";

    var t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("x", "0");
    t.setAttribute("y", "0");
    t.style.fontFamily = cs.fontFamily;
    t.style.fontSize = fontSize + "px";
    t.style.fontWeight = cs.fontWeight;
    t.style.fill = "transparent";
    t.style.stroke = color;
    t.style.strokeWidth = strokeW + "px";
    t.style.strokeLinecap = "round";
    t.style.strokeLinejoin = "round";
    t.textContent = text;

    svg.appendChild(t);
    el.appendChild(svg);
    return { el: el, svg: svg, text: t, color: color, fontSize: fontSize };
  }

  /* ---------- measure, size, and wire up the draw ------------- */
  function activate(it) {
    var t = it.svg.firstChild ? it.text : null;
    if (!t) return;

    // size the viewBox to the rendered text bounding box
    var bb;
    try { bb = t.getBBox(); } catch (e) { bb = null; }
    if (!bb || !bb.width) {
      // measuring failed -> show plain filled text as a fallback
      t.style.fill = it.color;
      t.style.stroke = "none";
      return;
    }
    var pad = it.fontSize * 0.22;
    it.svg.setAttribute(
      "viewBox",
      (bb.x - pad) + " " + (bb.y - pad) + " " +
      (bb.width + pad * 2) + " " + (bb.height + pad * 2)
    );
    it.svg.style.width = bb.width + pad * 2 + "px";
    it.svg.style.height = bb.height + pad * 2 + "px";

    // approximate the outline length from the advance width
    var advance = 0;
    try { advance = t.getComputedTextLength(); } catch (e) {}
    var len = (advance || bb.width) * STROKE_FACTOR;
    var dur = Math.min(MAX_DUR, Math.max(MIN_DUR, len / PEN_SPEED));

    t.style.strokeDasharray = len;
    t.style.strokeDashoffset = len;

    if (reduce) {
      // no motion: just show the finished, inked word
      t.style.strokeDashoffset = 0;
      t.style.fill = it.color;
      return;
    }

    var play = function () {
      var tl = gsap.timeline();
      tl.to(t, { strokeDashoffset: 0, duration: dur, ease: EASE });
      // ink fills in just behind the pen for a pen-to-paper finish
      tl.to(
        t,
        { fill: it.color, duration: 1.1, ease: "power2.out" },
        "-=0.6"
      );
    };

    if (window.ScrollTrigger) {
      window.ScrollTrigger.create({
        trigger: it.el,
        start: "top 85%",
        once: true,
        onEnter: play,
      });
    } else {
      play();
    }
  }
})();
