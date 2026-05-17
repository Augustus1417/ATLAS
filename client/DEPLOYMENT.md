# ATLAS Client — Deployment Prep

Deploy **after** the backend is live. Do not run `npm run build` until `VITE_API_BASE_URL` is set on your host.

## Environment variable

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `https://your-api.example.com` |

Copy from `.env.production.example`. No trailing slash. The app calls this URL directly (no Vite dev proxy in production).

## Backend CORS

Add your frontend origin to the backend `CORS_ORIGINS`, e.g.:

```env
CORS_ORIGINS=https://your-frontend.example.com
```

## Build (when ready)

```bash
cd client
npm ci
npm run build
```

Serve the `dist/` folder with any static host (Vercel, Netlify, Nginx, etc.).

## Error messages

Network errors in production show generic copy (not `localhost`). In dev, messages may mention the local API URL to help debugging.

## Local development

```bash
cp .env.example .env.local
npm run dev
```

Ensure the backend is running and `VITE_API_BASE_URL` matches it.
