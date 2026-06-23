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

  /* ---- Page-spanning line-art "follower" -------------------
     A single continuous line that snakes down the whole page,
     sitting behind content. It DRAWS with scroll (scrubbed) and
     eases in slowly at the start, gradually covering the page and
     finishing at the bottom. Only on pages that opt in (a .hero). */
  (function lineArt() {
    if (!document.querySelector(".hero")) return;

    var svg, path, draw;

    function snake(w, h) {
      var amp = Math.min(w * 0.3, 340);
      var cx = w * 0.5;
      var seg = Math.max(420, window.innerHeight * 0.62);
      var d = "M " + cx.toFixed(1) + " 0";
      var y = 0, dir = 1;
      while (y < h) {
        var ny = Math.min(h, y + seg);
        var c1y = y + (ny - y) * 0.35;
        var c2y = y + (ny - y) * 0.65;
        d += " C " + (cx + dir * amp).toFixed(1) + " " + c1y.toFixed(1) +
             ", " + (cx + dir * amp).toFixed(1) + " " + c2y.toFixed(1) +
             ", " + cx.toFixed(1) + " " + ny.toFixed(1);
        y = ny; dir *= -1;
      }
      return d;
    }

    function build() {
      if (svg) svg.remove();
      var w = window.innerWidth;
      var h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "lineart-page");
      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("aria-hidden", "true");
      path = document.createElementNS(NS, "path");
      path.setAttribute("class", "lineart-page__path");
      path.setAttribute("d", snake(w, h));
      svg.appendChild(path);
      document.body.appendChild(svg);

      var len = path.getTotalLength();
      path.style.strokeDasharray = len;

      if (reduce) { path.style.strokeDashoffset = 0; return; }
      path.style.strokeDashoffset = len;
      if (draw && draw.scrollTrigger) draw.scrollTrigger.kill();
      if (draw) draw.kill();
      draw = gsap.to(path, {
        strokeDashoffset: 0,
        ease: "power2.in", // slow at the start
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }

    build();
    // rebuild on meaningful resize (debounced)
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(build, 250);
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
