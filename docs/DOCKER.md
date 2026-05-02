# Docker Development

This project includes a Docker scaffold for a resume-friendly local production shape:

- React frontend container
- Django backend container
- PostgreSQL database container

## Run The Full Stack

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`

The backend waits for Postgres, runs migrations, then starts Django's development server.

## Check The Database

```bash
docker compose exec backend python manage.py check_database
```

Expected ending:

```text
Database connection OK.
```

## Backend Image

The root `Dockerfile` builds the Django backend with Gunicorn:

```bash
docker build -t cashflowgo-backend .
docker run --rm -p 8000:8000 cashflowgo-backend
```

For AWS, this backend image is the starting point for an ECS/Fargate deployment.

## Useful Commands

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose logs -f backend
docker compose down
```

To remove the local Postgres volume and start over:

```bash
docker compose down --volumes
```
