#!/usr/bin/env bash
set -euo pipefail

CLOUDFRONT_DOMAIN="${CLOUDFRONT_DOMAIN:-d2yc928ej87ojb.cloudfront.net}"
S3_BUCKET="${S3_BUCKET:-cashflowgo-frontend-schoopity}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E2AVM57GQO37BC}"

echo "Building React app for https://${CLOUDFRONT_DOMAIN}/api"
REACT_APP_API_BASE_URL="https://${CLOUDFRONT_DOMAIN}/api" \
REACT_APP_ENABLE_OFFLINE_FALLBACK=0 \
npm run build

echo "Uploading build/ to s3://${S3_BUCKET}"
aws s3 sync build/ "s3://${S3_BUCKET}" --delete

echo "Invalidating CloudFront distribution ${CLOUDFRONT_DISTRIBUTION_ID}"
INVALIDATION_ID="$(
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text
)"

echo "Invalidation started: ${INVALIDATION_ID}"
echo "Check status with:"
echo "aws cloudfront get-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --id ${INVALIDATION_ID}"
echo "Frontend URL: https://${CLOUDFRONT_DOMAIN}"
