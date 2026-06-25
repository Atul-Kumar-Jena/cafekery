/* =============================================================
   HAVEN — QR table ordering (front-end demo)
   Scan QR -> /order.html?t=12 -> menu with a "Table 12" badge ->
   add items -> cart persisted in localStorage (survives refresh)
   -> send -> confirmation with prep timer.

   Robustness (no backend, all client-side):
   - Cart + session recovery via localStorage (per table).
   - Outbox queue: a "sent" order goes to an outbox, then flushes to
     the shared order list (what kitchen.html reads). If offline, it
     stays queued and auto-retries on reconnect.
   - Duplicate guard via a unique clientOrderId.
   ============================================================= */
(function () {
  "use strict";

  // ---- Menu (kept in sync with menu.html) ----
  var MENU = [
    {
      cat: "Brunch",
      items: [
        { id: "feta-focaccia", name: "Feta Dip & Focaccia", desc: "Whipped feta, spring herbs, chilli oil.", price: 390 },
        { id: "big-brekkie", name: "Cafekery Big Brekkie", desc: "Two eggs, tomato, mushrooms, beans, bacon, sourdough.", price: 570 },
        { id: "green-shakshuka", name: "Green Shakshuka", desc: "Eggs baked in spinach & courgette, feta, dukkah.", price: 510 },
        { id: "smashed-avo", name: "Smashed Avo & Poached Eggs", desc: "Pickled onion, dukkah, lemon, sourdough.", price: 480 },
      ],
    },
    {
      cat: "Sweet",
      items: [
        { id: "spring-pancakes", name: "Spring Pancakes", desc: "Strawberries, diplomat cream, thyme-pepper meringue.", price: 420 },
        { id: "french-brioche", name: "Tiramisu French Brioche", desc: "Mascarpone cream, espresso, cocoa.", price: 450 },
        { id: "choc-cremeux", name: "Dark Chocolate Crémeux", desc: "70% crémeux, olive oil, buckwheat, sea salt.", price: 330 },
      ],
    },
    {
      cat: "Coffee",
      items: [
        { id: "espresso", name: "Espresso / Macchiato", desc: "", price: 90 },
        { id: "flat-white", name: "Flat White / Cappuccino", desc: "", price: 120 },
        { id: "guest-filter", name: "Guest Filter — Black Mass", desc: "This month's rotating guest roaster.", price: 140 },
        { id: "iced-latte", name: "Iced Latte", desc: "", price: 140 },
      ],
    },
    {
      cat: "Cold & fresh",
      items: [
        { id: "green-juice", name: "Cold-Pressed Green Juice", desc: "Cucumber, apple, spinach, celery, lemon, ginger.", price: 210 },
        { id: "smoothie", name: "Berry & Banana Smoothie", desc: "", price: 230 },
        { id: "lemonade", name: "House Lemonade", desc: "", price: 150 },
      ],
    },
  ];

  var ITEM_BY_ID = {};
  MENU.forEach(function (c) { c.items.forEach(function (it) { ITEM_BY_ID[it.id] = it; }); });

  // ---- Table id from URL ----
  var params = new URLSearchParams(window.location.search);
  var table = (params.get("t") || "").replace(/[^0-9A-Za-z-]/g, "").slice(0, 8);
  var validTable = !!table;
  if (!validTable) table = "—";

  var CART_KEY = "haven_cart_t" + table;
  var ORDERS_KEY = "haven_orders";
  var OUTBOX_KEY = "haven_outbox";

  // ---- Storage helpers (defensive) ----
  function read(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var cart = read(CART_KEY, {}); // { itemId: qty }

  // ---- DOM refs ----
  var elMenu = document.getElementById("orderMenu");
  var elBadge = document.getElementById("tableBadge");
  var elBar = document.getElementById("cartBar");
  var elBarSum = document.getElementById("cartSum");
  var elSend = document.getElementById("cartSend");
  var elConfirm = document.getElementById("confirm");
  var elConfirmTable = document.getElementById("confirmTable");
  var elTimer = document.getElementById("confirmTimer");
  var elOffline = document.getElementById("offlineBar");

  if (elBadge) elBadge.textContent = "Table " + table;

  // ---- Render menu ----
  function render() {
    if (!elMenu) return;
    var html = "";
    MENU.forEach(function (group) {
      html += '<div class="order-cat"><h2 class="order-cat__title">' + group.cat + "</h2>";
      group.items.forEach(function (it) {
        var qty = cart[it.id] || 0;
        html +=
          '<div class="oitem" data-id="' + it.id + '">' +
            '<div class="oitem__info">' +
              '<div class="oitem__name">' + it.name + "</div>" +
              (it.desc ? '<div class="oitem__desc">' + it.desc + "</div>" : "") +
              '<div class="oitem__price">₹' + fmt(it.price) + "</div>" +
            "</div>" +
            '<div class="qty">' +
              '<button type="button" data-act="dec" aria-label="Remove one"' + (qty ? "" : " disabled") + ">−</button>" +
              '<span class="qty__n" data-n>' + qty + "</span>" +
              '<button type="button" data-act="inc" aria-label="Add one">+</button>' +
            "</div>" +
          "</div>";
      });
      html += "</div>";
    });
    elMenu.innerHTML = html;
  }

  function fmt(n) { return (Math.round(n * 100) / 100).toString().replace(/\.0$/, ""); }

  function totals() {
    var count = 0, sum = 0;
    Object.keys(cart).forEach(function (id) {
      var q = cart[id]; if (!q || !ITEM_BY_ID[id]) return;
      count += q; sum += q * ITEM_BY_ID[id].price;
    });
    return { count: count, sum: sum };
  }

  function syncBar() {
    var t = totals();
    if (elBarSum) elBarSum.innerHTML = t.count + (t.count === 1 ? " item" : " items") + "<small>₹" + fmt(t.sum) + "</small>";
    if (elBar) elBar.classList.toggle("is-shown", t.count > 0 && validTable);
  }

  function setQty(id, q) {
    q = Math.max(0, Math.min(20, q));
    if (q === 0) delete cart[id]; else cart[id] = q;
    write(CART_KEY, cart);
    var row = elMenu.querySelector('.oitem[data-id="' + id + '"]');
    if (row) {
      row.querySelector("[data-n]").textContent = cart[id] || 0;
      row.querySelector('[data-act="dec"]').disabled = !cart[id];
    }
    syncBar();
  }

  // ---- Interactions ----
  if (elMenu) {
    elMenu.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-act]");
      if (!btn) return;
      var row = btn.closest(".oitem");
      var id = row && row.getAttribute("data-id");
      if (!id) return;
      setQty(id, (cart[id] || 0) + (btn.getAttribute("data-act") === "inc" ? 1 : -1));
    });
  }

  // ---- Sending an order ----
  function send() {
    var t = totals();
    if (!t.count || !validTable) return;
    var order = {
      clientOrderId: table + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      table: table,
      items: Object.keys(cart).map(function (id) {
        return { id: id, name: ITEM_BY_ID[id].name, qty: cart[id], price: ITEM_BY_ID[id].price };
      }),
      total: t.sum,
      placedAt: Date.now(),
      status: "new",
    };
    var outbox = read(OUTBOX_KEY, []);
    outbox.push(order);
    write(OUTBOX_KEY, outbox);

    // clear the cart immediately (the order is captured in the outbox)
    cart = {}; write(CART_KEY, cart); render(); syncBar();

    flush();
    showConfirm(order);
  }

  // Move queued orders into the shared list (simulated "network").
  // Duplicate-safe; if offline, leaves them queued for retry.
  function flush() {
    if (!navigator.onLine) { showOffline(true); return false; }
    var outbox = read(OUTBOX_KEY, []);
    if (!outbox.length) return true;
    var orders = read(ORDERS_KEY, []);
    var seen = {};
    orders.forEach(function (o) { seen[o.clientOrderId] = true; });
    outbox.forEach(function (o) {
      if (!seen[o.clientOrderId]) { orders.push(o); seen[o.clientOrderId] = true; }
    });
    write(ORDERS_KEY, orders);
    write(OUTBOX_KEY, []);
    showOffline(false);
    return true;
  }

  function showOffline(on) { if (elOffline) elOffline.classList.toggle("is-shown", !!on); }

  window.addEventListener("online", function () { showOffline(false); flush(); });
  window.addEventListener("offline", function () { showOffline(true); });

  // retry queued orders periodically (covers flaky signal)
  setInterval(function () {
    if (read(OUTBOX_KEY, []).length) flush();
  }, 10000);

  // ---- Confirmation ----
  var timerInt = null;
  function showConfirm(order) {
    if (!elConfirm) return;
    if (elConfirmTable) elConfirmTable.textContent = "Table " + order.table;
    elConfirm.classList.add("is-shown");
    var start = Date.now();
    clearInterval(timerInt);
    timerInt = setInterval(function () {
      var s = Math.floor((Date.now() - start) / 1000);
      var m = Math.floor(s / 60);
      if (elTimer) elTimer.textContent = "Preparing · " + (m ? m + "m " : "") + (s % 60) + "s";
    }, 1000);
  }
  var elDone = document.getElementById("confirmDone");
  if (elDone) {
    elDone.addEventListener("click", function () {
      elConfirm.classList.remove("is-shown");
      clearInterval(timerInt);
    });
  }

  // ---- Init ----
  if (elSend) elSend.addEventListener("click", send);
  if (!validTable && elMenu) {
    elMenu.insertAdjacentHTML(
      "afterbegin",
      '<p class="order-intro" style="color:var(--c-terracotta)">No table detected — scan the QR code on your table to start an order.</p>'
    );
  }
  render();
  syncBar();
  flush(); // deliver anything left queued from a previous visit
})();
