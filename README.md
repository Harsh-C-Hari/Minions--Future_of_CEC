# Smart Campus — CEC (College of Engineering Chengannur)

Monorepo containing the college website (frontend) and the Smart Campus API
(backend, with the AI assistant bundled inside it).

```
frontend/     Static site (ceconline.edu) + the new Student Portal (login + AI chat)
backend/      Node/Express API (auth, AI proxy) + backend/ai-service (Python/FastAPI + Gemma)
```

## How it fits together

```
 Browser (any page on the site)
   │  loads /assets/portal/portal-widget.js on every page
   │  + a dedicated /student-portal/ page
   ▼
 Express API  (backend/)              ai-service/  (backend/ai-service, Python)
   • POST /api/v1/auth/google  ───────▶ verifies Google ID token, issues JWTs
   • POST /api/v1/ai/chat  ───────────▶ proxies to ai-service ──▶ Ollama (Gemma)
```

- **Login**: every page (and the dedicated `/student-portal/`) loads a small
  floating widget that renders Google's Sign-In button. It posts the Google ID
  token to the backend, which verifies it, restricts sign-in to
  `@ceconline.edu` accounts, and returns access/refresh JWTs. Tokens are kept
  in `localStorage` on the frontend.
- **AI assistant**: once signed in, the same widget exposes a chat box. Chat
  messages go to `POST /api/v1/ai/chat` (JWT-protected) on the Express API,
  which forwards them to the bundled `ai-service` (FastAPI), which calls Gemma
  through a local Ollama instance and returns the response. The frontend never
  talks to `ai-service` directly — only through the Express backend.

## Quick start (local development)

**1. Backend + AI service**

```bash
cd backend
npm install
cp .env.example .env        # fill in DATABASE_URL, JWT secrets, GOOGLE_CLIENT_ID, etc.
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run ai:install           # first time only (Python deps for ai-service)
npm run dev:all              # runs the Express API (:5000) and ai-service (:8000) together
```

ai-service also needs a local [Ollama](https://ollama.com) instance running
with the configured model pulled — see `backend/ai-service/README.md`.

**2. Frontend**

The frontend is a static site, so any static file server works:

```bash
cd frontend
python3 -m http.server 5500
# then open http://localhost:5500/index.html
```

Because the portal widget is included with **root-relative** paths
(`/assets/portal/...`), the frontend must be served from its root — the
command above does this correctly. Visit `/student-portal/index.html` for the
dedicated portal page, or use the floating widget bubble on any page.

Make sure `backend/.env`'s `CORS_ORIGIN` includes whatever origin you're
serving the frontend from (e.g. `http://localhost:5500`), and that
`frontend/assets/portal/portal-config.js`'s `API_BASE_URL` points at the
backend (`http://localhost:5000/api/v1` by default).

## Google OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** of type **Web application**.
2. Add every origin the frontend will be served from under **Authorized
   JavaScript origins** (e.g. `http://localhost:5500`, and your production
   domain such as `https://ceconline.edu`). No redirect URI is needed — this
   project uses Google Identity Services' token-based sign-in, not a
   redirect flow.
3. Put that client ID in **both**:
   - `backend/.env` → `GOOGLE_CLIENT_ID` (used to verify tokens)
   - `frontend/assets/portal/portal-config.js` → `GOOGLE_CLIENT_ID` (used to
     render the Sign-In button)
4. Sign-in is further restricted server-side to emails ending in
   `ALLOWED_EMAIL_DOMAIN` (`ceconline.edu` by default).

## ⚠️ Before pushing to GitHub

- **Rotate your credentials.** The `backend/.env` file that came with this
  project contained a real Supabase database password and real JWT signing
  secrets. That file has been removed from this repo (it's git-ignored going
  forward), but since those values already existed in a shared/unzipped file,
  treat them as compromised: rotate the Supabase DB password and generate new
  `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` values before deploying.
- `backend/.env` and `backend/ai-service/.env` are git-ignored — only the
  `.env.example` files should be committed.
- The frontend zip was an HTTrack mirror of the live site. Non-functional
  WordPress admin/internals (`wp-admin/`, `wp-includes/`, `wp-json/`,
  `xmlrpc*.php`, a mirrored `wp-login` page, and a stray duplicate/preview
  page) were removed as dead weight — everything else (all real content
  pages, images in `wp-content/`) was kept as-is.
- A handful of the original WordPress pages have pre-existing malformed HTML
  (duplicate `<body>`/`<html>` tags from the original site/theme, not
  introduced here). Browsers render them fine, but it's worth cleaning up
  later if you do a proper migration off WordPress.

## Repo layout reference

| Path | What |
|---|---|
| `frontend/index.html` | Custom-redesigned homepage |
| `frontend/student-portal/index.html` | Dedicated login + AI assistant page |
| `frontend/assets/portal/` | Shared login/AI widget (config, JS, CSS) injected into every page |
| `frontend/assets/css/design-system.css`, `frontend/assets/js/main.js` | Homepage-family design system |
| `backend/src/` | Express API (auth, AI proxy, shared middleware/utils) |
| `backend/ai-service/` | FastAPI + Gemma/Ollama microservice |
| `backend/src/prisma/schema.prisma` | Database schema (Postgres via Supabase) |
