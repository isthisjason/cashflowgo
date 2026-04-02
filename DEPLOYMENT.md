# Deployment Guide (CashFlowGo)

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
- `PYTHON_VERSION` (optional depending platform)

Frontend:

- `REACT_APP_API_BASE_URL` (set to your deployed API URL + `/api`)
- `REACT_APP_ENABLE_OFFLINE_FALLBACK=0` (recommended in production)
- Optional EmailJS vars if you add your own provider setup later

## 3) Render Deployment (Example)

This repo includes `render.yaml` as a starting point.

Typical flow:

1. Push repo to GitHub
2. Create a new Render Blueprint from repo
3. Fill environment variables in Render dashboard
4. Deploy and verify `/api/accounts/csrf/` and frontend login flow

## 4) Post-Deploy Verification

- `/api/accounts/csrf/` returns success
- Login works and sets session cookie
- Add transaction works
- Income slider update works
- Budget and subscriptions endpoints respond

## 5) Common Issues

- `ModuleNotFoundError: django`:
  - Ensure build/install command includes `pip install -r requirements.txt`
- CORS/CSRF issues:
  - Update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to deployed frontend domain
- Backend unreachable from frontend:
  - Verify `REACT_APP_API_BASE_URL` points to correct deployed backend URL

