# AWS Deployment Scaffold

This repo is ready to move from local SQLite/Render-style config toward AWS with:

- React frontend on AWS Amplify Hosting
- Django API on AWS App Runner
- PostgreSQL on Amazon RDS

## 1) Backend Database Prep

Create an RDS PostgreSQL database, then set these backend environment variables in App Runner:

```bash
DJANGO_SECRET_KEY=<long-random-secret>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=<your-app-runner-host>,<optional-custom-api-domain>
CORS_ALLOWED_ORIGINS=https://<your-amplify-host-or-custom-domain>
CSRF_TRUSTED_ORIGINS=https://<your-amplify-host-or-custom-domain>
DATABASE_URL=postgresql://<user>:<password>@<rds-host>:5432/<database-name>
DATABASE_SSL_REQUIRE=true
DATABASE_CONN_MAX_AGE=60
EMAIL_NOTIFICATIONS_ENABLED=false
```

Notes:

- Keep `DATABASE_URL` unset locally if you want to keep using `db.sqlite3`.
- Set `DATABASE_SSL_REQUIRE=true` for RDS/App Runner production traffic.
- If your database URL already includes `?sslmode=...`, that value wins.

## 2) Verify Database Config

Before running migrations against RDS, verify Django can connect:

```bash
python manage.py check_database
```

Expected ending:

```text
Database connection OK.
```

Then run:

```bash
python manage.py migrate
```

For App Runner, the backend start command can remain similar to Render:

```bash
python manage.py migrate && gunicorn cashflowgo.wsgi --bind 0.0.0.0:$PORT
```

## 3) Frontend Environment

In Amplify Hosting, set:

```bash
REACT_APP_API_BASE_URL=https://<your-app-runner-host>/api
REACT_APP_ENABLE_OFFLINE_FALLBACK=0
```

Build command:

```bash
npm run build
```

Build output directory:

```text
build
```
