/* =============================================================
   ATUL's CAFEkery — letter-by-letter "write-on" for cursive headings
   The real cursive text (Parisienne, same as the logo) is kept and
   rebuilt as per-word / per-letter spans, then each letter is drawn in
   sequence with a quick left-to-right clip-path wipe — like a pen
   writing each glyph in reading order (so two-line headings write
   line by line, letter by letter). No SVG, no font data, no GSAP.

   Trigger is a plain getBoundingClientRect scroll check (not
   IntersectionObserver — the page's GSAP/ScrollTrigger ancestors make
   IO misreport visibility here). A safety timer writes anything still
   pending, so a heading can never stay hidden. Reduced-motion / no-JS
   shows the finished text immediately.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";

  // pacing: ms between letters, with a total cap so long phrases stay snappy
  var STEP_MS = 65;        // delay between consecutive letters
  var STEP_MIN = 26;       // floor when a phrase is long
  var TOTAL_CAP = 2400;    // a heading finishes within ~this many ms
  var SAFETY_MS = 4000;    // never leave a heading hidden past this

  var els = [].slice.call(document.querySelectorAll(SELECTOR));
  if (!els.length) return;

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // rebuild text as .hw-word > .hw-char spans; returns the char spans in order
  function build(el) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return [];
    el.setAttribute("aria-label", text);
    el.textContent = "";
    el.classList.add("hw-reveal");

    var chars = [];
    text.split(" ").forEach(function (word, wi) {
      if (wi > 0) el.appendChild(document.createTextNode(" "));
      var w = document.createElement("span");
      w.className = "hw-word";
      w.setAttribute("aria-hidden", "true");
      for (var i = 0; i < word.length; i++) {
        var c = document.createElement("span");
        c.className = "hw-char";
        c.textContent = word[i];
        w.appendChild(c);
        chars.push(c);
      }
      el.appendChild(w);
    });
    return chars;
  }

  function writeAll(chars) {
    chars.forEach(function (c) { c.classList.add("lit"); });
  }

  var items = [];
  els.forEach(function (el) {
    var chars = build(el);
    if (!chars.length) return;
    // reduced-motion or hidden (e.g. a closed dialog) -> show fully at once.
    if (reduce || el.offsetParent === null) writeAll(chars);
    else items.push({ el: el, chars: chars, started: false });
  });

  if (!items.length) return;

  function run(item) {
    if (item.started) return;
    item.started = true;
    var n = item.chars.length;
    var step = Math.max(STEP_MIN, Math.min(STEP_MS, TOTAL_CAP / n));
    item.chars.forEach(function (c, i) {
      window.setTimeout(function () { c.classList.add("lit"); }, i * step);
    });
  }

  function inView(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return r.top < vh * 0.86 && r.bottom > 0;
  }

  var ticking = false;
  function check() {
    ticking = false;
    items = items.filter(function (item) {
      if (inView(item.el)) { run(item); return false; }
      return true;
    });
    if (!items.length) teardown();
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    (window.requestAnimationFrame || window.setTimeout)(check);
  }
  function teardown() {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // write anything already on screen at load
  check();

  // safety net: a heading must never remain hidden, whatever the scroll math
  window.setTimeout(function () {
    items.forEach(function (item) { writeAll(item.chars); });
    items = [];
    teardown();
  }, SAFETY_MS);
})();
