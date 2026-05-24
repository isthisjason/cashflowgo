# Deployment Guide: Cloudflare Frontend + Render Backend

This is the active low-cost demo deployment path for CashFlowGo.

- Cloudflare Pages hosts the React build.
- Render hosts the Django API.
- AWS deployment docs remain in `docs/` as legacy/reference material.

## 1) Render Backend

This repo includes `render.yaml` for the backend service.

1. Push the repo to GitHub.
2. In Render, create a Blueprint or Web Service from the repo.
3. Use these backend settings:
   - Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - Start command: `python manage.py migrate && gunicorn cashflowgo.wsgi --bind 0.0.0.0:$PORT`
4. Set Render environment variables:
   - `DJANGO_SECRET_KEY=<long-random-secret>`
   - `DJANGO_DEBUG=false`
   - `DJANGO_ALLOWED_HOSTS=cashflowgo-backend.onrender.com`
   - `CORS_ALLOWED_ORIGINS=https://<cloudflare-pages-domain>`
   - `CSRF_TRUSTED_ORIGINS=https://<cloudflare-pages-domain>`
   - `EMAIL_NOTIFICATIONS_ENABLED=false`

Leave `DATABASE_URL` unset for a no-cost demo deployment. Django will use SQLite on Render's filesystem, which is not a durable production database. For persistent data, add Render Postgres or another Postgres provider and set `DATABASE_URL`.

Verify the backend:

```bash
curl -i https://cashflowgo-backend.onrender.com/api/accounts/csrf/
```

Expected response includes `HTTP 200` and a JSON `csrf_token`.

## 2) Cloudflare Pages Frontend

The restored deploy command builds the React app and publishes `build/` to Cloudflare Pages:

```bash
npm run deploy
```

Defaults used by the script:

```text
RENDER_API_BASE_URL=https://cashflowgo-backend.onrender.com/api
CLOUDFLARE_PAGES_PROJECT=cashflowgo
```

Override them when needed:

```bash
RENDER_API_BASE_URL=https://<render-backend-host>/api \
CLOUDFLARE_PAGES_PROJECT=<cloudflare-pages-project> \
npm run deploy
```

The script sets:

```text
REACT_APP_API_BASE_URL=$RENDER_API_BASE_URL
REACT_APP_ENABLE_OFFLINE_FALLBACK=0
```

If you deploy through Cloudflare's Git integration instead of `npm run deploy`, use:

```text
Build command: npm run build
Build output directory: build
```

Set these Cloudflare Pages environment variables:

```text
REACT_APP_API_BASE_URL=https://cashflowgo-backend.onrender.com/api
REACT_APP_ENABLE_OFFLINE_FALLBACK=0
```

The `public/_redirects` file is included so React routes work on hard refresh.

## 3) Post-Deploy Verification

Check:

- Cloudflare Pages URL loads.
- `/login` loads directly after hard refresh.
- `/api/accounts/csrf/` on Render returns `200` and a `csrf_token`.
- Signup, login, logout, dashboard fetches, add transaction, budget, subscriptions, and CSV download work.
- Browser console has no CORS, CSRF, session, or stale API URL errors.

## 4) Common Issues

- CORS or CSRF errors:
  - Confirm the exact Cloudflare Pages URL is in both `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.
  - Include the scheme, for example `https://cashflowgo.pages.dev`.
- Frontend fetches localhost or AWS:
  - Rebuild/redeploy with `REACT_APP_API_BASE_URL=https://cashflowgo-backend.onrender.com/api`.
- Login works but data disappears:
  - `DATABASE_URL` is unset, so Render is using demo-only SQLite storage.
- First request is slow:
  - Render free services spin down after inactivity and need time to wake up.
