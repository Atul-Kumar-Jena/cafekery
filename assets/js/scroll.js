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

    var doodles = [
      { d: HEART, x: 0.10, y: 0.30, s: 0.8 },
      { d: COFFEE, x: 0.89, y: 0.47, s: 0.85 },
      { d: SPRIG, x: 0.10, y: 0.64, s: 0.85 },
      { d: CROISSANT, x: 0.89, y: 0.82, s: 0.9 },
    ];

    var svg, tl;

    function snake(w, y0, y1) {
      var amp = Math.min(w * 0.26, 300);
      var cx = w * 0.5;
      var seg = Math.max(380, window.innerHeight * 0.6);
      var d = "M " + cx.toFixed(1) + " " + y0.toFixed(1);
      var y = y0, dir = 1;
      while (y < y1) {
        var ny = Math.min(y1, y + seg);
        d += " C " + (cx + dir * amp).toFixed(1) + " " + (y + (ny - y) * 0.35).toFixed(1) +
             ", " + (cx + dir * amp).toFixed(1) + " " + (y + (ny - y) * 0.65).toFixed(1) +
             ", " + cx.toFixed(1) + " " + ny.toFixed(1);
        y = ny; dir *= -1;
      }
      return d;
    }

    function build() {
      if (svg) svg.remove();
      if (tl) { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill(); tl = null; }

      var w = window.innerWidth;
      var h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      var vh = window.innerHeight;

      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "lineart-scroll");
      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("aria-hidden", "true");

      var main = document.createElementNS(NS, "path");
      main.setAttribute("d", snake(w, vh * 0.88, h - vh * 0.35));
      svg.appendChild(main);
      document.body.appendChild(svg);

      var mlen = main.getTotalLength();
      main.style.strokeDasharray = mlen;
      main.style.strokeDashoffset = reduce ? 0 : mlen;

      var built = [];
      doodles.forEach(function (dd) {
        var size = Math.min(w, 560) * 0.16 * dd.s;
        var g = document.createElementNS(NS, "g");
        g.setAttribute(
          "transform",
          "translate(" + (w * dd.x - size / 2).toFixed(1) + "," + (h * dd.y - size / 2).toFixed(1) +
          ") scale(" + (size / 100).toFixed(3) + ")"
        );
        var p = document.createElementNS(NS, "path");
        p.setAttribute("class", "doodle");
        p.setAttribute("d", dd.d);
        g.appendChild(p);
        svg.appendChild(g);
        var l = p.getTotalLength();
        p.style.strokeDasharray = l;
        p.style.strokeDashoffset = reduce ? 0 : l;
        built.push({ p: p, l: l, pos: Math.max(0.03, Math.min(0.95, (h * dd.y) / h)) });
      });

      if (reduce) return;

      tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
      tl.fromTo(main, { strokeDashoffset: mlen }, { strokeDashoffset: 0, ease: "none", duration: 1 }, 0);
      built.forEach(function (b) {
        tl.fromTo(b.p, { strokeDashoffset: b.l }, { strokeDashoffset: 0, ease: "none", duration: 0.05 }, b.pos);
      });
    }

    build();
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(build, 300);
    });
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
