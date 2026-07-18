/* ============================================================
   Lift Management — Shared UI Utilities
   Depends on design-system.css tokens.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Status badge ---- */

  var BADGE_MAP = {
    PENDING:  { label: "Pending",  cls: "lift-badge--pending"  },
    APPROVED: { label: "Approved", cls: "lift-badge--approved" },
    REJECTED: { label: "Rejected", cls: "lift-badge--rejected" },
    ACTIVE:   { label: "Active",   cls: "lift-badge--active"   },
    EXPIRED:  { label: "Expired",  cls: "lift-badge--expired"  },
    REVOKED:  { label: "Revoked",  cls: "lift-badge--revoked"  },
    USED:     { label: "Used",     cls: "lift-badge--expired"  },
  };

  function badge(status) {
    var b = BADGE_MAP[status] || { label: status || "Unknown", cls: "lift-badge--pending" };
    return '<span class="lift-badge ' + b.cls + '">' + escapeHtml(b.label) + "</span>";
  }

  /* ---- Date formatting ---- */

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatRelative(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    var now = Date.now();
    var diff = now - d.getTime();
    if (diff < 0) return "just now";
    var secs = Math.floor(diff / 1000);
    if (secs < 60) return "just now";
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + (mins === 1 ? " minute ago" : " minutes ago");
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
    return formatDate(iso);
  }

  /* ---- Countdown timer ---- */

  /**
   * Starts a countdown timer that updates `el.textContent` every second.
   * Returns a function to cancel the interval.
   * @param {string} expiresAtIso — ISO timestamp from the backend
   * @param {HTMLElement} el — element to update
   * @param {Function} [onExpired] — called once when countdown reaches 0
   */
  function startCountdown(expiresAtIso, el, onExpired) {
    var target = new Date(expiresAtIso).getTime();

    function tick() {
      var remaining = target - Date.now();
      if (remaining <= 0) {
        el.textContent = "Expired";
        el.classList.add("lift-countdown--expired");
        clearInterval(iv);
        if (onExpired) onExpired();
        return;
      }
      var totalSecs = Math.floor(remaining / 1000);
      var mins = Math.floor(totalSecs / 60);
      var secs = totalSecs % 60;
      el.textContent = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }

    tick();
    var iv = setInterval(tick, 1000);
    return function cancel() { clearInterval(iv); };
  }

  /* ---- Toast notification ---- */

  var toastContainer = null;

  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement("div");
    toastContainer.className = "lift-toast-container";
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function showToast(message, type) {
    type = type || "info";
    var container = ensureToastContainer();
    var toast = document.createElement("div");
    toast.className = "lift-toast lift-toast--" + type;
    toast.textContent = message;
    container.appendChild(toast);
    // Trigger animation
    requestAnimationFrame(function () {
      toast.classList.add("lift-toast--visible");
    });
    setTimeout(function () {
      toast.classList.remove("lift-toast--visible");
      toast.addEventListener("transitionend", function () {
        toast.remove();
      });
    }, 4000);
  }

  /* ---- Loading ---- */

  function showLoading(container) {
    container.innerHTML =
      '<div class="lift-loading">' +
      '  <div class="lift-spinner"></div>' +
      '  <p>Loading…</p>' +
      '</div>';
  }

  function hideLoading(container) {
    var loader = container.querySelector(".lift-loading");
    if (loader) loader.remove();
  }

  /* ---- Empty state ---- */

  function renderEmpty(container, message) {
    container.innerHTML =
      '<div class="lift-empty">' +
      '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">' +
      '    <rect x="3" y="3" width="18" height="18" rx="4"/>' +
      '    <path d="M9 9l6 6M15 9l-6 6"/>' +
      '  </svg>' +
      '  <p>' + escapeHtml(message || "Nothing here yet.") + '</p>' +
      '</div>';
  }

  /* ---- Error handling ---- */

  function handleApiError(err) {
    var msg = (err && err.message) || "Something went wrong. Please try again.";
    if (err && err.statusCode === 401) {
      msg = "Session expired. Please sign in again.";
      setTimeout(function () {
        window.location.href = "/student-portal/";
      }, 1500);
    } else if (err && err.statusCode === 403) {
      msg = "You do not have permission to perform this action.";
    } else if (err && err.statusCode === 404) {
      msg = "The requested resource was not found.";
    }
    showToast(msg, "error");
  }

  /* ---- Escape HTML ---- */

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = String(str == null ? "" : str);
    return div.innerHTML;
  }

  /* ---- Confirmation modal ---- */

  function confirm(title, message, onConfirm, opts) {
    opts = opts || {};
    var overlay = document.createElement("div");
    overlay.className = "lift-modal-overlay";
    var hasInput = opts.inputLabel;
    overlay.innerHTML =
      '<div class="lift-modal">' +
      '  <h3>' + escapeHtml(title) + '</h3>' +
      '  <p>' + escapeHtml(message) + '</p>' +
      (hasInput
        ? '<label class="lift-form__label">' + escapeHtml(opts.inputLabel) + '</label>' +
          '<textarea class="lift-form__textarea lift-modal__input" rows="3" placeholder="' + escapeHtml(opts.inputPlaceholder || '') + '"></textarea>'
        : '') +
      '  <div class="lift-modal__actions">' +
      '    <button type="button" class="btn btn-ghost-dark btn-sm lift-modal__cancel">Cancel</button>' +
      '    <button type="button" class="btn btn-sm ' + (opts.danger ? 'lift-btn--danger' : 'btn-brass') + ' lift-modal__confirm">' + escapeHtml(opts.confirmLabel || 'Confirm') + '</button>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("lift-modal-overlay--visible"); });

    var cancelBtn = overlay.querySelector(".lift-modal__cancel");
    var confirmBtn = overlay.querySelector(".lift-modal__confirm");
    var inputEl = overlay.querySelector(".lift-modal__input");

    function close() {
      overlay.classList.remove("lift-modal-overlay--visible");
      overlay.addEventListener("transitionend", function () { overlay.remove(); });
    }

    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    confirmBtn.addEventListener("click", function () {
      var val = inputEl ? inputEl.value.trim() : undefined;
      close();
      onConfirm(val);
    });
  }

  /* ---- Render sub-nav ---- */

  function renderSubNav(container, items, currentPath) {
    var html = '<nav class="lift-subnav" aria-label="Lift management">';
    html += '<div class="container"><ul class="lift-subnav__list">';
    items.forEach(function (item) {
      var isCurrent = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') ===
                      item.href.replace(/\/index\.html$/, '/').replace(/\/$/, '');
      html += '<li><a href="' + item.href + '"' +
              (isCurrent ? ' class="is-active" aria-current="page"' : '') + '>' +
              escapeHtml(item.label) + '</a></li>';
    });
    html += '</ul></div></nav>';
    container.insertAdjacentHTML("afterbegin", html);
  }

  /* ---- Public API ---- */

  window.LiftUI = {
    badge: badge,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatRelative: formatRelative,
    startCountdown: startCountdown,
    showToast: showToast,
    showLoading: showLoading,
    hideLoading: hideLoading,
    renderEmpty: renderEmpty,
    handleApiError: handleApiError,
    escapeHtml: escapeHtml,
    confirm: confirm,
    renderSubNav: renderSubNav,
  };
})();
