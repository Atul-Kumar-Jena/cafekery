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
