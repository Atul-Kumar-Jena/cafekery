/* =============================================================
   HAVEN — handwriting "write-on" for cursive headings
   Renders each WORD as real text (so connected cursive letters
   join correctly — no glitching/overlap), then reveals it
   left-to-right with a clip, word by word, in reading order.
   Solid + defined; plays once on scroll (never scrubbed) so it
   stays smooth during fast scrolling. Falls back to plain styled
   text without GSAP; reduced-motion shows the finished text.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";
  var NS = "http://www.w3.org/2000/svg";

  var WORD_DUR = 0.75;     // seconds to sweep one word
  var WORD_STAGGER = 0.42; // gap between words
  var INITIAL = 0.12;
  var EASE = "power2.inOut";

  var nodes = document.querySelectorAll(SELECTOR);
  if (!nodes.length) return;

  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";

  // Wait until the script font is ACTUALLY loaded before measuring, or
  // getBBox sizes the boxes for the fallback font and the text distorts
  // when the real font swaps in (very visible on slower mobile loads).
  var waits = [];
  if (document.fonts && document.fonts.load) {
    try { waits.push(document.fonts.load('600 1em "Dancing Script"')); } catch (e) {}
  }
  if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);

  Promise.all(waits).catch(function () {}).then(function () {
    requestAnimationFrame(function () { nodes.forEach(build); });
  });

  var uid = 0;

  function build(el) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    var cs = getComputedStyle(el);
    var color = cs.color;
    var fontSize = parseFloat(cs.fontSize) || 80;
    var weight = cs.fontWeight;
    var family = cs.fontFamily;

    el.setAttribute("aria-label", text);
    el.textContent = "";

    // shared vertical box so every word sits on one baseline
    var vbY = -fontSize * 0.95;
    var vbH = fontSize * 1.55;
    var padX = fontSize * 0.1;

    var rects = [];

    text.split(" ").forEach(function (word) {
      var span = document.createElement("span");
      span.className = "handwriting-word";
      span.style.verticalAlign = "top";
      span.style.marginRight = "0.26em";

      var svg = document.createElementNS(NS, "svg");
      var id = "hwclip" + ++uid;
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
      t.style.fontFamily = family;
      t.style.fontSize = fontSize + "px";
      t.style.fontWeight = weight;
      t.style.fill = color;
      t.setAttribute("clip-path", "url(#" + id + ")");
      t.textContent = word;

      svg.appendChild(defs);
      svg.appendChild(t);
      span.appendChild(svg);
      el.appendChild(span);

      var bb;
      try { bb = t.getBBox(); } catch (e) { bb = null; }
      if (!bb || !bb.width) { t.removeAttribute("clip-path"); return; }

      var vbX = bb.x - padX;
      var vbW = bb.width + padX * 2;
      svg.setAttribute("viewBox", vbX + " " + vbY + " " + vbW + " " + vbH);
      svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
      svg.style.display = "block";
      svg.style.width = vbW + "px";
      svg.style.height = "auto"; // derive from aspect -> never squishes if width is capped
      svg.style.maxWidth = "100%";
      svg.style.overflow = "visible";

      rect.setAttribute("x", vbX);
      rect.setAttribute("y", vbY);
      rect.setAttribute("height", vbH);
      rect.setAttribute("width", reduce ? vbW : 0);
      rects.push({ rect: rect, w: vbW });
    });

    if (reduce || !rects.length) return;

    var play = function () {
      if (hasGSAP) {
        rects.forEach(function (r, i) {
          window.gsap.to(r.rect, {
            attr: { width: r.w },
            duration: WORD_DUR,
            ease: EASE,
            delay: INITIAL + i * WORD_STAGGER,
          });
        });
      } else {
        rects.forEach(function (r) { r.rect.setAttribute("width", r.w); });
      }
    };

    if (typeof window.ScrollTrigger !== "undefined") {
      window.ScrollTrigger.create({ trigger: el, start: "top 82%", once: true, onEnter: play });
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) { if (e.isIntersecting) { play(); obs.unobserve(e.target); } });
      }, { threshold: 0.4 });
      io.observe(el);
    } else {
      play();
    }
  }
})();
