/**
 * CEC Portal API — Shared auth & fetch module for Lift Management pages.
 *
 * Reads the same localStorage keys that portal-widget.js writes
 * (cecp_access_token, cecp_refresh_token, cecp_user) so all pages share
 * a single authentication session. Does NOT modify portal-widget.js.
 *
 * Usage:
 *   <script src="/assets/portal/portal-config.js"></script>
 *   <script src="/assets/portal/portal-api.js"></script>
 *   <script>
 *     CecApi.requireAuth();
 *     CecApi.apiFetch('/lift-requests/me').then(…);
 *   </script>
 */
(function () {
  "use strict";

  var CFG = window.CEC_PORTAL_CONFIG || {};
  var API_BASE = (CFG.API_BASE_URL || "").replace(/\/+$/, "");

  var STORAGE_KEYS = {
    access: "cecp_access_token",
    refresh: "cecp_refresh_token",
    user: "cecp_user",
  };

  /* ---- localStorage helpers ---- */

  function getStored(key) {
    try { return window.localStorage.getItem(key); }
    catch (e) { return null; }
  }

  function setStored(key, value) {
    try {
      if (value === null || value === undefined) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) { /* private mode */ }
  }

  /* ---- Token refresh ---- */

  function refreshTokens() {
    var rt = getStored(STORAGE_KEYS.refresh);
    if (!rt) return Promise.resolve(false);
    return fetch(API_BASE + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    })
      .then(function (res) {
        return res.json().then(function (body) { return { res: res, body: body }; });
      })
      .then(function (r) {
        if (!r.res.ok) return false;
        var data = r.body.data;
        setStored(STORAGE_KEYS.user, JSON.stringify(data.user));
        setStored(STORAGE_KEYS.access, data.accessToken);
        setStored(STORAGE_KEYS.refresh, data.refreshToken);
        return true;
      })
      .catch(function () { return false; });
  }

  /* ---- Core fetch ---- */

  function apiFetch(path, options, isRetry) {
    options = options || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    var accessToken = getStored(STORAGE_KEYS.access);
    if (accessToken) headers.Authorization = "Bearer " + accessToken;

    return fetch(API_BASE + path, Object.assign({}, options, { headers: headers }))
      .then(function (res) {
        if (res.status === 401 && getStored(STORAGE_KEYS.refresh) && !isRetry) {
          return refreshTokens().then(function (ok) {
            if (ok) return apiFetch(path, options, true);
            clearAuth();
            throw new Error("Session expired. Please sign in again.");
          });
        }
        return res.json().then(function (body) {
          if (!res.ok) {
            var err = new Error((body && body.message) || "Request failed");
            err.statusCode = res.status;
            err.data = body;
            throw err;
          }
          return body;
        });
      });
  }

  /**
   * Upload files via multipart/form-data.
   * Does NOT set Content-Type — lets the browser set the boundary.
   */
  function apiFetchFormData(path, formData) {
    var accessToken = getStored(STORAGE_KEYS.access);
    var headers = {};
    if (accessToken) headers.Authorization = "Bearer " + accessToken;

    return fetch(API_BASE + path, {
      method: "POST",
      headers: headers,
      body: formData,
    })
      .then(function (res) {
        if (res.status === 401 && getStored(STORAGE_KEYS.refresh)) {
          return refreshTokens().then(function (ok) {
            if (!ok) {
              clearAuth();
              throw new Error("Session expired. Please sign in again.");
            }
            // Retry with fresh token
            var h2 = {};
            var newToken = getStored(STORAGE_KEYS.access);
            if (newToken) h2.Authorization = "Bearer " + newToken;
            return fetch(API_BASE + path, {
              method: "POST",
              headers: h2,
              body: formData,
            });
          })
          .then(function (res2) {
            return res2.json().then(function (body) {
              if (!res2.ok) {
                var err = new Error((body && body.message) || "Request failed");
                err.statusCode = res2.status;
                err.data = body;
                throw err;
              }
              return body;
            });
          });
        }
        return res.json().then(function (body) {
          if (!res.ok) {
            var err = new Error((body && body.message) || "Request failed");
            err.statusCode = res.status;
            err.data = body;
            throw err;
          }
          return body;
        });
      });
  }

  /* ---- Auth helpers ---- */

  function getUser() {
    var raw = getStored(STORAGE_KEYS.user);
    try { return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }

  function isLoggedIn() {
    return !!(getUser() && getStored(STORAGE_KEYS.access));
  }

  function isAdmin() {
    var user = getUser();
    return user && user.role === "ADMIN";
  }

  function clearAuth() {
    setStored(STORAGE_KEYS.access, null);
    setStored(STORAGE_KEYS.refresh, null);
    setStored(STORAGE_KEYS.user, null);
  }

  function logout() {
    var rt = getStored(STORAGE_KEYS.refresh);
    clearAuth();
    if (rt) {
      fetch(API_BASE + "/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(function () {});
    }
    window.location.href = "/student-portal/";
  }

  /**
   * Redirect to login if not authenticated.
   * Call at the top of every lift page's script.
   */
  function requireAuth(redirectUrl) {
    if (!isLoggedIn()) {
      window.location.href = redirectUrl || "/student-portal/";
      return false;
    }
    return true;
  }

  /**
   * Redirect students away from admin pages.
   */
  function requireAdmin() {
    if (!requireAuth()) return false;
    if (!isAdmin()) {
      window.location.href = "/elevator/";
      return false;
    }
    return true;
  }

  /* ---- Public API ---- */

  window.CecApi = {
    getUser: getUser,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    apiFetch: apiFetch,
    apiFetchFormData: apiFetchFormData,
    logout: logout,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    clearAuth: clearAuth,
  };
})();
