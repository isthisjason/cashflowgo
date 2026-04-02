# Deployment Guide (Cloudflare Frontend + Render Backend)

This guide is designed for a simple deployment path with minimal changes to project behavior.

## 1) Pre-Deploy Checklist

- Ensure local app runs successfully:
  - `python manage.py migrate`
  - `npm run dev`
- Commit latest migrations
- Set production environment variables

## 2) Required Environment Variables

Backend (Django):

- `DJANGO_SECRET_KEY` (required in production)
- `DJANGO_DEBUG=false`
- `DJANGO_ALLOWED_HOSTS` (comma-separated)
- `CORS_ALLOWED_ORIGINS` (comma-separated, include Cloudflare frontend URL)
- `CSRF_TRUSTED_ORIGINS` (comma-separated, include Cloudflare frontend URL)
- `DATABASE_URL` (Render Postgres connection string)

Frontend:

- `REACT_APP_API_BASE_URL` (set to your deployed API URL + `/api`)
- `REACT_APP_ENABLE_OFFLINE_FALLBACK=0` (recommended in production)

## 3) Render Backend Deployment

This repo includes `render.yaml` as a starting point.

Typical flow:

1. Push repo to GitHub
2. Create a new Render Blueprint from repo
3. In Render, set:
   - `DJANGO_SECRET_KEY` (secure random value)
   - `DJANGO_DEBUG=false`
   - `DJANGO_ALLOWED_HOSTS` to your Render host (and custom API host if any)
   - `CORS_ALLOWED_ORIGINS` to Cloudflare frontend URL(s)
   - `CSRF_TRUSTED_ORIGINS` to Cloudflare frontend URL(s)
4. Deploy and verify backend endpoint:
   - `https://<your-render-host>/api/accounts/csrf/`

## 4) Cloudflare Pages Frontend Deployment

1. In Cloudflare Pages, connect this GitHub repo.
2. Build settings:
   - Framework preset: `Create React App`
   - Build command: `npm run build`
   - Build output directory: `build`
3. Add frontend environment variable:
   - `REACT_APP_API_BASE_URL=https://<your-render-host>/api`
   - `REACT_APP_ENABLE_OFFLINE_FALLBACK=0`
4. Deploy.

The `public/_redirects` file is included so React routes work on hard refresh.

## 5) Post-Deploy Verification

- `/api/accounts/csrf/` returns success
- Login works and sets session cookie
- Add transaction works
- Income slider update works
- Budget and subscriptions endpoints respond

## 6) Common Issues

- `ModuleNotFoundError: django`:
  - Ensure build/install command includes `pip install -r requirements.txt`
- CORS/CSRF issues:
  - Update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to deployed Cloudflare domain
- Backend unreachable from frontend:
  - Verify `REACT_APP_API_BASE_URL` points to correct deployed backend URL
