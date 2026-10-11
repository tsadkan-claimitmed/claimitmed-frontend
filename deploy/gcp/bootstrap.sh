#!/usr/bin/env bash
set -euo pipefail

# Idempotent frontend-only GCP bootstrap (APIs + Artifact Registry).
# Cloud SQL lives in the API bootstrap. Same GCP project as the API is expected.
# Usage: ENV=dev ./deploy/gcp/bootstrap.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/gcp/common.sh
source "${ROOT_DIR}/deploy/gcp/common.sh"

require_project

echo "==> Project ${PROJECT_ID}  env=${ENV}  region=${REGION}"

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project="$PROJECT_ID"

if gcloud artifacts repositories describe "$ARTIFACT_REPO" \
  --location="$REGION" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Artifact Registry ${ARTIFACT_REPO} already exists"
else
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="ClaimItMed container images" \
    --project="$PROJECT_ID"
fi

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for role in \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/artifactregistry.writer \
  roles/cloudbuild.builds.builder; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="$role" \
    --quiet >/dev/null
done

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/artifactregistry.writer" \
  --quiet >/dev/null || true

echo "Frontend bootstrap complete for ${PROJECT_ID}."
echo "Next: ENV=${ENV} ./deploy/gcp/deploy.sh"
