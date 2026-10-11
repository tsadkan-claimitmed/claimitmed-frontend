#!/usr/bin/env bash
# Shared GCP settings for ClaimItMed frontend. Source from other deploy scripts.
# Usage: ENV=dev PROJECT_ID=claimitmed-dev source deploy/gcp/common.sh

set -euo pipefail

ENV="${ENV:-dev}"

case "$ENV" in
  dev | staging | prod) ;;
  *)
    echo "ERROR: ENV must be dev, staging, or prod (got: ${ENV})" >&2
    exit 1
    ;;
esac

PROJECT_ID="${PROJECT_ID:-claimitmed-${ENV}}"
REGION="${REGION:-us-central1}"
ARTIFACT_REPO="${ARTIFACT_REPO:-claimitmed}"
SERVICE_NAME="${SERVICE_NAME:-claimitmed-frontend}"
API_SERVICE_NAME="${API_SERVICE_NAME:-claimitmed-api}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
API_URL="${API_URL:-}"

case "$ENV" in
  dev)
    MIN_INSTANCES="${MIN_INSTANCES:-0}"
    MAX_INSTANCES="${MAX_INSTANCES:-5}"
    MEMORY="${MEMORY:-256Mi}"
    ;;
  staging)
    MIN_INSTANCES="${MIN_INSTANCES:-1}"
    MAX_INSTANCES="${MAX_INSTANCES:-10}"
    MEMORY="${MEMORY:-256Mi}"
    ;;
  prod)
    MIN_INSTANCES="${MIN_INSTANCES:-1}"
    MAX_INSTANCES="${MAX_INSTANCES:-20}"
    MEMORY="${MEMORY:-512Mi}"
    ;;
esac

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${SERVICE_NAME}:${IMAGE_TAG}"

require_gcloud() {
  if ! command -v gcloud >/dev/null 2>&1; then
    echo "ERROR: gcloud CLI is not installed. https://cloud.google.com/sdk/docs/install" >&2
    exit 1
  fi
}

require_project() {
  require_gcloud
  if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
    echo "ERROR: Set PROJECT_ID or ENV (defaults to claimitmed-\${ENV})." >&2
    exit 1
  fi
}

resolve_api_url() {
  if [[ -n "$API_URL" ]]; then
    return 0
  fi
  local api_base
  api_base="$(gcloud run services describe "$API_SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='value(status.url)' 2>/dev/null || true)"
  if [[ -z "$api_base" ]]; then
    echo "ERROR: Set API_URL (https://YOUR-API.run.app/api/v1) or deploy claimitmed-api first." >&2
    exit 1
  fi
  API_URL="${api_base}/api/v1"
}
