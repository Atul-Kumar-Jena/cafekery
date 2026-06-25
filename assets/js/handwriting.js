/* =============================================================
   ATUL's CAFEkery — "write-on" reveal for cursive headings
   The real cursive text (Parisienne, same as the logo) stays in the
   DOM — readable, selectable, accessible. We just wipe it in
   left-to-right with a CSS clip-path when it scrolls into view, so it
   reads like a pen writing at a constant speed. No SVG, no font data,
   no GSAP.

   Trigger is a plain getBoundingClientRect scroll check (not
   IntersectionObserver — the page's GSAP/ScrollTrigger ancestors make
   IO misreport visibility here). A safety timer reveals anything still
   pending, so a heading can never stay hidden. Reduced-motion / no-JS
   shows the finished text immediately.
   ============================================================= */
(function () {
  "use strict";

  var SELECTOR = ".title-special";

  // pacing: seconds per character, clamped — longer phrases write longer
  var PER_CHAR = 0.06;
  var MIN_DUR = 0.5;
  var MAX_DUR = 2.2;
  var SAFETY_MS = 4000; // never leave a heading hidden past this

  var els = [].slice.call(document.querySelectorAll(SELECTOR));
  if (!els.length) return;

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function write(el) {
    el.classList.add("is-written");
  }

  var pending = [];
  els.forEach(function (el) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    var dur = Math.min(MAX_DUR, Math.max(MIN_DUR, text.length * PER_CHAR));
    el.style.setProperty("--hw-dur", dur.toFixed(2) + "s");
    el.classList.add("hw-reveal");

    // reduced-motion or hidden (e.g. a closed dialog) -> show fully at once.
    if (reduce || el.offsetParent === null) write(el);
    else pending.push(el);
  });

  if (!pending.length) return;

  function inView(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    // start writing once the top edge is within the lower 88% of the viewport
    return r.top < vh * 0.88 && r.bottom > 0;
  }

  var ticking = false;
  function check() {
    ticking = false;
    pending = pending.filter(function (el) {
      if (inView(el)) {
        write(el);
        return false;
      }
      return true;
    });
    if (!pending.length) teardown();
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

  // reveal anything already on screen at load
  check();

  // safety net: a heading must never remain hidden, whatever the scroll math
  window.setTimeout(function () {
    pending.forEach(write);
    pending = [];
    teardown();
  }, SAFETY_MS);
})();
