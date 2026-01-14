# Path Tracker - Google Cloud Deployment Guide

This guide covers deploying Path Tracker to Google Cloud Platform (GCP).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                       │
│                                                                 │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────┐  │
│  │   GitHub    │────▶│   Cloud Build   │────▶│  Artifact    │  │
│  │ (main push) │     │   (CI/CD)       │     │  Registry    │  │
│  └─────────────┘     └────────┬────────┘     └──────────────┘  │
│                               │                                 │
│                               ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Cloud Run                          │   │
│  │                   (pathtracker)                         │   │
│  │                   europe-west1                          │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Cloud SQL                            │   │
│  │              PostgreSQL 16 (pathtracker-db)             │   │
│  │                   europe-west1                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Secret Manager                         │   │
│  │    - database-url                                       │   │
│  │    - clerk-publishable-key                              │   │
│  │    - clerk-secret-key                                   │   │
│  │    - clerk-webhook-secret                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- GitHub repository for the codebase
- Clerk account for authentication

## Infrastructure Components

| Component | Service | Region | Details |
|-----------|---------|--------|---------|
| Database | Cloud SQL PostgreSQL 16 | europe-west1 | Instance: `pathtracker-db` |
| Application | Cloud Run | europe-west1 | Service: `pathtracker` |
| Container Registry | Artifact Registry | europe-west1 | Repo: `pathtracker` |
| CI/CD | Cloud Build | europe-west1 | Triggered on push to `main` |
| Secrets | Secret Manager | global | 4 secrets |

## Configuration

### Project Details

```
Project Name: path-tracker
Project ID: path-tracker-484312
Region: europe-west1 (Belgium)
```

### Secret Manager Secrets

Update these secrets with your actual values:

```bash
# Clerk Publishable Key (from Clerk Dashboard)
echo -n "pk_live_xxxxx" | gcloud secrets versions add clerk-publishable-key --data-file=-

# Clerk Secret Key (from Clerk Dashboard)
echo -n "sk_live_xxxxx" | gcloud secrets versions add clerk-secret-key --data-file=-

# Clerk Webhook Secret (from Clerk Dashboard → Webhooks)
echo -n "whsec_xxxxx" | gcloud secrets versions add clerk-webhook-secret --data-file=-
```

### Database Connection

The database URL is automatically configured to use Cloud SQL's Unix socket connection:

```
postgresql://pathtracker:PASSWORD@/pathtracker?host=/cloudsql/path-tracker-484312:europe-west1:pathtracker-db
```

## Initial Setup

### 1. Initialize Database Schema

Connect to Cloud SQL and run the initialization script:

```bash
# Option 1: Using gcloud (requires psql installed)
gcloud sql connect pathtracker-db --user=pathtracker --database=pathtracker < scripts/init-db.sql

# Option 2: Using Cloud Shell
# 1. Go to: https://console.cloud.google.com/sql/instances/pathtracker-db/overview?project=path-tracker-484312
# 2. Click "Connect using Cloud Shell"
# 3. Upload scripts/init-db.sql
# 4. Run: psql -d pathtracker < init-db.sql

# Option 3: Install psql locally
brew install postgresql  # macOS
./scripts/cloud-db-init.sh
```

### 2. Connect GitHub Repository

Complete the GitHub connection in Cloud Console:

1. Go to [Cloud Build Connections](https://console.cloud.google.com/cloud-build/repositories/2nd-gen?project=path-tracker-484312)
2. Click on `pathtracker-github` connection
3. Complete the GitHub OAuth authorization
4. Link the repository: `felipe-tonon/path_tracker`

### 3. Create Build Trigger

```bash
gcloud builds triggers create github \
  --name="pathtracker-deploy" \
  --region=europe-west1 \
  --repository="projects/path-tracker-484312/locations/europe-west1/connections/pathtracker-github/repositories/path_tracker" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --description="Deploy to Cloud Run on push to main"
```

### 4. Update Clerk Configuration

In your Clerk Dashboard, update the allowed URLs:

- **Sign-in URL**: `https://your-cloud-run-url.run.app/sign-in`
- **Sign-up URL**: `https://your-cloud-run-url.run.app/sign-up`
- **Webhook URL**: `https://your-cloud-run-url.run.app/api/webhooks/clerk`

## Manual Deployment

To deploy manually without waiting for a push:

```bash
# Trigger a build manually
gcloud builds submit --config=cloudbuild.yaml --region=europe-west1

# Or deploy directly to Cloud Run
gcloud run deploy pathtracker \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --add-cloudsql-instances path-tracker-484312:europe-west1:pathtracker-db \
  --set-secrets DATABASE_URL=database-url:latest,NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=clerk-publishable-key:latest,CLERK_SECRET_KEY=clerk-secret-key:latest,CLERK_WEBHOOK_SECRET=clerk-webhook-secret:latest
```

## Monitoring & Logs

```bash
# View Cloud Run logs
gcloud run services logs read pathtracker --region=europe-west1

# View Cloud Build logs
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')

# Check service status
gcloud run services describe pathtracker --region=europe-west1
```

## Cost Estimates

| Service | Tier | Estimated Monthly Cost |
|---------|------|----------------------|
| Cloud SQL | db-f1-micro | ~$10-15 |
| Cloud Run | Pay-per-use | ~$0-10 (low traffic) |
| Artifact Registry | Storage | ~$0.10/GB |
| Cloud Build | Free tier | $0 (first 120 min/day) |
| Secret Manager | Free tier | $0 (first 6 active secrets) |

**Estimated Total**: ~$10-30/month for low-to-moderate traffic

## Troubleshooting

### Database Connection Issues

```bash
# Check Cloud SQL instance status
gcloud sql instances describe pathtracker-db

# Test connection
gcloud sql connect pathtracker-db --user=pathtracker
```

### Build Failures

```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID

# Check Cloud Build IAM
gcloud projects get-iam-policy path-tracker-484312 \
  --filter="bindings.members:*cloudbuild*" \
  --format="table(bindings.role,bindings.members)"
```

### Cloud Run Issues

```bash
# Check service health
gcloud run services describe pathtracker --region=europe-west1

# Check recent logs
gcloud run services logs read pathtracker --region=europe-west1 --limit=100
```

## Scaling Configuration

Current Cloud Run settings (in `cloudbuild.yaml`):

```yaml
--memory 512Mi          # Memory per instance
--cpu 1                 # CPU per instance
--min-instances 0       # Scale to zero when idle
--max-instances 10      # Maximum concurrent instances
```

To update:

```bash
gcloud run services update pathtracker \
  --region=europe-west1 \
  --min-instances=1 \
  --max-instances=20
```
