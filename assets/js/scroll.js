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
    // pasta plate: plate + rim + a noodle swirl + a little steam
    var PASTA = "M8 52 C8 34 27 23 50 23 C73 23 92 34 92 52 C92 66 73 75 50 75 C27 75 8 66 8 52 Z " +
                "M22 51 C22 41 34 34 50 34 C66 34 78 41 78 51 C78 60 66 66 50 66 C34 66 22 60 22 51 Z " +
                "M41 56 C36 51 41 45 48 47 C56 49 56 58 48 60 C38 62 32 54 36 46 C40 38 52 36 60 41 " +
                "M44 20 C47 15 43 12 45 8 M54 20 C57 15 53 12 55 8";

    // Each doodle anchors near a real section but is then placed by
    // measuring the page and dropping it into genuinely EMPTY space, so
    // it never lands on top of text/headings. `s` scales the target size;
    // `c` is its colour (cream contrasts terracotta cards, terracotta the
    // cream canvas — chosen per nearest background at placement time).
    var CREAM = "#fffaf7", TERRA = "#c1643b";
    var doodles = [
      { d: HEART, sel: "#spring", s: 1.4 },
      { d: PASTA, sel: "#brunch-intro", s: 1.8 },
      { d: SPRIG, sel: "#menu", s: 1.3 },
      { d: COFFEE, sel: "#coffee-intro", s: 1.5 },
      { d: CROISSANT, sel: "#order", s: 1.5 },
    ];

    var weaveSvg, doodleSvg, sts = [];

    function docTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
    function clearST() { sts.forEach(function (s) { try { s.kill(); } catch (e) {} }); sts = []; }

    // smooth, graceful vertical weave (gentle long S-curves, kept narrow
    // so it reads as an elegant thread down the page, not a slash across)
    function snake(w, y0, y1) {
      var amp = Math.min(w * 0.16, 150);
      var cx = w * 0.5;
      var seg = Math.max(window.innerHeight * 1.15, 720);
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

    // Collect document-space rectangles of everything a doodle must not
    // overlap (text, headings, cards, images, the big faint words…).
    function getObstacles() {
      var sy = window.pageYOffset || document.documentElement.scrollTop || 0;
      var sel = "h1,h2,h3,h4,h5,p,a,button,img,li," +
        ".eyebrow,.title-special,.head-italic,.bigtype__word,.bigtype__script," +
        ".menu-card,.foodtile,.hpanel,.loop-carousel,.feature,.btn,.hero__media";
      var out = [];
      document.querySelectorAll(sel).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return;
        out.push({ x: r.left, y: r.top + sy, r: r.right, b: r.bottom + sy });
      });
      return out;
    }

    function clearOf(box, obstacles, pad) {
      for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        if (box.x - pad < o.r && box.r + pad > o.x &&
            box.y - pad < o.b && box.b + pad > o.y) return false;
      }
      return true;
    }

    // Find an empty square of `size` within [yTop,yBottom]; prefers the
    // side margins (where whitespace lives) and shrinks before giving up.
    function findSpot(obstacles, yTop, yBottom, w, size, pad) {
      var minSize = Math.max(96, size * 0.45);
      var sideM = Math.max(10, w * 0.03);
      for (var s = size; s >= minSize; s -= 18) {
        // candidate x positions: right margin, left margin, then centre-ish
        var xs = [w - sideM - s, sideM, (w - s) * 0.5, w * 0.66 - s / 2, w * 0.34 - s / 2];
        var step = Math.max(20, s * 0.4);
        for (var y = yTop; y + s <= yBottom; y += step) {
          for (var k = 0; k < xs.length; k++) {
            var x = xs[k];
            if (x < sideM - 2 || x + s > w - sideM + 2) continue;
            var box = { x: x, y: y, r: x + s, b: y + s };
            if (clearOf(box, obstacles, pad)) return { x: x, y: y, size: s };
          }
        }
      }
      return null;
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

      // --- doodles (above content, but placed only in EMPTY space) ---
      doodleSvg = mkSvg("lineart-doodles", w, h);
      document.body.appendChild(doodleSvg);
      var obstacles = getObstacles();
      var taken = []; // doodles already placed become obstacles too
      var pad = Math.max(14, w * 0.03);

      doodles.forEach(function (dd) {
        var el = document.querySelector(dd.sel);
        if (!el) return;
        var top = docTop(el);
        var sh = el.offsetHeight || vh;
        // search this section plus the gap just below it
        var yTop = Math.max(vh * 0.6, top - vh * 0.15);
        var yBottom = Math.min(h, top + sh + vh * 0.45);
        var target = Math.max(120, Math.min(320, w * 0.34 * dd.s));
        var spot = findSpot(obstacles.concat(taken), yTop, yBottom, w, target, pad);
        if (!spot) return; // no clean room -> omit rather than cover text

        taken.push({ x: spot.x, y: spot.y, r: spot.x + spot.size, b: spot.y + spot.size });

        // doodles always land in the cream canvas (cards are obstacles),
        // so terracotta reads cleanly everywhere.
        var col = TERRA;

        var g = document.createElementNS(NS, "g");
        g.setAttribute("transform",
          "translate(" + spot.x.toFixed(1) + "," + spot.y.toFixed(1) + ") scale(" + (spot.size / 100).toFixed(3) + ")");
        var p = document.createElementNS(NS, "path");
        p.setAttribute("class", "doodle");
        p.setAttribute("d", dd.d);
        p.setAttribute("stroke", col);
        g.appendChild(p);
        doodleSvg.appendChild(g);
        var l = p.getTotalLength();
        p.style.strokeDasharray = l;
        p.style.strokeDashoffset = reduce ? 0 : l;
        if (!reduce) {
          // draw once, when the doodle's own position reaches lower viewport
          var startPx = Math.max(0, spot.y - vh * 0.85);
          var dt = gsap.to(p, {
            strokeDashoffset: 0, duration: 1.4, ease: "power2.out",
            scrollTrigger: { trigger: document.body, start: startPx + "px top", once: true, invalidateOnRefresh: true },
          });
          sts.push(dt.scrollTrigger);
        }
      });
    }

    build();
    // Rebuild after layout settles (fonts/images + the pin that adds
    // scroll height) so the path spans the real page height.
    window.addEventListener("load", function () { setTimeout(build, 200); });
    // Only rebuild on a real WIDTH change. On mobile the address bar
    // hides/shows while scrolling, firing resize with a new innerHeight —
    // rebuilding then would tear down and redraw the art mid-scroll
    // (the "distortion"). Ignore height-only changes.
    var lastW = window.innerWidth, rt;
    window.addEventListener("resize", function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
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
