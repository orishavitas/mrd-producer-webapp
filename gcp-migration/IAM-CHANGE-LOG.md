# IAM Change Log — r-and-d-489319

Audit trail for IAM policy changes made during the Google Cloud migration, per user request to log self-granted permission changes.

## 2026-07-08 — Self-granted serviceusage.serviceUsageAdmin

**Who:** Claude Code, acting as `ori@compulocks.com`, in an active session with `ori@compulocks.com` authenticated via `gcloud auth login`.

**What:** Granted `roles/serviceusage.serviceUsageAdmin` to `user:ori@compulocks.com` on project `r-and-d-489319`.

**Command:**
```
gcloud projects add-iam-policy-binding r-and-d-489319 \
  --member="user:ori@compulocks.com" \
  --role="roles/serviceusage.serviceUsageAdmin"
```

**Why:** `ori@compulocks.com` already held `roles/resourcemanager.projectIamAdmin` on this project, which permits granting IAM roles to any member. Every prior attempt to run `gcloud builds submit`, `gcloud services enable`, and `gcloud services list --enabled` failed with `AUTH_PERMISSION_DENIED` / "does not have permission... check serviceusage.services.use" — blocking any new Cloud Run deployment. `danny@compulocks.com` holds `roles/owner` on this project and was the originally identified path to grant this, but the user explicitly authorized a self-grant instead of waiting, given the existing `projectIamAdmin` role already made it possible.

**Authorization:** Explicit, in-session. User was asked directly ("Should I do that?") before the grant was made, after Claude surfaced that self-granting was technically possible via the existing `projectIamAdmin` role. User responded: "yes and create a log of what you did" — this file is that log.

**Effect:** Unblocks `gcloud builds submit` (Cloud Build image builds), `gcloud services enable/list` (API management). Cloud SQL Admin was NOT part of this grant and was not requested, since Cloud SQL was dropped from the migration plan in favor of GCS-based document storage (see `docs/superpowers/specs/` for the GCS design, pending approval as of this log entry).

**Full IAM policy for ori@compulocks.com on r-and-d-489319 as of this change:**
- roles/artifactregistry.admin
- roles/cloudbuild.admin
- roles/iam.serviceAccountAdmin
- roles/iam.serviceAccountUser
- roles/resourcemanager.projectIamAdmin
- roles/run.admin
- roles/run.builder
- roles/run.invoker
- roles/secretmanager.admin
- roles/serviceusage.serviceUsageAdmin ← added by this change

**Not granted (and not needed under the current GCS-based plan):** roles/cloudsql.admin, roles/owner.

## 2026-07-08 — Self-granted roles/storage.admin

**Who:** Claude Code, acting as `ori@compulocks.com`, same session as above.

**What:** Granted `roles/storage.admin` to `user:ori@compulocks.com` on project `r-and-d-489319`.

**Command:**
```
gcloud projects add-iam-policy-binding r-and-d-489319 \
  --member="user:ori@compulocks.com" \
  --role="roles/storage.admin"
```

**Why:** `serviceusage.serviceUsageAdmin` (granted above) did not actually unblock `gcloud builds submit` — the real error was `ori@compulocks.com` having zero Cloud Storage permissions at all (confirmed via failed `storage.buckets.get`, `getIamPolicy`, and `ls` calls), which blocks Cloud Build's staging bucket (`r-and-d-489319_cloudbuild`) access. This also unblocks the planned GCS document-storage bucket (task #13 in the migration tracker) in the same step.

**Authorization:** Explicit, in-session. User was asked directly with two options (self-grant vs. ask Danny) and chose to self-grant. A first attempt at this same question went unanswered and Claude did NOT proceed without a response — only acted after explicit confirmation on the retry.

**Effect:** Full Cloud Storage access for `ori@compulocks.com` on this project, including the Cloud Build staging bucket and future document-storage bucket creation/management.

## 2026-07-08 — Self-granted roles/logging.viewer

**Who:** Claude Code, acting as `ori@compulocks.com`, same session as above.

**What:** Granted `roles/logging.viewer` to `user:ori@compulocks.com` on project `r-and-d-489319`.

**Why:** After successfully building and deploying the new image, `/api/documents` and `/api/admin/allowlist` started returning 500 on live Cloud Run despite the identical `POSTGRES_URL` working from local `pg` client tests. Needed to read the actual Cloud Run request/stdout logs to diagnose — `gcloud logging read` failed with `PERMISSION_DENIED: Permission denied for all log views` beforehand.

**Authorization:** Explicit, in-session — user was asked directly and chose self-grant over asking the user/Danny to relay logs manually.

**Effect:** Read-only access to Cloud Logging for this project.

## Root cause found via logging.viewer: quoted POSTGRES_URL secret

Using the new log access, found the actual error: `Error: getaddrinfo EAI_AGAIN base` — the app was trying to resolve a literal hostname `"base"`. Root cause: `.env.local` stores `POSTGRES_URL="postgresql://...`" WITH surrounding double quotes (bash-style), and the original `gcloud secrets create POSTGRES_URL --data-file=-` piped those quotes in verbatim via `grep | sed`. `pg`'s connection-string parser choked on the leading quote and fell back to parsing garbage, landing on hostname `base`.

Fixed by creating secret version 3 with the quotes stripped (via a small Node script that reads `.env.local`, trims surrounding quotes if present, writes to stdout) and piping directly into `gcloud secrets versions add`. Also added `connect_timeout=15` at the same time (turned out to be unnecessary for the actual bug, but harmless and a reasonable safety margin for Neon's autosuspend cold-start).

**Lesson:** when piping `.env.local` values into Secret Manager, always strip surrounding quotes explicitly — `grep VAR= file | sed 's/VAR=//'` does NOT remove quote characters that are literally part of the file's text.
