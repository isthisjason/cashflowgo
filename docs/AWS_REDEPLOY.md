# Legacy AWS Redeploy Workflow

This document records the former AWS redeploy workflow for project history and reference. The active low-cost demo deployment uses `npm run deploy` for Cloudflare Pages and Render for the backend; see [../DEPLOYMENT.md](../DEPLOYMENT.md).

Use this guide after making changes to CashFlowGo. AWS deploys are split by what changed.

## Frontend Changes

Use this when you changed React components, CSS, routing, or frontend API usage.

```bash
npm run deploy:aws:frontend
```

The script:

1. Builds React with `REACT_APP_API_BASE_URL=https://d2yc928ej87ojb.cloudfront.net/api`.
2. Syncs `build/` to `s3://cashflowgo-frontend-schoopity`.
3. Creates a CloudFront invalidation for distribution `E2AVM57GQO37BC`.

After the invalidation completes, verify:

```text
https://d2yc928ej87ojb.cloudfront.net
https://d2yc928ej87ojb.cloudfront.net/login
```

## Backend Changes

Use this when you changed Django views, serializers, settings, auth, utilities, requirements, or backend behavior.

```bash
npm run deploy:aws:backend
```

The script:

1. Builds the backend Docker image from `Dockerfile`.
2. Pushes `cashflowgo-backend:latest` to ECR.
3. Forces a new ECS deployment for `cashflowgo-backend-service`.

Verify the backend through CloudFront:

```bash
curl -i https://d2yc928ej87ojb.cloudfront.net/api/accounts/csrf/
```

Expected:

```text
HTTP/2 200
{"message":"CSRF token set successfully."}
```

## Backend Changes With Migrations

Use this when you changed Django models or added migrations.

First deploy the backend image:

```bash
npm run deploy:aws:backend
```

Then run migrations as a one-off ECS task in the AWS Console:

- Go to `ECS -> Clusters -> cashflowgo-cluster -> Tasks -> Run new task`.
- Task definition: `cashflowgo-backend`, latest revision.
- Launch type: Fargate.
- VPC and subnets: same as the backend service.
- Security group: `sg-0e3383787fab844d9 / cashflowgo-backend-sg`.
- Public IP: on.
- Container command override:

```text
python,manage.py,migrate
```

Successful logs show `Applying ... OK`, and the task exits with code `0`.

## Smoke Test

After deploying, test the smallest relevant set:

- Frontend deploy: page loads, `/login` works directly, and the browser console has no stale API URL.
- Backend deploy: `/api/accounts/csrf/` returns `200` through CloudFront.
- Migration deploy: migration task exits `0`, then signup/login still work.
- Full app check: signup or login, add transaction, switch profile, and confirm dashboard data loads.

## Defaults Used By Scripts

Override these with environment variables if AWS resources change:

```text
CLOUDFRONT_DOMAIN=d2yc928ej87ojb.cloudfront.net
S3_BUCKET=cashflowgo-frontend-schoopity
CLOUDFRONT_DISTRIBUTION_ID=E2AVM57GQO37BC
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=218712444873
ECR_REPO=cashflowgo-backend
IMAGE_TAG=latest
ECS_CLUSTER=cashflowgo-cluster
ECS_SERVICE=cashflowgo-backend-service
```
