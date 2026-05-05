# AWS Deployment

CashFlowGo is deployed on AWS with one public CloudFront domain:

```text
https://<cloudfront-domain>
```

CloudFront routes requests by path:

```text
/        -> S3 bucket with the React build
/api/*   -> Application Load Balancer -> ECS/Fargate -> Django container
```

Supporting services:

- ECR stores the Django backend Docker image.
- ECS/Fargate runs the Django backend container.
- RDS PostgreSQL stores application data.
- The ALB routes backend traffic to the ECS service.

## Environment Variables

Set these on the ECS task definition for the Django container:

```bash
DJANGO_SECRET_KEY=<long-random-secret>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=<cloudfront-domain>,<alb-domain>
DJANGO_SECURE_SSL_REDIRECT=false
CORS_ALLOWED_ORIGINS=https://<cloudfront-domain>
CSRF_TRUSTED_ORIGINS=https://<cloudfront-domain>
DATABASE_URL=postgresql://<user>:<url-encoded-password>@<rds-endpoint>:5432/<database-name>
DATABASE_SSL_REQUIRE=true
DATABASE_CONN_MAX_AGE=60
EMAIL_NOTIFICATIONS_ENABLED=false
```

Notes:

- Keep `DATABASE_URL` unset locally if using `db.sqlite3`.
- URL-encode special characters in the RDS password before placing it in `DATABASE_URL`.
- `DJANGO_SECURE_SSL_REDIRECT=false` is temporary while the ALB origin uses HTTP behind CloudFront.

## Backend Deployment Flow

Build and push the Django image to ECR:

```bash
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=<account-id>
ECR_REPO=cashflowgo-backend
IMAGE_TAG=latest
ECR_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO

docker build -t $ECR_REPO:$IMAGE_TAG .
docker tag $ECR_REPO:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
docker push $ECR_URI:$IMAGE_TAG
```

Run the image on ECS/Fargate:

- Cluster: `cashflowgo-cluster`
- Service: `cashflowgo-backend-service`
- Container port: `8000`
- Load balancer listener: HTTP `80`
- Target group port: `8000`
- Health check path: `/api/accounts/csrf/`
- Temporary target group success codes: `200-399`

Run migrations as a one-off ECS task using the same task definition revision and backend security group:

```text
python,manage.py,migrate
```

Successful migration logs should show `Applying ... OK` and the task should exit with code `0`.

## Networking Rules

Security groups needed:

- ALB security group: allow inbound HTTP `80` from `0.0.0.0/0`.
- Backend task security group: allow inbound TCP `8000` from the ALB security group.
- RDS security group: allow inbound PostgreSQL `5432` from the backend task security group.

The RDS rule must use the backend security group ID as the source, not the typed security group name.

## Frontend Deployment Flow

Build the React app so API calls use the same CloudFront domain:

```bash
REACT_APP_API_BASE_URL=https://<cloudfront-domain>/api \
REACT_APP_ENABLE_OFFLINE_FALLBACK=0 \
npm run build
```

Upload the build to S3:

```bash
aws s3 sync build/ s3://<frontend-bucket-name> --delete
```

Invalidate CloudFront so the new build is served:

```bash
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

## CloudFront Configuration

Origins:

- S3 origin for the React build, using Origin Access Control.
- ALB origin for Django API traffic, using HTTP port `80`.

Behaviors:

- Default behavior routes to S3.
- `/api/*` behavior routes to the ALB origin.
- `/api/*` allowed methods: `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`.
- `/api/*` cache policy: `CachingDisabled`.
- `/api/*` origin request policy: `AllViewerExceptHostHeader`.

SPA fallback:

- Set default root object to `index.html`.
- Custom error response `403 -> /index.html` with HTTP `200`.
- Custom error response `404 -> /index.html` with HTTP `200`.

## Verification

Backend health through CloudFront:

```bash
curl -i https://<cloudfront-domain>/api/accounts/csrf/
```

Expected:

```text
HTTP/2 200
{"message":"CSRF token set successfully."}
```

Core deployed app flows:

- Signup
- Login
- Logout
- Add transaction
- Switch profile
- Income slider
- Budget view
- Subscriptions

## Redeploying Updates

For day-to-day updates after the first deployment, see [AWS_REDEPLOY.md](./AWS_REDEPLOY.md).

## Follow-Up Hardening

Later production cleanup:

- Add a custom domain and ACM certificate.
- Add HTTPS listener `443` to the ALB.
- Set `DJANGO_SECURE_SSL_REDIRECT=true`.
- Change target group success codes back to `200`.
- Tighten `DJANGO_ALLOWED_HOSTS` to exact CloudFront/custom domains.
- Move secrets from plain ECS environment variables to AWS Secrets Manager or SSM Parameter Store.
