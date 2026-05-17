# ATLAS Client — Deployment Guide

Backend API: **https://atlas-lrdt.onrender.com**

## Before you deploy

1. Backend is live and `/health` returns `"database": "connected"`.
2. You know your **frontend URL** (e.g. `https://atlas.vercel.app`).
3. On **Render** (backend service), add that URL to `CORS_ORIGINS`:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://YOUR-FRONTEND-URL
```

Redeploy the backend after updating CORS.

## Required build variable

| Variable | Value |
|----------|--------|
| `VITE_API_BASE_URL` | `https://atlas-lrdt.onrender.com` |

No trailing slash. This is embedded at **build time** (not read from `.env` in the browser at runtime).

### Option A — Local build (quick test)

`client/.env.production` is already set for this project. From the `client` folder:

```bash
npm ci
npm run build
npm run preview
```

Open the preview URL and test login.

### Option B — Host builds for you (Vercel / Netlify / Render)

Set `VITE_API_BASE_URL` in the host’s environment variables **before** the build step. See platform notes below.

## Deploy on Vercel

1. Import the repo; set **Root Directory** to `client`.
2. Environment variable: `VITE_API_BASE_URL` = `https://atlas-lrdt.onrender.com`
3. Build command: `npm run build` (default)
4. Output directory: `dist`
5. `vercel.json` handles SPA routing.

After deploy, add the Vercel URL to backend `CORS_ORIGINS` and redeploy the API.

## Deploy on Netlify

1. **Base directory:** `client`
2. Build command: `npm run build`
3. Publish directory: `client/dist`
4. Environment: `VITE_API_BASE_URL` = `https://atlas-lrdt.onrender.com`
5. `netlify.toml` and `public/_redirects` handle SPA routing.

## Deploy on Render (Static Site)

1. New **Static Site**, root `client`.
2. Build: `npm install && npm run build`
3. Publish path: `dist`
4. Env: `VITE_API_BASE_URL` = `https://atlas-lrdt.onrender.com`

## Local development vs production

| File | Purpose |
|------|---------|
| `.env.local` | Local overrides (wins over `.env` in dev) — keep pointing at Render or localhost |
| `.env.production` | Used only for `npm run build` on your machine |
| Host env vars | Used when the platform runs `npm run build` |

**Do not** rely on `.env.local` for production builds — it is not used in production mode.

## Checklist after deploy

- [ ] Login / register works
- [ ] Recommendations and chat load (need OpenRouter + Serper on backend)
- [ ] Browser Network tab shows requests to `https://atlas-lrdt.onrender.com`, not `localhost`
- [ ] No CORS errors in the console
- [ ] Refreshing deep links (e.g. `/dashboard`) does not 404

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| “API URL is not configured” | Rebuild with `VITE_API_BASE_URL` set |
| CORS error | Add exact frontend origin to backend `CORS_ORIGINS` |
| 404 on refresh | Ensure SPA redirects (`vercel.json` / `netlify.toml` / `_redirects`) |
| Still hits localhost | Rebuild; dev-only fallback is not in production bundles if env was set at build time |
