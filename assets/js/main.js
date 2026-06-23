/* =============================================================
   HAVEN — core interactions
   Sticky header · scroll-reveal · mobile menu · loop carousel ·
   forms · active nav. Mirrors the original site's behaviour.
   ============================================================= */
(function () {
  "use strict";

  /* ---- Current year ---------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---- Mobile menu toggle ---------------------------------- */
  var toggle = document.querySelector(".buttonToggleNavAside");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("noScroll");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // close the menu after tapping a link
    document.querySelectorAll(".nav__link").forEach(function (link) {
      link.addEventListener("click", function () {
        document.body.classList.remove("noScroll");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Sticky header --------------------------------------
     The header turns fixed + slides in once the hero banner
     scrolls out of view, exactly like haven-annecy.fr. ------- */
  var header = document.querySelector(".region-header");
  var banner = document.querySelector(".field-banner");

  if (header && banner && "IntersectionObserver" in window) {
    var headerObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            // hero in view → revert to transparent overlay header
            header.classList.add("is-leaving");
            header.classList.remove("is-visible");
            window.setTimeout(function () {
              header.classList.remove("is-fixed", "is-leaving");
            }, 600);
          } else {
            // hero gone → pin + reveal
            header.classList.add("is-fixed");
            // force reflow so the slide-in transition plays
            void header.offsetWidth;
            header.classList.add("is-visible");
          }
        });
      },
      { threshold: 0 }
    );
    headerObserver.observe(banner);
  } else if (header && !banner) {
    // interior pages have no hero banner — keep header pinned
    header.classList.add("is-fixed", "is-visible");
  }

  /* ---- Scroll-reveal animations ---------------------------- */
  var animated = document.querySelectorAll(
    ".animate--slide-in, .animate--slide-in-list"
  );

  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          if (el.classList.contains("animate--slide-in-list")) {
            Array.prototype.forEach.call(el.children, function (child, i) {
              child.style.setProperty("--i", i);
            });
          }
          el.classList.add("active");
          obs.unobserve(el);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    animated.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    animated.forEach(function (el) {
      el.classList.add("active");
    });
  }

  /* ---- Active section highlighting (homepage anchors) ------ */
  var navLinks = document.querySelectorAll('.nav__link[href^="#"]');
  if (navLinks.length && "IntersectionObserver" in window) {
    var map = {};
    navLinks.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (target) map[id] = link;
    });
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = map[entry.target.id];
          if (link && entry.isIntersecting) {
            navLinks.forEach(function (l) {
              l.classList.remove("active");
            });
            link.classList.add("active");
          }
        });
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );
    Object.keys(map).forEach(function (id) {
      sectionObserver.observe(document.getElementById(id));
    });
  }

  /* ---- Infinite loop carousel ------------------------------
     Clone the list and scroll at a constant ~0.9px/frame,
     resetting on overflow — the marquee effect from the site. */
  var loop = document.querySelector(".loop-carousel");
  if (loop) {
    var list = loop.querySelector("ul");
    if (list) {
      var width = list.offsetWidth;
      loop.appendChild(list.cloneNode(true));
      loop.appendChild(list.cloneNode(true));
      var position = 0;
      var paused = false;
      loop.addEventListener("mouseenter", function () { paused = true; });
      loop.addEventListener("mouseleave", function () { paused = false; });

      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) {
        var step = function () {
          if (!paused) {
            position += 0.9;
            if (position >= width) position = 0;
            loop.scrollLeft = position;
          }
          requestAnimationFrame(step);
        };
        window.setTimeout(function () {
          requestAnimationFrame(step);
        }, 200);
      }
    }
  }

  /* ---- Hero line-art: reliable draw-in on load ------------- */
  var linePath = document.querySelector(".lineart path");
  if (linePath && typeof linePath.getTotalLength === "function") {
    var reduceLine = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      var total = linePath.getTotalLength();
      linePath.style.strokeDasharray = total;
      if (reduceLine) {
        linePath.style.strokeDashoffset = 0;
      } else if (window.gsap) {
        linePath.style.strokeDashoffset = total;
        window.gsap.to(linePath, {
          strokeDashoffset: 0,
          duration: 6,
          ease: "power1.inOut",
          delay: 0.3,
        });
      } else {
        linePath.style.strokeDashoffset = total;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            linePath.style.transition = "stroke-dashoffset 6s ease 0.3s";
            linePath.style.strokeDashoffset = "0";
          });
        });
      }
    } catch (e) {
      linePath.style.strokeDashoffset = 0;
    }
  }

  /* ---- Back-to-top (injected, no per-page markup) ---------- */
  var toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.type = "button";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(toTop);
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  var toggleToTop = function () {
    if (window.scrollY > 700) toTop.classList.add("is-shown");
    else toTop.classList.remove("is-shown");
  };
  window.addEventListener("scroll", toggleToTop, { passive: true });
  toggleToTop();

  /* ---- Form handling (front-end demo) ---------------------- */
  document.querySelectorAll("form[data-demo]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form__status");
      if (status) {
        status.textContent =
          form.getAttribute("data-success") ||
          "Thank you — we'll be in touch shortly.";
      }
      form.reset();
    });
  });
})();
