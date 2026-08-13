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

## Quick Start

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

## Project Structure

```
src/app/
├── core/           # Auth, guards, interceptors, models, API services
├── shared/         # Reusable UI components and shell layout
└── features/       # Role-based portal pages (lazy-loaded)
    ├── auth/
    ├── member/
    ├── provider/
    ├── insurer/
    ├── admin/
    └── employer/
```

## Configuration

API URL is configured in `src/environments/environment.ts` (default: `http://localhost:3000/api/v1`).

## Scripts

| Script        | Description              |
|---------------|--------------------------|
| `npm start`   | Dev server on port 4200  |
| `npm run build` | Production build       |
| `npm test`    | Run unit tests           |
