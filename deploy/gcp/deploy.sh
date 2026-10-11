#!/usr/bin/env bash
set -euo pipefail

# Build and deploy the frontend to Cloud Run.
# Usage:
#   ENV=dev ./deploy/gcp/deploy.sh
#   ENV=dev API_URL=https://api-xxxxx.run.app/api/v1 IMAGE_TAG=$GITHUB_SHA ./deploy/gcp/deploy.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/gcp/common.sh
source "${ROOT_DIR}/deploy/gcp/common.sh"

require_project
resolve_api_url

cd "$ROOT_DIR"

echo "==> Deploying ${SERVICE_NAME} with API_URL=${API_URL}"
gcloud builds submit \
  --project="$PROJECT_ID" \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=${REGION},_ARTIFACT_REPO=${ARTIFACT_REPO},_IMAGE_TAG=${IMAGE_TAG},_API_URL=${API_URL},_MIN_INSTANCES=${MIN_INSTANCES},_MAX_INSTANCES=${MAX_INSTANCES},_MEMORY=${MEMORY}" \
  .

gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)'
