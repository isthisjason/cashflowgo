#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-218712444873}"
ECR_REPO="${ECR_REPO:-cashflowgo-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ECS_CLUSTER="${ECS_CLUSTER:-cashflowgo-cluster}"
ECS_SERVICE="${ECS_SERVICE:-cashflowgo-backend-service}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_URI="${ECR_REGISTRY}/${ECR_REPO}"

echo "Logging Docker into ECR registry ${ECR_REGISTRY}"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "Building backend image ${ECR_REPO}:${IMAGE_TAG}"
docker build -t "${ECR_REPO}:${IMAGE_TAG}" .

echo "Tagging image as ${ECR_URI}:${IMAGE_TAG}"
docker tag "${ECR_REPO}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"

echo "Pushing image to ECR"
docker push "${ECR_URI}:${IMAGE_TAG}"

echo "Forcing ECS service redeployment"
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --force-new-deployment \
  --region "${AWS_REGION}" \
  --query 'service.deployments[0].rolloutState' \
  --output text

echo "Backend redeploy started."
echo "Verify with:"
echo "curl -i https://d2yc928ej87ojb.cloudfront.net/api/accounts/csrf/"
