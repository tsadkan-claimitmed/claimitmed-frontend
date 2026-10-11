# GCP Cloud Run (frontend)

The full operator runbook (three projects, CORS loop, GitHub Environments, tags) lives in the backend repo:

**[claimitmed-backend/docs/gcp-deploy.md](../../claimitmed-backend/docs/gcp-deploy.md)**

Frontend-only commands from this repo:

```bash
chmod +x deploy/gcp/*.sh

ENV=dev ./deploy/gcp/bootstrap.sh
ENV=dev ./deploy/gcp/deploy.sh          # reads claimitmed-api URL if API_URL is unset

ENV=dev GITHUB_REPO=tsadkan-claimitmed/claimitmed-frontend ./deploy/gcp/bootstrap-wif.sh
```

CI: `.github/workflows/ci.yml`

| Trigger | Environment |
|---------|-------------|
| Push `main` / `master` | dev |
| Tag `staging-*` | staging |
| Tag `v*` | prod |
| Run workflow | chosen env |

GitHub environment variables: `GCP_PROJECT_ID`, `API_URL` (`https://…run.app/api/v1`). Secrets: `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`.
