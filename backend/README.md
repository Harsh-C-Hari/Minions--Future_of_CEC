# Smart Campus Student Platform — Backend

Backend API for the Smart Campus Student Platform: Authentication module, an AI
assistant proxy backed by the bundled `ai-service`, and project scaffolding. Built
so later modules — Student Profile, Lift Request, Lift Access Management, Admin,
Notifications — can be added on top **without modifying this module's routes,
response shapes, or auth flow.**

## Tech Stack

- Node.js + Express
- PostgreSQL (Supabase) via Prisma ORM
- JWT (access + rotating refresh tokens)
- Google OAuth (ID-token verification, restricted to `@ceconline.edu`)
- Zod (request validation + env validation)
- Multer (installed now, wired up in the Lift Request module)
- **`ai-service/`** — bundled Python/FastAPI microservice that talks to Gemma via
  Ollama. Runs as its own process; this API proxies to it (see below).

## Folder Structure

```
ai-service/       Python/FastAPI + Gemma(Ollama) microservice — see ai-service/README.md
src/
  config/         env loading + validation (config/env.js)
  controllers/     thin HTTP layer — calls services, shapes responses
  middleware/      auth guard, validation, centralized error handling
  prisma/          schema.prisma + Prisma client singleton
  routes/          Express routers (auth, ai)
  services/        business logic (talks to Prisma directly, or proxies to ai-service)
  utils/           ApiError, ApiResponse, asyncHandler, jwt helpers
  validations/      Zod schemas per module
  app.js           Express app (middleware + route mounting)
server.js          entry point, graceful shutdown
```

**Repository/Service pattern note:** for this module, Prisma itself acts as the
repository layer (it already gives us a clean, swappable data-access API), so
`services/auth.service.js` calls `prisma` directly rather than through an extra
repository wrapper. If a future module needs more complex queries, add a
`repositories/` folder following the same pattern without touching this module.

## Setup

```bash
npm install
cp .env.example .env   # then fill in real values, see below
npm run prisma:generate
npm run prisma:migrate -- --name init   # creates users & refresh_tokens tables
npm run dev             # nodemon, or: npm start
```

### Running the AI assistant too

The AI assistant (`ai-service/`) is a separate Python process — it needs Ollama
running locally with the configured model pulled (see `ai-service/README.md`).

```bash
npm run ai:install      # first time only: pip install ai-service/requirements.txt
npm run ai:dev          # runs ai-service on :8000 (uvicorn --reload)
# in another terminal:
npm run dev             # runs the Express API on :5000
# or run both at once:
npm run dev:all
```

The Express API proxies AI chat requests through `POST /api/v1/ai/chat`
(auth required) to `ai-service`'s `POST /chat` — the frontend never talks to
`ai-service` directly.

### Environment variables (`.env`)

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `5000`) |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `DATABASE_URL` | Supabase **pooled** connection string (runtime queries) |
| `DIRECT_URL` | Supabase **direct** connection string (Prisma Migrate) |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (must differ from above) |
| `JWT_ACCESS_EXPIRY` | e.g. `15m` |
| `JWT_REFRESH_EXPIRY` | e.g. `7d` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web Client ID from Google Cloud Console |
| `ALLOWED_EMAIL_DOMAIN` | `ceconline.edu` — only this domain may log in |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins, or `*` |
| `AI_SERVICE_URL` | Base URL of the bundled `ai-service` process (default `http://localhost:8000`) |
| `AI_SERVICE_TIMEOUT_MS` | Timeout in ms for AI proxy requests (default `30000`) |

The app **fails fast on boot** (`src/config/env.js`) if any required variable is
missing or malformed, instead of failing later with a confusing runtime error.

## How Google login works here

The frontend (web/mobile) uses Google Sign-In to obtain a **Google ID token**, then
sends *only that token* to `POST /api/v1/auth/google`. The backend verifies the token
signature directly with Google (`google-auth-library`), checks `email_verified` and the
`@ceconline.edu` domain, then upserts the user and issues our own JWTs. The backend
never sees the user's Google password and doesn't need a client secret or redirect
URIs — this keeps it a clean, stateless REST API that any client (including the future
AI layer) can call the same way.

Refresh tokens are stored in the `refresh_tokens` table (hashed by nature of being
random JWTs, one row per issued token) so they can be individually revoked and are
**rotated** on every refresh (old one is revoked, a new one issued) — a stolen refresh
token can only be replayed once before it's caught as revoked.

## API Reference

Base URL: `/api/v1/auth`

### `POST /auth/google`
Log in / register with a Google ID token.

Request:
```json
{ "idToken": "<google-id-token>" }
```

Success `200`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@ceconline.edu",
      "name": "Student Name",
      "avatarUrl": "https://...",
      "role": "STUDENT",
      "isActive": true,
      "createdAt": "2026-07-18T00:00:00.000Z"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

Errors: `400` invalid body · `401` invalid/unverified Google token · `403` wrong email domain or deactivated account.

### `POST /auth/refresh`
Exchange a valid refresh token for a new token pair (rotates the refresh token).

Request: `{ "refreshToken": "eyJ..." }`
Success `200`: same shape as above.
Errors: `401` invalid, expired, or already-used/revoked refresh token.

### `POST /auth/logout`
Revokes a refresh token.

Request: `{ "refreshToken": "eyJ..." }`
Success `200`: `{ "success": true, "statusCode": 200, "message": "Logged out successfully", "data": null }`

### `GET /auth/me`
Returns the currently authenticated user. Requires header:
`Authorization: Bearer <accessToken>`

Errors: `401` missing/invalid/expired access token.

### `POST /ai/chat`
Ask the campus AI assistant a question. Requires `Authorization: Bearer <accessToken>`.

Request:
```json
{ "message": "When do B.Tech admissions open?" }
```

Success `200`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "AI response generated successfully",
  "data": { "response": "...", "success": true }
}
```

Errors: `400` invalid/empty message · `401` missing/expired access token ·
`502`/`503`/`504` if `ai-service` (or Ollama behind it) is unreachable, errored,
or timed out.

## Error Response Shape (applies to every endpoint, every module)

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid or expired refresh token",
  "details": null
}
```
`details` is populated with field-level messages for `400` validation errors.
In non-production, a `stack` field is also included to speed up debugging.

## Verified in this environment

- `npm install` completes cleanly (multer pinned to the patched 2.x line to avoid
  the known 1.x vulnerabilities).
- `node --check` passes on every source file (no syntax errors).
- The Express app was smoke-tested end-to-end against a mocked Prisma client:
  `/health`, unknown-route `404`s, Zod validation `400`s, the JWT `authenticate`
  guard's `401`, and Google-token-rejection `401`s all returned the correct clean
  JSON shape.
- `prisma validate` / `prisma generate` could **not** be run in this sandbox because
  outbound access to `binaries.prisma.sh` (where Prisma downloads its query engine)
  is blocked by the sandbox's network policy — this is a sandbox limitation, not a
  project issue. Run `npm run prisma:generate` on your own machine or in CI, where
  normal internet access is available, before your first `prisma:migrate`.
- Two moderate `npm audit` advisories remain, both from `uuid` deep inside
  `google-auth-library`'s `gaxios` dependency, not from code in this project. No
  fix is currently published upstream; worth re-running `npm audit` periodically.

## Next modules (not yet built)

Student Profile → Lift Request System → Lift Access Management → Admin APIs →
Notifications, each added the same way: new Prisma models (additive), a
`validations/*.validation.js`, `services/*.service.js`, `controllers/*.controller.js`,
and a router mounted in `src/routes/index.js`. The `User` model already has the
`role` field (`STUDENT` / `ADMIN`) and `authenticate` / `authorize` middleware needed
to gate the upcoming Admin APIs.
