(function () {
  "use strict";
  /* Gracefully handle images whose source file is missing from this export
     (mainly wp-content/uploads/2016-2024, which were not part of the mirror).
     This does not hide or remove any content - it swaps a failed <img> for a
     labelled placeholder box in the same space, styled with the existing
     design system tokens, so a missing photo never appears as a broken-image
     icon or blank hole in the layout. */
  function handleError(img) {
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = "true";
    var label = img.getAttribute("alt") || img.getAttribute("title") || "Image unavailable";
    var box = document.createElement("div");
    box.className = "img-fallback";
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", label);
    box.innerHTML =
      '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<rect x="3" y="4" width="18" height="16" rx="2"></rect>' +
      '<circle cx="9" cy="10" r="2"></circle>' +
      '<path d="M21 16l-5.5-5.5L7 19"></path>' +
      "</svg>" +
      '<span>' + label + "</span>";
    if (img.className) box.className += " " + img.className;
    if (img.parentNode) img.parentNode.replaceChild(box, img);
  }

  document.addEventListener(
    "error",
    function (e) {
      var t = e.target;
      if (t && t.tagName === "IMG") handleError(t);
    },
    true
  );

  // Catch images that already failed before this script (placed at the end
  // of the page) got a chance to attach the listener above.
  function sweepAlreadyBroken() {
    var imgs = document.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.complete && img.naturalWidth === 0 && img.src) {
        handleError(img);
      }
    }
  }
  sweepAlreadyBroken();
  if (document.readyState !== "complete") {
    window.addEventListener("load", sweepAlreadyBroken);
  }
})();
