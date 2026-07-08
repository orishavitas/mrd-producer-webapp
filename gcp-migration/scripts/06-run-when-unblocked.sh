#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Run this ONLY after `gcloud auth login` succeeds interactively.
# Executes the remaining GCP migration steps in order. Each step is safe
# to re-run (idempotent) except where marked DESTRUCTIVE — those pause
# for confirmation.
#
# Fill in the variables below before running, or export them beforehand.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-r-and-d-489319}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-mrd-producer}"
SQL_INSTANCE="${SQL_INSTANCE:-mrd-producer-db}"
SQL_TIER="${SQL_TIER:-db-f1-micro}"          # bump for prod load later
SQL_DB_NAME="${SQL_DB_NAME:-mrd_producer}"
SQL_APP_USER="${SQL_APP_USER:-mrd_app}"
NEON_URL="${NEON_URL:-}"                      # source Postgres URL for pg_dump — set before running

gcloud config set project "$PROJECT_ID"

echo "── Step 1: Verify IAM roles ──────────────────────────────────"
gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten="bindings[].members" \
  --filter="bindings.members:$(gcloud config get-value account)" \
  --format="table(bindings.role)"
echo "Confirm the account above has: roles/editor OR (Cloud SQL Admin, Secret Manager Admin, Artifact Registry Admin, IAM Admin)."
read -p "Press enter once IAM is confirmed sufficient, or Ctrl+C to stop and request access first..." _

echo "── Step 2: Enable required APIs ──────────────────────────────"
gcloud services enable \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com

echo "── Step 2b: Ensure Artifact Registry repo exists ──────────────"
gcloud artifacts repositories describe mrd-producer --location="$REGION" &>/dev/null || \
  gcloud artifacts repositories create mrd-producer \
    --repository-format=docker --location="$REGION" \
    --description="mrd-producer-webapp container images"

echo "── Step 3: Provision Cloud SQL Postgres 15 ───────────────────"
if ! gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_15 \
    --tier="$SQL_TIER" \
    --region="$REGION" \
    --storage-auto-increase
else
  echo "Instance $SQL_INSTANCE already exists — skipping create."
fi

gcloud sql databases create "$SQL_DB_NAME" --instance="$SQL_INSTANCE" || echo "DB may already exist — continuing."

APP_DB_PASSWORD=$(openssl rand -base64 24)
gcloud sql users create "$SQL_APP_USER" --instance="$SQL_INSTANCE" --password "$APP_DB_PASSWORD" || echo "User may already exist — continuing."

CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE" --format="value(connectionName)")
echo "Cloud SQL connection name: $CONNECTION_NAME"

echo "── Step 4: Migrate data from Neon → Cloud SQL ────────────────"
if [ -z "$NEON_URL" ]; then
  echo "NEON_URL not set — skipping data migration. Export it and re-run this step manually:"
  echo '  pg_dump "$NEON_URL" --no-owner --no-acl -F c -f /tmp/neon-dump.pgcustom'
  echo '  gcloud sql import sql/custom ...  (or use Cloud SQL Auth Proxy + pg_restore)'
else
  echo "DESTRUCTIVE-ISH: about to dump Neon and restore into Cloud SQL $SQL_INSTANCE/$SQL_DB_NAME."
  read -p "Continue? (y/N) " confirm
  if [ "$confirm" = "y" ]; then
    pg_dump "$NEON_URL" --no-owner --no-acl -F c -f /tmp/neon-dump.pgcustom
    # Requires Cloud SQL Auth Proxy running locally on 127.0.0.1:5433, or use `gcloud sql import`
    echo "Dump written to /tmp/neon-dump.pgcustom — restore via Cloud SQL Auth Proxy + pg_restore, or gcloud sql import."
  fi
fi

echo "── Step 5: Store secrets in Secret Manager ────────────────────"
POSTGRES_URL_SECRET="postgresql://${SQL_APP_USER}:${APP_DB_PASSWORD}@/${SQL_DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"
printf '%s' "$POSTGRES_URL_SECRET" | gcloud secrets create POSTGRES_URL --data-file=- 2>/dev/null || \
  printf '%s' "$POSTGRES_URL_SECRET" | gcloud secrets versions add POSTGRES_URL --data-file=-

echo "Now create/update these secrets manually (values not auto-generated):"
echo "  gcloud secrets create AUTH_SECRET --data-file=-           # openssl rand -base64 32"
echo "  gcloud secrets create GOOGLE_CLIENT_ID --data-file=-      # from OAuth client (see step 6)"
echo "  gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-  # from OAuth client (see step 6)"
echo "  gcloud secrets create GOOGLE_API_KEY --data-file=-        # existing Gemini key"

echo "── Step 6: OAuth client (MANUAL — Console only) ───────────────"
echo "gcloud cannot create OAuth 2.0 clients. In GCP Console:"
echo "  1. APIs & Services > OAuth consent screen > configure (Internal, or External + test users)"
echo "  2. APIs & Services > Credentials > Create OAuth client ID > Web application"
echo "  3. Authorized redirect URI: https://<cloud-run-url>/api/auth/callback/google"
echo "  4. Copy Client ID/Secret into the secrets above, then re-run 'gcloud secrets versions add'"

echo "── Step 7: Fix IAP ─────────────────────────────────────────────"
gcloud run services update "$SERVICE" --region="$REGION" --clear-labels || true
echo "If IAP is enabled at the load-balancer/backend-service level (not just the label), disable it via:"
echo "  gcloud iap web disable --resource-type=backend-services --service=<backend-service-name>"
echo "Verify no IAP redirect: curl -sI https://<cloud-run-url>/ | grep -i location"

echo "── Step 8: Deploy current main ─────────────────────────────────"
gcloud builds submit --tag "${REGION}-docker.pkg.dev/${PROJECT_ID}/mrd-producer/app:manual-$(date +%s)" .
echo "Or push to main and let .github/workflows/deploy.yml handle it via CI/CD (preferred)."

gcloud run deploy "$SERVICE" \
  --region="$REGION" \
  --add-cloudsql-instances="$CONNECTION_NAME" \
  --set-secrets=POSTGRES_URL=POSTGRES_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GOOGLE_API_KEY=GOOGLE_API_KEY:latest \
  --remove-env-vars=BYPASS_AUTH

echo "── Step 9: Verify ───────────────────────────────────────────────"
SERVICE_URL=$(gcloud run services describe "$SERVICE" --region="$REGION" --format="value(status.url)")
echo "Service URL: $SERVICE_URL"
curl -sI "$SERVICE_URL/" | head -5
echo "Manually verify in browser: login works, One-Pager loads, document save/load hits Cloud SQL, admin allowlist page works."

echo "── Step 10: Fix CI/CD — WIF was never actually configured ────────"
echo "DISCOVERED: .github/workflows/deploy.yml's deploy-gcp job has failed on"
echo "EVERY run since 2026-06-04 (checked via gh run list / gh secret list)."
echo "WIF_PROVIDER, WIF_SERVICE_ACCOUNT, GCP_ARTIFACT_REGISTRY, GCP_PROJECT_ID,"
echo "GCP_REGION were never set as GitHub secrets. Every Cloud Run deploy so far"
echo "was manual. Run the following to make CI/CD actually work:"

GH_REPO="${GH_REPO:-orishavitas/mrd-producer-webapp}"   # adjust if org/name differs
WIF_POOL="github-pool"
WIF_PROVIDER_ID="github-provider"
WIF_SA="github-deployer"

cat <<EOF
  gcloud iam workload-identity-pools create $WIF_POOL \\
    --location=global --display-name="GitHub Actions Pool"

  gcloud iam workload-identity-pools providers create-oidc $WIF_PROVIDER_ID \\
    --location=global --workload-identity-pool=$WIF_POOL \\
    --display-name="GitHub Provider" \\
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \\
    --attribute-condition="assertion.repository=='$GH_REPO'" \\
    --issuer-uri="https://token.actions.githubusercontent.com"

  gcloud iam service-accounts create $WIF_SA --display-name="GitHub Actions Deployer"

  gcloud iam service-accounts add-iam-policy-binding \\
    "$WIF_SA@$PROJECT_ID.iam.gserviceaccount.com" \\
    --role="roles/iam.workloadIdentityUser" \\
    --member="principalSet://iam.googleapis.com/projects/\$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/$WIF_POOL/attribute.repository/$GH_REPO"

  gcloud projects add-iam-policy-binding $PROJECT_ID \\
    --member="serviceAccount:$WIF_SA@$PROJECT_ID.iam.gserviceaccount.com" \\
    --role="roles/run.admin"
  gcloud projects add-iam-policy-binding $PROJECT_ID \\
    --member="serviceAccount:$WIF_SA@$PROJECT_ID.iam.gserviceaccount.com" \\
    --role="roles/artifactregistry.writer"
  gcloud projects add-iam-policy-binding $PROJECT_ID \\
    --member="serviceAccount:$WIF_SA@$PROJECT_ID.iam.gserviceaccount.com" \\
    --role="roles/cloudsql.client"
  gcloud projects add-iam-policy-binding $PROJECT_ID \\
    --member="serviceAccount:$WIF_SA@$PROJECT_ID.iam.gserviceaccount.com" \\
    --role="roles/secretmanager.secretAccessor"
  gcloud projects add-iam-policy-binding $PROJECT_ID \\
    --member="serviceAccount:$WIF_SA@$PROJECT_ID.iam.gserviceaccount.com" \\
    --role="roles/iam.serviceAccountUser"

  gh secret set WIF_PROVIDER --body "projects/\$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/$WIF_POOL/providers/$WIF_PROVIDER_ID"
  gh secret set WIF_SERVICE_ACCOUNT --body "$WIF_SA@$PROJECT_ID.iam.gserviceaccount.com"
  gh secret set GCP_PROJECT_ID --body "$PROJECT_ID"
  gh secret set GCP_REGION --body "$REGION"
  gh secret set GCP_ARTIFACT_REGISTRY --body "${REGION}-docker.pkg.dev"
  gh secret set CLOUDSQL_INSTANCE --body "$SQL_INSTANCE"
EOF

echo "After running the above, push to main and confirm: gh run watch"

echo "── Done. Do NOT decommission Neon or touch Vercel prod until manual verification above passes. ──"
