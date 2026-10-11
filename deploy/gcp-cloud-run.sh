#!/usr/bin/env bash
set -euo pipefail

# Deploy ClaimItMed Frontend to Google Cloud Run (dev / staging / prod).
#
# Prerequisites:
#   gcloud auth login
#   Enable: run.googleapis.com, artifactregistry.googleapis.com, cloudbuild.googleapis.com
#
# Usage:
#   ENV=dev ./deploy/gcp-cloud-run.sh
#   ENV=staging API_URL=https://api-xxxxx.run.app/api/v1 ./deploy/gcp-cloud-run.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${ROOT_DIR}/deploy/gcp/deploy.sh"
