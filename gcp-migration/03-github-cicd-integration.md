# GitHub CI/CD Integration
> **Audience:** IT team + developer — connecting the GitHub repository to GCP for automated deployments.

---

## Current Flow (Vercel)

```
git push main
    │
    ▼
GitHub Actions (.github/workflows/deploy.yml)
    ├── npm ci
    ├── npm run build
    ├── vercel pull (fetch env vars)
    └── vercel deploy --prod
```

PR branches deploy to Vercel preview URLs automatically.

---

## New Flow (GCP)

```
git push main
    │
    ▼
GitHub Actions
    ├── npm ci
    ├── npm run build (verify)
    ├── docker build
    ├── docker push → Artifact Registry
    └── gcloud run deploy → Cloud Run (production)

git push <feature-branch>
    │
    ▼
GitHub Actions
    └── vercel deploy (PR preview — unchanged)
```

**Both flows run in parallel.** `main` deploys to GCP. PRs deploy to Vercel. No Vercel production deploy happens after migration.

---

## GitHub Secrets Required

Add these secrets in: GitHub repo → Settings → Secrets and variables → Actions

### For GCP deployment:

| Secret | How to get it |
|--------|--------------|
| `GCP_PROJECT_ID` | Your GCP project ID (e.g. `compulocks-mrd-producer-prod`) |
| `GCP_REGION` | e.g. `europe-west1` |
| `GCP_ARTIFACT_REGISTRY` | e.g. `europe-west1-docker.pkg.dev` |
| `WIF_PROVIDER` | Workload Identity Federation provider resource name (see below) |
| `WIF_SERVICE_ACCOUNT` | Service account email used by GitHub Actions |

### Keep these existing secrets (for Vercel PR previews):
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `GOOGLE_API_KEY` (used during build step)
- `GOOGLE_SEARCH_ENGINE_ID` (used during build step)

---

## Option A: Workload Identity Federation (Recommended)

WIF lets GitHub Actions authenticate to GCP without storing a service account key. More secure — no long-lived credentials in GitHub secrets.

### Set up WIF in GCP:

```bash
# Create a service account for GitHub Actions
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deploy"

# Grant it the roles it needs
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create the WIF pool
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create the WIF provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get your project number (needed for the binding command below)
# YOUR_PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# Bind the service account to the GitHub repo
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_ORG/mrd-producer-webapp"
```

After running the commands above, retrieve the values to add as GitHub secrets:

```bash
# Get the WIF provider resource name
gcloud iam workload-identity-pools providers describe github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --format="value(name)"
# Save this output as WIF_PROVIDER in GitHub secrets

# The service account email to save as WIF_SERVICE_ACCOUNT:
echo "github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

Save the WIF provider name as `WIF_PROVIDER` and the service account email as `WIF_SERVICE_ACCOUNT` in GitHub repo secrets.

---

## Option B: Service Account Key (Simpler, Less Secure)

If WIF setup is too complex, use a service account key instead.

```bash
# Create key
gcloud iam service-accounts keys create sa-key.json \
  --iam-account=github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Copy the content of sa-key.json
cat sa-key.json
```

Add the entire JSON content as a GitHub secret named `GCP_SA_KEY`.
In the workflow, replace the WIF auth step with:
```yaml
- uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}
```

> **Security note:** Service account keys are long-lived credentials. Rotate them every 90 days and restrict the service account's permissions to the minimum required.

---

## Updated GitHub Actions Workflow

Replace `.github/workflows/deploy.yml` with:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  # ── Build + deploy to GCP (main branch only) ──────────────────────────
  deploy-gcp:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # Required for Workload Identity Federation

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run linter
        run: npm run --if-present lint
        continue-on-error: true

      - name: Build
        run: npm run build
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          GOOGLE_SEARCH_ENGINE_ID: ${{ secrets.GOOGLE_SEARCH_ENGINE_ID }}

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Docker auth for Artifact Registry
        run: gcloud auth configure-docker ${{ secrets.GCP_ARTIFACT_REGISTRY }} --quiet

      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:${{ github.sha }} .
          docker tag ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:${{ github.sha }} \
            ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:latest

      - name: Push to Artifact Registry
        run: |
          docker push ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:${{ github.sha }}
          docker push ${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy mrd-producer \
            --image=${{ secrets.GCP_ARTIFACT_REGISTRY }}/${{ secrets.GCP_PROJECT_ID }}/mrd-producer/app:${{ github.sha }} \
            --platform=managed \
            --region=${{ secrets.GCP_REGION }} \
            --allow-unauthenticated

  # ── PR preview via Vercel (pull requests only) ────────────────────────
  preview-vercel:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Build
        run: npm run build
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          GOOGLE_SEARCH_ENGINE_ID: ${{ secrets.GOOGLE_SEARCH_ENGINE_ID }}

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Deploy to Vercel Preview
        run: vercel deploy --token=${{ secrets.VERCEL_TOKEN }}
```

Now replace the actual file `.github/workflows/deploy.yml` with the workflow YAML above (write it directly, not as a code block — it's the actual file content).

---
