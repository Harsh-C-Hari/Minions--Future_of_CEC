/**
 * CEC Student Portal widget.
 *
 * Talks to the smart-campus-backend Express API for Google login (JWT
 * access/refresh tokens) and to the bundled ai-service (proxied through
 * the same backend at /ai/chat) for the AI assistant.
 *
 * Include on any page as:
 *   <script src="/assets/portal/portal-config.js"></script>
 *   <script src="/assets/portal/portal-widget.js" defer></script>
 *   <link rel="stylesheet" href="/assets/portal/portal-widget.css">
 *
 * By default it renders as a floating bubble in the bottom-right corner.
 * If the page contains an element with id="cec-portal-mount", it renders
 * inline (expanded, no bubble) inside that element instead — used by the
 * dedicated /student-portal/ page.
 */
(function () {
  "use strict";

  var CFG = window.CEC_PORTAL_CONFIG || {};
  var API_BASE = (CFG.API_BASE_URL || "").replace(/\/+$/, "");
  var GOOGLE_CLIENT_ID = CFG.GOOGLE_CLIENT_ID || "";

  var STORAGE_KEYS = {
    access: "cecp_access_token",
    refresh: "cecp_refresh_token",
    user: "cecp_user",
  };

  function getStored(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function setStored(key, value) {
    try {
      if (value === null || value === undefined) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) {
      /* localStorage unavailable (private mode, etc.) — degrade silently */
    }
  }

  var state = {
    accessToken: getStored(STORAGE_KEYS.access),
    refreshToken: getStored(STORAGE_KEYS.refresh),
    user: (function () {
      var raw = getStored(STORAGE_KEYS.user);
      try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    })(),
    open: false,
    sending: false,
  };

  function persistAuth(user, accessToken, refreshToken) {
    state.user = user;
    state.accessToken = accessToken;
    state.refreshToken = refreshToken;
    setStored(STORAGE_KEYS.user, user ? JSON.stringify(user) : null);
    setStored(STORAGE_KEYS.access, accessToken);
    setStored(STORAGE_KEYS.refresh, refreshToken);
  }

  function clearAuth() {
    persistAuth(null, null, null);
  }

  /* ---------------- API helpers ---------------- */

  function apiFetch(path, options, isRetry) {
    options = options || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    if (state.accessToken) headers.Authorization = "Bearer " + state.accessToken;

    return fetch(API_BASE + path, Object.assign({}, options, { headers: headers }))
      .then(function (res) {
        if (res.status === 401 && state.refreshToken && !isRetry) {
          // Access token expired — try a silent refresh, then retry once.
          return refreshTokens().then(function (ok) {
            if (ok) return apiFetch(path, options, true);
            clearAuth();
            renderPanel();
            throw new Error("Session expired. Please sign in again.");
          });
        }
        return res.json().then(function (body) {
          if (!res.ok) throw new Error((body && body.message) || "Request failed");
          return body;
        });
      });
  }

  function refreshTokens() {
    if (!state.refreshToken) return Promise.resolve(false);
    return fetch(API_BASE + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: state.refreshToken }),
    })
      .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
      .then(function (r) {
        if (!r.res.ok) return false;
        var data = r.body.data;
        persistAuth(data.user, data.accessToken, data.refreshToken);
        return true;
      })
      .catch(function () { return false; });
  }

  function loginWithGoogle(idToken) {
    return fetch(API_BASE + "/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: idToken }),
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.message || "Login failed");
        return body.data;
      });
    });
  }

  function logout() {
    var rt = state.refreshToken;
    clearAuth();
    renderPanel();
    if (rt) {
      fetch(API_BASE + "/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(function () {});
    }
  }

  /* ---------------- DOM scaffold ---------------- */

  var pageMount = document.getElementById("cec-portal-mount");
  var isPageMode = !!pageMount;

  var root = document.createElement("div");
  root.id = "cec-portal-root";
  if (isPageMode) root.className = "cecp-mode-page";

  root.innerHTML =
    '<button type="button" class="cecp-launcher" aria-label="Open student portal" aria-expanded="false">' +
    '  <span class="cecp-launcher-inner"></span>' +
    "</button>" +
    '<div class="cecp-panel" role="dialog" aria-label="CEC Student Portal">' +
    '  <div class="cecp-panel__header">' +
    "    <div>" +
    '      <div class="cecp-panel__title">CEC Student Portal</div>' +
    '      <div class="cecp-panel__sub">Sign in &middot; Ask the campus assistant</div>' +
    "    </div>" +
    '    <button type="button" class="cecp-close" aria-label="Close">&#10005;</button>' +
    "  </div>" +
    '  <div class="cecp-panel__body"></div>' +
    "</div>";

  if (isPageMode) {
    pageMount.appendChild(root);
  } else {
    document.body.appendChild(root);
  }

  var launcherBtn = root.querySelector(".cecp-launcher");
  var launcherInner = root.querySelector(".cecp-launcher-inner");
  var panel = root.querySelector(".cecp-panel");
  var closeBtn = root.querySelector(".cecp-close");
  var body = root.querySelector(".cecp-panel__body");

  var CHAT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.1-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 1 1 21 11.5Z"/></svg>';

  function setOpen(v) {
    state.open = v;
    panel.classList.toggle("is-open", v);
    launcherBtn.setAttribute("aria-expanded", String(v));
    if (v) renderPanel();
  }

  if (!isPageMode) {
    launcherInner.innerHTML = CHAT_ICON;
    launcherBtn.addEventListener("click", function () { setOpen(!state.open); });
    closeBtn.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  } else {
    closeBtn.style.display = "none";
    setOpen(true);
  }

  /* ---------------- Google Identity Services ---------------- */

  var gsiLoaded = false;
  var gsiLoading = null;
  function loadGoogleScript() {
    if (gsiLoaded) return Promise.resolve();
    if (gsiLoading) return gsiLoading;
    gsiLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = function () { gsiLoaded = true; resolve(); };
      s.onerror = function () { reject(new Error("Could not load Google Sign-In script.")); };
      document.head.appendChild(s);
    });
    return gsiLoading;
  }

  function renderLoggedOut(loginError) {
    body.innerHTML =
      '<p class="cecp-login-intro">Sign in with your <strong>@ceconline.edu</strong> Google account to chat with the campus AI assistant and access student services.</p>' +
      (loginError ? '<div class="cecp-error">' + escapeHtml(loginError) + "</div>" : "") +
      '<div class="cecp-gsi-mount"></div>' +
      '<div class="cecp-hint">Only college Google accounts can sign in.</div>';

    if (!GOOGLE_CLIENT_ID) {
      body.querySelector(".cecp-gsi-mount").innerHTML =
        '<div class="cecp-error">Google sign-in is not configured (missing client ID).</div>';
      return;
    }

    loadGoogleScript()
      .then(function () {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.renderButton(body.querySelector(".cecp-gsi-mount"), {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          width: 260,
        });
      })
      .catch(function (err) {
        body.querySelector(".cecp-gsi-mount").innerHTML =
          '<div class="cecp-error">' + escapeHtml(err.message) + "</div>";
      });
  }

  function handleGoogleCredential(response) {
    body.innerHTML = '<p class="cecp-hint">Signing in&hellip;</p>';
    loginWithGoogle(response.credential)
      .then(function (data) {
        persistAuth(data.user, data.accessToken, data.refreshToken);
        chatMessages = [
          { role: "system", text: "Signed in as " + data.user.name + ". Ask me anything about campus." },
        ];
        renderPanel();
      })
      .catch(function (err) {
        renderLoggedOut(err.message || "Google sign-in failed. Please try again.");
      });
  }

  /* ---------------- Chat ---------------- */

  var chatMessages = [];

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = String(str == null ? "" : str);
    return div.innerHTML;
  }

  function renderLoggedIn() {
    var user = state.user;
    body.innerHTML =
      '<div class="cecp-profile">' +
      (user.avatarUrl
        ? '<img src="' + escapeHtml(user.avatarUrl) + '" alt="" />'
        : '<div style="width:36px;height:36px;border-radius:999px;background:#0B1730;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">' +
          escapeHtml((user.name || "?").charAt(0).toUpperCase()) +
          "</div>") +
      "<div>" +
      '<div class="cecp-profile__name">' + escapeHtml(user.name) + "</div>" +
      '<div class="cecp-profile__email">' + escapeHtml(user.email) + "</div>" +
      "</div>" +
      '<button type="button" class="cecp-logout">Sign out</button>' +
      "</div>" +
      '<div class="cecp-chat">' +
      '  <div class="cecp-chat__messages"></div>' +
      '  <form class="cecp-chat__form">' +
      '    <textarea class="cecp-chat__input" rows="1" placeholder="Ask about timetables, fees, facilities&hellip;"></textarea>' +
      '    <button type="submit" class="cecp-chat__send" aria-label="Send">' +
      '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>' +
      "    </button>" +
      "  </form>" +
      "</div>";

    body.querySelector(".cecp-logout").addEventListener("click", logout);

    var messagesEl = body.querySelector(".cecp-chat__messages");
    var form = body.querySelector(".cecp-chat__form");
    var input = body.querySelector(".cecp-chat__input");

    if (!chatMessages.length) {
      chatMessages = [{ role: "system", text: "Ask me anything about campus — timetables, facilities, admissions, and more." }];
    }
    renderMessages(messagesEl);

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || state.sending) return;
      input.value = "";
      sendChatMessage(text, messagesEl);
    });
  }

  function renderMessages(messagesEl) {
    messagesEl.innerHTML = chatMessages
      .map(function (m) {
        return '<div class="cecp-msg ' + m.role + '">' + escapeHtml(m.text) + "</div>";
      })
      .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function sendChatMessage(text, messagesEl) {
    chatMessages.push({ role: "user", text: text });
    renderMessages(messagesEl);

    state.sending = true;
    var typingEl = document.createElement("div");
    typingEl.className = "cecp-msg assistant";
    typingEl.innerHTML = '<span class="cecp-typing"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    apiFetch("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message: text }),
    })
      .then(function (body) {
        chatMessages.push({ role: "assistant", text: body.data.response });
      })
      .catch(function (err) {
        chatMessages.push({ role: "system", text: err.message || "Something went wrong. Please try again." });
      })
      .finally(function () {
        state.sending = false;
        renderMessages(messagesEl);
      });
  }

  /* ---------------- Panel router ---------------- */

  function renderPanel() {
    if (!API_BASE) {
      body.innerHTML = '<div class="cecp-error">Portal is not configured: missing API base URL.</div>';
      return;
    }
    if (state.user && state.accessToken) {
      renderLoggedIn();
    } else {
      renderLoggedOut();
    }
  }

  if (isPageMode) renderPanel();
})();
