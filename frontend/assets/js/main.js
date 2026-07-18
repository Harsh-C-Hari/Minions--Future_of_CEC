(function () {
  "use strict";

  /* Sticky header shrink */
  var header = document.querySelector(".site-header");
  var toTop = document.querySelector(".to-top");
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 12);
    if (toTop) toTop.classList.toggle("is-visible", y > 600);
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* Desktop dropdown / mega menu (hover + keyboard) */
  var topItems = document.querySelectorAll(".primary-nav > ul > li");
  topItems.forEach(function (li) {
    var link = li.querySelector(":scope > a");
    var panel = li.querySelector(":scope > .dropdown");
    if (!panel) return;
    var open = function () { li.classList.add("is-open"); link && link.setAttribute("aria-expanded", "true"); };
    var close = function () { li.classList.remove("is-open"); link && link.setAttribute("aria-expanded", "false"); };
    li.addEventListener("mouseenter", open);
    li.addEventListener("mouseleave", close);
    li.addEventListener("focusin", open);
    li.addEventListener("focusout", function (e) {
      if (!li.contains(e.relatedTarget)) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  });

  /* Mobile drawer */
  var toggle = document.querySelector(".menu-toggle");
  var drawer = document.querySelector(".mobile-drawer");
  var scrim = document.querySelector(".mobile-drawer__scrim");
  function setDrawer(state) {
    if (!drawer) return;
    drawer.classList.toggle("is-open", state);
    scrim && scrim.classList.toggle("is-open", state);
    toggle && toggle.setAttribute("aria-expanded", String(state));
    document.body.style.overflow = state ? "hidden" : "";
  }
  if (toggle) toggle.addEventListener("click", function () {
    setDrawer(!drawer.classList.contains("is-open"));
  });
  if (scrim) scrim.addEventListener("click", function () { setDrawer(false); });

  document.querySelectorAll(".mdrawer-item > button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".mdrawer-item");
      var wasOpen = item.classList.contains("is-open");
      document.querySelectorAll(".mdrawer-item.is-open").forEach(function (i) {
        if (i !== item) i.classList.remove("is-open");
      });
      item.classList.toggle("is-open", !wasOpen);
    });
  });

  /* Search overlay */
  var searchBtns = document.querySelectorAll("[data-search-open]");
  var overlay = document.querySelector(".search-overlay");
  var searchClose = document.querySelector(".search-overlay__close");
  var searchInput = overlay ? overlay.querySelector("input") : null;
  function setSearch(state) {
    if (!overlay) return;
    overlay.classList.toggle("is-open", state);
    if (state && searchInput) setTimeout(function () { searchInput.focus(); }, 150);
  }
  searchBtns.forEach(function (b) { b.addEventListener("click", function () { setSearch(true); }); });
  if (searchClose) searchClose.addEventListener("click", function () { setSearch(false); });
  if (overlay) overlay.addEventListener("click", function (e) { if (e.target === overlay) setSearch(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setSearch(false); setDrawer(false); }
  });

  /* Hero carousel */
  var slides = document.querySelectorAll(".hero__media .slide");
  var dots = document.querySelectorAll(".hero__dots button");
  if (slides.length > 1) {
    var idx = 0;
    var timer = setInterval(advance, 5500);
    function show(i) {
      slides.forEach(function (s, n) { s.classList.toggle("is-active", n === i); });
      dots.forEach(function (d, n) { d.classList.toggle("is-active", n === i); });
      idx = i;
    }
    function advance() { show((idx + 1) % slides.length); }
    dots.forEach(function (d, n) {
      d.addEventListener("click", function () {
        show(n);
        clearInterval(timer);
        timer = setInterval(advance, 5500);
      });
    });
  }

  /* Animated counters */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        seen.add(entry.target);
        var el = entry.target;
        var end = parseInt(el.getAttribute("data-count"), 10);
        var suffix = el.getAttribute("data-suffix") || "";
        var start = 0;
        var dur = 1200;
        var t0 = performance.now();
        function tick(t) {
          var p = Math.min(1, (t - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(start + (end - start) * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { io.observe(c); });
  }
})();
