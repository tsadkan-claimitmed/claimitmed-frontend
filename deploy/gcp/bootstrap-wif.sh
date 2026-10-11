#!/usr/bin/env bash
set -euo pipefail

# Create a GitHub Actions deployer SA and Workload Identity Federation (no JSON keys).
# Usage:
#   ENV=dev GITHUB_REPO=your-org/claimitmed-frontend ./deploy/gcp/bootstrap-wif.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/gcp/common.sh
source "${ROOT_DIR}/deploy/gcp/common.sh"

require_project

GITHUB_REPO="${GITHUB_REPO:-}"
if [[ -z "$GITHUB_REPO" ]]; then
  echo "ERROR: Set GITHUB_REPO=owner/claimitmed-frontend" >&2
  exit 1
fi

POOL_ID="${WIF_POOL_ID:-github}"
PROVIDER_ID="${WIF_PROVIDER_ID:-claimitmed-frontend}"
DEPLOY_SA_NAME="${DEPLOY_SA_NAME:-github-deploy}"
DEPLOY_SA_EMAIL="${DEPLOY_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$DEPLOY_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "==> ${DEPLOY_SA_EMAIL} already exists"
else
  gcloud iam service-accounts create "$DEPLOY_SA_NAME" \
    --display-name="GitHub Actions deployer" \
    --project="$PROJECT_ID"
fi

for role in \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/cloudbuild.builds.editor \
  roles/artifactregistry.writer \
  roles/serviceusage.serviceUsageConsumer \
  roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
    --role="$role" \
    --quiet >/dev/null
done

if gcloud iam workload-identity-pools describe "$POOL_ID" \
  --location=global \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "==> WIF pool ${POOL_ID} already exists"
else
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location=global \
    --display-name="GitHub Actions" \
    --project="$PROJECT_ID"
fi

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
POOL_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}"

if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "==> OIDC provider ${PROVIDER_ID} already exists"
else
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --location=global \
    --workload-identity-pool="$POOL_ID" \
    --display-name="GitHub frontend" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
    --project="$PROJECT_ID"
fi

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_RESOURCE}/attribute.repository/${GITHUB_REPO}" \
  --quiet >/dev/null

echo ""
echo "WIF ready for ${GITHUB_REPO} on ${PROJECT_ID}."
echo "GitHub environment (${ENV}) secrets:"
echo "  WIF_PROVIDER=${POOL_RESOURCE}/providers/${PROVIDER_ID}"
echo "  WIF_SERVICE_ACCOUNT=${DEPLOY_SA_EMAIL}"
echo "GitHub environment (${ENV}) variables:"
echo "  GCP_PROJECT_ID=${PROJECT_ID}"
echo "  API_URL=https://YOUR-API.run.app/api/v1"
