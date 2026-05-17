# ATLAS Backend — Deployment Guide

Deploy the API **before** the frontend. The client only needs `VITE_API_BASE_URL` pointing at this service.

## Readiness checklist

| Item | Status |
|------|--------|
| PostgreSQL database (schema migrated) | Required |
| `DATABASE_URL` set | Required |
| `JWT_SECRET_KEY` (long random string) | Required |
| `OPENROUTER_API_KEY` | Required for AI features |
| `SERPER_API_KEY` | Required for live pricing |
| `CORS_ORIGINS` includes your frontend URL | Required |
| `PUBLIC_APP_URL` = public API URL | Recommended |
| `ENVIRONMENT=production` | Recommended |
| `ALLOW_SQLITE_FALLBACK=false` | Required in production |

## Environment variables

Copy `.env.example` to `.env` locally. On your host, set variables in the dashboard (do not commit `.env`).

```env
ENVIRONMENT=production
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=<generate-a-strong-secret>
OPENROUTER_API_KEY=...
SERPER_API_KEY=...
CORS_ORIGINS=https://your-frontend.example.com
PUBLIC_APP_URL=https://your-api.example.com
ALLOW_SQLITE_FALLBACK=false
```

`CORS_ORIGINS` must be the **exact** origin(s) of the deployed frontend (scheme + host + port), comma-separated with no trailing slashes.

## Run command

```bash
cd atlas-backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Or use the included `Procfile` on Render/Railway (they set `PORT` automatically).

## Health checks

- `GET /` — basic “service up”
- `GET /health` — returns `503` if PostgreSQL is unreachable (use for load balancers)

## After deploy

1. Open `https://your-api.example.com/health` — should return `"database": "connected"`.
2. Note the API URL for the frontend: `VITE_API_BASE_URL=https://your-api.example.com`
3. Deploy the client with that variable (see `client/DEPLOYMENT.md`).
4. Add the **deployed frontend origin** to `CORS_ORIGINS` and redeploy this service.

## Common issues

- **CORS errors in browser** — add the frontend origin to `CORS_ORIGINS`, redeploy backend.
- **500 on every request** — check `DATABASE_URL` and that tables exist; ensure `ALLOW_SQLITE_FALLBACK` is not relied on in production.
- **AI/pricing failures** — verify `OPENROUTER_API_KEY` and `SERPER_API_KEY`.
