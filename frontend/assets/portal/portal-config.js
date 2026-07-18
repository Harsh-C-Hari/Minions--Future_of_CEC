/**
 * Shared configuration for the CEC Student Portal (login + AI assistant).
 * Loaded on every page before portal-widget.js.
 *
 * Edit API_BASE_URL when deploying: point it at wherever the
 * smart-campus-backend Express server is hosted.
 */
window.CEC_PORTAL_CONFIG = {
  // Local dev default. In production, replace with e.g.
  // "https://api.ceconline.edu/api/v1"
  API_BASE_URL: "http://localhost:5000/api/v1",

  // Google OAuth 2.0 Web Client ID (must match GOOGLE_CLIENT_ID in the
  // backend's .env so ID tokens verify correctly).
  GOOGLE_CLIENT_ID: "86443298678-hukvg56c9u5srciodheihi3v0ob5ns2a.apps.googleusercontent.com",
};
