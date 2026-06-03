# GCP Setup Guide
> **Audience:** IT team (GCP org admins) — step-by-step execution guide for setting up Google Cloud to host this app.

---

## Prerequisites

Before starting:
- [ ] You have Owner or Editor role on a GCP project (or can create one)
- [ ] `gcloud` CLI is installed: https://cloud.google.com/sdk/docs/install
- [ ] Docker is installed locally (for building the container)
- [ ] You have the repository cloned: `git clone https://github.com/compulocks/mrd-producer-webapp`
- [ ] You have values for all environment variables listed in Doc 1

---

## Step 1: Create the GCP Project

```bash
# Authenticate first
gcloud auth login

# Create a new project
gcloud projects create compulocks-mrd-prod --name="MRD Producer"

# Set it as the active project
gcloud config set project compulocks-mrd-prod

# Link billing account (required before enabling APIs)
# List your billing accounts:
gcloud billing accounts list
# Then link:
gcloud billing projects link compulocks-mrd-prod --billing-account=BILLING_ACCOUNT_ID
```

---

## Step 2: Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com
```

> This takes 1-2 minutes. Each API must be enabled before the corresponding resource can be created.

---

## Step 3: Set Up Artifact Registry (Container Storage)

```bash
gcloud artifacts repositories create mrd-producer \
  --repository-format=docker \
  --location=us-central1 \
  --description="MRD Producer app images"
```

---

## Step 4: Build and Push the Docker Image

The `Dockerfile` and `.dockerignore` are already in the repository root.
`next.config.js` already has `output: 'standalone'` set.

```bash
# From the repository root:

# Authenticate Docker with Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build the image
docker build -t us-central1-docker.pkg.dev/compulocks-mrd-prod/mrd-producer/app:latest .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/compulocks-mrd-prod/mrd-producer/app:latest
```

---

## Step 5: Store Secrets in Secret Manager

> **Security note:** Use the GCP Console UI (Secret Manager → Create Secret) to avoid storing values in shell history, or pipe from a file.

```bash
# Required secrets:
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_API_KEY --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_SEARCH_ENGINE_ID --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create AUTH_SECRET --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create POSTGRES_URL --data-file=-

# Optional secrets (add if you have them):
echo -n "YOUR_VALUE" | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create OPENAI_API_KEY --data-file=-

# Generate AUTH_SECRET if you don't have one:
# openssl rand -base64 32
```

> **POSTGRES_URL format for Cloud SQL (after Step 6):**
> `postgresql://app_user:PASSWORD@localhost/mrd_producer?host=/cloudsql/compulocks-mrd-prod:us-central1:mrd-producer-db`

---

## Step 6: Set Up Cloud SQL (PostgreSQL)

See Doc 4 for the full database setup guide. Summary:

```bash
# Create instance
gcloud sql instances create mrd-producer-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-auto-increase \
  --backup-start-time=02:00

# Create database and user
gcloud sql databases create mrd_producer --instance=mrd-producer-db
gcloud sql users create app_user \
  --instance=mrd-producer-db \
  --password=STRONG_RANDOM_PASSWORD
```

After creating the instance, update `POSTGRES_URL` in Secret Manager with the Cloud SQL connection string (see Doc 4).

---

## Step 7: Grant Cloud Run Access to Secret Manager

> **Do this before deploying** — Cloud Run needs Secret Manager access to read secrets.

```bash
PROJECT_NUMBER=$(gcloud projects describe compulocks-mrd-prod --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding compulocks-mrd-prod \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

# Also grant Cloud SQL client access
gcloud projects add-iam-policy-binding compulocks-mrd-prod \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"
```

---

## Step 8: Deploy to Cloud Run

```bash
gcloud run deploy mrd-producer \
  --image=us-central1-docker.pkg.dev/compulocks-mrd-prod/mrd-producer/app:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=10 \
  --concurrency=80 \
  --add-cloudsql-instances=compulocks-mrd-prod:us-central1:mrd-producer-db \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest,GOOGLE_SEARCH_ENGINE_ID=GOOGLE_SEARCH_ENGINE_ID:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,AUTH_SECRET=AUTH_SECRET:latest,POSTGRES_URL=POSTGRES_URL:latest
```

After deploy, Cloud Run outputs a service URL like:
`https://mrd-producer-<hash>-uc.a.run.app`

**Save this URL** — you'll need it for the OAuth callback update in Step 9.

---

## Step 9: Update OAuth Callback URL

> **CRITICAL — do this before testing login.**

In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client:

Add to **Authorized Redirect URIs:**
```
https://mrd-producer-<hash>-uc.a.run.app/api/auth/callback/google
```

Keep the existing Vercel URI during the transition period. Remove it once migration is verified complete.

> If the OAuth client was created under a personal Google account, it must be transferred to the org GCP project first. Contact whoever set up the original OAuth client.

---

## Step 10: Verify Deployment

```bash
# Check service status
gcloud run services describe mrd-producer --region=us-central1

# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mrd-producer" --limit=50
```

Expected: Service shows `READY`. Open the service URL in a browser — the login page should load and Google OAuth should work.

---

## Rollback Procedure

Cloud Run keeps all previous revisions. To roll back:

```bash
# List revisions
gcloud run revisions list --service=mrd-producer --region=us-central1

# Route 100% traffic to a previous revision
gcloud run services update-traffic mrd-producer \
  --region=us-central1 \
  --to-revisions=mrd-producer-00002-xxx=100
```

---

## Health Check

Cloud Run automatically probes `GET /` every 30 seconds.

```bash
curl -I https://mrd-producer-<hash>-uc.a.run.app
# Expected: HTTP/2 302 (redirect to login — correct for an authenticated app)
```
