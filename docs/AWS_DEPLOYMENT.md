# AWS Deployment Scaffold

This repo is ready to move from local SQLite/Render-style config toward AWS with:

- React frontend on S3 + CloudFront or AWS Amplify Hosting
- Django API on ECS/Fargate using the backend Docker image
- PostgreSQL on Amazon RDS

`Dockerfile` and `docker-compose.yml` provide the local container proof point before moving the backend image to AWS.

## 1) Backend Database Prep

Create an RDS PostgreSQL database, then set these backend environment variables for the ECS/Fargate backend task:

```bash
DJANGO_SECRET_KEY=<long-random-secret>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=<your-api-domain-or-load-balancer-host>
CORS_ALLOWED_ORIGINS=https://<your-cloudfront-or-amplify-domain>
CSRF_TRUSTED_ORIGINS=https://<your-cloudfront-or-amplify-domain>
DATABASE_URL=postgresql://<user>:<password>@<rds-host>:5432/<database-name>
DATABASE_SSL_REQUIRE=true
DATABASE_CONN_MAX_AGE=60
EMAIL_NOTIFICATIONS_ENABLED=false
```

Notes:

- Keep `DATABASE_URL` unset locally if you want to keep using `db.sqlite3`.
- Set `DATABASE_SSL_REQUIRE=true` for RDS production traffic.
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

For ECS/Fargate, use the root `Dockerfile` as the backend image and run migrations as a one-off task or release step before starting Gunicorn.

The container command is:

```bash
gunicorn cashflowgo.wsgi:application --bind 0.0.0.0:8000
```

## 3) Frontend Environment

For S3 + CloudFront or Amplify Hosting, build the React app with:

```bash
REACT_APP_API_BASE_URL=https://<your-api-domain>/api
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
