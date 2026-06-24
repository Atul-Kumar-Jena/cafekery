/* =============================================================
   HAVEN — GSAP scroll choreography
   - "The View": pinned horizontal side-scroll (desktop), graceful
     vertical stack on mobile.
   - Menu: ScrollTrigger.batch staggered reveals.
   Silent by design: scrub-tied, nothing competes, reduced-motion
   shows everything immediately.
   ============================================================= */
(function () {
  "use strict";
  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
    // GSAP unavailable -> make sure nothing stays hidden
    document.querySelectorAll(".menu-list .menu-item").forEach(function (el) {
      el.style.opacity = 1;
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";

  /* ---- Page-spanning line-art that draws as you scroll ------
     The hero portion draws on load (main.js); this continues the
     line down the whole page on scroll, with little hand-drawn
     doodles (heart, coffee, sprig, croissant) along the way that
     draw in when you reach them. */
  (function pageLine() {
    if (!document.querySelector(".hero")) return;

    // doodle outlines in a 0..100 box (single-stroke friendly)
    var HEART = "M50 84 C18 60 12 32 32 22 C44 16 50 26 50 32 C50 26 56 16 68 22 C88 32 82 60 50 84 Z";
    var COFFEE = "M28 40 H72 L67 76 C66 83 60 86 54 86 H46 C40 86 34 83 33 76 Z " +
                 "M72 48 H80 C89 48 89 64 80 64 H70 " +
                 "M44 26 C48 32 44 36 46 42 M56 26 C60 32 56 36 58 42";
    var SPRIG = "M50 88 L50 22 M50 60 C40 56 33 48 31 38 M50 60 C60 56 67 48 69 38 " +
                "M50 46 C42 43 37 36 36 28 M50 46 C58 43 63 36 64 28";
    var CROISSANT = "M18 66 C30 40 70 40 82 66 C64 55 36 55 18 66 Z M32 60 C44 53 56 53 68 60";

    // Each doodle anchors to a real section, sits ABOVE content, and is
    // coloured to contrast that section's background.
    var CREAM = "#fffaf7", TERRA = "#c1643b", COCOA = "#5b3018";
    var doodles = [
      { d: HEART, sel: "#spring", xf: 0.87, yo: 0.16, s: 1.1, c: CREAM },
      { d: SPRIG, sel: "#menu", xf: 0.93, yo: 0.10, s: 1.0, c: TERRA },
      { d: COFFEE, sel: "#coffee-intro", xf: 0.10, yo: 0.30, s: 1.15, c: TERRA },
      { d: CROISSANT, sel: "#order", xf: 0.10, yo: 0.26, s: 1.1, c: TERRA },
    ];

    var weaveSvg, doodleSvg, sts = [];

    function docTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
    function clearST() { sts.forEach(function (s) { try { s.kill(); } catch (e) {} }); sts = []; }

    // smooth, graceful vertical weave (long S-curves)
    function snake(w, y0, y1) {
      var amp = Math.min(w * 0.3, 360);
      var cx = w * 0.5;
      var seg = Math.max(window.innerHeight * 0.9, 560);
      var d = "M " + cx.toFixed(1) + " " + y0.toFixed(1);
      var y = y0, dir = 1;
      while (y < y1) {
        var ny = Math.min(y1, y + seg), m = ny - y;
        d += " C " + (cx + dir * amp).toFixed(1) + " " + (y + m * 0.5).toFixed(1) +
             ", " + (cx + dir * amp).toFixed(1) + " " + (y + m * 0.5).toFixed(1) +
             ", " + cx.toFixed(1) + " " + ny.toFixed(1);
        y = ny; dir *= -1;
      }
      return d;
    }

    function mkSvg(cls, w, h) {
      var s = document.createElementNS(NS, "svg");
      s.setAttribute("class", cls);
      s.setAttribute("width", w);
      s.setAttribute("height", h);
      s.setAttribute("viewBox", "0 0 " + w + " " + h);
      s.setAttribute("aria-hidden", "true");
      return s;
    }

    function build() {
      clearST();
      if (weaveSvg) weaveSvg.remove();
      if (doodleSvg) doodleSvg.remove();

      var w = window.innerWidth;
      var h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      var vh = window.innerHeight;

      // --- main weave (behind content) ---
      weaveSvg = mkSvg("lineart-scroll", w, h);
      var main = document.createElementNS(NS, "path");
      main.setAttribute("d", snake(w, vh * 0.9, h - vh * 0.3));
      weaveSvg.appendChild(main);
      document.body.appendChild(weaveSvg);
      var mlen = main.getTotalLength();
      main.style.strokeDasharray = mlen;
      main.style.strokeDashoffset = reduce ? 0 : mlen;
      if (!reduce) {
        var mt = gsap.to(main, {
          strokeDashoffset: 0, ease: "none",
          scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1.6, invalidateOnRefresh: true },
        });
        sts.push(mt.scrollTrigger);
      }

      // --- doodles (above content) ---
      doodleSvg = mkSvg("lineart-doodles", w, h);
      document.body.appendChild(doodleSvg);
      doodles.forEach(function (dd) {
        var el = document.querySelector(dd.sel);
        if (!el) return;
        var size = Math.max(110, Math.min(230, w * 0.28 * dd.s));
        var px = w * dd.xf;
        var py = docTop(el) + (el.offsetHeight || vh) * dd.yo;
        var g = document.createElementNS(NS, "g");
        g.setAttribute("transform",
          "translate(" + (px - size / 2).toFixed(1) + "," + (py - size / 2).toFixed(1) + ") scale(" + (size / 100).toFixed(3) + ")");
        var p = document.createElementNS(NS, "path");
        p.setAttribute("class", "doodle");
        p.setAttribute("d", dd.d);
        p.setAttribute("stroke", dd.c);
        g.appendChild(p);
        doodleSvg.appendChild(g);
        var l = p.getTotalLength();
        p.style.strokeDasharray = l;
        p.style.strokeDashoffset = reduce ? 0 : l;
        if (!reduce) {
          // play once when the section arrives (no scrub) so it stays
          // smooth and gradual even during fast scrolling
          var dt = gsap.to(p, {
            strokeDashoffset: 0, duration: 1.5, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 80%", once: true, invalidateOnRefresh: true },
          });
          sts.push(dt.scrollTrigger);
        }
      });
    }

    build();
    // Rebuild after layout settles (fonts/images + the pin that adds
    // scroll height) so the path spans the real page height.
    window.addEventListener("load", function () { setTimeout(build, 200); });
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 300); });
  })();

  /* ---- The View: horizontal side-scroll --------------------- */
  var track = document.querySelector(".hview__track");
  if (track) {
    var mm = gsap.matchMedia();
    mm.add("(min-width: 769px)", function () {
      var getX = function () {
        return -(track.scrollWidth - window.innerWidth);
      };
      var tween = gsap.to(track, {
        x: getX,
        ease: "none",
        scrollTrigger: {
          trigger: ".hview",
          pin: true,
          scrub: 1,
          end: function () {
            return "+=" + (track.scrollWidth - window.innerWidth);
          },
          invalidateOnRefresh: true,
        },
      });
      return function () {
        if (tween.scrollTrigger) tween.scrollTrigger.kill();
        tween.kill();
        gsap.set(track, { clearProps: "x" });
      };
    });
  }

  /* ---- Menu: staggered batch reveals ------------------------ */
  var reveals = gsap.utils.toArray(".menu-group__title, .menu-list .menu-item");
  if (reveals.length) {
    if (reduce) {
      gsap.set(reveals, { autoAlpha: 1, y: 0 });
    } else {
      gsap.set(reveals, { autoAlpha: 0, y: 24 });
      ScrollTrigger.batch(reveals, {
        start: "top 90%",
        onEnter: function (batch) {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.07,
            ease: "power2.out",
            overwrite: true,
          });
        },
      });
    }
  }

  // keep layout correct if fonts/images shift things after load
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
  });
})();
