/* =============================================================
   HAVEN — QR rendering
   Renders a scannable QR (SVG) into any [data-qr] element. The
   encoded URL is resolved against the current origin, so the code
   always points at the deployed site (e.g. .../order.html?t=12).
   ============================================================= */
(function () {
  "use strict";
  if (typeof window.qrcode === "undefined") return;

  document.querySelectorAll("[data-qr]").forEach(function (el) {
    var path = el.getAttribute("data-qr");
    var url;
    try {
      url = new URL(path, window.location.href).href;
    } catch (e) {
      url = path;
    }
    try {
      var qr = window.qrcode(0, "M"); // type auto, error-correction M
      qr.addData(url);
      qr.make();
      el.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      var svg = el.querySelector("svg");
      if (svg) {
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.style.width = "100%";
        svg.style.height = "100%";
      }
      el.setAttribute("data-resolved", url);
    } catch (e) {
      el.textContent = "QR unavailable";
    }
  });
})();
