/* =============================================================
   HAVEN — handwriting "write-on" for cursive headings
   FILLED reveal (no hollow outlines): each .title-special is
   rendered as solid cursive text, then revealed left-to-right by
   animating a clip rectangle — like ink flowing from a pen, in
   reading order. Letters stay solid and legible the whole time.
   - Waits for the font before measuring (correct geometry).
   - Plays once on scroll (ScrollTrigger), with an Intersection
     Observer fallback.
   - Reduced-motion / no-JS show the finished, filled text.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";

  var nodes = document.querySelectorAll(SELECTOR);
  if (!nodes.length) return;

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  if (hasGSAP && typeof window.ScrollTrigger !== "undefined") {
    gsap.registerPlugin(window.ScrollTrigger);
  }

  var ready =
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  if (document.fonts && document.fonts.load) {
    try { document.fonts.load("1em Parisienne"); } catch (e) {}
  }

  ready.then(function () {
    requestAnimationFrame(function () {
      nodes.forEach(build);
    });
  });

  var uid = 0;

  function build(el) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    var cs = getComputedStyle(el);
    var color = cs.color;
    var fontSize = parseFloat(cs.fontSize) || 80;

    el.setAttribute("aria-label", text);
    el.textContent = "";

    var id = "hwclip" + ++uid;
    var svg = document.createElementNS(NS, "svg");
    svg.style.display = "block";
    svg.style.overflow = "visible";

    var defs = document.createElementNS(NS, "defs");
    var clip = document.createElementNS(NS, "clipPath");
    clip.setAttribute("id", id);
    clip.setAttribute("clipPathUnits", "userSpaceOnUse");
    var rect = document.createElementNS(NS, "rect");
    clip.appendChild(rect);
    defs.appendChild(clip);

    var t = document.createElementNS(NS, "text");
    t.setAttribute("x", "0");
    t.setAttribute("y", "0");
    t.style.fontFamily = cs.fontFamily;
    t.style.fontSize = fontSize + "px";
    t.style.fontWeight = cs.fontWeight;
    t.style.fontStyle = cs.fontStyle;
    t.style.fill = color; // SOLID ink — no stroke, no double line
    t.setAttribute("clip-path", "url(#" + id + ")");
    t.textContent = text;

    svg.appendChild(defs);
    svg.appendChild(t);
    el.appendChild(svg);

    // measure once the font is applied
    var bb;
    try { bb = t.getBBox(); } catch (e) { bb = null; }
    if (!bb || !bb.width) { return; } // text is visible as-is

    var pad = fontSize * 0.18;
    var vbx = bb.x - pad, vby = bb.y - pad;
    var vbw = bb.width + pad * 2, vbh = bb.height + pad * 2;

    svg.setAttribute("viewBox", vbx + " " + vby + " " + vbw + " " + vbh);
    svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
    svg.style.width = vbw + "px";
    svg.style.height = "auto"; // keep aspect when max-width shrinks it
    svg.style.maxWidth = "100%";

    rect.setAttribute("x", vbx);
    rect.setAttribute("y", vby);
    rect.setAttribute("height", vbh);
    rect.setAttribute("width", reduce ? vbw : 0);

    if (reduce) return;

    // deliberate, length-aware pen speed
    var dur = Math.min(6.5, Math.max(2, text.length * 0.16));

    var play = function () {
      if (hasGSAP) {
        gsap.fromTo(
          rect,
          { attr: { width: 0 } },
          { attr: { width: vbw }, duration: dur, ease: "power1.inOut" }
        );
      } else {
        rect.setAttribute("width", vbw);
      }
    };

    if (typeof window.ScrollTrigger !== "undefined") {
      window.ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: play });
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { play(); obs.unobserve(e.target); }
          });
        },
        { threshold: 0.4 }
      );
      io.observe(el);
    } else {
      play();
    }
  }
})();
