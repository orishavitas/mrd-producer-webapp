# GCP Setup Guide
> **Audience:** IT team (GCP org admins) — step-by-step execution guide for setting up Google Cloud to host this app.

---

## Prerequisites

Before starting:
- [ ] You have Owner or Editor role on a GCP project (or can create one)
- [ ] `gcloud` CLI is installed: https://cloud.google.com/sdk/docs/install
- [ ] Docker is installed locally (for building the container)
- [ ] You have the repository cloned: `git clone https://github.com/<org>/mrd-producer-webapp`
- [ ] You have values for all environment variables listed in Doc 1

---

## Step 1: Create or Select a GCP Project

```bash
# Create a new project (recommended: use your org domain prefix)
gcloud projects create mrd-producer-prod --name="MRD Producer"

# Or select an existing project
gcloud config set project YOUR_PROJECT_ID
```

**Recommended project ID format:** `<company>-mrd-producer-prod`

---

## Step 2: Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  cloudresourcemanager.googleapis.com
```

> This takes 1-2 minutes. Each API must be enabled before the corresponding resource can be created.

---

## Step 3: Set Up Artifact Registry (Container Storage)

```bash
# Create a Docker repository in Artifact Registry
gcloud artifacts repositories create mrd-producer \
  --repository-format=docker \
  --location=europe-west1 \
  --description="MRD Producer app images"
```

> **Region choice:** Use `europe-west1` (Belgium) or `me-west1` (Tel Aviv) depending on your primary user geography. Use the same region for all resources in this guide.

---

## Step 4: Create the Dockerfile

In the project root, create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3080
ENV PORT 3080
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

Also add to `next.config.js`:
```js
output: 'standalone',
```
> The `standalone` output mode bundles only what's needed — critical for Docker image size.

---

## Step 5: Build and Push the Docker Image

```bash
# Authenticate Docker with Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev

# Build the image
docker build -t europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/mrd-producer/app:latest .

# Push to Artifact Registry
docker push europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/mrd-producer/app:latest
```

---

## Step 6: Store Secrets in Secret Manager

> **Security note:** Replace `YOUR_VALUE` with the actual secret value. Avoid typing real credentials directly into your terminal — use the GCP Console UI (Secret Manager → Create Secret) or pipe from a file to avoid storing values in shell history.

```bash
# Store each secret using the GCP Console UI, or via CLI:
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_API_KEY --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_SEARCH_ENGINE_ID --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create AUTH_SECRET --data-file=-
echo -n "YOUR_VALUE" | gcloud secrets create POSTGRES_URL --data-file=-

# Generate AUTH_SECRET if you don't have one:
# openssl rand -base64 32
```

---

## Step 7: Grant Cloud Run Access to Secret Manager

> **Do this before deploying** — Cloud Run needs Secret Manager access to read secrets during deployment.

```bash
# Get the default compute service account number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 8: Deploy to Cloud Run

Run this in **Git Bash** (not PowerShell or CMD — the line continuation syntax requires bash):

```bash
gcloud run deploy mrd-producer \
  --image=europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/mrd-producer/app:latest \
  --platform=managed \
  --region=europe-west1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=10 \
  --concurrency=80 \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest,GOOGLE_SEARCH_ENGINE_ID=GOOGLE_SEARCH_ENGINE_ID:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,AUTH_SECRET=AUTH_SECRET:latest,POSTGRES_URL=POSTGRES_URL:latest
```

> **Baseline config:** 512MB RAM, 1 vCPU, max 10 instances, concurrency 80. Adjust after load testing.
> **`--allow-unauthenticated`:** Required — users access the app from the browser without GCP credentials.

After deploy, Cloud Run outputs a service URL like:
`https://mrd-producer-<hash>-ew.a.run.app`

---

## Step 9: Custom Domain Setup

```bash
# Map your domain to the Cloud Run service
gcloud run domain-mappings create \
  --service=mrd-producer \
  --domain=YOUR_APP_DOMAIN \
  --region=europe-west1
```

Then add the DNS records shown in the output to your DNS provider (Google Domains, Cloudflare, etc.).
SSL is provisioned automatically by Google — wait 15-30 minutes for propagation.

---

## Step 10: Update OAuth Callback URL

> **CRITICAL — do this before testing login.**

In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client:

Add to **Authorized Redirect URIs:**
```
https://YOUR_APP_DOMAIN/api/auth/callback/google
```

> If the OAuth client was created under a personal Google account rather than your org's GCP project, it must be **transferred to the org project first**. Contact whoever set up the original OAuth client.

---

## Step 11: Verify Deployment

```bash
# Check service status
gcloud run services describe mrd-producer --region=europe-west1

# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mrd-producer" --limit=50 --format=json
```

Expected: Service shows `READY`. Open the service URL in a browser — the login page should load and Google OAuth should work.

---

## Rollback Procedure

Cloud Run keeps all previous revisions. To roll back:

```bash
# List revisions
gcloud run revisions list --service=mrd-producer --region=europe-west1

# Route 100% traffic to a previous revision
gcloud run services update-traffic mrd-producer \
  --region=europe-west1 \
  --to-revisions=mrd-producer-00002-xxx=100
```

---

## Health Check

Cloud Run automatically probes `GET /` every 30 seconds. If the app is healthy, it returns HTTP 200.
To check manually:
```bash
curl -I https://YOUR_APP_DOMAIN
# Expected: HTTP/2 302 (redirect to login page — this is correct for an authenticated app)
# If you see HTTP/2 200 on a public endpoint, the app is also healthy.
```
