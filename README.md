# ClaimItMed Frontend

Angular 19 single-page application for the ClaimItMed health insurance claims platform. Connects to the [ClaimItMed Backend](../claimitmed-backend) API.

## Features

### Authentication
- JWT login with refresh token flow
- Role-based routing (Admin, Insurer, Provider, Member, Employer)
- Demo account shortcuts on login page

### Member Portal
- Dashboard with coverage summary
- Benefit pool balances with usage progress
- Claim history tracking
- Out-of-pocket reimbursement requests

### Provider Portal
- Front-desk eligibility check (national ID lookup)
- Treatment case workflow (create → add services → complete)
- Draft claims inbox with one-click submit
- Provider dashboard with workflow guide

### Insurer Portal
- Policy and member management views
- Claim adjudication (lookup by ID, approve/reject)
- Dashboard with key metrics

### Admin Portal
- Reference data catalog (benefits, services, diagnoses)
- Organization management (insurers, employers, providers)
- Fraud rule configuration (activate/deactivate)

### Employer Portal
- Organization profile view (minimal — backend APIs limited)

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- ClaimItMed Backend running at `http://localhost:3000`

## Quick Start (Local Dev)

```bash
nvm use
npm install
npm start
```

Open `http://localhost:4200`

## Demo Accounts

| Role     | Email                  | Password   |
|----------|------------------------|------------|
| Member   | john.doe@email.com     | password   |
| Provider | staff@stpaul.com       | password   |
| Insurer  | admin@abc.com          | password   |
| Admin    | admin@platform.com     | password   |
| Employer | hr@techco.com          | password   |

## Docker

### Build & run (proxies API to host backend on port 3000)

```bash
npm run docker:build
docker compose -f docker/docker-compose.standalone.yml up --build
```

Open `http://localhost:8080`

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP listen port (Cloud Run sets this automatically) |
| `API_URL` | `/api/v1` | API base URL injected into the Angular app at runtime |
| `API_BACKEND_URL` | _(empty)_ | When set, nginx reverse-proxies `/api/` to this URL |

### Deployment modes

**Same-origin proxy** (Docker Compose, Kubernetes with sidecar/ingress):
```bash
API_URL=/api/v1
API_BACKEND_URL=http://claimitmed-api:3000/api/
```

**Separate backend URL** (Google Cloud Run, AWS, Azure):
```bash
API_URL=https://claimitmed-api-xxxxx.run.app/api/v1
# API_BACKEND_URL left empty — browser calls backend directly
```

## Google Cloud Run

### One-command deploy

```bash
chmod +x deploy/gcp-cloud-run.sh
PROJECT_ID=your-project \
API_URL=https://your-backend.run.app/api/v1 \
./deploy/gcp-cloud-run.sh
```

### Cloud Build (CI/CD)

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_API_URL=https://your-backend.run.app/api/v1
```

### Manual deploy

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/claimitmed-frontend .
gcloud run deploy claimitmed-frontend \
  --image gcr.io/PROJECT_ID/claimitmed-frontend \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars API_URL=https://your-backend.run.app/api/v1
```

## Kubernetes

```bash
docker build -f docker/Dockerfile -t claimitmed-frontend .
kubectl apply -f deploy/kubernetes/deployment.yaml
```

Edit `deploy/kubernetes/deployment.yaml` to set your image registry and `API_BACKEND_URL`.

## Project Structure

```
src/app/
├── core/           # Auth, guards, interceptors, models, API services
├── shared/         # Reusable UI components and shell layout
└── features/       # Role-based portal pages (lazy-loaded)
docker/             # Dockerfile, nginx, entrypoint, compose
deploy/             # Cloud Run, Kubernetes manifests
```

## Configuration

- **Development:** `src/environments/environment.ts`
- **Production build:** `src/environments/environment.prod.ts`
- **Runtime (Docker/Cloud):** `/assets/config.json` generated from `API_URL` env var at container start

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Dev server on port 4200 |
| `npm run build` | Production build |
| `npm run docker:build` | Build Docker image |
| `npm test` | Run unit tests |
