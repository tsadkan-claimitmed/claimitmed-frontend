#!/usr/bin/env bash
set -euo pipefail

# Deploy ClaimItMed Frontend to Google Cloud Run
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project YOUR_PROJECT_ID
#   Enable: run.googleapis.com, artifactregistry.googleapis.com, cloudbuild.googleapis.com
#
# Usage:
#   ./deploy/gcp-cloud-run.sh
#   PROJECT_ID=my-project REGION=us-central1 API_URL=https://api.example.com/api/v1 ./deploy/gcp-cloud-run.sh

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
ARTIFACT_REPO="${ARTIFACT_REPO:-claimitmed}"
SERVICE_NAME="${SERVICE_NAME:-claimitmed-frontend}"
API_URL="${API_URL:-/api/v1}"

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "ERROR: Set PROJECT_ID or run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/${SERVICE_NAME}:latest"

echo "==> Ensuring Artifact Registry repo exists..."
gcloud artifacts repositories describe "$ARTIFACT_REPO" \
  --location="$REGION" 2>/dev/null \
  || gcloud artifacts repositories create "$ARTIFACT_REPO" \
       --repository-format=docker \
       --location="$REGION" \
       --description="ClaimItMed container images"

echo "==> Building and pushing image..."
gcloud builds submit \
  --tag "$IMAGE" \
  --project "$PROJECT_ID" \
  .

echo "==> Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "API_URL=${API_URL}" \
  --project "$PROJECT_ID"

echo "==> Done!"
gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format 'value(status.url)'
