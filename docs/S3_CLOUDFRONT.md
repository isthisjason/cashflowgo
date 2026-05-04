# S3 + CloudFront Frontend Deployment

This checklist deploys the CashFlowGo React frontend to AWS using S3 for static files and CloudFront as the public CDN/HTTPS entrypoint.

## 1) Choose Values

Use one AWS region for the project:

```bash
AWS_REGION=us-east-1
BUCKET_NAME=cashflowgo-frontend-<unique-suffix>
```

Bucket names are globally unique across AWS, so include a personal suffix if the first name is taken.

## 2) Build The Frontend

Until the AWS backend exists, you can point the build at the current backend or use a placeholder API URL:

```bash
REACT_APP_API_BASE_URL=https://<future-api-domain>/api \
REACT_APP_ENABLE_OFFLINE_FALLBACK=0 \
npm run build
```

The production files will be created in `build/`.

## 3) Create The S3 Bucket

For `us-east-1`:

```bash
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$AWS_REGION"
```

For any other region:

```bash
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"
```

Keep public access blocked. CloudFront should be the public entrypoint.

## 4) Upload The React Build

```bash
aws s3 sync build/ "s3://$BUCKET_NAME" --delete
```

## 5) Create CloudFront Distribution

In the AWS Console:

1. Open CloudFront.
2. Create a distribution.
3. Origin domain: choose the S3 bucket.
4. Origin access: use Origin Access Control.
5. Viewer protocol policy: redirect HTTP to HTTPS.
6. Default root object: `index.html`.
7. Create the distribution.
8. Apply the generated S3 bucket policy when CloudFront prompts for it.

## 6) Configure React Router Fallback

CloudFront must return `index.html` for SPA routes like `/login` and `/transactions`.

In the CloudFront distribution, add custom error responses:

```text
HTTP error code: 403
Response page path: /index.html
HTTP response code: 200
Error caching minimum TTL: 0
```

Also add:

```text
HTTP error code: 404
Response page path: /index.html
HTTP response code: 200
Error caching minimum TTL: 0
```

## 7) Verify The Deployment

Visit the CloudFront distribution domain:

```text
https://<cloudfront-domain>.cloudfront.net
```

Check:

- The CashFlowGo React app loads.
- `/login` loads directly.
- Hard refresh on `/login` still loads the app.
- Browser console does not show missing static asset errors.

Some API-backed features may not work until the Django backend is deployed to AWS.

## 8) Update After Backend Deployment

After the backend has an AWS API URL:

```bash
REACT_APP_API_BASE_URL=https://<api-domain>/api \
REACT_APP_ENABLE_OFFLINE_FALLBACK=0 \
npm run build
aws s3 sync build/ "s3://$BUCKET_NAME" --delete
```

Then create a CloudFront invalidation:

```bash
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

## Resume Summary

Deployed a React single-page application to AWS using S3 for static hosting and CloudFront for HTTPS CDN delivery with SPA route fallback.
